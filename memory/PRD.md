# PRD - Plataforma EAD Ozoxx

## Problema Original
Desenvolver uma plataforma EAD completa para franquias, com sistema de módulos, capítulos, gamificação, avaliações, certificados e repositório de arquivos digitais.

## Personas
- **Admin**: Gerencia módulos, usuários, badges, desafios, avaliações e certificados
- **Supervisor**: Supervisiona licenciados (futuro: dashboard analytics)
- **Licenciado**: Consome conteúdo, realiza avaliações, ganha badges e certificados

## Requisitos Core
1. Sistema de módulos e capítulos com progresso
2. Gamificação (badges, streaks, desafios semanais)
3. Avaliações ao final dos módulos
4. Certificados automáticos ao concluir módulo + avaliação
5. Repositório de arquivos digitais com sistema de pastas

## Stack Técnica
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (motor driver)
- **Auth**: JWT tokens
- **PDF**: pdf2image + Pillow + poppler-utils para certificados
- **Email**: Resend (requer configuração de API key)

---

## Fases de Desenvolvimento

### Fase 1: Gamificação ✅ COMPLETA
- Badges e conquistas
- Sistema de pontos
- Streaks de acesso diário
- Desafios semanais

### Fase 2: Avaliações ✅ COMPLETA
- Quiz ao final de cada módulo
- Perguntas de múltipla escolha
- Score mínimo global configurável
- Resultados salvos

### Fase 3: Certificados ✅ COMPLETA
- Template PDF configurável pelo admin
- Geração automática com nome, data e módulo
- Posição Y configurável para cada campo
- Método robusto: PDF → Imagem → Overlay → PDF

### Fase 4: Sistema de Pastas ✅ COMPLETA (14/01/2026)
- CRUD de pastas (admin only)
- Upload de arquivos para pastas específicas
- Mover arquivos entre pastas
- Visualização por accordion no licenciado

### Fase 5: Reports & Analytics ✅ COMPLETA (14/01/2026)
- Dashboard analítico para supervisores/admin
- Engajamento por módulo
- Heatmaps de estudo
- Progresso detalhado de licenciados
- Exportação CSV

### Fase 6: Foto de Perfil ✅ COMPLETA (14/01/2026)
- Upload de foto pelo usuário
- Redimensionamento automático (200x200)
- Exibição no header, sidebar e perfil
- Fallback com iniciais

### Fase 7: Sistema de Favoritos ✅ COMPLETA (14/01/2026)
- Botão de favoritar nos capítulos
- Página "Meus Favoritos"
- Toggle favorito (adiciona/remove)

---

## Melhorias Implementadas (14/01/2026)

### Admin - Gerenciamento de Usuários
- Campo de senha ao criar/editar usuário
- Sistema de importação CSV/XLSX restaurado
- Modelo de importação para download

### Correções de Bugs
- URL de uploads corrigida para funcionar com proxy externo
- Instalado poppler-utils para geração de certificados

---

## Configurações Pendentes

### Email (Resend)
- Sistema implementado mas precisa de API key real
- Arquivo: `/app/backend/.env`
- Variável: `RESEND_API_KEY`

---

## Credenciais de Teste
- Admin: `admin@ozoxx.com` / `admin123`
- Licenciado: `licenciado.teste@ozoxx.com` / `licenciado123`
