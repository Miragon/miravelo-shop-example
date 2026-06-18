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
1. Click "Add to Cart" button for Miravelo Gravel One
2. Click cart icon in navigation menu
3. Cart page displays

**Verification:**
- Cart list contains "Miravelo Gravel One"

**Test Data:**
- Article: Miravelo Gravel One
- Article ID: `788b6181-c18b-4fff-a13a-43b9950c798d`

---

### Test #pjz - Complete Order
**Action:** User adds an article to cart and completes the order
**Steps:**
1. Click "Add to Cart" button for GravelKing Tubeless Tires
2. Navigate to cart page
3. Verify article appears in cart list
4. Click "Complete Order" button
5. Order confirmation page displays

**Verification:**
- Order details page shows "GravelKing Tubeless Tires" in order items

**Test Data:**
- Article: GravelKing Tubeless Tires
- Article ID: `ca79f826-8b2e-4d52-88c8-31edba8aace4`

---

### Test #ctn - Navigate to Orders
**Action:** User navigates to the orders overview page
**Steps:**
1. Add Aero Road Helmet to cart
2. Navigate to cart page
3. Complete an order to ensure at least one order exists
4. Click "Orders" button in navigation menu
5. If the empty-state "Continue Shopping" button exists, click it
6. Orders page loads

**Verification:**
- Orders overview root element is visible

**Test Data:**
- Article: Aero Road Helmet
- Article ID: `adc88073-ac0e-409f-b4eb-f6a345ec3b09`

---

### Test #izv - Remove Article from Cart
**Action:** User adds multiple articles to cart and removes one
**Steps:**
1. Add Miravelo Carbon Gravel Wheelset to cart
2. Navigate to cart page
3. Click "Continue Shopping" button
4. Add Merino Cycling Jersey to cart
5. Navigate to cart page
6. Verify both articles are visible in cart
7. Click remove button for the jersey
8. Verify the jersey is removed from cart

**Verification:**
- Cart initially contains both the wheelset and the jersey
- After removal, cart no longer contains the jersey text
- Cart still contains the wheelset

**Test Data:**
- Article 1: Miravelo Carbon Gravel Wheelset
  - ID: `90b83b4a-1a31-461f-b815-7363327fb0c7`
- Article 2: Merino Cycling Jersey
  - ID: `c2e55163-bdf8-4a4d-bdab-8168fc68fd2e`

---

## Test Data Dependencies

All tests depend on:
- Shop backend running and accessible
- Shop frontend running on configured `CYPRESS_BASE_URL`
- Keycloak authentication service available (realm `miravelo`)
- Test user credentials configured in `.env.local`
- Article catalog containing at least the following items:
  - Miravelo Gravel One
  - GravelKing Tubeless Tires
  - Miravelo Carbon Gravel Wheelset
  - Merino Cycling Jersey
  - Aero Road Helmet

## Notes

- All tests use isolated sessions with test isolation enabled
- Tests have 1 retry configured in run mode
- Each test starts with a clean authenticated session
