import {DATA_TESTID} from "../support/commands";
import {PAGE} from "../support/commands";

const {
    KEYCLOAK,
    SHOP_ARTICLES,
    SHOP_CART,
    SHOP_MENU,
    SHOP_ORDERS
} = DATA_TESTID

const {ARTICLES} = PAGE;

describe("Shop - Menubar Testsuite", function (): void {
    before(function () {
        //
    });

    beforeEach(function ()  {
        cy.login();
        cy.visit(ARTICLES);
        cy.get(`[data-testid^="${SHOP_ARTICLES.CARD}"]`).should("have.length.greaterThan", 10);
    });

    it("Logout (#prb)", function () {
        cy.get(SHOP_MENU.LOGOUT).click();
        cy.get(KEYCLOAK.USERNAME).should("be.visible");
    });
    it("Add article to cart (#unn)", function () {
        cy.get(`[data-testid="${SHOP_ARTICLES.ADD_TO_CART(SHOP_ARTICLES.ITEMS.GRAVEL_ONE.ID)}"]`).click();
        cy.get(SHOP_MENU.CART).click();
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.GRAVEL_ONE.DESCRIPTION);
    })
    it("Complete order (#pjz)", function () {
        cy.get(`[data-testid="${SHOP_ARTICLES.ADD_TO_CART(SHOP_ARTICLES.ITEMS.TIRES.ID)}"]`).click();
        cy.get(SHOP_MENU.CART).click();
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.TIRES.DESCRIPTION);
        cy.get(`[data-testid="${SHOP_CART.BUTTON_COMPLETE_ORDER}"]`).click();
        cy.get(`[data-testid="${SHOP_ORDERS.DETAILS.ITEMS}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.TIRES.DESCRIPTION);
    });
    it("Navigate to orders (#ctn)", function (){
        // NOTE:first make sure at least one order has been placed...
        cy.get(`[data-testid="${SHOP_ARTICLES.ADD_TO_CART(SHOP_ARTICLES.ITEMS.HELMET.ID)}"]`).click();
        cy.get(SHOP_MENU.CART).click();
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.HELMET.DESCRIPTION);
        cy.get(`[data-testid="${SHOP_CART.BUTTON_COMPLETE_ORDER}"]`).click();
        cy.get(`[data-testid="${SHOP_ORDERS.DETAILS.ITEMS}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.HELMET.DESCRIPTION);
        //
        cy.get(SHOP_MENU.ORDERS).click();
        cy.get("body").then(($body) => {
            const selector = `[data-testid="${SHOP_ORDERS.EMPTY.BUTTON_CONTINUE_SHOPPING}"]`;
            if ($body.find(selector).length) {
                cy.get(selector).click();
            }
        });
        cy.get(`[data-testid="${SHOP_ORDERS.ROOT}"]`).should("be.visible");
    });
    it("Remove article from cart (#izv)", function () {
        cy.get(`[data-testid="${SHOP_ARTICLES.ADD_TO_CART(SHOP_ARTICLES.ITEMS.WHEELSET.ID)}"]`).click();
        cy.get(SHOP_MENU.CART).click();
        cy.get(`[data-testid="${SHOP_CART.BUTTON_CONTINUE_SHOPPING}"]`).click();
        cy.get(`[data-testid="${SHOP_ARTICLES.ADD_TO_CART(SHOP_ARTICLES.ITEMS.JERSEY.ID)}"]`).click();
        cy.get(SHOP_MENU.CART).click();
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.WHEELSET.DESCRIPTION);
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`).should("contain.text", SHOP_ARTICLES.ITEMS.JERSEY.DESCRIPTION);
        cy.get(`[data-testid="${SHOP_CART.REMOVE}-${SHOP_ARTICLES.ITEMS.JERSEY.ID}"]`).click();
        cy.get(`[data-testid="${SHOP_CART.LIST}"]`).should("not.contain.text", SHOP_ARTICLES.ITEMS.JERSEY.DESCRIPTION);
    });
})
