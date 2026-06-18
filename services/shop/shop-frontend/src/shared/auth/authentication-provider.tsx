import React, {createContext, PropsWithChildren, useContext, useEffect, useRef, useState} from 'react';
import Keycloak from 'keycloak-js';
import {LinearProgress} from '@mui/material';
import type {AppRuntimeConfig} from '../runtime-config.ts';

type AuthContextValue = {
    keycloak: Keycloak;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthenticationProvider');
    return ctx;
};

type AuthenticationProviderProps = PropsWithChildren & {
    runtimeConfig: AppRuntimeConfig;
};

export const AuthenticationProvider: React.FC<AuthenticationProviderProps> = ({runtimeConfig, children}) => {
    const keycloakRef = useRef<Keycloak>(
        new Keycloak({
            url: runtimeConfig.keycloakUrl,
            realm: runtimeConfig.keycloakRealm,
            clientId: runtimeConfig.keycloakClientId,
        })
    );
    const initializedRef = useRef(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const kc = keycloakRef.current;

        kc.init({onLoad: 'login-required', checkLoginIframe: false}).then(() => {
            if (kc.token) localStorage.setItem('dddToken', kc.token);
            setIsReady(true);
        });

        kc.onTokenExpired = () => {
            kc.updateToken(30).then(() => {
                if (kc.token) localStorage.setItem('dddToken', kc.token);
            });
        };
    }, []);

    if (!isReady) {
        return <LinearProgress color="primary"/>;
    }

    return (
        <AuthContext.Provider value={{keycloak: keycloakRef.current}}>
            {children}
        </AuthContext.Provider>
    );
};
