# Shop E2E Tests

End-to-end tests for the Shop service using Cypress with Keycloak authentication and Mochawesome reporting.

## Prerequisites

- **Running shop stack**: The simplest way is the bundled Docker Compose stack
  (`cd stack && docker compose --profile with-shop up -d`), which serves the frontend, backend
  and **Keycloak** behind a single nginx reverse proxy on `http://localhost:8080`.
- **Node.js**: Version compatible with the project
- **Environment Configuration**: `.env.local` file (see below)

> **Why the reverse proxy matters:** the tests log in through the Keycloak login form. Because
> Keycloak is served under the **same origin** as the app (`http://localhost:8080/auth`), no
> Cypress `cy.origin()` boundary is needed. Point `CYPRESS_BASE_URL` at that single origin.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the `services/shop/shop-e2e` directory with the following variables:

```env
CYPRESS_BASE_URL=http://localhost:8080
KEYCLOAK_USERNAME=alice
KEYCLOAK_PASSWORD=test
```

> **Note:** `alice`, `bob` and `shopkeeper` (all password `test`) are the bundled test users from
> the `retail` realm — see [stack/keycloak/retail-realm.yaml](../../../stack/keycloak/retail-realm.yaml).
> No external accounts or secrets are required.

## Running Tests

### Interactive Mode (with Cypress UI)

Open the Cypress Test Runner for debugging and development:

```bash
npm run cy
```

**Note:** Interactive mode does NOT generate Mochawesome reports.

### Headless Mode (with reporting)

Run all test specs in headless mode:

```bash
npm run cy:all
```

Run a specific test spec:

```bash
npm run cy:spec
# Enter spec name when prompted (e.g., "basic")
```

### Generate HTML Report

After running tests in headless mode, generate a consolidated HTML report:

```bash
npm run cy:createReport
```

Reports are generated in:
- **Raw JSON**: `reports/raw/*.json`
- **Merged JSON**: `reports/mochawesome-merged.json`
- **HTML Report**: `reports/html/e2e_report.html`

## Configuration

Test configuration is in `cypress.config.ts`:

- **Browser**: Chrome (headless mode)
- **Viewport**: 1920x1080
- **Test Pattern**: `e2e/**/*.spec.{js,jsx,ts,tsx}`
- **Reporter**: Mochawesome (JSON output for headless runs)
- **Retries**: 1 retry in run mode, 0 in open mode

## Writing Tests

### Test Structure

```typescript
import { DATA_TESTID, PAGE } from "../support/commands";

const { SHOP_ARTICLES, SHOP_MENU, SHOP_CART } = DATA_TESTID;
const { ARTICLES } = PAGE;

describe("Shop - Test Suite", function () {
    beforeEach(function () {
        cy.login(); // Custom command for Keycloak login
        cy.visit(ARTICLES);
        cy.get(`[data-testid^="${SHOP_ARTICLES.CARD}"]`)
          .should("have.length.greaterThan", 10);
    });

    it("Add article to cart", function () {
        cy.get(`[data-testid="${SHOP_ARTICLES.ADD_TO_CART(SHOP_ARTICLES.ITEMS.SAMSUNG.ID)}"]`)
          .click();
        cy.get(SHOP_MENU.CART).click();
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`)
          .should("contain.text", SHOP_ARTICLES.ITEMS.SAMSUNG.DESCRIPTION);
    });
});
```

### Custom Commands

**Login Command** (`cy.login()`)

Drives the Keycloak login form and manages the cached session:

```typescript
cy.login(); // Uses default credentials from .env.local (KEYCLOAK_USERNAME / KEYCLOAK_PASSWORD)
cy.login("bob", "test"); // Custom realm credentials
```

It visits the app (which redirects to Keycloak via `login-required`), submits the username and
password, and waits for keycloak-js to persist the access token in `localStorage` under
`dddToken`. The session is cached per user/spec with `cy.session()`.

### Test Data IDs

All test selectors are centralized in `support/commands.ts` under the `DATA_TESTID` constant:

- `DATA_TESTID.KEYCLOAK.*` - Keycloak login selectors
- `DATA_TESTID.SHOP_MENU.*` - Navigation menu elements
- `DATA_TESTID.SHOP_ARTICLES.*` - Article list and cards
- `DATA_TESTID.SHOP_CART.*` - Shopping cart elements
- `DATA_TESTID.SHOP_ORDERS.*` - Order management elements

### Handling Optional UI Elements

Some UI elements can appear only in specific states (for example empty vs. non-empty orders overview).  
To avoid flaky failures, check for existence before clicking optional elements:

```typescript
cy.get("body").then(($body) => {
  const selector = `[data-testid="${SHOP_ORDERS.EMPTY.BUTTON_CONTINUE_SHOPPING}"]`;
  if ($body.find(selector).length) {
    cy.get(selector).click();
  }
});
```

### Page Routes

Page paths are defined in `support/commands.ts` under the `PAGE` constant:

- `PAGE.ARTICLES` - Article listing page
- `PAGE.ORDERS` - Orders overview page
- `PAGE.CART` - Shopping cart page

## Test Workflow

Each test typically follows this pattern:

1. **Login**: Authenticate via Keycloak
2. **Navigate**: Visit the target page
3. **Interact**: Perform actions (click, type, select)
4. **Assert**: Verify expected outcomes

## Test Specifications

Detailed test specifications are documented per suite in `Testspecifications/`.

### Suite Index

- [basic.spec.ts](Testspecifications/basic.md) - Shop menubar flows (`#prb`, `#ctn`, `#unn`, `#pjz`, `#izv`)

### Coverage Summary

- Authentication (Keycloak login/logout)
- Navigation menu interactions
- Shopping cart CRUD operations
- Order creation and confirmation
- Multi-article cart management

### Required Test Data

| Article Name | Article ID | Used In Tests |
|-------------|-----------|---------------|
| Samsung 980 PRO 1TB SSD | `f2b5c8a0-1d3e-4c5b-9f3e-7d6f8a2b1c3d` | #unn |
| Dell XPS 15 Laptop | `a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d` | #ctn |
| Keychron K2 Mechanical Keyboard | `d7e9a1e0-1234-4c5b-9876-abcdef123456` | #pjz |
| LG 34WN80C-B UltraWide Monitor | `d4e5f6a7-b8c9-7d8e-2f3a-1b2c3d4e5f6a` | #izv |
| Sony WH-1000XM5 Headphones | `0f5e45d3-aaa3-4cde-a1b2-9e8f0d1a2b3c` | #izv |

When adding a new suite:

1. Create `Testspecifications/<suite-name>.md`.
2. Add the suite link under `Suite Index` in this README.
3. Update required test data if new fixtures/articles are needed.

## Troubleshooting

### Tests not generating reports

Ensure you're running tests in headless mode using `npm run cy:all` or `npm run cy:spec`. Interactive mode (`npm run cy`) does not generate Mochawesome reports.

### Keycloak authentication failures

- Verify `KEYCLOAK_USERNAME` / `KEYCLOAK_PASSWORD` in `.env.local` match a realm user (default: `alice` / `test`)
- Make sure Keycloak is up and the `retail` realm was imported (`http://localhost:8080/auth/admin`, `admin` / `admin`)
- Ensure `CYPRESS_BASE_URL` points at the reverse proxy origin that also serves Keycloak (`http://localhost:8080`), so the login form stays same-origin

### Frontend not accessible

Confirm the shop-frontend is running on the URL specified in `CYPRESS_BASE_URL`.
