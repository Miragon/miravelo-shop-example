# Test Specification: basic.spec.ts

**Test Suite:** Shop - Menubar Testsuite
**File:** `e2e/basic.spec.ts`
**Purpose:** Validate core user interactions including navigation, shopping cart operations, order completion, and authentication flows.

## Setup

### Before Each Test
1. Authenticate user via Keycloak (`cy.login()`)
2. Navigate to articles page (`/articles`)
3. Verify at least 10 article cards are visible

## Test Cases

### Test #prb - Logout
**Action:** User logs out of the application
**Steps:**
1. Click logout button in menu
2. User is redirected to the Keycloak login page

**Verification:**
- Keycloak username input field is visible

**Test Data:** None required

---

### Test #unn - Add Article to Cart
**Action:** User adds a single article to the shopping cart
**Steps:**
1. Click "Add to Cart" button for Samsung 980 PRO 1TB SSD
2. Click cart icon in navigation menu
3. Cart page displays

**Verification:**
- Cart list contains "Samsung 980 PRO 1TB SSD"

**Test Data:**
- Article: Samsung 980 PRO 1TB SSD
- Article ID: `f2b5c8a0-1d3e-4c5b-9f3e-7d6f8a2b1c3d`

---

### Test #pjz - Complete Order
**Action:** User adds an article to cart and completes the order
**Steps:**
1. Click "Add to Cart" button for Keychron K2 Mechanical Keyboard
2. Navigate to cart page
3. Verify article appears in cart list
4. Click "Complete Order" button
5. Order confirmation page displays

**Verification:**
- Order details page shows "Keychron K2 Mechanical Keyboard" in order items

**Test Data:**
- Article: Keychron K2 Mechanical Keyboard
- Article ID: `d7e9a1e0-1234-4c5b-9876-abcdef123456`

---

### Test #ctn - Navigate to Orders
**Action:** User navigates to the orders overview page
**Steps:**
1. Add Dell XPS 15 Laptop to cart
2. Navigate to cart page
3. Complete an order to ensure at least one order exists
4. Click "Orders" button in navigation menu
5. If the empty-state "Continue Shopping" button exists, click it
6. Orders page loads

**Verification:**
- Orders overview root element is visible

**Test Data:**
- Article: Dell XPS 15 Laptop
- Article ID: `a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d`

---

### Test #izv - Remove Article from Cart
**Action:** User adds multiple articles to cart and removes one
**Steps:**
1. Add LG 34WN80C-B UltraWide Monitor to cart
2. Navigate to cart page
3. Click "Continue Shopping" button
4. Add Sony WH-1000XM5 Headphones to cart
5. Navigate to cart page
6. Verify both articles are visible in cart
7. Click remove button for Sony headphones
8. Verify Sony headphones are removed from cart

**Verification:**
- Cart initially contains both LG monitor and Sony headphones
- After removal, cart no longer contains Sony headphones text
- Cart still contains LG monitor

**Test Data:**
- Article 1: LG 34WN80C-B UltraWide Monitor
  - ID: `d4e5f6a7-b8c9-7d8e-2f3a-1b2c3d4e5f6a`
- Article 2: Sony WH-1000XM5 Headphones
  - ID: `0f5e45d3-aaa3-4cde-a1b2-9e8f0d1a2b3c`

---

## Test Data Dependencies

All tests depend on:
- Shop backend running and accessible
- Shop frontend running on configured `CYPRESS_BASE_URL`
- Keycloak authentication service available (realm `retail`)
- Test user credentials configured in `.env.local`
- Article catalog containing at least the following items:
  - Samsung 980 PRO 1TB SSD
  - Keychron K2 Mechanical Keyboard
  - LG 34WN80C-B UltraWide Monitor
  - Sony WH-1000XM5 Headphones
  - Dell XPS 15 Laptop

## Notes

- All tests use isolated sessions with test isolation enabled
- Tests have 1 retry configured in run mode
- Each test starts with a clean authenticated session
