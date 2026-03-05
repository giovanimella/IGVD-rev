# 📡 Documentação da API de Webhooks

## Visão Geral

Esta documentação descreve os endpoints de integração via webhooks da plataforma. A API permite:

1. **Webhook de Entrada (Incoming)**: Cadastrar licenciados automaticamente no sistema
2. **Webhook de Saída (Outgoing)**: Receber notificações quando um licenciado completa o onboarding

---

## 🔐 Autenticação

Todas as requisições de entrada devem incluir o header de autenticação:

```
X-API-Key: sua_chave_api_aqui
```

A chave de API é configurada pelo administrador no painel do sistema em:
**Configurações do Sistema > Webhook > API Key**

---

## 📥 WEBHOOKS DE ENTRADA (Incoming)

### 1. Cadastrar Novo Licenciado

Cria um novo licenciado no sistema automaticamente.

**Endpoint:**
```
POST /api/webhook/licensee
```

**Headers:**
```
Content-Type: application/json
X-API-Key: sua_chave_api_aqui
```

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | ✅ Sim | ID único do licenciado no seu sistema |
| `full_name` | string | ✅ Sim | Nome completo do licenciado |
| `email` | string | ✅ Sim | Email do licenciado (deve ser único) |
| `phone` | string | ❌ Não | Telefone do licenciado |
| `birthday` | string | ❌ Não | Data de nascimento (formato: YYYY-MM-DD) |
| `leader_id` | string | ❌ Não | ID do líder que indicou/cadastrou |
| `leader_name` | string | ❌ Não | Nome do líder que indicou |
| `kit_type` | string | ❌ Não | Tipo de kit: `"master"` ou `"senior"` |
| `responsible_id` | string | ❌ Não | ID do Responsável/Supervisor externo |

**Exemplo de Requisição:**

```bash
curl -X POST "https://sua-plataforma.com/api/webhook/licensee" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_chave_api_aqui" \
  -d '{
    "id": "LIC-12345",
    "full_name": "João da Silva",
    "email": "joao.silva@email.com",
    "phone": "11999998888",
    "birthday": "1990-05-15",
    "leader_id": "LEAD-001",
    "leader_name": "Maria Líder",
    "kit_type": "senior",
    "responsible_id": "SUP-001"
  }'
```

**Resposta de Sucesso (200 OK):**

```json
{
  "success": true,
  "message": "Licenciado cadastrado com sucesso",
  "data": {
    "id": "LIC-12345",
    "email": "joao.silva@email.com",
    "full_name": "João da Silva",
    "birthday": "1990-05-15",
    "kit_type": "senior",
    "initial_stage": "registro",
    "supervisor_id": "uuid-do-supervisor",
    "supervisor_name": "Carlos Supervisor",
    "supervisor_matched": true,
    "email_sent": true
  }
}
```

**Respostas de Erro:**

| Código | Mensagem | Descrição |
|--------|----------|-----------|
| 400 | `Email já cadastrado no sistema` | O email já está em uso |
| 400 | `ID já existe no sistema` | O ID informado já está cadastrado |
| 401 | `Webhook não configurado` | A API Key não foi configurada no sistema |
| 401 | `API Key inválida` | A API Key informada está incorreta |

---

### Detalhes dos Campos

#### `kit_type`
Define o fluxo de onboarding do licenciado:

| Valor | Comportamento |
|-------|---------------|
| `"master"` | Pula todas as etapas de onboarding → vai direto para status "completo" |
| `"senior"` | Segue o fluxo normal de onboarding (etapas: registro → documentos → etc) |

Se não informado, assume `"senior"`.

#### `responsible_id`
Este campo permite associar automaticamente o licenciado a um supervisor.

**Como funciona:**
1. O administrador cadastra um `external_id` (ID Externo) em cada supervisor no sistema
2. Quando o webhook recebe um `responsible_id`, o sistema busca um supervisor que tenha esse valor como `external_id`
3. Se encontrar, faz a associação automática

**Configuração do Supervisor:**
- No painel admin, vá em **Usuários**
- Edite o supervisor desejado
- Preencha o campo **"ID Externo (para Webhook)"**

---

## 📤 WEBHOOKS DE SAÍDA (Outgoing)

### 1. Notificação de Onboarding Completo

Quando um licenciado completa todas as etapas do onboarding, o sistema envia automaticamente uma notificação para a URL configurada.

**Configuração:**
No painel admin, vá em **Configurações do Sistema > Webhook** e configure:
- **URL do Webhook**: URL que receberá as notificações
- **Webhook Habilitado**: Ative para começar a enviar

**Payload Enviado:**

```json
{
  "event": "onboarding_completed",
  "timestamp": "2024-01-15T14:30:00.000000",
  "data": {
    "id": "LIC-12345",
    "full_name": "João da Silva"
  }
}
```

**Headers Enviados:**
```
Content-Type: application/json
```

**Seu endpoint deve:**
- Aceitar requisições POST
- Retornar status HTTP 200, 201 ou 202 para confirmar recebimento
- Processar a requisição em até 30 segundos

---

## 📋 Endpoint de Logs

### Consultar Logs de Webhooks

Retorna o histórico de webhooks processados (entrada e saída).

**Endpoint:**
```
GET /api/webhook/logs
```

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `limit` | integer | Quantidade máxima de registros (default: 50) |
| `type` | string | Filtrar por tipo: `"incoming"` ou `"outgoing"` |

**Exemplo:**
```bash
GET /api/webhook/logs?limit=100&type=incoming
```

**Resposta:**
```json
[
  {
    "id": "uuid-do-log",
    "type": "incoming",
    "event": "licensee_created",
    "user_id": "LIC-12345",
    "payload": { ... },
    "supervisor_matched": true,
    "supervisor_id": "uuid-supervisor",
    "success": true,
    "created_at": "2024-01-15T14:30:00.000000"
  }
]
```

---

## 🔄 Fluxo de Integração Completo

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  Seu Sistema    │        │   Plataforma     │        │   Licenciado    │
└────────┬────────┘        └────────┬─────────┘        └────────┬────────┘
         │                          │                           │
         │  1. POST /webhook/licensee                          │
         │─────────────────────────>│                           │
         │                          │                           │
         │  2. Resposta de sucesso  │                           │
         │<─────────────────────────│                           │
         │                          │                           │
         │                          │  3. Email "Defina sua     │
         │                          │     senha"                │
         │                          │──────────────────────────>│
         │                          │                           │
         │                          │  4. Licenciado faz login  │
         │                          │     e completa onboarding │
         │                          │<──────────────────────────│
         │                          │                           │
         │  5. Webhook "onboarding  │                           │
         │     completed"           │                           │
         │<─────────────────────────│                           │
         │                          │                           │
```

---

## 📝 Exemplos de Código

### Python

```python
import requests

API_URL = "https://sua-plataforma.com/api/webhook/licensee"
API_KEY = "sua_chave_api_aqui"

def cadastrar_licenciado(dados):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    payload = {
        "id": dados["id"],
        "full_name": dados["nome"],
        "email": dados["email"],
        "phone": dados.get("telefone"),
        "birthday": dados.get("nascimento"),  # YYYY-MM-DD
        "leader_id": dados.get("id_lider"),
        "leader_name": dados.get("nome_lider"),
        "kit_type": dados.get("kit", "senior"),
        "responsible_id": dados.get("id_responsavel")
    }
    
    response = requests.post(API_URL, json=payload, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"Sucesso! Supervisor associado: {result['data'].get('supervisor_matched')}")
        return result
    else:
        print(f"Erro: {response.json()}")
        return None

# Uso
cadastrar_licenciado({
    "id": "LIC-12345",
    "nome": "João da Silva",
    "email": "joao@email.com",
    "telefone": "11999998888",
    "nascimento": "1990-05-15",
    "kit": "senior",
    "id_responsavel": "SUP-001"
})
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'https://sua-plataforma.com/api/webhook/licensee';
const API_KEY = 'sua_chave_api_aqui';

async function cadastrarLicenciado(dados) {
  try {
    const response = await axios.post(API_URL, {
      id: dados.id,
      full_name: dados.nome,
      email: dados.email,
      phone: dados.telefone,
      birthday: dados.nascimento,
      leader_id: dados.idLider,
      leader_name: dados.nomeLider,
      kit_type: dados.kit || 'senior',
      responsible_id: dados.idResponsavel
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });
    
    console.log('Sucesso!', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
    return null;
  }
}

// Uso
cadastrarLicenciado({
  id: 'LIC-12345',
  nome: 'João da Silva',
  email: 'joao@email.com',
  telefone: '11999998888',
  nascimento: '1990-05-15',
  kit: 'senior',
  idResponsavel: 'SUP-001'
});
```

### PHP

```php
<?php

$apiUrl = 'https://sua-plataforma.com/api/webhook/licensee';
$apiKey = 'sua_chave_api_aqui';

function cadastrarLicenciado($dados) {
    global $apiUrl, $apiKey;
    
    $payload = [
        'id' => $dados['id'],
        'full_name' => $dados['nome'],
        'email' => $dados['email'],
        'phone' => $dados['telefone'] ?? null,
        'birthday' => $dados['nascimento'] ?? null,
        'leader_id' => $dados['id_lider'] ?? null,
        'leader_name' => $dados['nome_lider'] ?? null,
        'kit_type' => $dados['kit'] ?? 'senior',
        'responsible_id' => $dados['id_responsavel'] ?? null
    ];
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-Key: ' . $apiKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    } else {
        throw new Exception('Erro: ' . $response);
    }
}

// Uso
$resultado = cadastrarLicenciado([
    'id' => 'LIC-12345',
    'nome' => 'João da Silva',
    'email' => 'joao@email.com',
    'telefone' => '11999998888',
    'nascimento' => '1990-05-15',
    'kit' => 'senior',
    'id_responsavel' => 'SUP-001'
]);

print_r($resultado);
```

---

## ⚠️ Considerações Importantes

1. **Unicidade de ID e Email**: Cada licenciado deve ter um `id` e `email` únicos no sistema.

2. **Associação de Supervisor**: Para que a associação automática funcione:
   - O supervisor deve estar cadastrado no sistema
   - O supervisor deve ter o campo `external_id` preenchido com o valor correspondente ao `responsible_id`

3. **Email Automático**: Após o cadastro, o sistema envia automaticamente um email para o licenciado definir sua senha. O link é válido por 48 horas.

4. **Timeout**: As requisições têm timeout de 30 segundos.

5. **Logs**: Todas as requisições são registradas e podem ser consultadas via endpoint `/api/webhook/logs`.

---

## 📞 Suporte

Em caso de dúvidas sobre a integração, entre em contato com o administrador da plataforma.

---

## 🏦 APÊNDICE: Webhooks Internos do Sistema

### Webhooks do PagBank (Pagamentos)

O sistema também possui webhooks internos para receber notificações do PagBank sobre atualizações de pagamento. Estes são configurados automaticamente e não requerem ação do desenvolvedor externo.

**Endpoint (interno):**
```
POST /api/payments/webhooks/pagbank
```

**Eventos processados:**
- Confirmação de pagamento de vendas
- Confirmação de pagamento de treinamentos
- Atualizações de status de assinaturas

> ⚠️ Este endpoint é usado exclusivamente pelo PagBank e não deve ser chamado manualmente.

---

**Versão da API:** 1.0  
**Última atualização:** Março 2024
