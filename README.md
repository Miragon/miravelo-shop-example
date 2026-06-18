# 🚲 Miravelo — DDD Bike Shop Example

> *A showcase of how multiple teams can collaborate in a monorepo using Domain-Driven Design*

**Miravelo** is our standard scenario for trainings, workshops and demos — a (fictional) lifestyle
bike shop selling gravel bikes for weekends in the woods, road bikes for after-work loops, and
accessories nobody strictly needs but everybody *feels*. It gives every example a consistent domain
narrative ("we're building features for a shop") that anyone understands instantly — so the focus
stays on the architecture, not the domain.

Welcome to our **Domain-Driven Design** showcase!
This isn't just another "Hello World" - it's a **multi-team monorepo** demonstrating how different bounded contexts can
coexist, evolve independently, and work together in harmony.
We've got hexagons, bounded contexts, and more patterns than a textile factory.

## 🎯 What's This All About?

This project demonstrates how **multiple development teams** can work effectively in a **single repository** using **DDD
principles**, **bounded contexts**, and **Hexagonal Architecture**.

**Key Concepts Demonstrated:**

- 🏢 **Multi-team ownership** - Each service represents a different team's domain
- 🔒 **Bounded contexts** - Clear domain boundaries with explicit interfaces
- 📦 **Monorepo benefits** - Shared tooling, unified CI/CD, cross-cutting concerns
- 🏗️ **Independent deployability** - Teams can deploy their services autonomously
- 📋 **Documentation-driven development** - ADRs, architectural guidelines, and decision tracking

Think of it as a **digital shopping mall** where each team owns their "store" (bounded context) but shares the
infrastructure, while maintaining clear ownership and autonomy.

## 🏬 The Domain: The Miravelo bike shop

The domain is **Miravelo**, a bike e-commerce platform with multiple bounded contexts,
each representing a different aspect of the business:

- **🛒 Shop Service**: The main attraction - handles articles (bikes & gear), orders, and all that e-commerce jazz
- **🚚 Delivery Service**: Knows where your new gravel bike is (probably stuck in traffic)
- **📦 Warehouse Service**: Keeps track of inventory (yes, we're out of that one popular saddle again)

## 🎪 Tech Circus

Within this monorepo, we are using a variety of technologies to keep things interesting and modern.

**Backend Performers:**

- **Kotlin + Spring Boot** - Because who has time for Java verbosity?
- **PostgreSQL** - For when you need your data to actually persist
- **OAuth2 JWT** - Security that doesn't make you cry
- **ArchUnit** - The architecture police that never sleeps

**Frontend Stars:**

- **React 19 + TypeScript** - Modern, fast, and type-safe
- **Material-UI** - Pretty components without the CSS nightmares
- **TanStack Query** - State management that doesn't fight you

**Infrastructure Crew:**

- **Keycloak** - Self-hosted auth, bundled and pre-configured so you don't have to sign up for anything
- **Docker + Docker Compose** - Containerization for the container-curious
- **Kubernetes + Helm** - Orchestration without the orchestra pit
- **Minikube** - Kubernetes for your laptop

## 🚀 Quick Start (The Easy Way™)

The fastest way to get the whole shop running — including a pre-configured **Keycloak** with
ready-to-use test users — is the bundled Docker Compose stack in [`stack/`](stack/):

```bash
cd stack

# Just the infrastructure (Postgres, Keycloak, nginx reverse proxy)
docker compose up -d

# ...or the full shop (infrastructure + backend + frontend)
docker compose --profile with-shop up -d
```

Everything is reachable through the nginx reverse proxy on a single port:

| URL | Target |
|-----|--------|
| `http://localhost:8080/` | Frontend |
| `http://localhost:8080/api/` | Backend |
| `http://localhost:8080/auth/` | Keycloak |
| `http://localhost:8080/auth/admin` | Keycloak Admin (`admin` / `admin`) |

Log in with one of the bundled test users (realm `miravelo`, password `test`): `alice`, `bob`
(both `CUSTOMER`), or `shopkeeper` (`CUSTOMER` + `ADMIN`). See [stack/README.md](stack/README.md)
for details.

### Running services locally (without Compose)

You can also run the backends/frontend directly while keeping the infrastructure in Compose:

1. **Start the infrastructure** (Postgres + Keycloak + nginx):
   ```bash
   cd stack && docker compose up -d
   ```

2. **Build everything**:
   ```bash
   ./gradlew build
   ```

3. **Start the services**
   - **Backends**: run the "miravelo-application" compound config in IntelliJ, or
     `./gradlew :services:shop:shop-backend:bootRun` (and likewise for delivery/warehouse).
     The dev profile already points `ISSUER_URI` at the local Keycloak realm
     (see [application-dev.yml](services/shop/shop-backend/src/main/resources/application-dev.yml)).
   - **Frontend**: `cd services/shop/shop-frontend && yarn dev`.
     Local Keycloak settings live in
     [services/shop/shop-frontend/public/app.env](services/shop/shop-frontend/public/app.env).

### Running on Minikube (alternative)

A Helm-based Minikube setup also exists under [`charts/`](charts/):

```bash
minikube start
kubectl config use-context minikube
minikube tunnel # keep the terminal open

cd charts
helm dependency build ./postgres
helm upgrade --install postgres ./postgres
kubectl get po -w # Wait until the database pod is ready

# Build all the images
minikube image build -t shop-backend:local -f services/shop/shop-backend/Dockerfile .
minikube image build -t delivery-backend:local -f services/delivery/delivery-backend/Dockerfile .
minikube image build -t warehouse-backend:local -f services/warehouse/warehouse-backend/Dockerfile .
minikube image build -t shop-frontend:local -f services/shop/shop-frontend/Dockerfile .

# Deploy the shop
helm upgrade --install shop-backend ./shop-backend --values ./shop-backend/values.local.yaml
```

**Keycloak** runs in-cluster too, as its own chart
([charts/infrastructure/keycloak](charts/infrastructure/keycloak)) behind Traefik under `/auth`,
with the `miravelo` realm imported by `keycloak-config-cli`. The services are wired to it via the
`KEYCLOAK_*` ([charts/shop-frontend/values.local.yaml](charts/shop-frontend/values.local.yaml)) and
`security.issuer-uri` / `security.jwk-set-uri`
([charts/shop-backend/values.local.yaml](charts/shop-backend/values.local.yaml)) values. The backend
validates the token `iss` against the browser-facing `issuer-uri` but fetches JWKS from the
in-cluster `jwk-set-uri` (since the browser URL isn't reachable from inside a pod). See
[charts/README.md](charts/README.md) for the full Minikube/Traefik walkthrough.

## 🔐 Authentication (Keycloak)

Authentication is handled by a **self-hosted Keycloak** that ships with the Docker Compose stack —
no external accounts, no sign-up, no secrets to copy around. On startup,
[keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli) imports the `miravelo` realm
from [stack/keycloak/miravelo-realm.yaml](stack/keycloak/miravelo-realm.yaml), which defines:

- A public SPA client `shop-frontend`
- Realm roles `CUSTOMER` and `ADMIN`
- Three test users (all with password `test`):

  | User | Roles |
  |------|-------|
  | `alice` | `CUSTOMER` |
  | `bob` | `CUSTOMER` |
  | `shopkeeper` | `CUSTOMER`, `ADMIN` |

How the pieces are wired:

- **Frontend** reads its Keycloak settings at runtime from
  [services/shop/shop-frontend/public/app.env](services/shop/shop-frontend/public/app.env)
  (`KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`).
- **Backend** validates JWTs against the realm via `ISSUER_URI`
  (`http://localhost:8080/auth/realms/miravelo`), configured in
  [application-dev.yml](services/shop/shop-backend/src/main/resources/application-dev.yml).

To inspect or tweak realm settings, open the admin console at
`http://localhost:8080/auth/admin` (`admin` / `admin`).

## 🏗️ Architecture: It's Hexagonal, Darling

Each service follows the **Hexagonal Architecture** pattern because circles are overrated.
Here's how we keep our code clean and our sanity intact:

```
🏛️ Your Service Palace
├── 🚪 Adapters (The doormen)
│   ├── 📥 Inbound (REST controllers, the front desk)  
│   └── 📤 Outbound (Databases, external APIs, the back office)
├── 🧠 Application (The brain)
│   ├── 🔌 Ports (The contracts)
│   └── ⚙️ Services (The actual work happens here)
└── 💎 Domain (The precious business logic)
```

## 🧪 Testing: Because We're Not Savages

- **Unit Tests**: Test the tiny pieces
- **Integration Tests**: Test the bigger pieces
- **Architecture Tests**: Test that we didn't mess up the patterns
- **E2E Tests**: Test the whole shebang

Run all tests with: `./gradlew test` (and pray to the testing gods)

## 🤝 Contributing

Found a bug? Want to add a feature? Great! Just remember:

- Follow the hexagonal pattern (seriously, the ArchUnit tests will find you)
- Write tests (future you will thank present you)
- Keep the domain pure (no external dependencies in there!)

---

*Built with ❤️ by Miragon*
