# Plano de implementação — MVP do `ms-dashboard` (Módulo 6)

Tarefas de codificação incrementais e testáveis. Cada item constrói sobre o anterior e
referencia os requisitos de `requirements.md`. Execute na ordem; cada tarefa deve terminar com
o código compilando e os testes relacionados passando.

- [ ] 1. Esqueleto do monorepo (front-end + BFF)
  - Criar `backend/` com `pyproject.toml` (FastAPI, uvicorn, httpx, pydantic v2,
    pydantic-settings, python-jose, pytest, pytest-asyncio) e `app/main.py` + `core/config.py`
    (Settings via env: `USE_MOCKS`, URLs dos serviços, JWT, timeouts).
  - Criar `frontend/` com Vite + React + TS + Tailwind + Recharts; aplicar os tokens da steering
    `design-system.md` em `index.css` e `tailwind.config.ts`.
  - _Requisitos: 1.4, 7.6, 8.1, 9.1_

- [ ] 2. Infra transversal do BFF: logging, erros, health
  - [ ] 2.1 Logs JSON com `correlation_id` via middleware. _Requisitos: 7.2_
  - [ ] 2.2 Handlers de erro padronizados (401/403/422/503/500 sem stack trace). _Requisitos: 7.3_
  - [ ] 2.3 `GET /health` e `GET /ready` (readiness reflete só o BFF, não os downstreams) + teste.
    _Requisitos: 7.1_

- [ ] 3. Autenticação e repasse de identidade
  - [ ] 3.1 `core/security.py`: validar JWT (chave de env), extrair `user_id`/`role`/
    `project_ids`; `get_current_user`, `require_role`, `downstream_headers`. _Requisitos: 2.1, 2.2, 2.3, 2.5_
  - [ ] 3.2 Rota de modo dev `GET /api/bff/dev/tokens` (só em `APP_ENV=development`) para PO/PM/Dev.
    _Requisitos: 2.4_
  - [ ] 3.3 Testes: token válido/expirado/ausente → 200/401; papel errado → 403. _Requisitos: 2.2, 2.5_

- [ ] 4. Camada de resiliência (base da degradação graciosa)
  - [ ] 4.1 `core/resilience.py`: `guarded_call` com timeout + circuit breaker simples por chave +
    cache (TTL) da última resposta válida; `UpstreamUnavailable`. _Requisitos: 6.1, 6.2_
  - [ ] 4.2 Testes: sucesso popula cache; falha com cache → `stale=true`; falha sem cache →
    `UpstreamUnavailable`; breaker abre após N falhas. _Requisitos: 6.1, 6.2_

- [ ] 5. Clients upstream (Protocol + mock + HTTP)
  - [ ] 5.1 `clients/base.py` + `BacklogClient`/`GithubClient` (Protocol) com impl mock
    determinística e esqueleto HTTP; seleção por `USE_MOCKS`. _Requisitos: 4.2_
  - [ ] 5.2 `NotificationsClient` (list/unread_count/mark_read/mark_all_read/ws_source) com mock
    que emite exemplos de cada `source` e todas as prioridades. _Requisitos: 3.1, 3.3, 3.5_
  - [ ] 5.3 `ChatClient` (history/post/ws_source) com mock em memória por projeto. _Requisitos: 5.2, 5.3_

- [ ] 6. Dashboard — agregador e rota (BFF)
  - [ ] 6.1 `dashboard/aggregator.py`: monta cards independentes via `guarded_call`
    (commits/semana, PRs abertos, reviews pendentes, User Stories por status) + série semanal.
    _Requisitos: 4.1, 4.3, 4.4_
  - [ ] 6.2 Router `GET /api/bff/dashboard?project_id=...`. _Requisitos: 4.1_
  - [ ] 6.3 Testes: client falhando → card `unavailable`, demais OK; cache serve resposta anterior.
    _Requisitos: 4.3, 4.4_

- [ ] 7. Notificações — proxy REST + bridge WS (BFF)
  - [ ] 7.1 `notifications/service.py` + router REST: listar (filtros priority/source/status),
    unread-count, marcar lida, marcar todas; estado `unavailable` quando o upstream cai.
    _Requisitos: 3.1, 3.5, 3.6_
  - [ ] 7.2 `WsBridge` + WS `/ws/notifications` autenticado, repassando `notification.new` e
    `unread_count` do upstream/mock. _Requisitos: 3.3_
  - [ ] 7.3 Testes: listagem/filtros, marcar lida, upstream fora → `unavailable`. _Requisitos: 3.1, 3.5, 3.6_

- [ ] 8. Chat — proxy REST + bridge WS (BFF)
  - [ ] 8.1 `chat/service.py` + router: histórico por projeto e envio de texto, restrito aos
    projetos do token; estado `unavailable` quando o upstream cai. _Requisitos: 5.1, 5.2, 5.4, 5.5_
  - [ ] 8.2 WS `/ws/chat?project_id=...` autenticado via bridge. _Requisitos: 5.3_
  - [ ] 8.3 Testes: histórico ao entrar; acesso negado a projeto fora do token; upstream fora →
    `unavailable`. _Requisitos: 5.1, 5.2, 5.4_

- [ ] 9. Front-end — base: tema, auth, apiClient, WS
  - [ ] 9.1 `ThemeProvider` (claro/escuro via `data-theme`) + `AppShell`/`Navbar` responsivos,
    só com classes de token. _Requisitos: 1.1, 1.2, 1.3, 8.1, 8.5_
  - [ ] 9.2 `auth/` (armazenar token, dev-login consumindo `/api/bff/dev/tokens`) + `apiClient`
    que injeta `Authorization` e trata 401. _Requisitos: 2.1, 2.4_
  - [ ] 9.3 `useWebSocket` com reconexão por backoff exponencial e refetch REST ao reconectar.
    _Requisitos: 3.4, 6.3_

- [ ] 10. Front-end — Notificações
  - [ ] 10.1 `NotificationCard` (borda esquerda 4px na cor da prioridade, selo, origem
    ícone+rótulo, título, resumo, horário relativo) e `UnavailableState`. _Requisitos: 3.2, 3.6, 8.2, 8.3_
  - [ ] 10.2 `NotificationCenter`: sino + contador + feed com filtros + toasts em tempo real via WS.
    _Requisitos: 3.1, 3.3, 3.5_
  - [ ] 10.3 Testes de componente: prioridade→cor e estado indisponível. _Requisitos: 3.2, 3.6_

- [ ] 11. Front-end — Dashboard
  - [ ] 11.1 `MetricCard` (número com `.metric`/`tabular-nums`) + `WeeklyChart` (Recharts,
    `--chart-1..5`), com `UnavailableState` por card. _Requisitos: 4.1, 4.3, 4.5, 4.6_
  - [ ] 11.2 Tela `Dashboard` consumindo `GET /api/bff/dashboard`. _Requisitos: 4.1, 4.3_

- [ ] 12. Front-end — Chat
  - [ ] 12.1 `ChatRoom` (seleção de sala por projeto, `MessageList`, `Composer`) com envio e
    recebimento em tempo real; `UnavailableState` quando o chat cai. _Requisitos: 5.1, 5.3, 5.4_

- [ ] 13. Operação, mocks de demo e documentação
  - [ ] 13.1 `docker-compose.yml` subindo front-end + BFF com um comando; `.env.example`.
    _Requisitos: 7.4_
  - [ ] 13.2 Modo/seed de mocks (`USE_MOCKS=true`) que simula notificações de cada `source`,
    métricas e chat, para demo ponta a ponta sem os outros grupos. _Requisitos: 7.5_
  - [ ] 13.3 Garantir OpenAPI do BFF em `/docs`. _Requisitos: 7.6_
  - [ ] 13.4 README do repositório: execução, variáveis de ambiente, contratos consumidos dos
    outros serviços e diagrama da arquitetura do `ms-dashboard`. _Requisitos: 9.3_
