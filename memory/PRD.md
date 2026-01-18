# PRD - Plataforma UniOzoxx

## Problema Original
Desenvolver uma plataforma EAD completa para franquias, com sistema de módulos, capítulos, gamificação, avaliações, certificados e repositório de arquivos digitais.

## Personas
- **Admin**: Gerencia módulos, usuários, badges, desafios, avaliações e certificados
- **Supervisor**: Supervisiona licenciados (dashboard analytics), visualiza documentos e agenda dos licenciados
- **Licenciado**: Consome conteúdo, realiza avaliações, ganha badges e certificados, gerencia agenda

## Requisitos Core
1. Sistema de módulos e capítulos com progresso
2. Gamificação (badges, streaks, desafios semanais)
3. Avaliações ao final dos módulos
4. Certificados automáticos ao concluir módulo + avaliação
5. Repositório de arquivos digitais com sistema de pastas
6. Logo customizável da plataforma
7. Sistema de webhooks para integração externa
8. Onboarding com documentos PF e PJ separados
9. Sistema de Agenda para licenciados

## Stack Técnica
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (motor driver)
- **Auth**: JWT tokens
- **PDF**: pdf2image + Pillow + poppler-utils para certificados
- **Email**: Resend (configurado com domínio email.ozoxx.com.br)
- **Webhooks**: httpx para requisições assíncronas

---

## Fases de Desenvolvimento - TODAS COMPLETAS ✅

### Fase 1: Gamificação ✅
- Badges e conquistas
- Sistema de pontos
- Streaks de acesso diário
- Desafios semanais

### Fase 2: Avaliações ✅
- Quiz ao final de cada módulo
- Perguntas de múltipla escolha
- Score mínimo global configurável
- Resultados salvos

### Fase 3: Certificados ✅
- Template PDF configurável pelo admin
- Geração automática com nome, data e módulo
- Posição Y configurável para cada campo

### Fase 4: Sistema de Pastas ✅
- CRUD de pastas (admin only)
- Upload de arquivos para pastas específicas
- Mover arquivos entre pastas
- Visualização por accordion no licenciado

### Fase 5: Reports & Analytics ✅
- Dashboard analítico para supervisores/admin
- Engajamento por módulo
- Heatmaps de estudo
- Progresso detalhado de licenciados
- Exportação CSV

### Fase 6: Foto de Perfil ✅
- Upload de foto pelo usuário
- Redimensionamento automático (200x200)
- Exibição no header, sidebar e perfil

### Fase 7: Sistema de Favoritos ✅
- Botão de favoritar nos capítulos
- Página "Meus Favoritos"
- Toggle favorito (adiciona/remove)

### Fase 8: Branding UniOzoxx ✅ (14/01/2026)
- Renomeado para UniOzoxx em toda plataforma
- Sistema de upload de logo (PNG, max 10MB)
- Logo exibida em: Login, Sidebar, onde conveniente
- Removido texto "Plataforma de Treinamento para Franquias"

### Fase 9: Sistema de Webhooks ✅ (16/01/2026)
- Webhook inbound para criação de usuários via API externa
- Webhook outbound para notificar conclusão de onboarding
- Configuração via Painel Sistema (URL, API Key)

### Fase 10: Reestruturação do Onboarding ✅ (17/01/2026)
- Separação de documentos em duas etapas: PF (Pessoa Física) e PJ (Pessoa Jurídica)
- Documentos PF: RG, CPF, Comprovante de Residência
- Documentos PJ: Cartão CNPJ, Contrato Social
- Barra de progresso com 9 etapas
- Aba "Documentos" na página de detalhes do licenciado (supervisor/admin)
- Visualização de documentos PF e PJ pelo supervisor/admin

### Fase 11: Sistema de Agenda ✅ (17/01/2026)
- Página de agenda com calendário mensal interativo
- CRUD completo de compromissos
- Categorias: Visita a Cliente, Reunião, Treinamento, Lembrete, Outro
- Campos: Título, Data, Hora, Categoria, Duração (livre), Observações
- Widget no Dashboard mostrando compromissos de hoje e próximos 3 dias
- Supervisor/Admin pode visualizar agenda do licenciado (aba "Agenda")
- Navegação por mês no calendário
- Indicadores visuais de compromissos nos dias do calendário

---

## Fluxo de Onboarding Atual (7 Etapas) - ATUALIZADO 18/01/2026

1. **Registro** - Cadastro inicial via link do supervisor
2. **Docs PF** - Envio de RG, CPF, Comprovante de Residência
3. **Acolhimento** - Primeiros treinamentos (módulos de acolhimento)
4. **Treinamento Presencial** - Inscrição, pagamento e participação no treinamento presencial
5. **Vendas** - 10 vendas em campo
6. **Docs PJ** - Envio de Cartão CNPJ, Contrato Social
7. **Completo** - Acesso total à plataforma

**Nota**: Etapa de "Pagamento de Taxa de Licença" e "Agendamento" foram removidas/incorporadas.

---

## Melhorias Admin (14/01/2026)

- Campo de senha ao criar/editar usuário
- Sistema de importação CSV/XLSX com modelo
- Upload de logo da plataforma no Painel Sistema

---

## Configurações Atuais

### Email (Resend) ✅ CONFIGURADO
- Chave API: Configurada
- Domínio: email.ozoxx.com.br
- Remetente: noreply@email.ozoxx.com.br

### Certificados ✅ FUNCIONANDO
- poppler-utils instalado
- Geração de PDF funcionando

### Webhooks ✅ CONFIGURADO
- Inbound: POST /api/webhooks/users/create (requer X-API-Key)
- Outbound: Notifica URL configurada quando onboarding é concluído

---

## Credenciais de Teste
- Admin: `admin@ozoxx.com` / `admin123`
- Licenciado: `licenciado.teste@ozoxx.com` / `licenciado123`

---

## APIs de Documentos

### Documentos PF
- `POST /api/onboarding/documents/pf/{document_type}` - Upload (rg, cpf, comprovante_residencia)
- `GET /api/onboarding/documents/pf` - Lista documentos PF do usuário

### Documentos PJ
- `POST /api/onboarding/documents/pj/{document_type}` - Upload (cartao_cnpj, contrato_social)
- `GET /api/onboarding/documents/pj` - Lista documentos PJ do usuário

### Supervisor/Admin
- `GET /api/onboarding/supervisor/licensee/{user_id}/documents` - Visualiza documentos de um licenciado

---

## APIs de Agenda

### Licenciado
- `POST /api/appointments/` - Criar compromisso
- `GET /api/appointments/` - Listar todos os compromissos
- `GET /api/appointments/upcoming` - Compromissos de hoje + 3 dias
- `GET /api/appointments/month/{year}/{month}` - Compromissos do mês
- `GET /api/appointments/{id}` - Detalhes de um compromisso
- `PUT /api/appointments/{id}` - Atualizar compromisso
- `DELETE /api/appointments/{id}` - Excluir compromisso

### Supervisor/Admin
- `GET /api/appointments/supervisor/licensee/{user_id}` - Todos compromissos do licenciado
- `GET /api/appointments/supervisor/licensee/{user_id}/month/{year}/{month}` - Compromissos do mês
