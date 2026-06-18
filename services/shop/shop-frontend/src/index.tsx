import ReactDOM from 'react-dom/client'
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client'
import {AuthenticationProvider} from "./shared/auth/authentication-provider.tsx";
import {LoginBarrier} from "./shared/auth/login-barrier.tsx";
import {AppContent} from "./shared/app-content.tsx";
import {BrowserRouter} from "react-router";
import {persistOptions, queryClient} from "./shared/tanstack/tanstack-query-config.tsx";
import {RuntimeConfigGate} from "./shared/runtime-config.ts";
import {ThemeProvider} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {theme} from "./shared/theme.ts";
import "./index.css";

const AppRoot = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <RuntimeConfigGate>
                {(runtimeConfig) => (
                    <AuthenticationProvider runtimeConfig={runtimeConfig}>
                        <LoginBarrier>
                            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
                                <BrowserRouter>
                                    <AppContent/>
                                </BrowserRouter>
                            </PersistQueryClientProvider>
                        </LoginBarrier>
                    </AuthenticationProvider>
                )}
            </RuntimeConfigGate>
        </ThemeProvider>
    )
}

const rootElement = document.getElementById('root') as HTMLElement
ReactDOM.createRoot(rootElement).render(<AppRoot/>);
