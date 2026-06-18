# Stack

```bash
# Nur Infrastruktur (Postgres, Keycloak, nginx)
docker compose up -d

# Inkl. Frontend + Backend
docker compose --profile with-shop up -d
```

## Einstiegspunkte

| URL | Ziel |
|-----|------|
| `http://localhost:8080/` | Frontend |
| `http://localhost:8080/api/` | Backend |
| `http://localhost:8080/auth/` | Keycloak |
| `http://localhost:8080/auth/admin` | Keycloak Admin (admin / admin) |

## Testuser (Realm: retail)

| User | Passwort | Rollen |
|------|----------|--------|
| alice | test | CUSTOMER |
| bob | test | CUSTOMER |
| shopkeeper | test | CUSTOMER, ADMIN |

## Verzeichnisstruktur

```
stack/
├── keycloak/       # Realm-Konfiguration (keycloak-config-cli)
├── nginx/          # nginx reverse proxy config
└── shop/           # Frontend runtime config (app.env)
```
