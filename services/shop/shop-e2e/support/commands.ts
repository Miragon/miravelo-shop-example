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
    // Cart-IconButton-f2b5c8a0-1d3e-4c5b-9f3e-7d6f8a2b1c3d
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
            SAMSUNG: {
                ID: "f2b5c8a0-1d3e-4c5b-9f3e-7d6f8a2b1c3d",
                DESCRIPTION: "Samsung 980 PRO 1TB SSD"
            },
            KEYCHRON: {
                ID: "d7e9a1e0-1234-4c5b-9876-abcdef123456",
                DESCRIPTION: "Keychron K2 Mechanical Keyboard"
            },
            SONY_HEADPHONES: {
                ID: "0f5e45d3-aaa3-4cde-a1b2-9e8f0d1a2b3c",
                DESCRIPTION: "Sony WH-1000XM5 Headphones"
            },
            LG: {
                ID: "d4e5f6a7-b8c9-7d8e-2f3a-1b2c3d4e5f6a",
                DESCRIPTION: "LG 34WN80C-B UltraWide Monitor"
            },
            DELL: {
                ID: "a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d",
                DESCRIPTION: "Dell XPS 15 Laptop"
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
