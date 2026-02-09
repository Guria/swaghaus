import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { ConvexClient } from "convex/browser";
import {
  abortVar,
  action,
  atom,
  computed,
  effect,
  named,
  peek,
  wrap,
  withConnectHook,
  type Atom,
} from "@reatom/core";
import { reatomInstance } from "./reatomInstance";

/**
 * Auth provider state interface for Convex integration. Generic interface
 * compatible with Auth0, better-auth, or any auth system.
 */
export type AuthProviderState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (args: {
    forceRefreshToken: boolean;
  }) => Promise<string | null>;
};

/**
 * Creates a reactive Convex client atom using reatomInstance. The client is
 * created lazily on first subscription and disposed on disconnect.
 *
 * @param url - Convex deployment URL
 * @param name - Optional atom name (defaults to 'convexClient')
 */
export const reatomConvexClient = (url: string, name = "convexClient") => {
  return reatomInstance(
    () => new ConvexClient(url),
    (client) => client.close(),
    name,
  );
};

/**
 * Creates a Convex integration with Reatom, providing reactive queries,
 * mutations, and actions with two-phase authentication tracking.
 *
 * @param url - Convex deployment URL
 * @param authProviderState - Atom containing auth provider state
 */
export const reatomConvex = (
  url: string,
  authProviderState: Atom<AuthProviderState>,
) => {
  const authVersion = atom(0, "convexClient.authVersion");
  const isServerAuthenticated = atom<boolean | null>(
    null,
    "convexClient.isAuthenticated",
  );
  const isAuthenticated = computed(() => {
    const { isAuthenticated, isLoading } = authProviderState();
    const serverAuthenticated = isServerAuthenticated();
    if (isLoading) {
      return null;
    }

    if (!isAuthenticated) {
      return false;
    }

    return serverAuthenticated === true;
  });

  const client = reatomConvexClient(url).extend(
    withConnectHook((client) => {
      return authProviderState.subscribe(
        ({ fetchAccessToken, isAuthenticated, isLoading }) => {
          if (!isLoading) {
            if (isAuthenticated) {
              const currentVersion = authVersion.set((version) => version + 1);
              client().setAuth(
                fetchAccessToken,
                (backendReportsIsAuthenticated) => {
                  if (currentVersion === peek(authVersion)) {
                    isServerAuthenticated.set(backendReportsIsAuthenticated);
                  }
                },
              );
            } else {
              authVersion.set((version) => version + 1);
              try {
                client().client.clearAuth();
                isServerAuthenticated.set(false);
              } catch (error) {
                console.error("Failed to clear auth:", error);
                // Don't update isServerAuthenticated if clearAuth failed
                // to avoid UI showing logged out while client is still authenticated
              }
            }
          }
        },
      );
    }),
    () => ({ isAuthenticated }),
  );

  const clearAuth = () => {
    authVersion.set((version) => version + 1);
    try {
      client().client.clearAuth();
      isServerAuthenticated.set(false);
    } catch (error) {
      console.error("Failed to clear auth:", error);
      throw error; // Re-throw to let caller handle the failure
    }
  };

  const reatomQuery = <Query extends FunctionReference<"query">>(
    query: Query,
    argsOrName?: (() => FunctionArgs<Query>) | string,
    maybeName?: string,
  ) => {
    const argsFn =
      typeof argsOrName === "function"
        ? argsOrName
        : () => ({} as FunctionArgs<Query>);
    const name =
      typeof argsOrName === "string"
        ? argsOrName
        : (maybeName ?? named("convexQuery"));
    const args = computed(argsFn, `${name}.args`);
    const result = atom<Query["_returnType"] | undefined>(
      undefined,
      name,
    ).extend(() => {
      const error = atom<unknown | null>(null, `${name}.error`);
      return { error };
    });
    result.extend(
      withConnectHook(() => {
        effect(() => {
          const nextArgs = args();

          try {
            const unsub = client().onUpdate(
              query,
              nextArgs,
              wrap((data) => {
                result.error.set(null);
                result.set(data);
              }),
              wrap((error) => {
                result.error.set(error);
                result.set(undefined);
              }),
            );
            abortVar.subscribe(unsub);
          } catch (error) {
            result.error.set(error);
            result.set(undefined);
          }
        }, `${name}.effect`);
      }),
    );
    return result;
  };

  const reatomMutation = <Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    name: string = named("convexMutation"),
  ) => {
    return action(
      (args: FunctionArgs<Mutation>): Promise<FunctionReturnType<Mutation>> =>
        client().mutation(mutation, args),
      name,
    );
  };

  const reatomAction = <Action extends FunctionReference<"action">>(
    convexAction: Action,
    name: string = named("convexAction"),
  ) => {
    return action(
      (args: FunctionArgs<Action>): Promise<FunctionReturnType<Action>> =>
        client().action(convexAction, args),
      name,
    );
  };

  return {
    client,
    clearAuth,
    reatomQuery,
    reatomMutation,
    reatomAction,
  };
};
