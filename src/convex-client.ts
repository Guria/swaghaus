import { atom, assert, action } from "@reatom/core";
import { type AuthProviderState, createReatomConvex } from "./reatom-convex";
import type { Auth0Client, GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";

const AUTH_BOOTSTRAP_KEY = "swaghaus.auth0.bootstrap";
const emptyAccessToken: AuthProviderState["fetchAccessToken"] = async () => null;

const getUnauthenticatedState = (): AuthProviderState => ({
  isLoading: false,
  isAuthenticated: false,
  fetchAccessToken: emptyAccessToken,
});

const getLoadingState = (): AuthProviderState => ({
  isLoading: true,
  isAuthenticated: false,
  fetchAccessToken: emptyAccessToken,
});

const hasAuthRedirectParams = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("code") && params.has("state");
};

const readBootstrapFlag = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTH_BOOTSTRAP_KEY) === "1";
  } catch {
    return false;
  }
};

const updateBootstrapFlag = (isAuthenticated: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (isAuthenticated) {
      window.localStorage.setItem(AUTH_BOOTSTRAP_KEY, "1");
    } else {
      window.localStorage.removeItem(AUTH_BOOTSTRAP_KEY);
    }
  } catch {
    // Ignore storage errors in restricted browser environments.
  }
};

const authProviderState = atom<AuthProviderState>(getUnauthenticatedState(), "authProviderState");

const syncAuthProviderState = async (auth0Client: Auth0Client) => {
  const isAuthenticated = await auth0Client.isAuthenticated();
  updateBootstrapFlag(isAuthenticated);
  authProviderState.set({
    isLoading: false,
    isAuthenticated,
    fetchAccessToken: async ({ forceRefreshToken }) => {
      try {
        const response = (await auth0Client.getTokenSilently({
          detailedResponse: true,
          cacheMode: forceRefreshToken ? "off" : "on",
        })) as GetTokenSilentlyVerboseResponse;
        assert(response, "Failed to fetch access token");
        return response.id_token;
      } catch {
        return null;
      }
    },
  });
};

let authClientPromise: Promise<Auth0Client> | null = null;

const createClient = async () => {
  const { createAuth0Client } = await import("@auth0/auth0-spa-js");
  const auth0Client = await createAuth0Client({
    domain: import.meta.env.VITE_AUTH0_DOMAIN!,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID!,
    // Keep auth state stable across redirects and client re-instantiation.
    useRefreshTokens: true,
    cacheLocation: "localstorage",
    authorizationParams: {
      redirect_uri: typeof window === "undefined" ? undefined : window.location.origin,
    },
  });

  if (hasAuthRedirectParams()) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await syncAuthProviderState(auth0Client);
  return auth0Client;
};

const getAuthClient = async () => {
  if (!authClientPromise) {
    authProviderState.set(getLoadingState());
    authClientPromise = createClient().catch((error) => {
      authClientPromise = null;
      updateBootstrapFlag(false);
      authProviderState.set(getUnauthenticatedState());
      throw error;
    });
  }
  return authClientPromise;
};

const convexURL = import.meta.env.VITE_CONVEX_URL;
assert(convexURL, "VITE_CONVEX_URL is not defined");

export const { client, clearAuth, reatomQuery, reatomMutation, reatomAction } = createReatomConvex(
  convexURL,
  authProviderState,
);

export const ensureAuthClient = action(() => {
  return getAuthClient();
}, "auth.ensureClient");

export const signIn = action(async () => {
  const auth0Client = await getAuthClient();
  return auth0Client.loginWithRedirect();
}, "auth.signIn");

export const signOut = action(async () => {
  clearAuth();
  updateBootstrapFlag(false);
  authProviderState.set(getUnauthenticatedState());

  const auth0Client = authClientPromise ? await authClientPromise : null;
  return auth0Client?.logout({
    logoutParams: {
      returnTo: typeof window === "undefined" ? undefined : window.location.origin,
    },
  });
});

if (hasAuthRedirectParams() || readBootstrapFlag()) {
  void getAuthClient();
}
