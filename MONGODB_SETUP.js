// ============================================
// COMANDOS MONGODB SHELL - NOVAS FUNCIONALIDADES
// Execute estes comandos no MongoDB Shell (mongosh)
// ============================================

// Conectar ao banco de dados (ajuste o nome se necessário)
use ozoxx_lms

// ============================================
// 1. TIMELINE/COMUNIDADE
// ============================================

// Criar collection de posts
db.createCollection("timeline_posts")

// Criar índices para timeline_posts
db.timeline_posts.createIndex({ "id": 1 }, { unique: true })
db.timeline_posts.createIndex({ "author_id": 1 })
db.timeline_posts.createIndex({ "is_active": 1, "is_pinned": -1, "created_at": -1 })
db.timeline_posts.createIndex({ "created_at": -1 })

// Criar collection de comentários
db.createCollection("timeline_comments")

// Criar índices para timeline_comments
db.timeline_comments.createIndex({ "id": 1 }, { unique: true })
db.timeline_comments.createIndex({ "post_id": 1, "is_active": 1, "created_at": 1 })
db.timeline_comments.createIndex({ "author_id": 1 })

// Criar collection de reações
db.createCollection("timeline_reactions")

// Criar índices para timeline_reactions
db.timeline_reactions.createIndex({ "id": 1 }, { unique: true })
db.timeline_reactions.createIndex({ "post_id": 1, "user_id": 1 }, { unique: true })
db.timeline_reactions.createIndex({ "post_id": 1, "reaction_type": 1 })

// ============================================
// 2. TERMOS DE ACEITE DIGITAL
// ============================================

// Criar collection de termos
db.createCollection("digital_terms")

// Criar índices para digital_terms
db.digital_terms.createIndex({ "id": 1 }, { unique: true })
db.digital_terms.createIndex({ "is_active": 1 })
db.digital_terms.createIndex({ "created_at": -1 })

// Criar collection de aceites
db.createCollection("term_acceptances")

// Criar índices para term_acceptances
db.term_acceptances.createIndex({ "id": 1 }, { unique: true })
db.term_acceptances.createIndex({ "user_id": 1, "term_id": 1 }, { unique: true })
db.term_acceptances.createIndex({ "term_id": 1 })
db.term_acceptances.createIndex({ "accepted_at": -1 })

// ============================================
// 3. CONFIGURAÇÕES WHATSAPP
// ============================================

// Criar collection de configuração do WhatsApp
db.createCollection("whatsapp_config")

// Criar índice para whatsapp_config
db.whatsapp_config.createIndex({ "id": 1 }, { unique: true })

// Inserir configuração padrão (se não existir)
db.whatsapp_config.updateOne(
  { id: "whatsapp_config" },
  {
    $setOnInsert: {
      id: "whatsapp_config",
      enabled: false,
      api_url: null,
      api_key: null,
      instance_name: null,
      notify_new_modules: true,
      notify_tips: true,
      notify_access_reminder: true,
      notify_birthday: true,
      notify_live_classes: true,
      notify_custom: true,
      access_reminder_days: 7,
      updated_at: new Date().toISOString()
    }
  },
  { upsert: true }
)

// Criar collection de mensagens WhatsApp
db.createCollection("whatsapp_messages")

// Criar índices para whatsapp_messages
db.whatsapp_messages.createIndex({ "id": 1 }, { unique: true })
db.whatsapp_messages.createIndex({ "user_id": 1 })
db.whatsapp_messages.createIndex({ "status": 1 })
db.whatsapp_messages.createIndex({ "message_type": 1 })
db.whatsapp_messages.createIndex({ "created_at": -1 })

// ============================================
// 4. ATUALIZAR COLLECTION DE USUÁRIOS
// ============================================

// Adicionar novos campos aos usuários existentes (se não existirem)
db.users.updateMany(
  { birthday: { $exists: false } },
  { $set: { birthday: null } }
)

db.users.updateMany(
  { terms_accepted: { $exists: false } },
  { $set: { terms_accepted: false } }
)

db.users.updateMany(
  { terms_accepted_at: { $exists: false } },
  { $set: { terms_accepted_at: null } }
)

db.users.updateMany(
  { last_access_at: { $exists: false } },
  { $set: { last_access_at: null } }
)

// Criar índice para busca de aniversariantes
db.users.createIndex({ "birthday": 1 })
db.users.createIndex({ "last_access_at": 1 })

// ============================================
// 5. CRIAR COLLECTION DE ACESSOS (se não existir)
// ============================================

db.createCollection("user_accesses")
db.user_accesses.createIndex({ "user_id": 1, "accessed_at": -1 })
db.user_accesses.createIndex({ "user_id": 1, "date": -1 })

// ============================================
// VERIFICAR SE TUDO FOI CRIADO
// ============================================

print("\n=== COLLECTIONS CRIADAS ===")
db.getCollectionNames().forEach(function(c) { print(c) })

print("\n=== ÍNDICES timeline_posts ===")
db.timeline_posts.getIndexes().forEach(function(i) { print(JSON.stringify(i.key)) })

print("\n=== ÍNDICES digital_terms ===")
db.digital_terms.getIndexes().forEach(function(i) { print(JSON.stringify(i.key)) })

print("\n=== ÍNDICES whatsapp_config ===")
db.whatsapp_config.getIndexes().forEach(function(i) { print(JSON.stringify(i.key)) })

print("\n=== CONFIGURAÇÃO WHATSAPP ===")
printjson(db.whatsapp_config.findOne({ id: "whatsapp_config" }))

print("\n✅ Setup MongoDB concluído!")
