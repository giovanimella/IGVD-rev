# PRD - Plataforma UniOzoxx

## Problema Original
Desenvolver uma plataforma EAD completa para franquias, com sistema de módulos, capítulos, gamificação, avaliações, certificados e repositório de arquivos digitais.

## Personas
- **Admin**: Gerencia módulos, usuários, badges, desafios, avaliações e certificados
- **Supervisor**: Supervisiona licenciados (dashboard analytics)
- **Licenciado**: Consome conteúdo, realiza avaliações, ganha badges e certificados

## Requisitos Core
1. Sistema de módulos e capítulos com progresso
2. Gamificação (badges, streaks, desafios semanais)
3. Avaliações ao final dos módulos
4. Certificados automáticos ao concluir módulo + avaliação
5. Repositório de arquivos digitais com sistema de pastas
6. Logo customizável da plataforma

## Stack Técnica
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (motor driver)
- **Auth**: JWT tokens
- **PDF**: pdf2image + Pillow + poppler-utils para certificados
- **Email**: Resend (configurado com domínio email.ozoxx.com.br)

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

---

## Credenciais de Teste
- Admin: `admin@ozoxx.com` / `admin123`
- Licenciado: `licenciado.teste@ozoxx.com` / `licenciado123`
