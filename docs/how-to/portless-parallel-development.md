# 🛣️ Portless Parallel-Dev: running multiple branches at once

AI is shifting the bottleneck of software development. Code now appears faster than ever:
several features in flight at once, each in its own branch. What slows things down
afterwards is no longer the writing but **review and testing**. Before a branch is merged,
you want to *see it running*.

And increasingly you want to see *several* branches running at once, one under test while
you keep building the next. That is where the old problem shows up: **port conflicts.** Two
checkouts both want Postgres on `5432`, Keycloak on `8080`, the backend on `8081`, Vite on
`5173`. Start two of them and everything collides.

The way out is **isolation**, and git already taught us the pattern. **Worktrees** let one
repo check out many branches side by side without collisions; a running stack needs the
same thing, its own isolated world per branch. The idea underneath is small: give each
branch its own identity, with distinct ports, names, and URLs.

[portless](https://github.com/vercel-labs/portless) does that for the web layer. Every
service gets a stable `*.localhost` name, and the real ports float underneath. One nuance
shapes everything below, though: portless natively covers only JavaScript apps, while this
stack is mostly Gradle/Spring services and Docker Compose containers. So we borrow
portless's *philosophy* and apply it by hand to the non-JS parts. The full breakdown is in
[Portless for JS: the philosophy for everything else](#-portless-for-js-the-philosophy-for-everything-else).

> This document covers the **portless mode** (parallel dev). If you only work on a
> *single* branch, the simpler single-origin mode (nginx on `:8080`) is the better fit;
> see [`stack/README.md`](../../stack/README.md).

**Just want to run it?** [Quick start](#-quick-start) and [Entry points](#-entry-points)
are all you need. Everything after that is the *why* behind the design: worth reading if
you're adopting the pattern, skippable if you only want to use it.

## ✅ Prerequisites

- **Node.js 24+**, required by portless (`engines.node >=24`). Older versions won't run it.
- **Docker or Podman** with **Compose v2** (the `docker compose` CLI), for the per-branch
  Postgres + Keycloak stack. `dev:down`'s orphan cleanup also needs **`jq`**.
- **Java 21**, for the Gradle/Spring backends.
- Tested on **macOS and Linux**. Windows is unverified here (portless claims Windows
  support, but this flow hasn't been validated on it).

## 🚀 Quick start

```bash
npm --prefix scripts install        # once per checkout: installs portless
npm --prefix scripts run dev        # bring up the stack + all backends/frontend
npm --prefix scripts run dev:down   # stop Compose (the dev processes stop via Ctrl-C)
```

Both npm scripts are thin wrappers around a single entry point,
[`scripts/dev.sh`](../../scripts/dev.sh):

```bash
./scripts/dev.sh up      # == npm run dev
./scripts/dev.sh down    # == npm run dev:down
```

`dev:down` tears down the current branch's stack and leaves every other branch's stack
running, which is what makes parallel dev possible. It also sweeps stacks left behind by
deleted worktrees and stops the shared proxy once the last stack is gone (see
[Crash recovery & cleanup](#-crash-recovery--cleanup)).

## 🌐 Entry points

Each branch gets its own URLs. `$BRANCH_SLUG` comes from `git rev-parse --abbrev-ref HEAD`,
lowercased, with `/` and `_` replaced by `-` (e.g. `spike-keycloak-portless`).

| URL                                              | Target                       |
|--------------------------------------------------|------------------------------|
| `http://app.${BRANCH_SLUG}.localhost:1355`       | Frontend (Vite)              |
| `http://shop.${BRANCH_SLUG}.localhost:1355`      | shop-backend                 |
| `http://delivery.${BRANCH_SLUG}.localhost:1355`  | delivery-backend             |
| `http://warehouse.${BRANCH_SLUG}.localhost:1355` | warehouse-backend            |
| `http://auth.${BRANCH_SLUG}.localhost:1355`      | Keycloak                     |
| `http://auth.${BRANCH_SLUG}.localhost:1355/admin`| Keycloak Admin (admin/admin) |

Postgres is not reachable through portless (no HTTP), so connect to it directly on
`localhost:${POSTGRES_PORT}` (the `dev.sh up` banner prints the port on startup).

### Test users (realm: miravelo)

| User       | Password | Roles           |
|------------|----------|-----------------|
| alice      | test     | CUSTOMER        |
| bob        | test     | CUSTOMER        |
| shopkeeper | test     | CUSTOMER, ADMIN |

## ⚙️ What portless actually is

You've already seen the one-liner: portless replaces ports with named `.localhost` URLs
behind one proxy. Three of its mechanics matter once you run this stack, and they explain
the choices in `dev.sh`.

1. **One proxy, ephemeral apps.** When portless starts a process it injects a free `PORT`
   (random in `4000-4999`) and routes the hostname to it. Most frameworks read `PORT` on
   their own. For the ones that don't (Vite, Astro, Angular, and a few others) portless
   injects the right `--port`/`--host` flags itself. The app ports float; only the proxy
   port is fixed.
2. **TLS by default, which we turn off on purpose.** Out of the box portless serves HTTPS
   + HTTP/2 on `:443`, generates a local CA, and binds a privileged port (which needs
   `sudo`). We pass `--no-tls` on the unprivileged port `1355` instead, so the whole flow
   needs no sudo and no TLS trust dance: one outward-facing port per machine, all service
   ports ephemeral underneath.
3. **`.localhost` resolution is free in most browsers.** `*.localhost` resolves to
   `127.0.0.1` automatically in Chromium-based browsers (Chrome/Edge) and Firefox, with no
   `/etc/hosts` editing. Safari uses the system resolver and may not resolve `*.localhost`;
   if branch URLs don't load there, run `npm --prefix scripts exec -- portless hosts sync`
   once (it writes `/etc/hosts` and may prompt for sudo). We keep portless's automatic
   `/etc/hosts` sync off (`PORTLESS_SYNC_HOSTS=0`) to preserve the no-sudo property.

## 🧩 Portless for JS: the philosophy for everything else

The most important thing to know about this repo is that only a fraction of what you see is
portless. The rest is portless's *philosophy*, applied by hand to a stack portless was
never built to manage.

Portless's convenience features (a `portless.json` with an `apps:` map that "covers all
workspace packages", and `portless run`, which auto-prefixes the branch name onto a
worktree's hostname) are built for one specific world: a JavaScript/TypeScript monorepo. It
discovers apps from `pnpm-workspace.yaml` or the `"workspaces"` field in `package.json`,
and expects each app to be a package with a `dev` script.

This project isn't that. Its "apps" are Spring Boot services built with Gradle, plus two
containers (Postgres and Keycloak) managed by Docker Compose. None of them is a JS
workspace package, so portless's auto-discovery never sees them. Three concrete gaps
follow:

| Portless feature (for JS monorepos) | Why it can't carry this stack |
|---|---|
| `apps:` map starts every workspace package with one command | The backends are Gradle modules and containers, invisible to npm/pnpm workspace discovery. |
| `portless run` auto-prefixes the branch onto the hostname | It injects only each app's own URL (`PORTLESS_URL`). But shop needs Keycloak's `ISSUER_URI`, and the frontend needs shop's URL via CORS, so services need each other's branch URLs up front, before they boot. |
| `portless.json` as the single source of config | It has no field for the proxy port or `--no-tls`; those are env vars or CLI flags. Database ports, the Compose project name, and Keycloak's relative path live entirely outside portless. |

So `dev.sh` doesn't *replace* portless. It extends portless's idea to the non-JS parts of
the stack and wires the two together. The philosophy is "derive a unique name per branch,
give every service a stable hostname, let the ports float", and it shows up in three
layers:

1. **Branch-derived identity (ours).** From the git branch, `dev.sh` computes a
   `BRANCH_SLUG` and, via a `cksum` hash, deterministic host ports for Postgres and
   Keycloak plus a unique `COMPOSE_PROJECT_NAME`. Two checkouts then collide on neither
   container ports nor Compose projects. It's the same "no fixed ports" idea portless
   brings to JS apps, done in bash for Compose.
2. **Processes through portless (portless's job).** The three Spring backends and the Vite
   frontend do honor an injected port, so they go through portless the normal way:
   `portless shop.<slug> ./gradlew …:bootRun`. The backends bind via
   `server.port=${PORT:8080}` (see `application.yml`), and Vite gets `--port` injected for
   free. Ephemeral ports, named URLs, which is what portless is for.
3. **A container pinned with `alias` (the bridge).** Keycloak runs as a Compose container
   on a fixed, hash-derived host port, so it can't take an ephemeral `PORT`. portless has a
   primitive for exactly this: `portless alias auth.<slug> <port>` registers a static route
   onto an already-bound port (the docs call out Docker as the use case). Postgres isn't
   HTTP at all, so it skips portless entirely and is reached directly via
   `localhost:${POSTGRES_PORT}` in `DATABASE_URL`.

Splitting it this way, instead of forcing the stack into portless's config model, keeps
each layer in the tool that owns it. Compose owns containers, portless owns hostname→port
routing, and a few derived env vars (`ISSUER_URI`, `CORS_ALLOWED_ORIGINS`,
`SHOP_BACKEND_URL`, `APP_ORIGIN`, `KEYCLOAK_HOSTNAME`) carry the branch-unique URLs that no
single tool could infer on its own.

> **One file, two verbs.** All of this lives in a single `dev.sh` with an `up`/`down`
> dispatch. The branch environment is computed once in a `derive_env` function and shared
> by both, so there's no separate "env" or "down" file to keep in sync.

The result is a full stack per branch: its own Postgres, Keycloak, backends, and frontend,
all reachable at once under branch-unique URLs (including the `ISSUER_URI`,
`CORS_ALLOWED_ORIGINS`, and Keycloak `redirect_uris` that `keycloak-config-cli` sets per
slug). That is what lets you test one variant while you keep building the next.

## 🧹 Crash recovery & cleanup

Two `portless` housekeeping commands keep parallel dev stable without touching live
worktrees, because both act only on orphans whose owning CLI process is already dead:

- **`portless prune`** reaps dev-server routes leaked by a session that was `SIGKILL`ed
  (e.g. a hard stop). `dev.sh up` runs it before registering new routes, and `down` runs it
  during teardown.
- The **orphan stack sweep** in `down` is ours, not portless's. It asks `docker compose ls`
  for every `miravelo-*` project and tears down the ones whose source Compose file no
  longer exists on disk (stacks left behind by a deleted worktree), while leaving live
  worktrees' stacks running.

> **A note on hash collisions.** Host ports come from `cksum(slug) % 1000` over a 1000-port
> window, so two branches can in principle land on the same Postgres or Keycloak port.
> There's no probing. A collision shows up right away as a Compose "port is already
> allocated" error on the second `up`; rename the branch and retry. With a handful of
> concurrent worktrees it effectively never happens.

## ⚖️ Approach comparison

There's more than one way to run several variants of the project in parallel, and the
choice has real consequences for production parity, isolation, and resource usage. Three
approaches are worth comparing:

| Criterion         | **A: Per-branch stack** | **B: Stackless** (H2 + no-secure) | **C: Shared stack** (infra on main, branch only FE/BE) |
|-------------------|-------------------------|-----------------------------------|--------------------------------------------------------|
| Prod parity DB    | ✅ real Postgres         | ❌ H2 ≠ Postgres                   | ✅ real Postgres                                        |
| Prod parity auth  | ✅ real Keycloak/OIDC    | ❌ security disabled               | ✅ real Keycloak/OIDC                                   |
| Branch isolation  | ✅ complete              | ✅ (nothing shared)                | ❌ shared DB & realm state                              |
| Resources         | ❌ 2 containers + JVMs per branch | ✅ minimal               | 🟡 1× infra total + JVMs per branch                    |
| Startup/branch    | ❌ Keycloak health ~60 s | ✅ seconds                         | ✅ only FE/BE to start                                  |
| Maintenance       | 🟡 more moving parts    | ❌ separate no-secure profile      | 🟡 wildcard realm + migration discipline               |

- **A, per-branch stack (chosen):** a dedicated Postgres + Keycloak plus all services per
  branch. Full parity and full isolation. The price is resources: two containers plus up to
  four JVMs per branch (budget very roughly 1.5-2 GB RAM each) and a ~60 s Keycloak health
  wait at startup.
- **B, stackless (H2 + a no-secure profile):** fastest, no Docker, but it abstracts away
  the two things this repo is actually about. Postgres parity (Flyway plus
  `ddl-auto: validate` against Postgres DDL) and real OIDC both vanish. Fine for pure
  domain/unit work, useless for verifying auth and persistence locally.
- **C, shared stack (infra once, branch only runs FE/BE):** keeps A's parity and saves the
  most resources, but a shared DB and realm mean branches clobber each other's data,
  migrations, and redirect URIs. A sensible opt-in under resource pressure, not a safe
  default, since isolation is the whole reason for the setup.

**We chose A.** While only a few worktrees run at once and correctness around auth and DB
migrations matters, full isolation is worth the resources. C could be offered later as an
opt-in flag without giving up A as the default.

<details>
<summary>Why B and C fall down, in detail</summary>

**B, no parity, and parity is the point.**
- The schema is created with **Flyway**, and Hibernate runs with `ddl-auto: validate`
  against Postgres-written DDL (`UUID`, `DOUBLE PRECISION`, `TIMESTAMP`). Under H2 you'd
  either maintain H2-compatible migrations or give up `validate`, and both defeat the
  migration tests.
- There's no no-secure profile; `application.yml` requires a real `ISSUER_URI`. You'd have
  to build and maintain one alongside the real `SecurityConfig` (roles `CUSTOMER`/`ADMIN`,
  JWT, CORS), which is guaranteed to drift, and drift is where the interesting bugs live.

**C, shared state breaks isolation.**
- **Shared DB:** branches overwrite each other's data, and Flyway migrations diverge per
  branch. A branch that adds `V2` migrates the shared DB and breaks `validate` everywhere
  else.
- **Shared realm:** `keycloak-config-cli` sets `redirect_uris`/`web-origins` per slug
  today; a shared Keycloak would need wildcard origins for every branch host, and one
  branch's realm edits would hit everyone.

</details>

## 📂 Related files

- [`scripts/dev.sh`](../../scripts/dev.sh), the single `up`/`down` entry point
- [`scripts/package.json`](../../scripts/package.json), pins `portless` and maps the npm scripts
- [`stack/README.md`](../../stack/README.md), stack overview and single-origin mode
- [`stack/docker-compose.yml`](../../stack/docker-compose.yml), both setups from one file
