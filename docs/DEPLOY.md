# Guia de deploy — Azure App Services (containers) via GitHub Actions + GHCR

Este guia descreve como o `ms-dashboard` (portal + BFF do Módulo 6) é publicado na nuvem, e como
um colega pode reproduzir o deploy em uma **cópia própria**.

O deploy é **automático**: a cada push na `main`, o pipeline de CI/CD
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) executa lint → testes → verificação
de dependências → **build das imagens Docker** → **push no GitHub Container Registry (GHCR)** →
**deploy em dois Azure App Services (containers)**.

> Pré-requisitos: contas no GitHub e no Azure (ex.: Azure for Students com e-mail acadêmico).
> **Não é preciso ter Docker na máquina** — o pipeline constrói as imagens na nuvem.

---

## Arquitetura

| Serviço | O que é | Porta do container |
|---------|---------|:------------------:|
| BFF (FastAPI) | API que agrega os dados | **8006** |
| Portal (React/nginx) | Interface que o usuário abre | **80** |

O portal conversa com o BFF pela internet. Por isso o portal precisa ser **buildado** com a URL
pública do BFF (`VITE_API_BASE_URL`), e o BFF precisa liberar o domínio do portal no `CORS_ORIGINS`.

---

## Etapa 1 — Copiar o código para o seu GitHub

Faça um **fork** do repositório, ou clone e envie para um repositório seu. O arquivo
`.github/workflows/ci.yml` vai junto.

## Etapa 2 — Publicar as imagens no GHCR (primeira execução do pipeline)

1. Faça um push na `main` (ou use **Actions ▸ Re-run**). O job `build-images` publica as imagens
   `.../bff` e `.../web` no GHCR.
2. Em `https://github.com/<seu-usuario>?tab=packages`, abra cada pacote →
   **Package settings ▸ Change visibility ▸ Public**. (O Azure precisa puxar imagens públicas.)

## Etapa 3 — Criar os dois App Services no Azure

No portal do Azure, **Create a resource ▸ Web App**, para cada serviço:

**BFF**
- **Publish:** Container · **OS:** Linux
- **Name:** ex. `ms-dashboard-bff-SEUNOME`
- Aba **Container**:
  - Image Source: **Other container registries** · Access Type: **Public**
  - Registry server URL: `https://ghcr.io`
  - Image and tag: `SEU-USUARIO/SEU-REPO/bff:latest` (tudo minúsculo)
  - **Port: `8006`**  ← crítico (o BFF escuta nessa porta)

**Portal**
- Igual, mudando:
  - Image and tag: `SEU-USUARIO/SEU-REPO/web:latest`
  - **Port: `80`**

> ⚠️ **A porta é o erro mais comum.** Se deixar a porta padrão (80) no BFF, o container não sobe
> e o site responde `503`. BFF = 8006, portal = 80.

## Etapa 4 — Variáveis de ambiente de cada App Service

Em **Settings ▸ Environment variables**:

**BFF:**
| Nome | Valor |
|------|-------|
| `WEBSITES_PORT` | `8006` |
| `USE_MOCKS` | `true` |
| `ENABLE_DEV_LOGIN` | `true` |
| `JWT_SECRET` | (texto aleatório longo) |
| `CORS_ORIGINS` | a URL **real** do portal (ver abaixo) |

**Portal:**
| Nome | Valor |
|------|-------|
| `WEBSITES_PORT` | `80` |

> **URL real com sufixo:** o Azure gera URLs como
> `https://<app>-<hash>.<regiao>-01.azurewebsites.net` (ex.:
> `https://ms-dashboard-web-heloisa-g0eqdmgufyb4dtd5.brazilsouth-01.azurewebsites.net`). Pegue a
> URL exata em **Overview ▸ Default domain** de cada App Service.

## Etapa 5 — Apontar o pipeline para as URLs reais

No `.github/workflows/ci.yml`, no job `build-images`, ajuste:

```yaml
    env:
      BFF_URL: https://<app-bff>-<hash>.<regiao>-01.azurewebsites.net
      WEB_URL: https://<app-web>-<hash>.<regiao>-01.azurewebsites.net
```

E confirme os `app-name` no job `deploy` (o nome curto do recurso, sem o sufixo).

## Etapa 6 — Cadastrar os Secrets no GitHub

1. Em cada App Service: **Overview ▸ Download publish profile** (um XML). Se o download estiver
   bloqueado com *"Basic authentication is disabled"*, ligue a **Basic Auth Publishing** em
   **Settings ▸ Configuration** e tente de novo.
2. No GitHub: **Settings ▸ Secrets and variables ▸ Actions ▸ New repository secret**:
   - `AZURE_WEBAPP_PUBLISH_PROFILE_BFF` → XML do BFF
   - `AZURE_WEBAPP_PUBLISH_PROFILE_WEB` → XML do portal

> Se você **recriar** um App Service, o publish profile muda — baixe e **atualize o secret**.

## Etapa 7 — Disparar o deploy e validar

1. Faça um push na `main` (ou **Re-run** o último workflow).
2. Aguarde os jobs ficarem verdes e o Azure puxar as imagens (alguns minutos no primeiro boot).
3. Confirme:
   - `https://<bff>/health` → `{"status":"ok"}`
   - abra o portal, clique em **Entrar como Product Owner** → o Dashboard deve abrir.

---

## Variáveis de build (lembrete)

`VITE_API_BASE_URL` é lida em **tempo de build** do portal (o Vite "assa" a URL no JavaScript).
O pipeline injeta esse valor como build-arg a partir de `BFF_URL`. Mudar a URL do BFF exige
**rebuild** da imagem do portal (um novo push resolve).

## Integração com os outros módulos

Quando `ms-notifications`, `ms-chat` e os Módulos 1 e 2 estiverem publicados, troque nas
variáveis do BFF: `USE_MOCKS=false` e as URLs `NOTIFICATIONS_URL`, `CHAT_URL`, `BACKLOG_URL`,
`GITHUB_URL`. Nenhuma mudança de código é necessária.

## Testar localmente (opcional, requer Docker)

```bash
docker compose up --build
# portal: http://localhost:8080   | BFF: http://localhost:8006
```
