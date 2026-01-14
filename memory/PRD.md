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
- **PDF**: pdf2image + Pillow para certificados

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
- Ícones e cores customizáveis

### Fase 5: Reports & Analytics 🔜 PRÓXIMA
- Dashboard analítico para supervisores
- Engajamento por módulo
- Heatmaps de estudo
- Exportação de relatórios

### Fase 6: Favoritos 📋 BACKLOG
- Licenciados podem favoritar capítulos
- Página "Meus Favoritos"

---

## Arquitetura

```
/app/
├── backend/
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── module_routes.py
│   │   ├── gamification_routes.py
│   │   ├── assessment_routes.py
│   │   ├── certificate_routes.py
│   │   ├── file_routes.py (pastas e arquivos)
│   │   └── system_routes.py
│   ├── models.py
│   └── server.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── AdminBadges.js
│       │   │   ├── AdminChallenges.js
│       │   │   ├── AdminAssessment.js
│       │   │   ├── AdminCertificates.js
│       │   │   └── AdminFiles.js
│       │   ├── Dashboard.js
│       │   ├── ModuleDetail.js
│       │   ├── ModuleAssessment.js
│       │   ├── MyCertificates.js
│       │   └── FileRepository.js
│       └── App.js
└── tests/
    └── test_folder_system.py
```

## Collections MongoDB
- users, modules, chapters, progress
- badges, user_badges, weekly_challenges, user_streaks
- assessments, assessment_results
- certificates, system_configs
- file_folders, file_repository

## Credenciais de Teste
- Admin: `admin@ozoxx.com` / `admin123`
- Licenciado: `licenciado.teste@ozoxx.com` / `licenciado123`

## Verificações Pendentes
- Certificados: aguardando confirmação do usuário com template real
