import {createElement, type ReactNode, useEffect, useState} from "react";

export interface AppRuntimeConfig {
    keycloakUrl: string;
    keycloakRealm: string;
    keycloakClientId: string;
}

const envFileUrl = "/app.env";

let runtimeConfig: AppRuntimeConfig | null = null;

const parseEnvFile = (content: string): Record<string, string> => {
    const parsed: Record<string, string> = {};
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const delimiterIndex = trimmed.indexOf("=");
        if (delimiterIndex <= 0) {
            continue;
        }
        const key = trimmed.slice(0, delimiterIndex).trim();
        let value = trimmed.slice(delimiterIndex + 1).trim();
        if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        parsed[key] = value;
    }
    return parsed;
}

const requireConfigValue = (source: Record<string, string>, key: string): string => {
    const value = source[key]?.trim();
    if (!value) {
        throw new Error(`Missing required runtime config: ${key}`);
    }
    return value;
}

export const initRuntimeConfig = async (): Promise<AppRuntimeConfig> => {
    if (runtimeConfig) {
        return runtimeConfig;
    }

    const response = await fetch(envFileUrl, {cache: "no-store"});
    if (!response.ok) {
        throw new Error(`Failed to load runtime env file: ${envFileUrl} (${response.status})`);
    }

    const parsed = parseEnvFile(await response.text());
    runtimeConfig = {
        keycloakUrl: resolveKeycloakUrl(requireConfigValue(parsed, "KEYCLOAK_URL")),
        keycloakRealm: requireConfigValue(parsed, "KEYCLOAK_REALM"),
        keycloakClientId: requireConfigValue(parsed, "KEYCLOAK_CLIENT_ID"),
    };

    return runtimeConfig;
}

// "auto" derives the Keycloak URL from the current frontend host (see
// stack/README.md). Two dev layouts are supported:
//   - portless parallel-dev: app.<slug>.localhost -> auth.<slug>.localhost (root)
//   - local single-origin:   served behind nginx  -> same origin under /auth
const resolveKeycloakUrl = (raw: string): string => {
    if (raw !== "auto") return raw;
    const {protocol, host} = window.location;
    if (host.startsWith("app.")) {
        return `${protocol}//${host.replace(/^app\./, "auth.")}`;
    }
    return `${protocol}//${host}/auth`;
}

type RuntimeConfigGateProps = {
    children: (runtimeConfig: AppRuntimeConfig) => ReactNode;
};

export const RuntimeConfigGate = ({children}: RuntimeConfigGateProps) => {
    const [resolvedRuntimeConfig, setResolvedRuntimeConfig] = useState<AppRuntimeConfig | null>(null);
    const [runtimeConfigError, setRuntimeConfigError] = useState<string | null>(null);

    useEffect(() => {
        initRuntimeConfig()
            .then(setResolvedRuntimeConfig)
            .catch((error) => setRuntimeConfigError(`${error}`));
    }, []);

    if (runtimeConfigError) {
        return createElement("pre", null, `Failed to load runtime config.\n${runtimeConfigError}`);
    }

    if (!resolvedRuntimeConfig) {
        return null;
    }

    return children(resolvedRuntimeConfig);
}
