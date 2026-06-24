# Stack

Dev infrastructure (Postgres + Keycloak) for two setups from **one**
`docker-compose.yml`:

- **Portless (parallel):** one dedicated stack per checkout, routing to local
  backend/frontend processes via [portless](https://github.com/vercel-labs/portless).
  Multiple branches run side by side without collisions.
  → Full guide: [docs/how-to/portless-parallel-development.md](../docs/how-to/portless-parallel-development.md).
- **Local (single-origin):** a single nginx on `:8080` as the only entry point,
  bundling frontend, `/api` and Keycloak (`/auth`) under one origin (see below).

## Start — Portless (parallel)

```bash
npm --prefix scripts install        # once per checkout: installs portless
npm --prefix scripts run dev        # bring up the stack + all backends/frontend via portless
npm --prefix scripts run dev:down   # stop Compose (portless processes via Ctrl-C in dev)
```

Each branch gets its own URLs (`http://app.<slug>.localhost:1355`, …) and its own
stack on hash-derived ports. How this works (routing, branch isolation, approach
comparison, test users) is documented in
[docs/how-to/portless-parallel-development.md](../docs/how-to/portless-parallel-development.md).

## Directory structure

```
stack/
├── keycloak/       # Realm configuration (keycloak-config-cli)
└── docker-compose.yml
```

## Local single-origin mode (nginx, without portless)

If you don't work in parallel, start the infra including **nginx** and the services
directly — without `dev.sh`'s branch-derived env. Backend and frontend run on the host (e.g. via the
IntelliJ run configs); nginx proxies them together with Keycloak under `:8080`:

```bash
cd stack && docker compose --profile solo up -d   # Postgres + Keycloak + nginx
SPRING_PROFILES_ACTIVE=dev ./gradlew :services:shop:shop-backend:bootRun
npm --prefix services/shop/shop-frontend run dev  # Vite on :5173
# then open: http://localhost:8080
```

> Important: **`--profile solo`** — without the profile nginx does not start (so it
> stays off in portless mode). Open the app at **`http://localhost:8080`**, not
> `:5173` and not directly on Keycloak.

Routing (everything under one origin `http://localhost:8080`):

| Path                         | Target                                |
|------------------------------|---------------------------------------|
| `/`                          | Frontend (Vite, host `:5173`)         |
| `/api/...`                   | shop-backend (host `:8081`)           |
| `/auth/realms/miravelo`      | Keycloak (realm, issuer)              |
| `/auth/admin`                | Keycloak Admin (admin/admin)          |

Keycloak is additionally reachable directly at `http://localhost:8088/auth` (its own
host port, since nginx occupies `:8080`). Logging in as `alice`/`test` goes through
the app on `:8080`.

Without env vars set, the `docker-compose.yml` defaults apply (project
`miravelo-local`, Postgres `5432`, Keycloak admin `8088`, nginx `8080`,
`KC_HOSTNAME=http://localhost:8080/auth`, `KC_HTTP_RELATIVE_PATH=/auth`,
redirect/origin `http://localhost:8080`) — matching `application-dev.yml`
(`ISSUER_URI=http://localhost:8080/auth/realms/miravelo`, shop `:8081`).

`dev.sh up` overrides the same variables with the branch-specific
portless values (Keycloak under root path `/`, dedicated host names instead of
`/auth`), and starts **without** `--profile solo`, so nginx never runs there.
