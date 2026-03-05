# 🎯 GUIA RÁPIDO: Resolver Erro 401 - Token PagBank

## ⚠️ Problema Atual

Você está recebendo **HTTP 401 Unauthorized** ao tentar gerar a chave pública do PagBank.

**Causa**: O token que você configurou não é válido para o ambiente **Sandbox**.

---

## ✅ SOLUÇÃO EM 5 PASSOS

### 📍 PASSO 1: Obter o Token Correto no PagBank

#### Via Dashboard PagBank:

1. **Acesse**: https://pagseguro.uol.com.br (ou https://minhaconta.pagseguro.com.br)
2. **Login** com suas credenciais
3. Vá em: **Área de Vendas** → **Integrações**
4. Procure por: **"Token de Segurança"** ou **"Gerar Token"**
5. Clique em **"Gerar Token"** ou **"Novo Token"**
6. **COPIE o token completo** (ele não será mostrado novamente!)

**Formato esperado**:
```
2e612a91-94e7-4d57-8267-eaac13dad79a
```
(UUID de 36 caracteres com hifens)

---

### 📍 PASSO 2: Configurar no Sistema

1. **Faça login** como **Administrador** no seu sistema
2. Vá em: **Assinaturas** (menu lateral esquerdo)
3. Role até a seção: **"Credenciais PagBank API"**
4. **Cole o token** no campo **"Token Bearer (Obrigatório)"**
   - ⚠️ NÃO adicione "Bearer " antes do token
   - ⚠️ NÃO deixe espaços antes ou depois
5. Verifique: **Ambiente PagBank** = **Sandbox (Teste)**
6. Clique em **"Salvar"**
7. Aguarde a confirmação de sucesso

---

### 📍 PASSO 3: Gerar Chave Pública

1. Ainda na mesma página, clique no botão verde: **"Gerar Chave Pública"**
2. **Aguarde** (pode levar alguns segundos)
3. ✅ **Sucesso**: Você verá uma mensagem de confirmação
4. ❌ **Erro 401**: O token ainda está incorreto - volte ao Passo 1

---

### 📍 PASSO 4: Testar a Assinatura

1. **Faça logout** da conta de administrador
2. **Crie uma nova conta** de licenciado (ou use a conta de teste)
3. **Siga o fluxo de onboarding** até chegar na etapa de **Assinatura**
4. **Preencha os dados**:
   - Dados pessoais
   - Endereço de cobrança
   - Dados do cartão de teste (use cartões de teste do PagBank)
5. Clique em **"Confirmar Assinatura"**

**Cartões de Teste PagBank (Sandbox)**:
```
Número: 4111 1111 1111 1111
Validade: 12/30
CVV: 123
Nome: TESTE SANDBOX
```

---

### 📍 PASSO 5: Verificar Resultado

**Se tudo der certo**:
- ✅ Assinatura criada com sucesso
- ✅ Você verá uma mensagem de confirmação
- ✅ O sistema redirecionará para o dashboard

**Se ainda houver erro**:
- ❌ Verifique os logs do navegador (F12 → Console)
- ❌ Tire um print e me envie
- ❌ Vou investigar mais a fundo

---

## 🔍 Como Saber se o Token está Correto?

### Token VÁLIDO ✅:
- 36 caracteres com hifens
- Formato UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Não contém espaços
- Não contém "Bearer " no início
- Gerado no ambiente correto (Sandbox)

### Token INVÁLIDO ❌:
- Muito curto ou muito longo
- Contém espaços
- Começa com "Bearer "
- Foi gerado em produção (não funciona no sandbox)
- Foi revogado ou expirado

---

## 🎥 Onde Encontrar o Token no PagBank

### Caminho Visual:

```
PagBank Dashboard
    ↓
[Menu] Área de Vendas
    ↓
[Submenu] Integrações
    ↓
[Seção] Token de Segurança
    ↓
[Botão] Gerar Token / Novo Token
    ↓
[Copiar] Token gerado
```

---

## ❓ FAQ - Perguntas Frequentes

### Q1: Posso usar o mesmo token em sandbox e produção?
**R**: NÃO. Cada ambiente tem seu próprio token.

### Q2: O token expira?
**R**: Sim, tokens podem expirar. Se isso acontecer, gere um novo.

### Q3: Posso ter múltiplos tokens?
**R**: Sim, mas cada novo token pode invalidar o anterior dependendo da configuração do PagBank.

### Q4: Como sei se estou usando o token de sandbox correto?
**R**: Teste gerando a chave pública. Se der 401, o token está incorreto.

### Q5: E se eu não tiver acesso ao dashboard do PagBank?
**R**: Você precisa ser o proprietário da conta ou ter permissões de administrador.

---

## 🆘 Precisa de Ajuda?

Se após seguir todos os passos o erro persistir:

1. **Tire prints** da tela de configuração (censure dados sensíveis)
2. **Copie a mensagem de erro** completa
3. **Me envie** essas informações
4. **Vou investigar** e ajudar você a resolver

---

## 📚 Recursos Adicionais

- **Documentação PagBank**: https://developer.pagbank.com.br/docs
- **Fórum PagBank**: https://developer.pagbank.com.br/discuss
- **Suporte**: Através do dashboard PagBank

---

**Última atualização**: 05/03/2026  
**Versão**: 1.0  
**Autor**: E1 - Emergent Agent
