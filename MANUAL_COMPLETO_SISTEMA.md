# MANUAL COMPLETO DO SISTEMA IGVD/OZOXX LMS
## Guia Completo para Tutorial de Usuários

---

# 📚 SUMÁRIO

1. [Visão Geral do Sistema](#visão-geral)
2. [LICENCIADO - Funções e Recursos](#licenciado)
3. [SUPERVISOR - Funções e Recursos](#supervisor)
4. [ADMIN - Funções e Recursos](#admin)
5. [Funcionalidades Comuns](#funcionalidades-comuns)
6. [Fluxos Importantes](#fluxos-importantes)

---

# VISÃO GERAL DO SISTEMA

## O que é o Sistema IGVD/Ozoxx?

Uma plataforma de Learning Management System (LMS) completa para treinamento e gestão de licenciados em vendas diretas. O sistema possui:

- **3 tipos de usuários:** Licenciado, Supervisor e Admin
- **Onboarding estruturado** em 7 etapas
- **Gamificação** com pontos, conquistas e ranking
- **Sistema de avaliações** com certificados
- **Gestão de vendas** e comissões
- **Comunidade social** (timeline)
- **Chat de suporte** integrado

---

# 🎓 LICENCIADO - FUNÇÕES E RECURSOS

## 1. PRIMEIRO ACESSO E ONBOARDING

### 1.1. Fluxo de Registro
**Como o licenciado entra no sistema:**

1. **Recebe email com link de registro**
   - Link único gerado pelo admin ou supervisor
   - Formato: `https://plataforma.com/register/TOKEN`

2. **Preenche dados iniciais**
   - Nome completo
   - Email
   - Telefone
   - Criar senha

3. **Aceita Termos de Uso**
   - Popup automático no primeiro login
   - Obrigatório para continuar

4. **Acessa Dashboard pela primeira vez**
   - Vê barra de progresso do onboarding
   - Sistema indica próxima etapa

### 1.2. Etapas do Onboarding

O onboarding possui **7 etapas obrigatórias**:

#### ETAPA 1: Registro
- **Status:** Definir senha
- **O que fazer:** Verificar email e criar senha
- **Onde:** Email recebido
- **Quando avança:** Após definir senha e fazer primeiro login

#### ETAPA 2: Documentos PF (Pessoa Física)
- **Status:** Upload de documentos pessoais
- **O que fazer:** 
  - Enviar RG ou CNH
  - Enviar CPF
  - Enviar comprovante de residência
- **Onde:** Menu > "Onboarding" ou link na barra de progresso
- **Página:** `/onboarding/documents`
- **Formatos aceitos:** PDF, JPG, PNG
- **Quando avança:** Admin aprova os documentos

#### ETAPA 3: Acolhimento
- **Status:** Completar módulos de acolhimento
- **O que fazer:**
  - Assistir todos os capítulos dos módulos marcados como "Acolhimento"
  - Fazer avaliações (se houver)
  - Obter nota mínima (configurada pelo admin)
- **Onde:** Menu > "Módulos" > Filtro "Acolhimento"
- **Quando avança:** Todos os módulos de acolhimento concluídos com aprovação

#### ETAPA 4: Treinamento Presencial
- **Status:** Participar de treinamento na empresa
- **O que fazer:**
  - Verificar turmas disponíveis
  - Inscrever-se em uma turma
  - Comparecer no dia agendado
- **Onde:** Menu > "Treinamento"
- **Página:** `/training`
- **Quando avança:** Admin confirma presença no treinamento

#### ETAPA 5: Vendas em Campo
- **Status:** Realizar 10 vendas
- **O que fazer:**
  - Cadastrar vendas realizadas
  - Informar dados da venda (valor, cliente, data)
  - Upload de comprovantes
- **Onde:** Menu > "Vendas"
- **Página:** `/sales`
- **Progresso:** Barra mostra X/10 vendas
- **Quando avança:** Atingir 10 vendas aprovadas

#### ETAPA 6: Documentos PJ (Pessoa Jurídica)
- **Status:** Upload de documentos da empresa
- **O que fazer:**
  - Enviar CNPJ
  - Enviar contrato social
  - Outros documentos jurídicos
- **Onde:** Menu > "Onboarding PJ"
- **Página:** `/onboarding/documents-pj`
- **Quando avança:** Admin aprova os documentos

#### ETAPA 7: Completo
- **Status:** Acesso total à plataforma
- **Benefícios:**
  - Acesso a todos os módulos
  - Pode resgatar recompensas
  - Participação em desafios
  - Certificados disponíveis

### 1.3. Barra de Progresso do Onboarding

**Onde aparece:** Dashboard principal

**Elementos visuais:**
- ✅ **Verde com check:** Etapa concluída
- 🔵 **Azul pulsando:** Etapa atual
- 🔒 **Cinza com cadeado:** Etapa bloqueada

**Interação:**
- Clicar na etapa atual leva para a página específica
- Etapas bloqueadas não são clicáveis

---

## 2. DASHBOARD PRINCIPAL

### 2.1. Visão Geral do Dashboard

**Localização:** `/dashboard`

**Seções do Dashboard:**

#### A. Header do Dashboard
- **Foto de perfil** com menu dropdown:
  - Meu Perfil
  - Sair
- **Pontos acumulados**
- **Nível atual** (Iniciante, Intermediário, Avançado, etc.)

#### B. Barra de Progresso do Onboarding
- Mostra etapa atual
- Botão "Continuar" para próxima ação
- Progresso visual em %

#### C. Cards de Estatísticas
1. **Módulos Concluídos**
   - Número de módulos finalizados
   - Total de módulos disponíveis
   - Ícone de livro

2. **Pontos Acumulados**
   - Total de pontos ganhos
   - Ícone de estrela
   - Cor dourada

3. **Minha Posição no Ranking**
   - Posição atual entre todos os licenciados
   - Ícone de troféu
   - Cor variável conforme posição

4. **Certificados Obtidos**
   - Quantidade de certificados conquistados
   - Ícone de diploma
   - Link para ver certificados

#### D. Banners Rotativos
- **Banners informativos** criados pelo admin
- **Comunicados importantes**
- **Promoções e novidades**
- **Navegação:** Setas ou pontos

#### E. Cards de Gamificação (se disponível)
1. **Sequência (Streak)**
   - Dias consecutivos acessando a plataforma
   - Ícone de fogo

2. **Minhas Conquistas**
   - Últimas badges conquistadas
   - Ver todas as conquistas

3. **Desafio da Semana**
   - Desafio atual
   - Progresso do desafio
   - Recompensa

#### F. Atividades Recentes
- Lista das últimas ações:
  - Módulos concluídos
  - Avaliações feitas
  - Certificados obtidos
  - Conquistas desbloqueadas

---

## 3. MÓDULOS DE TREINAMENTO

### 3.1. Listagem de Módulos

**Localização:** Menu > "Módulos" (`/modules`)

**Filtros Disponíveis:**
- **Todos os módulos**
- **Módulos de acolhimento** (para nova pessoa)
- **Módulos regulares**
- **Módulos com certificado**

**Informações de Cada Módulo:**
- Título
- Descrição resumida
- Número de capítulos
- Pontos que oferece
- Badge de "Certificado" (se aplicável)
- Badge de "Acolhimento" (se aplicável)
- Progresso (% concluído)
- Status: "Não iniciado", "Em andamento", "Concluído"

**Ações:**
- Clicar no módulo abre os detalhes

### 3.2. Detalhes do Módulo

**Localização:** `/module/:id`

**Informações Exibidas:**
- Capa do módulo (imagem)
- Título completo
- Descrição detalhada
- Criado por (admin)
- Data de criação
- Pontos de recompensa
- Progresso pessoal

**Lista de Capítulos:**
- Nome do capítulo
- Duração do vídeo
- Status: 
  - ✅ Concluído
  - ▶️ Em andamento
  - 🔒 Bloqueado (se houver sequência obrigatória)

**Botões de Ação:**
- **"Continuar"** - Se já iniciou
- **"Iniciar Módulo"** - Se não iniciou
- **"Fazer Avaliação"** - Após concluir todos os capítulos
- **"Ver Certificado"** - Após aprovação na avaliação

### 3.3. Assistindo Capítulos

**Localização:** `/module/:moduleId/chapter/:chapterId`

**Elementos da Tela:**

#### A. Player de Vídeo
- **Vídeo em HD**
- **Controles:**
  - Play/Pause
  - Barra de progresso
  - Velocidade (0.5x, 1x, 1.5x, 2x)
  - Volume
  - Tela cheia
  - Picture-in-picture

#### B. Informações do Capítulo
- Título do capítulo
- Descrição
- Duração
- Módulo ao qual pertence

#### C. Barra Lateral (Playlist)
- **Lista de todos os capítulos do módulo**
- Capítulo atual destacado
- Status de cada capítulo
- Navegação rápida entre capítulos

#### D. Recursos Adicionais
- **Materiais de Apoio** (se houver):
  - PDFs
  - Apresentações
  - Links externos
  - Downloads

- **Notas Pessoais:**
  - Fazer anotações no timestamp do vídeo
  - Salvar para consulta posterior

#### E. Progresso Automático
- Sistema registra automaticamente:
  - Tempo assistido
  - Percentual do vídeo visto
  - Capítulo marca como concluído ao atingir 90%

#### F. Navegação
- **Botão "Anterior"** - Capítulo anterior
- **Botão "Próximo"** - Próximo capítulo
- **Botão "Voltar ao Módulo"**

### 3.4. Avaliações dos Módulos

**Quando aparece:** Após concluir todos os capítulos

**Localização:** `/module/:moduleId/assessment`

**Tipos de Questões:**
1. **Múltipla escolha** (uma resposta)
2. **Múltipla escolha** (várias respostas)

**Interface da Avaliação:**
- **Header:**
  - Nome da avaliação
  - Número de questões
  - Pontos totais
  - Tempo (se houver limite)

- **Questões:**
  - Numeradas sequencialmente
  - Texto da questão
  - Opções de resposta
  - Navegação entre questões
  - Indicador de questões respondidas

- **Barra de Progresso:**
  - Quantas questões foram respondidas
  - Quantas faltam

**Submissão:**
1. Revisar respostas antes de enviar
2. Botão "Enviar Avaliação"
3. Confirmação obrigatória

**Resultado:**
- **Nota obtida** (%)
- **Status:** Aprovado ou Reprovado
- **Nota mínima necessária**
- **Feedback por questão:**
  - ✅ Corretas em verde
  - ❌ Erradas em vermelho
  - Resposta correta mostrada

**Se Reprovado:**
- Pode refazer a avaliação
- Número de tentativas (configurável)
- Aguardar X horas entre tentativas (se configurado)

**Se Aprovado:**
- **Pontos creditados automaticamente**
- **Certificado liberado** (se módulo tiver)
- **Conquista desbloqueada** (se houver)
- **Progresso do onboarding** atualizado

---

## 4. SISTEMA DE RANKING

### 4.1. Ranking Sidebar (Barra Lateral)

**Onde aparece:** Lado direito da tela (desktop)

**Recursos:**
- **Recolhível:** Clicar na setinha para esconder/mostrar
- **Dois tipos de ranking:**
  1. **⭐ Médias:** Ranking por média de notas nas avaliações
  2. **🏆 Pontos:** Ranking por pontos acumulados

**Alternância de Ranking:**
- Botões no topo: "Médias" e "Pontos"
- Preferência salva automaticamente

**Exibição:**
- **Pódio Top 3:**
  - 🥇 1º lugar: Troféu dourado
  - 🥈 2º lugar: Troféu prateado
  - 🥉 3º lugar: Troféu bronze

- **Lista Top 10:**
  - Posição numerada
  - Avatar do usuário (formato losango)
  - Nome
  - Pontuação ou média

**Informações Mostradas:**
- **Modo Médias:**
  - Média de notas (%)
  - Quantidade de avaliações feitas
  
- **Modo Pontos:**
  - Total de pontos acumulados

**Botão "Ver Ranking Completo":**
- Abre página dedicada com mais detalhes

### 4.2. Página de Ranking Completo

**Localização:** Menu > "Ranking" (`/leaderboard`)

**Recursos:**
- **Filtros:**
  - Por tipo (Médias ou Pontos)
  - Por período (Semanal, Mensal, Anual, Geral)
  
- **Tabela Completa:**
  - Posição
  - Avatar e nome
  - Nível
  - Pontos ou média
  - Total de avaliações
  - Taxa de aprovação

- **Minha Posição:**
  - Card destacado mostrando posição atual
  - Comparação com o líder

- **Gráfico de Evolução:**
  - Sua posição ao longo do tempo
  - Tendência de subida/descida

---

## 5. SISTEMA DE RECOMPENSAS

### 5.1. Loja de Recompensas

**Localização:** Menu > "Recompensas" (`/rewards`)

**Como Funciona:**
- Licenciados acumulam pontos
- Pontos podem ser trocados por recompensas
- Cada recompensa tem custo em pontos

**Tipos de Recompensas:**
1. **Físicas:** Brindes, produtos, vale-compras
2. **Digitais:** Cupons, códigos, cursos extras
3. **Experiências:** Eventos, jantares, viagens

**Interface:**

#### A. Saldo de Pontos
- **Destaque no topo da página**
- Pontos disponíveis
- Pontos em resgate (aguardando aprovação)

#### B. Catálogo de Recompensas
**Cada card mostra:**
- Imagem da recompensa
- Nome
- Descrição curta
- Custo em pontos
- Disponibilidade (estoque)
- Badge "Em destaque" (se aplicável)

**Filtros:**
- Por categoria
- Por custo (menor para maior / maior para menor)
- Disponíveis / Esgotadas

#### C. Detalhes da Recompensa
**Ao clicar em uma recompensa:**
- Imagem maior
- Descrição completa
- Termos e condições
- Validade (se aplicável)
- Prazo de entrega

**Botão de Ação:**
- **"Resgatar"** - Se tem pontos suficientes
- **"Pontos insuficientes"** - Desabilitado

### 5.2. Processo de Resgate

1. **Selecionar Recompensa**
2. **Clicar em "Resgatar"**
3. **Confirmar resgate** (popup)
4. **Informar dados de entrega** (se necessário):
   - Endereço
   - Telefone
   - Observações
5. **Pontos debitados automaticamente**
6. **Status: "Aguardando aprovação do admin"**

### 5.3. Meus Resgates

**Localização:** Aba "Meus Resgates" dentro de Recompensas

**Histórico de Resgates:**
- Data do resgate
- Recompensa
- Pontos gastos
- Status:
  - ⏳ **Pendente:** Aguardando aprovação
  - ✅ **Aprovado:** Em preparação/envio
  - 📦 **Enviado:** A caminho
  - ✅ **Entregue:** Concluído
  - ❌ **Recusado:** Pontos devolvidos

**Ações:**
- Ver detalhes do resgate
- Rastrear envio (se disponível)
- Confirmar recebimento

---

## 6. CERTIFICADOS

### 6.1. Meus Certificados

**Localização:** Menu > "Certificados" (`/certificates`)

**Lista de Certificados:**
- **Certificados obtidos:**
  - Thumbnail do certificado
  - Nome do módulo
  - Data de emissão
  - Nota obtida
  - Código de verificação

**Ações por Certificado:**
- **👁️ Visualizar:** Abre em tela cheia
- **📥 Download PDF:** Salva arquivo
- **🔗 Compartilhar:** Gera link público
- **📧 Enviar por email**

### 6.2. Visualização do Certificado

**Elementos do Certificado:**
- Logo da plataforma
- Título: "Certificado de Conclusão"
- Nome do licenciado
- Nome do módulo
- Carga horária
- Data de emissão
- Nota obtida
- Código de verificação único
- Assinatura digital
- QR Code para verificação

**Recursos:**
- **Zoom in/out**
- **Tela cheia**
- **Compartilhamento direto para redes sociais**

---

## 7. AGENDA DE EVENTOS

### 7.1. Visualização da Agenda

**Localização:** Menu > "Agenda" (`/agenda`)

**Tipos de Eventos:**
1. **Eventos da Empresa** (criados pelo admin)
2. **Treinamentos Presenciais**
3. **Lives e transmissões**
4. **Prazos de atividades**

**Visualizações:**
- **📅 Mês:** Calendário mensal
- **📋 Lista:** Lista de eventos próximos
- **📊 Semana:** Visão semanal

**Informações do Evento:**
- Título
- Data e hora
- Duração
- Local (presencial ou online)
- Descrição
- Criado por
- Status: Confirmado, Pendente, Cancelado

**Ações:**
- **Ver detalhes**
- **Confirmar presença**
- **Adicionar ao calendário** (Google, Outlook)
- **Receber lembrete** (email/WhatsApp)

### 7.2. Eventos da Empresa

**Características:**
- Criados pelo admin
- Podem ser obrigatórios ou opcionais
- Pontos podem ser oferecidos por participação

**Exemplos:**
- Reunião mensal
- Workshop
- Confraternização
- Convenção anual

---

## 8. TREINAMENTO PRESENCIAL

### 8.1. Página de Treinamentos

**Localização:** Menu > "Treinamento" (`/training`)

**Funcionalidade:**
- Ver turmas disponíveis
- Inscrever-se em uma turma
- Acompanhar status da inscrição

**Informações da Turma:**
- Nome do treinamento
- Data e horário
- Local/Endereço
- Instrutor
- Vagas disponíveis
- Carga horária
- Conteúdo programático

**Status da Inscrição:**
- ⏳ **Aguardando:** Inscrição feita, aguardando confirmação
- ✅ **Confirmado:** Presença confirmada
- ❌ **Cancelado:** Inscrição cancelada
- ✅ **Concluído:** Participou e foi registrado

**Após o Treinamento:**
- Admin confirma presença
- Licenciado avança na etapa de onboarding
- Pode receber certificado de participação

---

## 9. GESTÃO DE VENDAS

### 9.1. Cadastro de Vendas

**Localização:** Menu > "Vendas" (`/sales`)

**Objetivo:** Registrar as 10 vendas obrigatórias para avançar no onboarding

**Formulário de Cadastro:**
- **Nome do cliente**
- **CPF/CNPJ**
- **Telefone**
- **Email**
- **Valor da venda**
- **Data da venda**
- **Produto/Serviço vendido**
- **Forma de pagamento**
- **Comprovante** (upload opcional):
  - Foto do contrato
  - Print da transferência
  - Nota fiscal

**Após Cadastrar:**
- Status: "Aguardando validação"
- Admin analisa e aprova/reprova
- Se aprovado: Contador +1
- Se reprovado: Pode cadastrar novamente

**Progresso:**
- Barra visual: "X/10 vendas"
- Lista das vendas cadastradas
- Status de cada venda

### 9.2. Links de Venda

**Localização:** Menu > "Links de Vendas" (`/sales-links`)

**Funcionalidade:**
- Gerar link único de afiliado
- Rastrear vendas via link
- Ver comissões geradas

**Recursos:**
- Link personalizado: `plataforma.com/venda/SEU-ID`
- Copiar link
- Compartilhar em redes sociais
- QR Code do link

**Relatórios:**
- Cliques no link
- Conversões
- Valor em vendas
- Comissão a receber

---

## 10. IGVD CAST (Vídeos de Lives)

### 10.1. Biblioteca de Vídeos

**Localização:** Menu > "IGVD Cast" (`/igvd-cast`)

**O que é:**
- Repositório de lives gravadas
- Palestras e workshops
- Conteúdo exclusivo

**Interface:**
- Grid de vídeos com thumbnails
- Título e descrição
- Duração
- Data de publicação
- Visualizações

**Player:**
- Reprodução em alta qualidade
- Controles completos
- Legendas (se disponível)
- Compartilhamento

---

## 11. COMUNIDADE (TIMELINE)

### 11.1. Feed Social

**Localização:** Menu > "Comunidade" (`/timeline`)

**O que é:**
- Rede social interna
- Compartilhar conquistas
- Interagir com outros licenciados

**Tipos de Posts:**
1. **Texto simples**
2. **Foto + texto**
3. **Conquista automática:**
   - Módulo concluído
   - Certificado obtido
   - Nível alcançado
   - Badge conquistada

**Interações:**
- ❤️ **Curtir**
- 💬 **Comentar**
- 🔄 **Compartilhar**

**Filtros:**
- Todos os posts
- Apenas minhas publicações
- Posts de amigos/seguidos

**Criar Publicação:**
- Campo de texto
- Upload de imagem
- Emoji
- Menção (@usuario)
- Hashtags

**Moderação:**
- Filtro de palavras proibidas (configurado pelo admin)
- Denunciar conteúdo impróprio

---

## 12. REPOSITÓRIO DE ARQUIVOS

### 12.1. Biblioteca de Materiais

**Localização:** Menu > "Arquivos" (`/file-repository`)

**O que é:**
- Central de materiais de apoio
- PDFs, planilhas, apresentações
- Organizados por categoria

**Categorias Típicas:**
- Manuais de vendas
- Apresentações de produtos
- Materiais de marketing
- Formulários e contratos
- Planilhas de controle

**Funcionalidades:**
- **Visualizar online** (se possível)
- **Baixar arquivo**
- **Favoritar** (acesso rápido)
- **Pesquisar** por nome ou categoria

**Interface:**
- Lista ou grid de arquivos
- Ícone conforme tipo (PDF, Excel, etc.)
- Nome do arquivo
- Tamanho
- Data de upload
- Descrição

---

## 13. PERFIL DO USUÁRIO

### 13.1. Minha Conta

**Localização:** Menu dropdown (foto perfil) > "Meu Perfil" (`/profile`)

**Abas do Perfil:**

#### A. Informações Pessoais
- **Foto de perfil:**
  - Upload de nova foto
  - Recorte/ajuste
  - Preview

- **Dados:**
  - Nome completo
  - Email (não editável)
  - Telefone
  - Data de nascimento
  - CPF

- **Endereço:**
  - CEP
  - Rua
  - Número
  - Complemento
  - Bairro
  - Cidade
  - Estado

**Botão:** Salvar Alterações

#### B. Segurança
- **Alterar Senha:**
  - Senha atual
  - Nova senha
  - Confirmar nova senha
  - Regras de senha exibidas

- **Sessões Ativas:**
  - Lista de dispositivos logados
  - Opção de desconectar remotamente

#### C. Preferências
- **Idioma:**
  - Português
  - Inglês
  - Espanhol

- **Tema:**
  - 🌞 Claro
  - 🌙 Escuro
  - 🔄 Automático (sistema)

- **Notificações:**
  - Email: On/Off
  - Push: On/Off
  - WhatsApp: On/Off

- **Privacidade:**
  - Perfil público/privado
  - Mostrar no ranking
  - Permitir menções

#### D. Estatísticas Pessoais
- Total de módulos concluídos
- Total de horas de estudo
- Média de notas
- Pontos acumulados
- Posição no ranking
- Dias de streak
- Conquistas desbloqueadas

#### E. Documentos Enviados
- Lista de documentos no onboarding
- Status de cada documento
- Reenviar se necessário

---

## 14. CHAT DE SUPORTE

### 14.1. Widget de Chat

**Localização:** Ícone flutuante no canto inferior direito

**Como Usar:**
1. Clicar no ícone de chat
2. Digitar mensagem
3. Enviar
4. Aguardar resposta do admin/supervisor

**Recursos:**
- **Histórico de conversas**
- **Status:**
  - 🟢 Online
  - 🟡 Ausente
  - 🔴 Offline

- **Notificações:**
  - Som quando recebe mensagem
  - Badge de mensagens não lidas

- **Anexos:**
  - Enviar imagens
  - Enviar arquivos

**Horário de Atendimento:**
- Exibido no chat
- Configurável pelo admin

---

## 15. FAVORITOS

### 15.1. Conteúdos Favoritos

**Localização:** Menu > "Favoritos" (`/favorites`)

**O que pode ser favoritado:**
- Módulos
- Capítulos
- Arquivos
- Posts da comunidade

**Interface:**
- Lista organizada por tipo
- Acesso rápido ao conteúdo
- Remover dos favoritos

---

## 16. NOTIFICAÇÕES

### 16.1. Central de Notificações

**Localização:** Ícone de sino no header

**Tipos de Notificações:**
- 📚 **Novo módulo disponível**
- 🏆 **Conquista desbloqueada**
- 📜 **Certificado emitido**
- 💬 **Nova mensagem no chat**
- 🎉 **Subiu no ranking**
- ⚠️ **Prazo se aproximando**
- ✅ **Documento aprovado**
- ❌ **Documento reprovado**
- 📅 **Evento próximo**
- 🎁 **Resgate aprovado**

**Ações:**
- Marcar como lida
- Marcar todas como lidas
- Ir para o item relacionado
- Excluir notificação

**Configurações:**
- Ativar/desativar por tipo
- Escolher canal (email, push, whatsapp)

---

# 👨‍💼 SUPERVISOR - FUNÇÕES E RECURSOS

## 1. VISÃO GERAL DO SUPERVISOR

**Papel:** Acompanhar e dar suporte aos licenciados sob sua supervisão

**Permissões:**
- Ver dados de seus licenciados
- Acompanhar progresso
- Ver relatórios
- Atender chat de suporte

**NÃO pode:**
- Criar/editar módulos
- Gerenciar sistema
- Aprovar resgates
- Alterar configurações globais

---

## 2. DASHBOARD DO SUPERVISOR

### 2.1. Dashboard Básico

**Localização:** `/dashboard` (após login)

**Cards de Estatísticas:**
- **Total de Licenciados**
- **Licenciados Ativos** (acessaram nos últimos 7 dias)
- **Licenciados em Onboarding**
- **Média de Conclusão de Módulos**

**Gráficos:**
- Progresso geral dos licenciados
- Taxa de conclusão por módulo
- Evolução mensal

### 2.2. Dashboard Avançado

**Localização:** Menu > "Analytics Avançado" (`/supervisor/advanced`)

**Métricas Detalhadas:**
- Engajamento por licenciado
- Tempo médio de estudo
- Taxa de aprovação em avaliações
- Ranking de performance
- Módulos mais acessados
- Horas de estudo por semana

**Filtros:**
- Por período
- Por licenciado
- Por módulo
- Por etapa de onboarding

---

## 3. GESTÃO DE LICENCIADOS

### 3.1. Lista de Licenciados

**Localização:** Menu > "Meus Licenciados" (`/supervisor/licensees`)

**Visualização:**
- Tabela com todos os licenciados supervisionados
- Foto, nome, email
- Etapa do onboarding
- Progresso geral
- Último acesso
- Status (Ativo/Inativo)

**Filtros:**
- Por etapa de onboarding
- Por status
- Por nome/email

**Pesquisa:**
- Busca por nome ou email

**Ações:**
- Ver detalhes do licenciado
- Enviar mensagem

### 3.2. Detalhes do Licenciado

**Localização:** Clicar em um licenciado > `/supervisor/licensee/:id`

**Informações Exibidas:**

#### A. Perfil
- Foto
- Nome completo
- Email, telefone
- Data de cadastro
- Etapa atual do onboarding

#### B. Progresso Acadêmico
- **Módulos:**
  - Lista de módulos
  - Progresso em cada um
  - Notas obtidas
  - Data de conclusão

- **Avaliações:**
  - Notas
  - Tentativas
  - Taxa de aprovação

- **Certificados:**
  - Quantidade
  - Lista de certificados

#### C. Atividade
- Último acesso
- Dias de streak
- Horas de estudo (total e por período)
- Capítulos assistidos recentemente

#### D. Pontos e Ranking
- Pontos acumulados
- Posição no ranking
- Conquistas desbloqueadas

#### E. Vendas (se na etapa)
- Vendas cadastradas
- Progresso (X/10)
- Status de cada venda

#### F. Comunicação
- Histórico de mensagens
- Enviar nova mensagem

---

## 4. CHAT DE ATENDIMENTO

### 4.1. Painel de Atendimento

**Localização:** Menu > "Atendimento" (`/admin/chat`)

**Funcionalidade:**
- Mesma interface do admin
- Atender licenciados sob sua supervisão
- Ver histórico completo

**Interface:**
- Lista de conversas à esquerda
- Chat à direita
- Indicadores de mensagens não lidas
- Status online/offline

**Recursos:**
- Responder mensagens
- Enviar arquivos
- Histórico completo
- Marcar como resolvido

---

## 5. RELATÓRIOS

### 5.1. Relatórios Disponíveis

**Tipos:**
1. **Relatório de Progresso Geral**
2. **Relatório por Licenciado**
3. **Relatório por Módulo**
4. **Relatório de Engajamento**

**Exportação:**
- PDF
- Excel
- CSV

**Período:**
- Última semana
- Último mês
- Último trimestre
- Personalizado

---

## 6. COMUNIDADE

**Acesso:** Menu > "Comunidade" (`/timeline`)

**Permissões:**
- Ver posts de seus licenciados
- Comentar e curtir
- Publicar mensagens motivacionais

---

# 👨‍💻 ADMIN - FUNÇÕES E RECURSOS

## 1. VISÃO GERAL DO ADMIN

**Papel:** Controle total da plataforma

**Acesso a:**
- Todas as funcionalidades de Supervisor
- Todas as funcionalidades de Licenciado
- Ferramentas administrativas completas
- Configurações do sistema

---

## 2. PAINEL SISTEMA (HUB CENTRAL)

### 2.1. Acesso ao Painel Sistema

**Localização:** Menu > "Painel Sistema" (`/admin/system`)

**Estrutura:** 5 Abas organizadas

---

### ABA 1: GESTÃO

#### 1.1. Usuários
**Página:** `/admin/users`

**Funcionalidades:**

##### A. Criar Novo Usuário
- **Tipos:** Admin, Supervisor, Licenciado
- **Dados obrigatórios:**
  - Nome completo
  - Email
  - Tipo de usuário
  - Senha (pode ser gerada automaticamente)
  
- **Dados opcionais:**
  - Telefone
  - Supervisor responsável (para licenciados)
  - Data de aniversário

##### B. Listar Usuários
- **Filtros:**
  - Por tipo (Admin, Supervisor, Licenciado)
  - Por status (Ativo, Inativo)
  - Por etapa de onboarding (apenas licenciados)

- **Informações exibidas:**
  - Foto
  - Nome
  - Email
  - Tipo
  - Etapa (se licenciado)
  - Data de cadastro
  - Último acesso

- **Pesquisa:** Por nome ou email

##### C. Editar Usuário
- Alterar dados pessoais
- Alterar tipo de usuário
- Resetar senha
- **Alterar etapa do onboarding manualmente** ⭐
  - Útil para resolver problemas
  - Modal com todas as etapas:
    - Registro
    - Documentos PF
    - Acolhimento
    - Treinamento Presencial
    - Vendas em Campo
    - Documentos PJ
    - Completo

##### D. Excluir Usuário
- Exclusão com confirmação
- Dados podem ser arquivados

##### E. Gerar Link de Registro
- Criar link único para novo licenciado
- Link tem validade
- Pode ser enviado por email automaticamente

##### F. Importação em Massa
- Upload de planilha Excel/CSV
- Criar múltiplos usuários de uma vez

#### 1.2. Recompensas
**Página:** `/admin/rewards`

**Funcionalidades:**

##### A. Criar Recompensa
- **Dados:**
  - Nome
  - Descrição
  - Custo em pontos
  - Categoria
  - Imagem
  - Quantidade em estoque
  - Ativa/Inativa
  - Em destaque (sim/não)
  
##### B. Listar Recompensas
- Ver todas as recompensas
- Filtrar por status (Ativa/Inativa)
- Ordenar por custo, nome, data

##### C. Editar Recompensa
- Alterar qualquer informação
- Ajustar estoque
- Ativar/desativar

##### D. Gerenciar Resgates
- **Aba "Solicitações de Resgate"**
- **Status:**
  - ⏳ Pendente
  - ✅ Aprovado
  - 📦 Enviado
  - ✅ Entregue
  - ❌ Recusado

- **Ações:**
  - Aprovar resgate
  - Recusar resgate (devolve pontos)
  - Marcar como enviado
  - Marcar como entregue
  - Ver dados de entrega

##### E. Histórico de Resgates
- Todos os resgates
- Filtros por período, usuário, status

#### 1.3. Atendimento (Chat)
**Página:** `/admin/chat`

**Interface:**
- **Painel esquerdo:** Lista de conversas
  - Nome do usuário
  - Última mensagem
  - Badge de não lidas
  - Timestamp

- **Painel direito:** Chat ativo
  - Histórico completo
  - Campo para digitar
  - Enviar arquivos
  - Emoji

**Recursos:**
- Ver dados do usuário (sidebar)
- Marcar conversa como resolvida
- Filtrar por status (Abertas, Resolvidas, Todas)
- Pesquisar conversas

#### 1.4. Eventos da Empresa
**Página:** `/admin/company-events`

**Funcionalidades:**

##### A. Criar Evento
- **Dados:**
  - Título
  - Descrição
  - Data e hora de início
  - Data e hora de término
  - Local (presencial ou link online)
  - Tipo: Obrigatório/Opcional
  - Pontos oferecidos
  - Banner/imagem

##### B. Listar Eventos
- Calendário mensal
- Lista de próximos eventos
- Eventos passados

##### C. Editar/Excluir Eventos

##### D. Ver Participações
- Quem confirmou presença
- Quem compareceu (marcar manualmente)

#### 1.5. Conquistas (Badges)
**Página:** `/admin/badges`

**Funcionalidades:**

##### A. Criar Conquista
- **Dados:**
  - Nome
  - Descrição
  - Ícone/emoji
  - Pontos oferecidos
  - Critério de desbloqueio:
    - Automático (exemplo: completar X módulos)
    - Manual (admin concede)
  
##### B. Listar Conquistas
- Todas as conquistas criadas
- Quantos usuários desbloquearam

##### C. Conceder Conquista Manualmente
- Selecionar usuário
- Selecionar conquista
- Motivo (opcional)

##### D. Editar/Excluir Conquistas

#### 1.6. Desafios
**Página:** `/admin/challenges`

**Funcionalidades:**

##### A. Criar Desafio
- **Dados:**
  - Nome do desafio
  - Descrição
  - Tipo:
    - Completar X capítulos
    - Obter X pontos
    - Fazer X avaliações
    - Personalizado
  - Meta numérica
  - Período (data início e fim)
  - Recompensa (pontos)

##### B. Listar Desafios
- Desafios ativos
- Desafios finalizados
- Desafios futuros

##### C. Ver Participantes
- Quem está participando
- Progresso de cada um

##### D. Editar/Excluir Desafios

#### 1.7. Certificados
**Página:** `/admin/certificates`

**Funcionalidades:**

##### A. Templates de Certificado
- **Upload de template:**
  - Imagem de fundo
  - Posição dos campos:
    - Nome do usuário
    - Nome do módulo
    - Data
    - Nota
    - Assinatura

- **Editor visual:**
  - Arrastar campos
  - Ajustar fonte
  - Ajustar cores

##### B. Configurar Certificados por Módulo
- Ativar/desativar certificado
- Escolher template
- Requisito mínimo (nota)

##### C. Ver Certificados Emitidos
- Lista de todos os certificados
- Por usuário
- Por módulo
- Download em massa

##### D. Reemitir Certificado
- Caso de erro
- Nova versão

#### 1.8. Treinamentos Presenciais
**Página:** `/admin/training`

**Funcionalidades:**

##### A. Criar Turma
- **Dados:**
  - Nome do treinamento
  - Data e horário
  - Local/Endereço
  - Instrutor
  - Vagas (limite)
  - Carga horária
  - Descrição/Conteúdo programático

##### B. Listar Turmas
- Próximas turmas
- Turmas passadas
- Filtrar por status

##### C. Ver Inscrições
- Lista de inscritos
- Confirmar inscrição
- Cancelar inscrição

##### D. Registrar Presença
- Marcar quem compareceu
- Gera atualização automática na etapa de onboarding

##### E. Gerar Lista de Presença
- Exportar PDF para impressão

#### 1.9. Relatório de Vendas
**Página:** `/admin/sales`

**Funcionalidades:**

##### A. Ver Todas as Vendas Cadastradas
- **Informações:**
  - Licenciado que cadastrou
  - Cliente
  - Valor
  - Data
  - Status (Pendente, Aprovada, Reprovada)
  - Comprovante (se houver)

##### B. Aprovar/Reprovar Vendas
- **Aprovar:**
  - Contador do licenciado +1
  - Pode avançar no onboarding

- **Reprovar:**
  - Motivo obrigatório
  - Licenciado pode cadastrar novamente

##### C. Tipos de Comissão
- **Criar tipos:**
  - Nome (exemplo: "Comissão Padrão")
  - Porcentagem
  - Ativo/Inativo

- **Gerenciar comissões:**
  - Editar porcentagens
  - Ativar/desativar tipos

##### D. Relatórios
- Total de vendas por período
- Total de vendas por licenciado
- Comissões a pagar
- Exportar Excel/PDF

#### 1.10. IGVD Cast
**Página:** `/admin/igvd-cast`

**Funcionalidades:**

##### A. Upload de Vídeo
- **Dois métodos:**
  1. **Upload direto:** Arquivo de vídeo
  2. **Link do YouTube:** Embed

- **Dados:**
  - Título
  - Descrição
  - Thumbnail (imagem de capa)
  - Categoria
  - Data de publicação
  - Ordem de exibição

##### B. Listar Vídeos
- Grid de vídeos
- Ordenar por data, visualizações, título

##### C. Editar/Excluir Vídeos

##### D. Estatísticas
- Total de visualizações
- Vídeos mais assistidos
- Tempo médio de visualização

#### 1.11. Níveis da Plataforma
**Página:** `/admin/levels`

**Funcionalidades:**

##### A. Criar Nível
- **Dados:**
  - Nome do nível (exemplo: "Iniciante", "Avançado")
  - Pontos necessários
  - Ícone/cor
  - Benefícios do nível

##### B. Listar Níveis
- Ordem crescente de pontos
- Ver quantos usuários em cada nível

##### C. Editar/Excluir Níveis

##### D. Definir Critérios Automáticos
- Usuário sobe de nível automaticamente ao atingir pontos

---

### ABA 2: CONFIGURAÇÕES

#### 2.1. Identidade da Plataforma

##### A. Nome da Plataforma
- Campo editável
- Aparece em:
  - Login
  - Emails
  - Certificados
  - Título das páginas

##### B. Logo da Plataforma
- **Upload:**
  - Formato PNG
  - Máximo 10MB
  - Dimensões recomendadas

- **Preview:**
  - Como aparece no login
  - Como aparece no menu lateral

- **Ações:**
  - Alterar logo
  - Remover logo

#### 2.2. Configurações de Avaliação

##### A. Nota Mínima Global
- Define nota mínima para aprovação em todas as avaliações
- Valor em porcentagem (0-100)
- Exemplo: 70% = licenciado precisa acertar 70% das questões

**Onde aplica:**
- Todas as avaliações de módulos
- Pode ser sobrescrito por módulo específico

#### 2.3. Resumo do Sistema

**Estatísticas Exibidas:**
- **Usuários por Função:**
  - Admins
  - Supervisores
  - Licenciados

- **Conteúdo:**
  - Módulos totais
  - Módulos de acolhimento
  - Módulos com certificado

- **Gamificação:**
  - Recompensas ativas
  - Recompensas inativas
  - Resgates pendentes

---

### ABA 3: CONTEÚDO

#### 3.1. Módulos
**Página:** `/admin/modules`

**Funcionalidades:**

##### A. Criar Módulo
- **Dados básicos:**
  - Título
  - Descrição
  - Ordem de exibição
  - Imagem de capa

- **Configurações:**
  - Pontos de recompensa
  - Tem certificado? (Sim/Não)
  - É módulo de acolhimento? (Sim/Não)
  - Tem avaliação? (Sim/Não)
  - Permite reassistir? (Sim/Não)
  
- **Tipo de Módulo:**
  - Padrão (vídeos on-demand)
  - Live (transmissão ao vivo)

- **Live (se aplicável):**
  - Plataforma (YouTube, Twitch)
  - URL da transmissão
  - Data/hora agendada

- **Visibilidade:**
  - Aparece imediatamente
  - Aparece após X meses de cadastro

##### B. Listar Módulos
- Todos os módulos criados
- Ordenar por data, nome, ordem
- Filtrar por tipo (Acolhimento, Regular, Com certificado)

##### C. Editar Módulo
- Alterar qualquer configuração
- Reordenar módulos (drag and drop)

##### D. Excluir Módulo
- Com confirmação
- Verifica se há progresso de usuários

##### E. Gerenciar Capítulos
**Ao clicar em "Capítulos" no módulo:**

**Página:** `/admin/module/:moduleId/chapters`

**Criar Capítulo:**
- **Dados:**
  - Título
  - Descrição
  - Ordem
  - Duração (minutos)
  - **Upload de vídeo** ou **URL do vídeo**
  - Thumbnail

**Listar Capítulos:**
- Todos os capítulos do módulo
- Reordenar (drag and drop)
- Editar/excluir

##### F. Criar Avaliação
**Página:** `/admin/module/:moduleId/assessment`

**Estrutura:**
- Título da avaliação
- Descrição
- Nota mínima (pode sobrescrever nota global)

**Adicionar Questões:**
- **Tipo de questão:**
  1. Múltipla escolha (uma resposta)
  2. Múltipla escolha (várias respostas)

- **Dados da questão:**
  - Enunciado
  - Pontuação
  - Opções de resposta (mínimo 2)
  - Marcar resposta(s) correta(s)
  - Ordem da questão

**Gerenciar Questões:**
- Listar todas as questões
- Editar questão
- Excluir questão
- Reordenar questões

#### 3.2. Repositório de Arquivos
**Página:** `/admin/files`

**Funcionalidades:**

##### A. Upload de Arquivo
- **Tipos aceitos:**
  - PDF
  - Word (.doc, .docx)
  - Excel (.xls, .xlsx)
  - PowerPoint (.ppt, .pptx)
  - Imagens (.jpg, .png)
  - ZIP

- **Dados:**
  - Nome do arquivo
  - Descrição
  - Categoria
  - Tags (para busca)
  - Permissões (todos os licenciados ou específicos)

##### B. Organização
- **Categorias:**
  - Criar categorias
  - Atribuir arquivos

- **Pastas:**
  - Estrutura de pastas
  - Mover arquivos

##### C. Gerenciamento
- Listar todos os arquivos
- Buscar por nome, categoria, tag
- Editar informações
- Excluir arquivo
- Download

##### D. Estatísticas
- Downloads por arquivo
- Arquivos mais baixados

#### 3.3. Landing Page
**Página:** `/admin/landing-page`

**Funcionalidades:**

##### A. Seção Hero (Topo)
- **Título principal**
- **Subtítulo**
- **Imagem de fundo**
- **Botão de CTA** (Call to Action):
  - Texto do botão
  - Link de destino

##### B. Seção Sobre
- **Título**
- **Texto descritivo**
- **Imagem**

##### C. Seção Recursos/Benefícios
- **Adicionar cards:**
  - Ícone
  - Título
  - Descrição

##### D. Seção Depoimentos
- **Adicionar depoimentos:**
  - Nome
  - Cargo
  - Foto
  - Texto do depoimento
  - Avaliação (estrelas)

##### E. Seção Contato/CTA Final
- **Título**
- **Subtítulo**
- **Botão**
- **Imagem**

##### F. Rodapé
- **Links sociais**
- **Informações da empresa**
- **Links úteis**

**Preview:**
- Ver como está ficando em tempo real
- Modo desktop/mobile

**Publicar:**
- Salvar alterações
- Publicar ao vivo

#### 3.4. Banners
**Página:** `/admin/banners`

**Funcionalidades:**

##### A. Criar Banner
- **Upload de imagem:**
  - Dimensões recomendadas
  - Formato JPG/PNG

- **Dados:**
  - Título (alt text)
  - Link de destino (opcional)
  - Ordem de exibição
  - Data de início
  - Data de fim (opcional)
  - Ativo/Inativo

##### B. Listar Banners
- Ver todos os banners
- Ordenar (drag and drop)
- Ver status (Ativo, Agendado, Expirado)

##### C. Editar/Excluir Banners

**Exibição:**
- Banners aparecem no dashboard dos licenciados
- Rotação automática (carousel)

#### 3.5. Comunicados
**Página:** `/admin/posts`

**Funcionalidades:**

##### A. Criar Comunicado
- **Título**
- **Conteúdo** (editor rich text):
  - Negrito, itálico
  - Listas
  - Links
  - Imagens

- **Tipo:**
  - Informativo
  - Urgente
  - Promoção

- **Destinatários:**
  - Todos
  - Apenas licenciados
  - Licenciados em etapa específica

- **Agendamento:**
  - Publicar agora
  - Agendar para data/hora

- **Anexos:**
  - Upload de arquivos relacionados

##### B. Listar Comunicados
- Todos os comunicados
- Filtrar por status (Publicado, Rascunho, Agendado)
- Ordenar por data

##### C. Editar/Excluir Comunicados

##### D. Estatísticas
- Quantos visualizaram
- Taxa de abertura

**Exibição:**
- Comunicados aparecem no dashboard
- Notificação push/email (opcional)

#### 3.6. Termos de Aceite
**Página:** `/admin/terms`

**Funcionalidades:**

##### A. Criar/Editar Termos
- **Título:** "Termos de Uso e Política de Privacidade"
- **Conteúdo:** Editor rich text
- **Versão:** Controle de versões
- **Data de vigência**

##### B. Configurações
- **Obrigatório no primeiro acesso?** (Sim/Não)
- **Exigir aceite após atualização?** (Sim/Não)

##### C. Histórico de Aceites
- Quem aceitou
- Quando aceitou
- Versão aceita

##### D. Relatório
- Usuários que aceitaram
- Usuários pendentes

---

### ABA 4: INTEGRAÇÕES

#### 4.1. WhatsApp (Evolution API)
**Página:** `/admin/whatsapp`

**Funcionalidades:**

##### A. Configuração da API
- **URL da API**
- **API Key**
- **Instância do WhatsApp**
- **Status:** Conectado/Desconectado

**Testar Conexão:**
- Botão para verificar se está funcionando

##### B. Notificações Automáticas
**Configurar envios automáticos:**

1. **Aniversariantes:**
   - Enviar mensagem no aniversário
   - Template de mensagem
   - Horário de envio

2. **Novo Módulo Disponível:**
   - Notificar quando novo módulo é publicado
   - Template de mensagem

3. **Certificado Emitido:**
   - Notificar quando receber certificado
   - Incluir link para download

4. **Resgate Aprovado:**
   - Notificar aprovação de resgate
   - Detalhes da recompensa

5. **Evento Próximo:**
   - Lembrete X dias antes do evento

6. **Documentos Reprovados:**
   - Notificar motivo da reprovação

##### C. Templates de Mensagens
- Criar templates personalizados
- Variáveis dinâmicas:
  - {nome}
  - {modulo}
  - {pontos}
  - {data}
  - {evento}

##### D. Logs de Envio
- Histórico de mensagens enviadas
- Status (Enviado, Erro, Lido)
- Filtrar por tipo, usuário, data

#### 4.2. Pagamentos (MercadoPago)
**Página:** `/admin/payment-settings`

**Funcionalidades:**

##### A. Credenciais
- **Public Key**
- **Access Token**
- **Modo:** Teste/Produção

**Testar Conexão:**
- Verificar se credenciais estão corretas

##### B. Configurações
- **Ativar pagamentos?** (Sim/Não)
- **Valor da taxa de licenciamento**
- **Parcelamento:**
  - Número máximo de parcelas
  - Juros por parcela

##### C. Histórico de Pagamentos
- Todos os pagamentos realizados
- Status (Pendente, Aprovado, Recusado)
- Filtrar por usuário, data, status

##### D. Conciliação
- Pagamentos aprovados
- Pagamentos pendentes
- Estornos

#### 4.3. Webhooks

##### A. Webhook de Entrada
**Receber Licenciados de Sistemas Externos**

**Endpoint:** `POST /api/webhook/licensee`

**Autenticação:**
- Header: `X-API-Key`
- Valor: API Key gerada pelo sistema

**Gerar API Key:**
- Botão "Gerar Nova Key"
- Copiar chave
- Salvar configuração

**Payload Esperado:**
```json
{
  "full_name": "Nome Completo",
  "email": "email@example.com",
  "phone": "11999999999",
  "cpf": "12345678900"
}
```

**Ações:**
- Cria usuário automaticamente
- Envia email de boas-vindas
- Inicia no onboarding (etapa Registro)

##### B. Webhook de Saída
**Notificar Quando Onboarding Completo**

**Configuração:**
- **URL de Destino:** Para onde enviar
- **Habilitar/Desabilitar**
- **Eventos:**
  - Onboarding completo
  - Módulo concluído (opcional)
  - Certificado emitido (opcional)

**Payload Enviado:**
```json
{
  "event": "onboarding_completed",
  "timestamp": "2026-02-06T12:00:00Z",
  "data": {
    "id": "user-123",
    "full_name": "Nome do Licenciado",
    "email": "email@example.com"
  }
}
```

**Testar Webhook:**
- Botão para enviar payload de teste

##### C. Logs de Webhooks
**Histórico de webhooks:**
- **Tipo:** Entrada ou Saída
- **Evento**
- **Data/hora**
- **Status:** Sucesso ou Erro
- **Payload completo**
- **Resposta recebida**

**Filtros:**
- Por tipo
- Por status
- Por período

**Ações:**
- Ver detalhes
- Reenviar (se erro)

---

### ABA 5: SEGURANÇA

#### 5.1. Filtro de Palavras Proibidas
**Página:** `/admin/banned-words`

**Funcionalidades:**

##### A. Adicionar Palavra
- Campo de texto
- Adicionar à lista
- Confirmar

##### B. Lista de Palavras
- Todas as palavras bloqueadas
- Ordenar alfabeticamente
- Pesquisar palavra

##### C. Editar/Excluir Palavras
- Editar palavra
- Remover da lista

##### D. Configurações
- **Onde aplicar:**
  - ✅ Comentários na comunidade
  - ✅ Posts na timeline
  - ✅ Chat de suporte
  - ✅ Mensagens privadas

- **Ação ao detectar:**
  - Bloquear envio (com aviso)
  - Enviar para moderação
  - Substituir por asteriscos (****)

##### E. Logs de Bloqueios
- Histórico de mensagens bloqueadas
- Usuário que tentou enviar
- Palavra detectada
- Data/hora
- Contexto (onde tentou postar)

**Importante:**
- Atualizar lista regularmente
- Comum em português: palavrões, ofensas, spam

---

## 3. DASHBOARD DO ADMIN

### 3.1. Visão Geral

**Localização:** `/dashboard` (após login como admin)

**Cards de Estatísticas:**
- **Total de Licenciados**
- **Módulos Disponíveis**
- **Recompensas Ativas**
- **Resgates Pendentes**

**Gráficos:**
- **Distribuição por Etapa de Onboarding:**
  - Pizza ou barras
  - Quantos em cada etapa

- **Novos Cadastros (Últimos 30 dias):**
  - Linha do tempo

- **Módulos Mais Acessados:**
  - Top 10

- **Taxa de Conclusão:**
  - Porcentagem geral

**Ações Rápidas:**
- Criar novo usuário
- Criar novo módulo
- Ver resgates pendentes
- Ver mensagens de suporte

---

## 4. OUTRAS FUNCIONALIDADES ADMIN

### 4.1. Comunidade (Timeline)
**Localização:** Menu > "Comunidade" (`/timeline`)

**Permissões do Admin:**
- Ver todos os posts
- Comentar e curtir
- **Deletar posts** impróprios
- **Suspender usuários** (temporário ou permanente)

### 4.2. Relatórios Avançados

**Tipos de Relatórios:**
1. **Relatório Geral de Usuários:**
   - Todos os usuários cadastrados
   - Campos personalizáveis
   - Exportar Excel/PDF

2. **Relatório de Progresso Acadêmico:**
   - Módulos concluídos por usuário
   - Notas obtidas
   - Certificados emitidos

3. **Relatório de Engajamento:**
   - Logins por período
   - Tempo médio na plataforma
   - Taxa de retorno

4. **Relatório Financeiro:**
   - Pagamentos recebidos
   - Comissões a pagar
   - Resgates aprovados (valor em reais)

5. **Relatório de Onboarding:**
   - Tempo médio por etapa
   - Taxa de conclusão
   - Gargalos identificados

**Agendamento de Relatórios:**
- Enviar por email automaticamente
- Periodicidade (diário, semanal, mensal)

---

# 🔄 FUNCIONALIDADES COMUNS A TODOS

## 1. Sistema de Temas

**Localização:** Ícone no header (sol/lua)

**Opções:**
- ☀️ **Modo Claro**
- 🌙 **Modo Escuro**
- 🔄 **Automático** (segue sistema operacional)

**Persistência:**
- Preferência salva no navegador
- Mantém entre sessões

---

## 2. Sistema de Idiomas

**Localização:** Ícone de bandeira no header

**Idiomas Disponíveis:**
- 🇧🇷 Português (Brasil)
- 🇺🇸 Inglês
- 🇪🇸 Espanhol

**Abrangência:**
- Toda interface traduzida
- Emails em idioma escolhido
- Certificados no idioma

---

## 3. Notificações

### 3.1. Sino de Notificações

**Localização:** Ícone de sino no header

**Badge:** Número de notificações não lidas

**Ao clicar:**
- Dropdown com últimas 10 notificações
- Link "Ver todas"

### 3.2. Central de Notificações

**Página:** `/notifications`

**Tipos:**
- Sistema
- Acadêmicas
- Sociais (timeline)
- Administrativas

**Ações:**
- Marcar como lida
- Marcar todas como lidas
- Filtrar por tipo
- Excluir

---

## 4. Busca Global

**Localização:** Barra de busca no header

**O que busca:**
- Módulos
- Capítulos
- Usuários (admin/supervisor)
- Arquivos
- Posts da comunidade

**Resultados:**
- Separados por categoria
- Link direto para o item

---

## 5. Menu Dropdown do Perfil

**Localização:** Canto superior direito (foto do usuário)

**Opções:**
- 👤 **Meu Perfil** - Ir para página de perfil
- 🚪 **Sair** - Fazer logout (redireciona para landing page)

---

# 📋 FLUXOS IMPORTANTES

## FLUXO 1: ONBOARDING COMPLETO DE UM LICENCIADO

1. **Admin cria usuário** ou gera link de registro
2. **Licenciado recebe email** com link
3. **Preenche dados** e cria senha
4. **Primeiro login** - Aceita termos de uso
5. **Dashboard** - Vê barra de progresso (Etapa: Registro)
6. **Documentos PF:**
   - Acessa página de documentos
   - Faz upload de RG, CPF, comprovante
   - Aguarda aprovação do admin
7. **Admin aprova documentos**
8. **Licenciado avança** - Etapa: Acolhimento
9. **Acolhimento:**
   - Acessa módulos marcados como "Acolhimento"
   - Assiste todos os capítulos
   - Faz avaliações
   - Obtém nota mínima
10. **Automaticamente avança** - Etapa: Treinamento Presencial
11. **Treinamento:**
    - Vê turmas disponíveis
    - Inscreve-se em uma
    - Comparece no dia
    - Admin marca presença
12. **Avança** - Etapa: Vendas em Campo
13. **Vendas:**
    - Cadastra vendas realizadas (até 10)
    - Admin aprova cada venda
    - Ao atingir 10, avança automaticamente
14. **Etapa: Documentos PJ**
    - Upload de CNPJ e documentos PJ
    - Admin aprova
15. **Etapa: Completo**
    - Acesso total à plataforma
    - Pode resgatar recompensas
    - Participa de desafios

---

## FLUXO 2: CRIAÇÃO DE UM MÓDULO COMPLETO

1. **Admin acessa** "Módulos"
2. **Clica** "Criar Novo Módulo"
3. **Preenche dados:**
   - Título, descrição
   - Upload de capa
   - Define pontos
   - Marca se é acolhimento
   - Ativa certificado
4. **Salva módulo**
5. **Clica** "Gerenciar Capítulos"
6. **Adiciona capítulos:**
   - Título, descrição
   - Upload de vídeo ou URL
   - Define ordem
7. **Cria avaliação** (se necessário):
   - Título e descrição da avaliação
   - Adiciona questões:
     - Múltipla escolha
     - Define pontos por questão
     - Marca respostas corretas
8. **Configura certificado** (se ativado):
   - Escolhe template
   - Define nota mínima para emissão
9. **Publica módulo**
10. **Licenciados recebem notificação** de novo módulo

---

## FLUXO 3: RESGATE DE RECOMPENSA

1. **Licenciado acumula pontos** (completando módulos, desafios)
2. **Acessa** "Recompensas"
3. **Navega pelo catálogo**
4. **Escolhe recompensa** com pontos suficientes
5. **Clica** "Resgatar"
6. **Confirma resgate** no popup
7. **Informa dados de entrega** (se necessário)
8. **Pontos debitados** automaticamente
9. **Status:** "Aguardando aprovação"
10. **Admin recebe notificação**
11. **Admin acessa** "Recompensas" > Aba "Resgates"
12. **Admin analisa resgate:**
    - Verifica dados
    - Aprova ou recusa
13. **Se aprovado:**
    - Status: "Aprovado"
    - Admin processa envio
    - Marca como "Enviado"
    - Licenciado recebe notificação
14. **Licenciado recebe** recompensa
15. **Confirma recebimento** no sistema
16. **Status final:** "Entregue"

---

## FLUXO 4: CHAT DE SUPORTE

1. **Licenciado tem dúvida**
2. **Clica** no ícone de chat (canto inferior direito)
3. **Digita mensagem**
4. **Envia**
5. **Admin/Supervisor recebe notificação**
6. **Acessa** "Atendimento"
7. **Seleciona conversa** do licenciado
8. **Responde dúvida**
9. **Licenciado recebe notificação**
10. **Vê resposta** no chat
11. **Pode continuar conversando**
12. **Quando resolvido:**
    - Admin marca como "Resolvido"
    - Conversa arquivada

---

# 📱 RECURSOS TÉCNICOS

## Responsividade
- **Desktop:** Interface completa
- **Tablet:** Adaptado, sidebar recolhível
- **Mobile:** Menu hambúrguer, layout otimizado

## Performance
- **Lazy loading:** Carrega conteúdo sob demanda
- **Cache:** Reduz requisições
- **Otimização de imagens**

## Segurança
- **Autenticação JWT**
- **Senhas criptografadas** (bcrypt)
- **HTTPS obrigatório**
- **Proteção CSRF**
- **Rate limiting** (limite de requisições)

## Integrações
- **MercadoPago:** Pagamentos
- **WhatsApp (Evolution API):** Notificações
- **YouTube/Twitch:** Lives
- **Google Calendar:** Eventos

---

# 🎯 DICAS PARA O TUTORIAL

## Para Licenciados:
1. Comece pelo **onboarding** - é o caminho natural
2. Destaque a **barra de progresso** - guia visual claro
3. Mostre como **ganhar pontos** - gamificação engaja
4. Explique **ranking** - competição saudável motiva
5. Demonstre **resgates** - recompensas tangíveis

## Para Supervisores:
1. Foco em **acompanhamento** de licenciados
2. Como usar **relatórios** para identificar problemas
3. **Chat de suporte** - responder rápido
4. **Dashboard** - visão geral da equipe

## Para Admins:
1. **Painel Sistema** é o hub central - explorar todas as abas
2. Criar **módulos** passo a passo
3. Configurar **recompensas** - estoque e aprovações
4. Gerenciar **etapas manualmente** quando necessário
5. **Integrações** - WhatsApp e webhooks para automação

---

# ✅ CHECKLIST DE FUNCIONALIDADES

## Licenciado:
- [ ] Login e primeiro acesso
- [ ] Onboarding (7 etapas)
- [ ] Assistir módulos
- [ ] Fazer avaliações
- [ ] Obter certificados
- [ ] Ranking (médias e pontos)
- [ ] Resgatar recompensas
- [ ] Agenda de eventos
- [ ] Treinamento presencial
- [ ] Cadastrar vendas
- [ ] IGVD Cast
- [ ] Comunidade (timeline)
- [ ] Arquivos
- [ ] Chat de suporte
- [ ] Perfil

## Supervisor:
- [ ] Dashboard de supervisão
- [ ] Lista de licenciados
- [ ] Detalhes de cada licenciado
- [ ] Relatórios
- [ ] Chat de atendimento
- [ ] Comunidade

## Admin:
- [ ] Painel Sistema (5 abas)
- [ ] Gestão de usuários
- [ ] Criação de módulos
- [ ] Gerenciamento de recompensas
- [ ] Aprovação de resgates
- [ ] Chat de atendimento
- [ ] Eventos da empresa
- [ ] Conquistas e desafios
- [ ] Certificados
- [ ] Treinamentos presenciais
- [ ] Relatório de vendas
- [ ] IGVD Cast (admin)
- [ ] Níveis da plataforma
- [ ] Configurações gerais
- [ ] Landing page
- [ ] Banners
- [ ] Comunicados
- [ ] Termos de aceite
- [ ] WhatsApp
- [ ] Pagamentos
- [ ] Webhooks
- [ ] Filtro de palavras

---

**FIM DO MANUAL COMPLETO** 🎉

Este documento contém TODAS as funcionalidades do sistema organizadas por tipo de usuário, prontas para você criar seu tutorial completo!
