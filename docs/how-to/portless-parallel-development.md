# 🛣️ Portless Parallel-Dev: running multiple branches at once

AI is shifting the bottleneck of software development. Code now appears faster than
ever — several features in parallel, each in its own worktree. What slows things down
afterwards is no longer the writing, but **review and testing**: before a branch gets
merged, you want to *see it running*.

This is exactly where a technical obstacle used to sit: **port conflicts.** Two
checkouts of the same project both want Postgres on `5432`, Keycloak on `8080`, the
backend on `8081`, and Vite on `5173`. The moment you tried to start two variants at
once — one to test, one to keep building — everything collided.

**Portless solves this testing bottleneck.** Every worktree gets its own, fully
isolated stack and unique URLs. You can run as many variants of the project in
parallel as you like — one per branch — and try them out side by side without
anything getting in each other's way.

> This document covers the **portless mode** (parallel dev). If you only work on a
> *single* branch, the simpler single-origin mode (nginx on `:8080`) is the better
> fit — see [`stack/README.md`](../../stack/README.md).

## 🚀 Quick start

```bash
npm --prefix scripts install        # once per checkout: installs portless
npm --prefix scripts run dev        # bring up the stack + all backends/frontend via portless
npm --prefix scripts run dev:down   # stop Compose (portless processes via Ctrl-C in dev)
```

`dev:down` stops the current branch's stack and additionally cleans up orphaned
`miravelo-*` stacks whose Compose file no longer exists (e.g. deleted worktrees).
Stacks of live worktrees (Compose file still present) keep running — that is exactly
what makes parallel dev possible.

## 🌐 Entry points

Each branch gets its own URLs. `$BRANCH_SLUG` is derived from
`git rev-parse --abbrev-ref HEAD` (lowercased, `/` and `_` replaced with `-` —
e.g. `spike-keycloak-portless`).

| URL                                              | Target                       |
|--------------------------------------------------|------------------------------|
| `http://app.${BRANCH_SLUG}.localhost:1355`       | Frontend (Vite)              |
| `http://shop.${BRANCH_SLUG}.localhost:1355`      | shop-backend                 |
| `http://delivery.${BRANCH_SLUG}.localhost:1355`  | delivery-backend             |
| `http://warehouse.${BRANCH_SLUG}.localhost:1355` | warehouse-backend            |
| `http://auth.${BRANCH_SLUG}.localhost:1355`      | Keycloak                     |
| `http://auth.${BRANCH_SLUG}.localhost/admin`     | Keycloak Admin (admin/admin) |

Postgres is not reachable through portless (no HTTP) — connect directly on
`localhost:${POSTGRES_PORT}` (see the `dev-env.sh` output on startup).

### Test users (realm: miravelo)

| User       | Password | Roles           |
|------------|----------|-----------------|
| alice      | test     | CUSTOMER        |
| bob        | test     | CUSTOMER        |
| shopkeeper | test     | CUSTOMER, ADMIN |

## ⚙️ How portless works

[portless](https://github.com/vercel-labs/portless) is a local reverse proxy that
occupies **one** port (`1355`) and routes to local processes based on the host name.
`*.localhost` resolves automatically to `127.0.0.1` on macOS/Linux — no editing of
`/etc/hosts`, no TLS, no sudo (unprivileged port). That way the entire branch only
needs this single port facing outward; all service ports underneath are ephemeral.

`dev.sh` uses portless in two ways:

1. **Alias to a fixed port** — Keycloak runs in the Compose container on the
   hash-derived host port `${KEYCLOAK_PORT}`. `portless alias auth.<slug>
   <KEYCLOAK_PORT>` maps the branch host name onto this existing port. The port must
   be known up front (portless only aliases to an *already* bound port) and be
   deterministic from the slug, so parallel worktrees don't collide. The same applies
   to Postgres, which doesn't run through portless at all (raw TCP) but is addressed
   directly via `localhost:${POSTGRES_PORT}` in `DATABASE_URL`.
2. **Process with an ephemeral port** — `portless <hostname> <command>` starts a
   process, injects a free `PORT` env var, reads the actual port, and routes the host
   name there. The Spring backends bind via `server.port: ${PORT:8080}` (see
   `application.yml`), and Vite respects `PORT` too. That's why `dev-env.sh` does
   `unset SPRING_PROFILES_ACTIVE`: the `dev` profile would otherwise override the
   portless assignment with its fixed port.

## 🧬 Branch isolation

Two worktrees running side by side without collisions comes from two mechanisms
working together:

- **`dev-env.sh`** derives deterministic host ports (Postgres/Keycloak) and the
  `COMPOSE_PROJECT_NAME` from the branch slug via `cksum` → two branches collide
  neither on container ports nor on Compose projects.
- **portless host names** carry the slug (`app.<slug>.localhost`, …) → the
  browser/backend URLs are unique per branch, including `ISSUER_URI`,
  `CORS_ALLOWED_ORIGINS`, and Keycloak `redirect_uris` (set per slug by
  `keycloak-config-cli`).

The result: a complete stack per branch — its own Postgres, its own Keycloak, its own
backends, its own frontend — all reachable simultaneously under branch-unique URLs.
Exactly what you need to test one variant while you keep working on the next.

## ⚖️ Approach comparison

When you want to run several variants of the project in parallel, there is more than
one way to go about it — and the choice has real consequences for production parity,
isolation, and resource usage. Three approaches are worth comparing:

| Criterion         | **A: Per-branch stack** | **B: Stackless** (H2 + no-secure) | **C: Shared stack** (infra on main, branch only FE/BE) |
|-------------------|-------------------------|-----------------------------------|--------------------------------------------------------|
| Prod parity DB    | ✅ real Postgres         | ❌ H2 ≠ Postgres                   | ✅ real Postgres                                        |
| Prod parity auth  | ✅ real Keycloak/OIDC    | ❌ security disabled               | ✅ real Keycloak/OIDC                                   |
| Branch isolation  | ✅ complete              | ✅ (nothing shared)                | ❌ shared DB & realm state                              |
| Resources         | ❌ 2 containers + JVMs per branch | ✅ minimal               | 🟡 1× infra total + JVMs per branch                    |
| Startup/branch    | ❌ Keycloak health ~60 s | ✅ seconds                         | ✅ only FE/BE to start                                  |
| Maintenance       | 🟡 more moving parts    | ❌ separate no-secure profile      | 🟡 wildcard realm + migration discipline               |

**A: Per-branch stack — a dedicated stack (Postgres + Keycloak) *and* all services per
branch.** Full production parity and full isolation; the price is resources (two
containers plus JVMs per branch) and a ~60 s Keycloak health wait on startup.

**B: Stackless (H2 + no-secure profile) — no parity.**
Fastest start, no Docker. But the project stands and falls with exactly the parts
that B abstracts away:

- The schema is created via **Flyway**, and Hibernate runs with `ddl-auto: validate`
  against Postgres-written DDL (`UUID`, `DOUBLE PRECISION`, `TIMESTAMP`). Under H2 you
  would either have to maintain H2-compatible migrations or give up `validate` — both
  undermine the point of the migration tests.
- There is **no** no-secure profile; `application.yml` requires a real `ISSUER_URI`.
  You would have to build such a profile and maintain it in parallel with the real
  `SecurityConfig` (roles `CUSTOMER`/`ADMIN`, JWT, CORS) — it is guaranteed to drift,
  and that's exactly where the interesting bugs live.

Bottom line: B is fine for pure domain/unit work (there are already tests for that),
but not for locally verifying auth and persistence behavior. Since this repo hosts a
Keycloak spike among other things, missing parity would be especially harmful here.

**C: Shared stack (infra once, branch only starts FE/BE).**
Keeps A's parity and saves the most resources (one Postgres, one Keycloak instead of
n×2 containers; branches start without the Keycloak wait). The price is the loss of
isolation — and isolation is the actual purpose of the parallel-dev setup:

- **Shared DB:** branches overwrite each other's data. Worse: Flyway migrations
  diverge per branch. If a branch adds `V2`, it migrates the shared DB and breaks
  `validate` on main/other branches.
- **Shared realm:** `keycloak-config-cli` sets `redirect_uris`/`web-origins` per slug
  today. With a shared Keycloak you'd need wildcard origins for all branch host
  names, and one branch's realm changes immediately hit everyone.

C is a sensible **opt-in optimization** when resource pressure is high *and* branches
rarely touch the schema or realm. As the default, you'd lose exactly the
collision-freedom that A guarantees.

**We chose A.** It is the right default as long as only a few worktrees run at once and
correctness around auth + DB migrations matters (both core topics of this repo). The
resource downside could later be softened by an optional C-mode flag, without giving
up A as the safe default.

## 📂 Related files

- [`scripts/dev.sh`](../../scripts/dev.sh) — starts the stack + portless processes
- [`scripts/dev-env.sh`](../../scripts/dev-env.sh) — derives the slug, ports, and
  `COMPOSE_PROJECT_NAME` from the branch
- [`scripts/dev-down.sh`](../../scripts/dev-down.sh) — stops and cleans up
- [`stack/README.md`](../../stack/README.md) — stack overview + single-origin mode
- [`stack/docker-compose.yml`](../../stack/docker-compose.yml) — both setups from one
  file
