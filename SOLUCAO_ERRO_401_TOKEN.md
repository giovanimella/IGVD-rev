# 🔐 Solução: Erro 401 Unauthorized - Token PagBank Inválido

## 🎯 Problema Identificado

O erro **HTTP 401 Unauthorized** ao tentar gerar a chave pública indica que o **Bearer Token** do PagBank está:
- ❌ Inválido
- ❌ Expirado
- ❌ De ambiente diferente (produção ao invés de sandbox, ou vice-versa)
- ❌ Revogado

## 🔍 Diagnóstico Realizado

✅ **Formato do token está correto** (100 caracteres, sem "Bearer " no início)  
✅ **Ambiente configurado**: Sandbox (Teste)  
❌ **Token retorna 401** ao tentar gerar chave pública  

**Conclusão**: O token precisa ser renovado/atualizado no PagBank.

---

## 📝 Como Obter um Token Válido no PagBank

### Opção 1: Token via Dashboard PagBank (Recomendado)

1. **Acesse sua conta PagBank**
   - URL: https://pagseguro.uol.com.br/ (ou https://minhaconta.pagseguro.com.br/)
   - Faça login com suas credenciais

2. **Navegue até Integrações**
   - Vá em: **Área de Vendas** → **Integrações** → **Token de Segurança**
   - Ou busque por "Integrações" ou "Token" no menu

3. **Gere um Novo Token**
   - Clique em **"Gerar Token"** ou **"Novo Token"**
   - Escolha o tipo: **"Token para API"**
   - ⚠️ **CUIDADO**: Se já tem um token em uso, gerar outro pode invalidar o anterior

4. **Copie o Token**
   - O token será exibido **apenas uma vez**
   - Copie e guarde em local seguro
   - Formato esperado: UUID longo (ex: `2e612a91-94e7-4d57-8267-eaac13dad79a`)

5. **Configure no Sistema**
   - No painel administrativo da sua aplicação:
   - Vá em: **Assinaturas** → **Configurações**
   - Cole o token no campo **"Token Bearer (Obrigatório)"**
   - Clique em **"Salvar"**
   - Depois clique em **"Gerar Chave Pública"**

---

### Opção 2: Connect Key (API Moderna - 2024/2025)

Se você está usando a **API moderna do PagBank** (versão 2024+), pode precisar de uma **Connect Key** ao invés de token tradicional.

#### Como obter Connect Key:

1. **Acesse o Dashboard PagBank**
   - https://minhaconta.pagseguro.com.br/

2. **Vá em Integrações → Connect**
   - Procure por "Connect" ou "Aplicativos"

3. **Crie uma Aplicação**
   - Clique em "Criar Aplicação"
   - Preencha os dados da sua aplicação

4. **Obtenha as Credenciais**
   - **Connect Key Sandbox**: Para testes
   - **Connect Key Produção**: Para ambiente real

5. **Use a Connect Key como Bearer Token**
   - A Connect Key funciona da mesma forma que o token tradicional
   - Cole no campo de token do sistema

---

## 🧪 Diferença entre Sandbox e Produção

### Token Sandbox (Testes)
- ✅ Não processa pagamentos reais
- ✅ Ideal para desenvolvimento
- ✅ Cartões de teste funcionam
- ⚠️ Precisa ser gerado especificamente para sandbox

### Token Produção (Real)
- ⚠️ Processa pagamentos reais
- ⚠️ Requer validações de segurança
- ⚠️ Precisa de certificação

**IMPORTANTE**: Não tente usar token de PRODUÇÃO no ambiente SANDBOX (e vice-versa). Cada ambiente tem seu próprio token.

---

## 🔧 Passos para Resolver o Problema

### 1. Obter Novo Token do PagBank

Siga as instruções acima para obter um token válido.

### 2. Configurar no Sistema

1. Faça login como **Administrador**
2. Vá em: **Assinaturas** (menu lateral)
3. Na seção **"Credenciais PagBank API"**:
   - Cole o token no campo **"Token Bearer"**
   - Verifique se o ambiente está correto: **Sandbox (Teste)**
   - Clique em **"Salvar"**

### 3. Gerar Chave Pública

1. Após salvar o token, clique no botão **"Gerar Chave Pública"**
2. Se tudo estiver correto, você verá a mensagem de sucesso
3. A chave será salva automaticamente

### 4. Testar Assinatura

1. Faça logout
2. Crie uma conta de licenciado (ou use a conta de teste)
3. Siga o fluxo de onboarding até a etapa de assinatura
4. Preencha os dados e teste o pagamento

---

## 🐛 Troubleshooting

### Ainda retorna 401 após trocar o token?

**Verifique:**

1. ✅ Token foi copiado **completamente** (sem cortar caracteres)
2. ✅ Não tem espaços no início/fim do token
3. ✅ Token é do ambiente correto (Sandbox vs Produção)
4. ✅ Você clicou em "Salvar" após colar o token
5. ✅ Aguardou alguns segundos antes de testar

### Token funciona no Postman mas não no sistema?

**Verifique:**

1. ✅ Headers estão corretos: `Authorization: Bearer {token}`
2. ✅ URL está correta: `https://sandbox.api.pagseguro.com` (sandbox)
3. ✅ Endpoint está correto: `/public-keys`
4. ✅ Body está correto: `{"type": "card"}`

### Onde posso encontrar ajuda oficial?

- 📚 **Documentação**: https://developer.pagbank.com.br/docs
- 💬 **Fórum**: https://developer.pagbank.com.br/discuss
- 📞 **Suporte**: Através do painel PagBank
- 📧 **Email**: atendimento@pagseguro.com.br

---

## 📊 Status Atual do Sistema

- ✅ Código corrigido (payload do customer_data)
- ❌ Token PagBank inválido/expirado (retorna 401)
- ⏳ Aguardando novo token válido

---

## 🎯 Próximos Passos

1. **[AÇÃO DO USUÁRIO]** Obter novo token válido no dashboard PagBank
2. **[AÇÃO DO USUÁRIO]** Configurar token no painel administrativo
3. **[AÇÃO DO USUÁRIO]** Gerar chave pública
4. **[TESTE]** Testar criação de assinatura
5. **[VALIDAÇÃO]** Verificar se o erro 422 também foi resolvido

---

## 💡 Dicas Importantes

- 🔑 **Guarde o token em local seguro** (ele não pode ser recuperado depois)
- 🔄 **Use tokens diferentes** para sandbox e produção
- ⏰ **Tokens podem expirar** - anote a data de criação
- 🚫 **Nunca compartilhe** seu token publicamente
- 📝 **Teste sempre em sandbox** antes de produção

---

**Última atualização**: 05/03/2026  
**Autor**: E1 - Emergent Agent
