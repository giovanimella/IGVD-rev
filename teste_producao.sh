#!/bin/bash

# 🧪 Script de Teste das Correções em Produção
# Execute este script após aplicar as correções

echo "================================================"
echo "🧪 TESTE DAS CORREÇÕES - SISTEMA DE ASSINATURAS"
echo "================================================"
echo ""

# Configurar URL da API (ajuste conforme necessário)
API_URL="${API_URL:-http://localhost:8001}"
TOKEN="SEU_TOKEN_DE_TESTE_AQUI"

echo "🔍 Testando conexão com backend..."
curl -s "$API_URL/api/health" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend está respondendo"
else
    echo "❌ Backend não está respondendo"
    exit 1
fi

echo ""
echo "================================================"
echo "TESTE 1: Verificar novos métodos do serviço"
echo "================================================"

echo "Verificando se métodos list_customers e get_customer existem..."
grep -q "async def list_customers" /app/backend/services/pagbank_subscription_service_v2.py
if [ $? -eq 0 ]; then
    echo "✅ Método list_customers() encontrado"
else
    echo "❌ Método list_customers() NÃO encontrado"
fi

grep -q "async def get_customer" /app/backend/services/pagbank_subscription_service_v2.py
if [ $? -eq 0 ]; then
    echo "✅ Método get_customer() encontrado"
else
    echo "❌ Método get_customer() NÃO encontrado"
fi

echo ""
echo "================================================"
echo "TESTE 2: Verificar campo pagbank_customer_id"
echo "================================================"

grep -q "pagbank_customer_id" /app/backend/models_subscription.py
if [ $? -eq 0 ]; then
    echo "✅ Campo pagbank_customer_id adicionado no modelo"
else
    echo "❌ Campo pagbank_customer_id NÃO encontrado no modelo"
fi

echo ""
echo "================================================"
echo "TESTE 3: Verificar uso de SUSPEND (não CANCEL)"
echo "================================================"

grep -q "suspend_subscription()" /app/backend/routes/subscription_routes.py
if [ $? -eq 0 ]; then
    echo "✅ Endpoint usando suspend_subscription()"
else
    echo "❌ Endpoint ainda usando cancel_subscription()"
fi

grep -q "activate_subscription()" /app/backend/routes/subscription_routes.py
if [ $? -eq 0 ]; then
    echo "✅ Endpoint usando activate_subscription()"
else
    echo "❌ Endpoint não usando activate_subscription()"
fi

echo ""
echo "================================================"
echo "TESTE 4: Verificar logs do backend"
echo "================================================"

echo "Últimas 20 linhas do log de erro:"
tail -20 /var/log/supervisor/backend.err.log

echo ""
echo "================================================"
echo "TESTE 5: Verificar estrutura de customer_data"
echo "================================================"

grep -A 2 "Reutilizando customer existente\|Customer encontrado no PagBank" /app/backend/routes/subscription_routes.py > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Lógica de reutilização de customer implementada"
else
    echo "⚠️  Logs de reutilização não encontrados (pode ser normal se arquivo não foi atualizado)"
fi

echo ""
echo "================================================"
echo "✅ RESUMO DOS TESTES AUTOMÁTICOS"
echo "================================================"
echo ""
echo "Próximos passos MANUAIS:"
echo ""
echo "1. 🧪 Teste com usuário que JÁ teve assinatura:"
echo "   - Criar nova assinatura"
echo "   - NÃO deve dar erro de tax_ID duplicado"
echo "   - Verificar logs: 'Reutilizando customer existente'"
echo ""
echo "2. 🔄 Teste de suspensão:"
echo "   - Suspender assinatura ativa"
echo "   - Verificar no dashboard PagBank: status = SUSPENDED"
echo ""
echo "3. ✅ Teste de reativação:"
echo "   - Reativar assinatura suspensa"
echo "   - Verificar no dashboard PagBank: status = ACTIVE"
echo "   - Confirmar que acesso foi liberado"
echo ""
echo "4. 🔍 Verificar banco de dados:"
echo "   - Campo pagbank_customer_id deve estar preenchido"
echo "   - Status deve ser SUSPENDED (não CANCELLED)"
echo ""
echo "================================================"
echo "✅ Testes automáticos concluídos!"
echo "================================================"
