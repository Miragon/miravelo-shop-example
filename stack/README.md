# Stack

Branch-isolierte Dev-Infrastruktur: pro Checkout läuft ein eigener
Postgres + Keycloak. Routing zu lokal gestarteten Backend-/Frontend-Prozessen
übernimmt [portless](http://github.com/vercel-labs/portless).

## Start

```bash
npm --prefix scripts install        # einmalig pro Checkout: installiert portless
npm --prefix scripts run dev        # Stack hoch + alle Backends/Frontend via portless
npm --prefix scripts run dev:down   # Compose stoppen (portless-Prozesse via Ctrl-C in dev)
```

`dev:down` stoppt den Stack des aktuellen Branches und räumt zusätzlich
verwaiste `retail-*`-Stacks auf, deren Compose-Datei nicht mehr existiert (z.B.
gelöschte Worktrees). Stacks lebender Worktrees (Compose-Datei noch vorhanden)
bleiben laufen, damit Parallel-Dev funktioniert.

`scripts/dev-env.sh` leitet aus dem aktuellen Git-Branch einen Slug ab und
berechnet daraus deterministische Host-Ports für Postgres und Keycloak.
Zwei Checkouts auf verschiedenen Branches laufen so kollisionsfrei parallel.

## Einstiegspunkte

`$BRANCH_SLUG` ergibt sich aus `git rev-parse --abbrev-ref HEAD` (Kleinbuchstaben,
`/` und `_` durch `-` ersetzt — z.B. `spike-keycloak-portless`).

| URL                                              | Ziel                         |
|--------------------------------------------------|------------------------------|
| `http://app.${BRANCH_SLUG}.localhost:1355`       | Frontend (Vite)              |
| `http://shop.${BRANCH_SLUG}.localhost:1355`      | shop-backend                 |
| `http://delivery.${BRANCH_SLUG}.localhost:1355`  | delivery-backend             |
| `http://warehouse.${BRANCH_SLUG}.localhost:1355` | warehouse-backend            |
| `http://auth.${BRANCH_SLUG}.localhost:1355`      | Keycloak                     |
| `http://auth.${BRANCH_SLUG}.localhost/admin`     | Keycloak Admin (admin/admin) |

Postgres ist nicht über portless erreichbar (kein HTTP) — Verbindung direkt
auf `localhost:${POSTGRES_PORT}` (siehe `dev-env.sh`-Ausgabe beim Start).

## Wie portless funktioniert

[portless](https://github.com/vercel-labs/portless) ist ein lokaler
Reverse-Proxy, der **einen** Port (`1355`) belegt und anhand des Host-Namens auf
lokale Prozesse routet. `*.localhost` löst auf macOS/Linux automatisch auf
`127.0.0.1` auf — kein `/etc/hosts`-Editieren, kein TLS, kein sudo (unprivilegierter
Port). Damit braucht der gesamte Branch nur diesen einen Port nach außen; alle
Service-Ports darunter sind ephemer.

`dev.sh` nutzt portless auf zwei Arten:

1. **Alias auf festen Port** — Keycloak läuft im Compose-Container auf dem
   hash-derivierten Host-Port `${KEYCLOAK_PORT}`. `portless alias auth.<slug>
   <KEYCLOAK_PORT>` mappt den Branch-Hostnamen auf diesen bestehenden Port.
   Der Port muss vorab feststehen (portless aliast nur auf einen *bereits*
   gebundenen Port) und aus dem Slug deterministisch sein, damit parallele
   Worktrees nicht kollidieren. Gleiches gilt für Postgres, das als rohes TCP
   gar nicht über portless läuft, sondern direkt via `localhost:${POSTGRES_PORT}`
   in `DATABASE_URL` angesprochen wird.
2. **Prozess mit ephemerem Port** — `portless <hostname> <command>` startet einen
   Prozess, injiziert eine freie `PORT`-Env-Var, liest den tatsächlichen Port aus
   und routet den Hostnamen dorthin. Die Spring-Backends binden über
   `server.port: ${PORT:8080}` (siehe `application.yml`), Vite respektiert `PORT`
   ebenso. Deshalb `unset SPRING_PROFILES_ACTIVE` in `dev-env.sh`: das `dev`-Profil
   würde sonst mit seinem fixen Port die portless-Zuweisung überschreiben.

Branch-Isolation entsteht durch zwei zusammenwirkende Mechanismen:

- **`dev-env.sh`** leitet aus dem Branch-Slug per `cksum` deterministische
  Host-Ports (Postgres/Keycloak) und den `COMPOSE_PROJECT_NAME` ab → zwei Branches
  kollidieren weder bei Container-Ports noch bei Compose-Projekten.
- **portless-Hostnamen** tragen den Slug (`app.<slug>.localhost`, …) → die
  Browser-/Backend-URLs sind pro Branch eindeutig, inklusive `ISSUER_URI`,
  `CORS_ALLOWED_ORIGINS` und Keycloak-`redirect_uris` (von `keycloak-config-cli`
  pro Slug gesetzt).

## Testuser (Realm: retail)

| User       | Passwort | Rollen          |
|------------|----------|-----------------|
| alice      | test     | CUSTOMER        |
| bob        | test     | CUSTOMER        |
| shopkeeper | test     | CUSTOMER, ADMIN |

## Verzeichnisstruktur

```
stack/
├── keycloak/       # Realm-Konfiguration (keycloak-config-cli)
└── docker-compose.yml
```

## Ansatz-Vergleich: warum Pro-Branch-Stack?

Der hier gewählte Ansatz — **ein eigener Stack (Postgres + Keycloak) *und* alle
Services pro Branch** — ist eine bewusste Abwägung zwischen Parität, Isolation
und Ressourcenverbrauch. Zwei naheliegende Alternativen:

| Kriterium         | **A: Pro-Branch-Stack** (gewählt) | **B: Stackless** (H2 + no-secure) | **C: Geteilter Stack** (Infra auf main, Branch nur FE/BE) |
|-------------------|-----------------------------------|-----------------------------------|-----------------------------------------------------------|
| Prod-Parität DB   | ✅ echtes Postgres                 | ❌ H2 ≠ Postgres                   | ✅ echtes Postgres                                         |
| Prod-Parität Auth | ✅ echtes Keycloak/OIDC            | ❌ Security abgeschaltet           | ✅ echtes Keycloak/OIDC                                    |
| Branch-Isolation  | ✅ vollständig                     | ✅ (nichts geteilt)                | ❌ geteilte DB- & Realm-State                              |
| Ressourcen        | ❌ 2 Container + JVMs je Branch    | ✅ minimal                         | 🟡 1× Infra gesamt + JVMs je Branch                       |
| Startzeit/Branch  | ❌ Keycloak-Health ~60 s           | ✅ Sekunden                        | ✅ nur FE/BE starten                                       |
| Wartungsaufwand   | 🟡 mehr bewegliche Teile          | ❌ separates no-secure-Profil      | 🟡 Wildcard-Realm + Migrations-Disziplin                  |

**B: Stackless (H2 + no-secure-Profil) — keine Parität.**
Schnellster Start, kein Docker. Aber das Projekt steht und fällt mit genau den
Teilen, die B wegabstrahiert:

- Das Schema wird per **Flyway** angelegt, Hibernate läuft mit
  `ddl-auto: validate` gegen Postgres-geschriebenes DDL (`UUID`,
  `DOUBLE PRECISION`, `TIMESTAMP`). Unter H2 müsste man entweder H2-kompatible
  Migrations pflegen oder `validate` aufgeben — beides untergräbt den Sinn der
  Migration-Tests.
- Es gibt **kein** no-secure-Profil; `application.yml` verlangt ein echtes
  `ISSUER_URI`. Ein solches Profil müsste man bauen und parallel zur echten
  `SecurityConfig` (Rollen `CUSTOMER`/`ADMIN`, JWT, CORS) pflegen — es driftet
  garantiert weg, und genau dort sitzen die interessanten Bugs.

Fazit: B taugt für reine Domain-/Unit-Arbeit (dafür gibt es bereits Tests),
nicht für lokales Verifizieren von Auth- und Persistenz-Verhalten. Da dieses
Repo u.a. einen Keycloak-Spike beherbergt, wäre fehlende Parität hier besonders
schädlich.

**C: Geteilter Stack (Infra einmalig, Branch startet nur FE/BE).**
Behält die Parität von A und spart die meisten Ressourcen (ein Postgres, ein
Keycloak statt n×2 Containern; Branches starten ohne Keycloak-Wartezeit). Der
Preis ist der Verlust der Isolation — und Isolation ist der eigentliche Zweck
des Parallel-Dev-Setups:

- **Geteilte DB:** Branches überschreiben sich gegenseitig Daten. Schlimmer:
  Flyway-Migrations divergieren pro Branch. Fügt ein Branch `V2` hinzu, migriert
  er die gemeinsame DB und bricht `validate` auf main/anderen Branches.
- **Geteilter Realm:** `keycloak-config-cli` setzt `redirect_uris`/`web-origins`
  heute pro Slug. Bei geteiltem Keycloak bräuchte man Wildcard-Origins für alle
  Branch-Hostnamen, und Realm-Änderungen eines Branches treffen sofort alle.

C ist eine sinnvolle **Opt-in-Optimierung**, wenn der Ressourcendruck hoch ist
*und* Branches selten Schema oder Realm anfassen. Als Default verlöre man genau
die Kollisionsfreiheit, die A garantiert.

**Fazit:** A ist richtig, solange nur wenige Worktrees gleichzeitig laufen und
Korrektheit bei Auth + DB-Migrationen zählt (beides Kernthemen dieses Repos). Der
Ressourcen-Nachteil ließe sich später durch ein optionales C-Mode-Flag
abfedern, ohne A als sicheren Default aufzugeben.

## Klassischer Solo-Mode (ohne portless)

Wer nicht parallel arbeitet, kann weiterhin direkt mit dem dev-Profil starten:

```bash
SPRING_PROFILES_ACTIVE=dev ./gradlew :services:shop:shop-backend:bootRun
```

Dann gelten die fixen Ports aus `application-dev.yml` (shop 8081, delivery 8082,
warehouse 8083, mcp 8085) und der Vite-Proxy-Default zeigt auf `localhost:8081`.
Keycloak und Postgres müssen dafür separat aufgesetzt werden.
