declare global {
    namespace Cypress {
        // noinspection JSUnusedGlobalSymbols
        interface Chainable {
            login(user?: string, pw?: string): Cypress.Chainable
        }
    }
}

export const DATA_TESTID = {
    KEYCLOAK: {
        USERNAME: "input#username",
        PASSWORD: "input#password",
        SUBMIT: "#kc-login"
    },
    // Cart-IconButton-788b6181-c18b-4fff-a13a-43b9950c798d
    SHOP_MENU: {
        ORDERS: "button[title='Orders']",
        CART: "button[title='Cart']",
        LOGOUT: "button:contains(Logout)",
    },
    SHOP_ARTICLES: {
        CARD: "ArticleCard",
        ADD_TO_CART: (id: string): string => {
            return `ArticleCard-${id}-Button`
        },
        ITEMS: {
            GRAVEL_ONE: {
                ID: "788b6181-c18b-4fff-a13a-43b9950c798d",
                DESCRIPTION: "Miravelo Gravel One"
            },
            TIRES: {
                ID: "ca79f826-8b2e-4d52-88c8-31edba8aace4",
                DESCRIPTION: "GravelKing Tubeless Tires"
            },
            JERSEY: {
                ID: "c2e55163-bdf8-4a4d-bdab-8168fc68fd2e",
                DESCRIPTION: "Merino Cycling Jersey"
            },
            WHEELSET: {
                ID: "90b83b4a-1a31-461f-b815-7363327fb0c7",
                DESCRIPTION: "Miravelo Carbon Gravel Wheelset"
            },
            HELMET: {
                ID: "adc88073-ac0e-409f-b4eb-f6a345ec3b09",
                DESCRIPTION: "Aero Road Helmet"
            }
        }
    },
    SHOP_ORDERS: {
        EMPTY: {
            BUTTON_CONTINUE_SHOPPING: "Orders-Overview-Empty-Button-ContinueShopping",
            ROOT: "Orders-Overview-Empty"
        },
        BUTTON_CONTINUE_SHOPPING: "Orders-Overview-Button-ContinueShopping",
        BUTTON_VIEW_ORDER_PREFIX: "Orders-Overview-Button-ViewOrder",
        ROOT: "Orders-Overview",
        DETAILS: {
            CHECK_CIRCLE_ICON: "Order-Details-CheckCircleIcon",
            ITEMS: "Order-Details-ListItems",
        }
    },
    SHOP_CART: {
        EMPTY: {
            BUTTON_CONTINUE_SHOPPING: "Cart-Empty-Button-ContinueShopping"
        },
        ICON_BUTTON: "Cart-IconButton",
        LIST: "Cart-Page-List",
        BUTTON_CONTINUE_SHOPPING: "Cart-Button-ContinueShopping",
        BUTTON_COMPLETE_ORDER: "Cart-Button-CompleteOrder",
        REMOVE: "Cart-IconButton"
    }
} as const;
export const API = {
    ARTICLES: "/api/articles",
    ORDERS: "/api/orders"
} as const;
export const PAGE = {
    ARTICLES: "/articles",
    ORDERS: "/orders",
    CART: "/cart"
} as const;

// keycloak-js stores the access token here once the OIDC login flow completes.
const TOKEN_STORAGE_KEY = "dddToken";

// Retries until keycloak-js has persisted the access token in localStorage.
const expectAuthenticated = (): void => {
    cy.window({timeout: 30000}).should(win => {
        expect(win.localStorage.getItem(TOKEN_STORAGE_KEY)).to.be.a("string");
    });
};

Cypress.Commands.add("login", function (username, password) {
    Cypress.log({
        displayName: "KEYCLOAK LOGIN",
        message: [`🔐 Session | ${Cypress.spec.name}`]
    });
    // `env` values are read via cy.env() (project runs with allowCypressEnv: false).
    cy.env(["keycloakUsername", "keycloakPassword"]).then(credentials => {
        const {keycloakUsername, keycloakPassword} = credentials;
        const user = username ?? keycloakUsername;
        const pass = password ?? keycloakPassword;
        // NOTE: the session ID is unique per test. Sharing a session across the spec
        // breaks once a test logs out (it invalidates the Keycloak server session),
        // so each test gets its own clean login.
        cy.session(
            `${user}-${Cypress.spec.name}-${Cypress.currentTest.title}`,
            () => {
                const {KEYCLOAK} = DATA_TESTID;
                cy.clearAllSessionStorage();
                cy.clearAllCookies();
                cy.clearAllLocalStorage();
                // The app boots with keycloak-js `login-required`, so visiting it
                // immediately redirects to the Keycloak login form. Keycloak is served
                // under the same origin (behind the nginx/Traefik reverse proxy on :8080),
                // so no cy.origin() boundary is required.
                cy.visit("/");
                cy.get(KEYCLOAK.USERNAME).should("be.visible").clear().type(user);
                cy.get(KEYCLOAK.PASSWORD).clear().type(pass, {log: false});
                cy.get(KEYCLOAK.SUBMIT).click();
                // After a successful login Keycloak redirects back and keycloak-js
                // persists the access token.
                expectAuthenticated();
            },
            {
                validate: expectAuthenticated,
                cacheAcrossSpecs: false
            });
    });
});
