# Stack

Dev-Infrastruktur (Postgres + Keycloak) für zwei Setups aus **einer**
`docker-compose.yml`:

- **Portless (parallel):** pro Checkout ein eigener Stack, Routing zu lokalen
  Backend-/Frontend-Prozessen via [portless](https://github.com/vercel-labs/portless).
  Mehrere Branches laufen kollisionsfrei parallel.
  → Vollständige Anleitung: [docs/how-to/portless-parallel-development.md](../docs/how-to/portless-parallel-development.md).
- **Lokal (single-origin):** ein nginx auf `:8080` als einziger Entry-Point, der
  Frontend, `/api` und Keycloak (`/auth`) unter einer Herkunft bündelt (siehe unten).

## Start — Portless (parallel)

```bash
npm --prefix scripts install        # einmalig pro Checkout: installiert portless
npm --prefix scripts run dev        # Stack hoch + alle Backends/Frontend via portless
npm --prefix scripts run dev:down   # Compose stoppen (portless-Prozesse via Ctrl-C in dev)
```

Pro Branch entstehen eigene URLs (`http://app.<slug>.localhost:1355`, …) und ein
eigener Stack auf hash-derivierten Ports. Wie das funktioniert (Routing,
Branch-Isolation, Ansatz-Vergleich, Testuser) steht in
[docs/how-to/portless-parallel-development.md](../docs/how-to/portless-parallel-development.md).

## Verzeichnisstruktur

```
stack/
├── keycloak/       # Realm-Konfiguration (keycloak-config-cli)
└── docker-compose.yml
```

## Lokaler Single-Origin-Mode (nginx, ohne portless)

Wer nicht parallel arbeitet, startet die Infra inkl. **nginx** und die Services
direkt — ohne `dev-env.sh`. Backend und Frontend laufen auf dem Host (z.B. über
die IntelliJ-Run-Configs), nginx proxyt sie zusammen mit Keycloak unter `:8080`:

```bash
cd stack && docker compose --profile solo up -d   # Postgres + Keycloak + nginx
SPRING_PROFILES_ACTIVE=dev ./gradlew :services:shop:shop-backend:bootRun
npm --prefix services/shop/shop-frontend run dev  # Vite auf :5173
# danach: http://localhost:8080 öffnen
```

> Wichtig: **`--profile solo`** — ohne das Profil startet nginx nicht (so bleibt
> es im portless-Modus aus). App öffnen unter **`http://localhost:8080`**, nicht
> `:5173` und nicht direkt auf Keycloak.

Routing (alles unter einer Herkunft `http://localhost:8080`):

| Pfad                         | Ziel                                  |
|------------------------------|---------------------------------------|
| `/`                          | Frontend (Vite, Host `:5173`)         |
| `/api/...`                   | shop-backend (Host `:8081`)           |
| `/auth/realms/miravelo`      | Keycloak (Realm, Issuer)              |
| `/auth/admin`                | Keycloak Admin (admin/admin)          |

Keycloak ist zusätzlich direkt unter `http://localhost:8088/auth` erreichbar
(eigener Host-Port, da nginx `:8080` belegt). Login als `alice`/`test` läuft über
die App auf `:8080`.

Ohne gesetzte Env-Vars greifen die Defaults der `docker-compose.yml` (Projekt
`miravelo-local`, Postgres `5432`, Keycloak-Admin `8088`, nginx `8080`,
`KC_HOSTNAME=http://localhost:8080/auth`, `KC_HTTP_RELATIVE_PATH=/auth`,
Redirect/Origin `http://localhost:8080`) — passend zu `application-dev.yml`
(`ISSUER_URI=http://localhost:8080/auth/realms/miravelo`, shop `:8081`).

`dev.sh` überschreibt dieselben Variablen via `dev-env.sh` mit den
branch-spezifischen portless-Werten (Keycloak unter Root-Pfad `/`, eigene
Hostnamen statt `/auth`), und startet **ohne** `--profile solo`, sodass nginx
dort nie läuft.
