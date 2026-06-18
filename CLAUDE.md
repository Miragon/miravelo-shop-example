# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build System & Development

This is a multi-module Gradle project using Kotlin and Spring Boot. Java 21 is required.

### Common Commands

**Build entire project:**

```bash
./gradlew build
```

**Run tests:**

```bash
./gradlew test
```

**Run specific service locally:**

```bash
./gradlew :services:shop:shop-backend:bootRun
./gradlew :services:delivery:delivery-backend:bootRun
./gradlew :services:warehouse:warehouse-backend:bootRun
./gradlew :services:shop:shop-mcp-client:bootRun
```

**Run single test:**

```bash
./gradlew :services:shop:shop-backend:test --tests "LoadArticlesServiceTest"
```

**Build Docker images:**

```bash
docker build -t shop-backend:local -f services/shop/shop-backend/Dockerfile .
```

### Frontend Development

The shop frontend is a React + Vite application:

**Frontend commands (in services/shop/shop-frontend/):**

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run test:eslint  # Run ESLint
npm run apiGeneration # Generate API client from OpenAPI spec
```

**E2E Testing (in services/shop/shop-e2e/):**

```bash
npm run cy:all    # Run all Cypress tests
npm run cy:spec   # Run specific test spec
```

## Architecture Overview

This project implements Domain-Driven Design (DDD) with Hexagonal Architecture across multiple bounded contexts:

### Services Structure

- **shop-backend**: Main e-commerce service with full CRUD, persistence, and security
- **delivery-backend**: Delivery domain service (in-memory storage)
- **warehouse-backend**: Warehouse domain service (in-memory storage)
- **shop-mcp-client**: Model Context Protocol (MCP) client providing AI tools for article queries
- **shop-frontend**: React SPA with Material-UI
- **shop-e2e**: Cypress end-to-end tests

### Hexagonal Architecture Pattern

Each backend service follows strict hexagonal architecture enforced by ArchUnit tests:

```
src/main/kotlin/
├── adapter/
│   ├── inbound/     # REST controllers, security config
│   └── outbound/    # JPA repositories, external API clients
├── application/
│   ├── port/
│   │   ├── inbound/  # UseCase/Query interfaces
│   │   └── outbound/ # Repository interfaces
│   └── service/     # Application services implementing use cases
└── domain/          # Pure business logic, no dependencies
```

**Architectural Rules:**

- Domain layer has no external dependencies
- Application layer depends only on domain
- Adapters implement ports but don't depend on each other
- Use cases end with "UseCase" or "Query"
- Application services end with "Service"
- Each service implements exactly one inbound port

### Technology Stack

**Backend:**

- Kotlin + Spring Boot 3.5.3
- Spring Security with OAuth2 JWT
- Spring Data JPA with PostgreSQL
- SpringDoc OpenAPI
- ArchUnit for architecture testing

**Frontend:**

- React 19 + TypeScript
- Vite build tool
- Material-UI components
- TanStack Query for state management
- Auth0 for authentication

**Infrastructure:**

- Docker containers
- Kubernetes/Helm for deployment
- Minikube for local development

## Domain Model

The core domain revolves around Articles with shared value objects:

- `ArticleId`, `ArticleName`, `ArticleDescription`, `Price`, `ImageUrl`

Each service implements its own article repository following the same domain model but different persistence strategies.

## Local Development Setup

### Parallel-Dev (mehrere Checkouts, portless)

Einmalig pro Checkout: `npm --prefix scripts install` (installiert portless lokal).

```bash
npm --prefix scripts run dev        # Compose-Stack + alle Backends/Vite via portless
npm --prefix scripts run dev:down   # Stack stoppen
```

Pro Branch-Checkout entstehen branch-spezifische URLs (`http://app.<slug>.localhost:1355`,
`http://shop.<slug>.localhost:1355`, ...) und ein eigener Compose-Stack (Postgres +
Keycloak) auf hash-derivierten Ports. Zwei Worktrees auf unterschiedlichen
Branches laufen so kollisionsfrei parallel. Details: `stack/README.md`.

### Lokal single-origin (single-clone, ohne portless)

```bash
cd stack && docker compose --profile solo up -d   # Postgres + Keycloak + nginx (:8080)
SPRING_PROFILES_ACTIVE=dev ./gradlew :services:shop:shop-backend:bootRun
npm --prefix services/shop/shop-frontend run dev  # Vite :5173
# App: http://localhost:8080  (Login alice/test)
```

nginx auf `:8080` ist der einzige Entry-Point: `/` → Vite, `/api` → Backend
(festen dev-Ports 8081/8082/8083/8085), `/auth` → Keycloak. Keycloak-Admin direkt
unter `:8088/auth`. Das `--profile solo` ist nötig (sonst startet nginx nicht);
`dev.sh` lässt es weg, damit nginx im portless-Modus aus bleibt. Details und
Helm/Minikube-Alternative: `stack/README.md` bzw. `charts/README.md`.

## Testing Strategy

- **Unit tests**: Service layer and domain logic
- **Integration tests**: Repository layer with H2 database
- **Architecture tests**: ArchUnit enforces hexagonal boundaries
- **E2E tests**: Cypress for full user workflows

Always run `./gradlew test` before committing to ensure architecture compliance and functionality.

## MCP (Model Context Protocol) Integration

The project includes a dedicated MCP client (`shop-mcp-client`) that provides AI tools for querying article data. It communicates with the shop-backend via REST API using public endpoints (no authentication required for article browsing).

### MCP Architecture

The MCP module has a flat, simplified structure:

```
services/shop/shop-mcp-client/
├── inbound/     # ArticleTools directly
└── outbound/    # ShopApiClient + Configuration
```

### Running MCP Client

1. **Start shop-backend first** (required dependency):
```bash
./gradlew :services:shop:shop-backend:bootRun
```

2. **Start MCP client**:
```bash
./gradlew :services:shop:shop-mcp-client:bootRun
```

The MCP client runs on port 8085 and connects to shop-backend on port 8081.

### Available MCP Tools

- `getArticles()`: Retrieves all articles from the shop (public endpoint)
- `getArticleById(id: String)`: Retrieves a specific article by ID (public endpoint)

**Note:** MCP tools only provide read-only access to the product catalog. Cart operations and order placement require user authentication through the web frontend.

### Configuration

MCP client settings can be configured in `services/shop/shop-mcp-client/src/main/resources/application.yml`:

```yaml
shop:
  backend:
    url: http://localhost:8081  # Shop backend URL
```

The client activates the `mcp-server` profile automatically and provides Spring AI MCP tools for integration with Claude Desktop and other MCP clients.

## Implementation Guidelines

Always use IDE diagnostics to validate code after implementation
