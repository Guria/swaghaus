import {
  atom,
  wrap,
  type Atom,
  withConnectHook,
  withDisconnectHook,
  withAbort,
  abortVar,
  reset,
  computed,
  effect,
  action,
} from "@reatom/core";
import { ConvexClient } from "convex/browser";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

export const reatomConvexClient = (url: string, name = "convexClient") => {
  const resource = computed(() => {
    const client = new ConvexClient(url);
    abortVar.subscribe(() => client.close());
    return client;
  }, name).extend(
    withAbort(),
    withDisconnectHook(() => {
      resource.abort("disconnect");
      reset(resource);
    }),
  );
  return resource;
};

export type AuthProviderState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
};

export const createReatomConvex = (url: string, authProviderState: Atom<AuthProviderState>) => {
  const isServerAuthenticated = atom<boolean | null>(null, "convexClient.isAuthenticated");
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
      return authProviderState.subscribe(({ fetchAccessToken, isAuthenticated, isLoading }) => {
        if (!isLoading) {
          if (isAuthenticated) {
            client().setAuth(fetchAccessToken, (backendReportsIsAuthenticated) => {
              isServerAuthenticated.set(backendReportsIsAuthenticated);
            });
          } else {
            isServerAuthenticated.set(false);
            client().client.clearAuth();
          }
        }
      });
    }),
    () => ({ isAuthenticated }),
  );
  const clearAuth = () => {
    isServerAuthenticated.set(false);
    client().client.clearAuth();
  };
  return {
    client,
    clearAuth,
    reatomQuery: <Query extends FunctionReference<"query">>(
      query: Query,
      argsFn: () => FunctionArgs<Query>,
      name?: string,
    ) => {
      const queryName = name ?? "convexQuery";
      const args = computed(argsFn, `${queryName}.args`);
      const result = atom<Query["_returnType"] | undefined>(undefined, queryName).extend(() => {
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
    },
    reatomMutation: <Mutation extends FunctionReference<"mutation">>(
      mutation: Mutation,
      name?: string,
    ) => {
      const mutationName = name ?? "convexMutation";
      return action(
        (args: FunctionArgs<Mutation>): Promise<FunctionReturnType<Mutation>> =>
          client().mutation(mutation, args),
        mutationName,
      );
    },
    reatomAction: <Action extends FunctionReference<"action">>(
      convexAction: Action,
      name?: string,
    ) => {
      const actionName = name ?? convexAction.toString() ?? "convexAction";
      return action(
        (args: FunctionArgs<Action>): Promise<FunctionReturnType<Action>> =>
          client().action(convexAction, args),
        actionName,
      );
    },
  };
};
