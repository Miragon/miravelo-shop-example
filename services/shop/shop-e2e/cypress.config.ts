import {defineConfig} from "cypress";
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;

console.info('CYPRESS_BASE_URL:', process.env.CYPRESS_BASE_URL);
console.info('KEYCLOAK_USERNAME:', process.env.KEYCLOAK_USERNAME);

export default defineConfig({
    port: 8101,
    viewportWidth: 1920,
    viewportHeight: 1080,
    defaultCommandTimeout: 5000,
    component: {
        devServer: {
            framework: "react",
            bundler: "vite"
        },
        specPattern: "e2e/**/*.spec.{js,jsx,ts,tsx}",
        supportFile: false
    },
    e2e: {
        //baseUrl: process.env.CYPRESS_BASE_URL,
        numTestsKeptInMemory: 5,
        pageLoadTimeout: 60000,
        specPattern: "e2e/**/*.spec.{js,jsx,ts,tsx}",
        supportFile: "support/e2e.ts",
        downloadsFolder: "downloads",
        fixturesFolder: "fixtures",
        videosFolder: "videos",
        screenshotsFolder: "screenshots",
        trashAssetsBeforeRuns: true,
        testIsolation: true,
        chromeWebSecurity: false,
        scrollBehavior: "top",
        screenshotOnRunFailure: true,
        video: false,
        experimentalPromptCommand: false,
        allowCypressEnv: false,
        reporter: "mochawesome",
        reporterOptions: {
            reportDir: "reports/raw",
            reportFilename: `[name]-${process.pid}`,
            quiet: false,
            overwrite: false,
            html: false,
            json: true,
        },
        retries: {
            openMode: 0,
            runMode: 1,
        },
        env: {
            keycloakUsername: process.env.KEYCLOAK_USERNAME,
            keycloakPassword: process.env.KEYCLOAK_PASSWORD
        },
        //
        setupNodeEvents: (on: PluginEvents, config: PluginConfigOptions) => {
            const CONFIG = config;
            on("before:browser:launch", (browser, launchOptions) => {
                switch (browser.family) {
                    case "chromium":
                        launchOptions.args.push("--window-size=1920,1080");
                        launchOptions.args.push("--auto-open-devtools-for-tabs");
                        break;
                    case "firefox":
                        launchOptions.args.push("--window-size=1920,1080");
                        launchOptions.args.push("-devtools");
                        break;
                    default:
                }
                return launchOptions;
            });
            on("task", {
                log(msg: string) {
                    console.log(msg);
                    return null;
                }
            });
            return CONFIG;
        }
    }
});
