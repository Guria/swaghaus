import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { ConvexClient } from "convex/browser";
import {
  action,
  atom,
  computed,
  effect,
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
export const createReatomConvex = (
  url: string,
  authProviderState: Atom<AuthProviderState>,
) => {
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
              client().setAuth(
                fetchAccessToken,
                (backendReportsIsAuthenticated) => {
                  isServerAuthenticated.set(backendReportsIsAuthenticated);
                },
              );
            } else {
              isServerAuthenticated.set(false);
              client().client.clearAuth();
            }
          }
        },
      );
    }),
    () => ({ isAuthenticated }),
  );

  const clearAuth = () => {
    isServerAuthenticated.set(false);
    client().client.clearAuth();
  };

  const reatomQuery = <Query extends FunctionReference<"query">>(
    query: Query,
    argsFn: () => FunctionArgs<Query>,
    name?: string,
  ) => {
    const queryName = name ?? "convexQuery";
    const args = computed(argsFn, `${queryName}.args`);
    const result = atom<Query["_returnType"] | undefined>(
      undefined,
      queryName,
    ).extend(() => {
      const error = atom<unknown | null>(null, `${queryName}.error`);
      return { error };
    });
    result.extend(
      withConnectHook(() => {
        let unsubscribe: (() => void) | null = null;
        const stop = effect(() => {
          const nextArgs = args();
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }

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
          unsubscribe = () => unsub();
        }, `${queryName}.effect`);

        return () => {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          stop.unsubscribe();
        };
      }),
    );
    return result;
  };

  const reatomMutation = <Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    name?: string,
  ) => {
    const mutationName = name ?? "convexMutation";
    return action(
      (args: FunctionArgs<Mutation>): Promise<FunctionReturnType<Mutation>> =>
        client().mutation(mutation, args),
      mutationName,
    );
  };

  const reatomAction = <Action extends FunctionReference<"action">>(
    convexAction: Action,
    name?: string,
  ) => {
    const actionName = name ?? "convexAction";
    return action(
      (args: FunctionArgs<Action>): Promise<FunctionReturnType<Action>> =>
        client().action(convexAction, args),
      actionName,
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
