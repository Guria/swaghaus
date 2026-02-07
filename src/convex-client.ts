import { atom, assert, action } from "@reatom/core";
import { type AuthProviderState, createReatomConvex } from "./reatom-convex";
import { createAuth0Client } from '@auth0/auth0-spa-js';
import { reatomInstance } from "./reatomInstance";


export const authClientAtom = reatomInstance(async () => {
    const client = await createAuth0Client({
        domain: import.meta.env.VITE_AUTH0_DOMAIN!,
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID!,
        // Keep auth state stable across redirects and client re-instantiation.
        useRefreshTokens: true,
        cacheLocation: "localstorage",
        authorizationParams: {
            redirect_uri: typeof window === "undefined" ? undefined : window.location.origin
        }
    });
    const params = new URLSearchParams(window.location.search);
    if (params.has("code") && params.has("state")) {
        await client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    return client;
});

const authProviderState = atom<AuthProviderState>({
    isLoading: true,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
}, "authProviderState");

// Update auth state when Auth0 client becomes available
authClientAtom.data.subscribe(async (auth0Client) => {
    if (!auth0Client) return;
    const isAuthenticated = await auth0Client.isAuthenticated();
    authProviderState.set({
        isLoading: false,
        isAuthenticated,
        fetchAccessToken: async ({ forceRefreshToken }) => {
            try {
                const response = await auth0Client.getTokenSilently({
                    detailedResponse: true,
                    cacheMode: forceRefreshToken ? "off" : "on",
                });
                assert(response, "Failed to fetch access token");
                return response.id_token;
            } catch {
                return null;
            }
        },
    });
});

const convexURL = import.meta.env.VITE_CONVEX_URL;
assert(convexURL, "VITE_CONVEX_URL is not defined");

export const { client, clearAuth, reatomQuery, reatomMutation, reatomAction } = createReatomConvex(
    convexURL,
    authProviderState,
);

export const signOut = action(() => {
    clearAuth();
    return authClientAtom.data()?.logout()
});
