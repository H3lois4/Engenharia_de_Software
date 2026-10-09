# Requisitos — MVP do `ms-dashboard` (Módulo 6)

## Introdução

Este repositório é o **`ms-dashboard`**: o **portal web central** do Módulo 6 (Dashboard,
Central de Notificações e Comunicação) da plataforma acadêmica de microsserviços **Assistente
Inteligente de Engenharia de Software**, e o **BFF (Backend for Frontend)** que agrega as
métricas e dados dos demais serviços.

O Módulo 6 é dividido em três serviços independentes (ver README):

| Serviço | Responsabilidade | Este repo? |
|---------|------------------|:----------:|
| `ms-dashboard` | **Portal web (frontend) + BFF agregador** | ✅ |
| `ms-notifications` | Recebe eventos, prioriza com IA, entrega notificações | ❌ (consumido) |
| `ms-chat` | Chat em tempo real entre membros | ❌ (consumido) |

**Escopo deste repositório:** renderizar o portal (sino de notificações, feed, toasts em
tempo real, dashboard de métricas e UI do chat) e expor um BFF que consome e agrega os serviços
downstream. **Fora do escopo deste repositório:** ingestão de eventos, priorização por IA e
persistência de notificações (são do `ms-notifications`); a lógica de persistência/entrega do
chat (é do `ms-chat`). Este serviço apenas **consome** essas APIs.

O requisito transversal e obrigatório da disciplina continua valendo: **a falha de um ou mais
microsserviços não pode deixar o sistema inteiro indisponível.** Para o `ms-dashboard` isso
significa: quando um serviço downstream (notificações, chat, Módulo 1 ou 2) está fora do ar, o
portal continua carregando e apenas a área correspondente mostra o estado "indisponível no
momento".

### Perfis de usuário
- **Product Owner (PO)**
- **Gerente de Projetos / Scrum Master (PM)**
- **Desenvolvedor (Dev)**

### Decisões de arquitetura confirmadas com o usuário
- **BFF em FastAPI** (Python 3.12), mantendo a stack unificada da turma, o mesmo padrão de JWT
  e OpenAPI automático.
- **Clients com interface + implementação mock**, selecionáveis por `USE_MOCKS=true`, para que o
  portal rode e seja demonstrado ponta a ponta antes dos serviços reais subirem.
- O front-end é **React + TypeScript + Vite + Tailwind + Recharts**, seguindo
  `.kiro/steering/design-system.md`.

### Contratos consumidos (propostos; alinhar com os outros grupos)
- `ms-notifications`: `GET /api/v1/notifications` (paginado, filtros), `GET
  /notifications/unread-count`, `PATCH /notifications/{id}`, `POST /notifications/read-all`;
  WebSocket `/ws/notifications`.
- `ms-chat`: histórico por sala/projeto + WebSocket de mensagens.
- Módulo 1 (Auth/Backlog) e Módulo 2 (GitHub): métricas do projeto.

### Fora do escopo do MVP (próximos passos)
- Preferências de notificação, e-mail/push, agrupamento/digest, snooze, feedback de relevância
  (pertencem ao `ms-notifications`).
- Anexos, edição, reações e busca no histórico do chat (pertencem ao `ms-chat`).
- Autenticação/emissão de token (é do Módulo 1); aqui apenas validamos/repassamos o JWT.

---

## Requisitos

### Requisito 1 — Portal web e layout central

**História de usuário:** Como usuário da plataforma, quero um portal central com navegação
para notificações, dashboard e chat, para acessar tudo do Módulo 6 em um só lugar.

#### Critérios de aceite
1. O sistema DEVE apresentar um layout central (navbar + área de conteúdo) com acesso às três
   áreas: Dashboard, Notificações e Chat.
2. O sistema DEVE suportar modo claro e escuro alternáveis via `data-theme`, aplicando os
   tokens da steering `design-system.md`.
3. O sistema DEVE ser responsivo (desktop e mobile) e manter contraste WCAG AA em texto sobre
   fundos neutros.
4. A interface NÃO DEVE usar hex direto nos componentes; DEVE usar as CSS variables / classes
   Tailwind mapeadas dos tokens.

### Requisito 2 — Autenticação e sessão

**História de usuário:** Como usuário, quero entrar com o token emitido pelo Módulo 1 e ter o
portal reconhecendo meu papel e meus projetos, para ver apenas o que me pertence.

#### Critérios de aceite
1. QUANDO o portal recebe um JWT (emitido pelo Módulo 1), o front-end DEVE armazená-lo e
   enviá-lo em `Authorization: Bearer` nas chamadas ao BFF.
2. O BFF DEVE validar o JWT com o segredo/chave pública em variável de ambiente e extrair
   `user_id`, `role` e `project_ids`; QUANDO ausente/expirado/inválido, DEVE responder `401`.
3. O BFF DEVE repassar a identidade do usuário aos serviços downstream (encaminhando o token ou
   um token de serviço, conforme o contrato acordado).
4. O sistema DEVE oferecer um modo de desenvolvimento que gera tokens de teste para os três
   perfis (PO, PM, Dev), para uso local sem o Módulo 1 no ar.
5. QUANDO o usuário acessa uma área restrita ao papel (ex.: métricas de PO/PM), o BFF DEVE
   responder `403` se o papel não permitir.

### Requisito 3 — Notificações no portal (consumo do `ms-notifications`)

**História de usuário:** Como usuário, quero ver minhas notificações priorizadas no portal e em
tempo real, para agir rápido sem recarregar a página.

#### Critérios de aceite
1. O sistema DEVE exibir um sino com contador de não lidas e um feed de notificações com
   filtros por prioridade, origem e status de leitura.
2. Cada card de notificação DEVE ter borda esquerda de 4px na cor da prioridade, selo de
   prioridade, origem com ícone + rótulo, título, resumo e horário relativo (conforme
   `design-system.md`). A cor indica prioridade; o ícone/rótulo indicam a origem.
3. QUANDO o `ms-notifications` emite uma nova notificação pelo WebSocket, o portal DEVE exibi-la
   (feed + toast) e atualizar o contador em tempo real.
4. SE a conexão WebSocket cair, o front-end DEVE reconectar com backoff exponencial e recuperar
   o que perdeu via REST, sem duplicatas.
5. O sistema DEVE permitir marcar uma notificação como lida e marcar todas como lidas,
   refletindo a mudança no `ms-notifications`.
6. SE o `ms-notifications` estiver indisponível, ENTÃO o portal DEVE exibir "notificações
   indisponíveis no momento" sem quebrar o restante do portal.

### Requisito 4 — Dashboard de métricas (BFF agregador)

**História de usuário:** Como PO/PM/Dev, quero ver as métricas do projeto em um dashboard, para
acompanhar o andamento mesmo quando algum serviço de origem está fora do ar.

#### Critérios de aceite
1. O sistema DEVE exibir cards com: commits na semana, PRs abertos, reviews pendentes e User
   Stories por status, além de um gráfico de PRs/commits por semana.
2. O BFF DEVE obter esses dados dos Módulos 1 e 2 por meio de clients com interface definida;
   QUANDO `USE_MOCKS=true`, DEVE usar implementações mock determinísticas.
3. SE um serviço de origem estiver indisponível, ENTÃO apenas o card correspondente DEVE exibir
   "indisponível no momento" e o restante do dashboard DEVE continuar funcionando.
4. As chamadas do BFF aos serviços externos DEVEM ter timeout e um circuit breaker simples, e o
   BFF DEVE servir a última resposta válida em cache quando a chamada falhar.
5. Todo número que se atualiza no dashboard DEVE usar `font-variant-numeric: tabular-nums`.
6. Os gráficos DEVEM usar as cores `--chart-1..5` na ordem, nunca cores de prioridade.

### Requisito 5 — Chat no portal (consumo do `ms-chat`)

**História de usuário:** Como membro da equipe, quero conversar em tempo real com meus colegas
por projeto dentro do portal, para me comunicar sem sair da plataforma.

#### Critérios de aceite
1. O sistema DEVE listar as salas por projeto, restritas aos projetos presentes no token do
   usuário.
2. QUANDO o usuário entra em uma sala, o portal DEVE exibir as últimas N mensagens do histórico
   obtido do `ms-chat`.
3. QUANDO o usuário envia uma mensagem de texto, o portal DEVE encaminhá-la ao `ms-chat` e
   exibir, em tempo real, as mensagens dos participantes conectados.
4. SE o `ms-chat` estiver indisponível, ENTÃO a área de chat DEVE exibir "chat indisponível no
   momento" sem quebrar o restante do portal.
5. O MVP DEVE suportar apenas mensagens de texto (sem anexos, edição ou reações).

### Requisito 6 — Resiliência do BFF (degradação graciosa)

**História de usuário:** Como responsável pela operação, quero que o portal continue útil mesmo
com serviços downstream fora do ar, para atender ao critério de robustez da disciplina.

#### Critérios de aceite
1. O BFF DEVE aplicar timeout, circuit breaker simples e cache da última resposta válida em
   todas as chamadas a serviços externos (Módulos 1/2, `ms-notifications`, `ms-chat`).
2. QUANDO um serviço downstream falha, o BFF NÃO DEVE propagar erro que derrube a página; DEVE
   responder com um estado parcial que o front-end traduz em "indisponível no momento" apenas
   na área afetada.
3. O WebSocket de notificações/chat consumido pelo portal DEVE tolerar quedas do upstream e
   permitir reconexão sem travar a UI.

### Requisito 7 — Robustez e operação

**História de usuário:** Como responsável pela operação, quero health checks, logs estruturados
e um ambiente reprodutível, para operar e demonstrar o portal com segurança.

#### Critérios de aceite
1. O BFF DEVE expor `GET /health` (liveness) e `GET /ready` (readiness).
2. O BFF DEVE emitir logs estruturados em JSON com um `correlation_id` por requisição.
3. QUANDO ocorre um erro, o BFF DEVE responder em formato padronizado e NÃO DEVE expor stack
   trace.
4. O sistema DEVE fornecer um `docker-compose.yml` que sobe front-end e BFF com um único
   comando (e serviços auxiliares apenas se necessários ao BFF).
5. O sistema DEVE fornecer um modo/seed de mocks que simula respostas dos serviços downstream,
   para demonstrar o portal ponta a ponta sem os outros grupos no ar.
6. O BFF DEVE gerar documentação OpenAPI automaticamente das rotas que expõe ao front-end.

### Requisito 8 — Identidade visual

**História de usuário:** Como usuário, quero uma interface consistente, acessível e alinhada à
identidade da plataforma, para entender a urgência dos alertas de imediato.

#### Critérios de aceite
1. O front-end DEVE usar os tokens de `.kiro/steering/design-system.md` como CSS variables +
   `theme.extend` do Tailwind, sem hex direto nos componentes.
2. A cor DEVE indicar prioridade; a origem DEVE ser indicada por ícone + rótulo. O vermelho DEVE
   ser exclusivo de alertas críticos; ações primárias DEVEM usar o azul-marinho.
3. Laranja e verde DEVEM aparecer apenas em bordas, ícones e selos em negrito, nunca em texto
   corrido.
4. A interface DEVE usar Inter (pesos 400/500/600; escala 12/14/16/20/24/32px) e JetBrains Mono
   apenas para código, branches e hashes.
5. O sistema DEVE suportar modo claro e escuro e layout responsivo com contraste WCAG AA.

### Requisito 9 — Qualidade e organização do código

**História de usuário:** Como integrante do grupo, quero o código organizado e testado, para
atender aos critérios de qualidade da disciplina e facilitar a integração.

#### Critérios de aceite
1. O BFF DEVE ser organizado em camadas (rotas → serviços → clients) com tipagem completa; o
   front-end DEVE separar componentes, hooks e clients de API.
2. O sistema DEVE ter testes automatizados cobrindo no mínimo: degradação graciosa dos clients
   do BFF (serviço fora → card/área indisponível, cache serve resposta anterior), agregação de
   métricas e as rotas do BFF; e testes de componente do front-end para prioridade→cor e estado
   de indisponibilidade.
3. O repositório DEVE conter um `README` com execução, variáveis de ambiente (`.env.example`),
   os contratos consumidos dos outros serviços e um diagrama simples da arquitetura.
4. Os commits DEVEM ser pequenos e descritivos (Conventional Commits).
