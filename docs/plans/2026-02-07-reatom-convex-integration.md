# Reatom-Convex Integration for reatom/reusables

## Overview

Add a reatom-convex integration to the reatom/reusables repo (at ~/ghq/github.com/reatom/reusables) following existing jsrepo conventions. The integration provides reatomConvexClient, createReatomConvex (with reatomQuery, reatomMutation, reatomAction), and the AuthProviderState type. No bundling - distributed via jsrepo like all other reusables. Also reconcile the swaghaus reatomInstance (which uses withAsyncData instead of withAbort) with the reusables version.

## Context

- **Files involved** (all in ~/ghq/github.com/reatom/reusables unless noted):
  - Create: `src/reusables/convex/reatom-convex.ts` (reatomConvexClient + createReatomConvex factory)
  - Create: `src/reusables/convex/reatom-convex.meta.ts` (jsrepo registry metadata, type: reatom:integration)
  - Create: `src/reusables/convex/reatom-convex.test.ts` (vitest tests using the test reusable)
  - Create: `src/reusables/convex/reatom-convex.example.ts` (usage examples)
  - Create: `src/reusables/convex/reatom-convex.md` (documentation)
- **Related patterns**: existing reusables structure (5-file convention per utility), reatomInstance factory, withConnectHook/withDisconnectHook lifecycle
- **Dependencies**: convex (npm dependency declared in meta), @reatom/core (excluded via jsrepo config)
- **Registry dependency**: reatomInstance (declared in meta files[].registryDependencies)

## Guidelines

- **Testing approach**: TDD - write tests first, then implement
- Complete each task fully before moving to the next
- Follow reusables conventions exactly: test import from 'test', single quotes, no semicolons, 80-char width
- reatomConvexClient uses reatomInstance from the existing instance reusable (registry dependency)
- AuthProviderState is a plain type exported from the integration (generic, not tied to Auth0 or better-auth)
- The createReatomConvex factory takes (url, authProviderState) and returns { client, clearAuth, reatomQuery, reatomMutation, reatomAction }
- Two-phase auth: tracks both client-side and server-confirmed authentication
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Task 1: Reconcile reatomInstance differences

**Files:**
- Modify: `src/reusables/instance/reatom-instance.ts` (in reatom/reusables)

- [x] Compare swaghaus version (uses withAsyncData, no withAbort) vs reusables version (uses withAbort, no withAsyncData)
- [x] Determine if withAsyncData is needed for async create factories (swaghaus ConvexClient is sync but the extension was added for flexibility)
- [x] If needed, update reatomInstance to support both patterns or note the divergence
- [x] Run existing reatomInstance tests - must pass
- [x] Update tests if reatomInstance signature changed

## Task 2: Create reatom-convex integration - tests first

**Files:**
- Create: `src/reusables/convex/reatom-convex.test.ts`

- [ ] Write tests for reatomConvexClient: lazy creation, disposal on disconnect, uses reatomInstance
- [ ] Write tests for AuthProviderState type contract (loading, authenticated, unauthenticated states)
- [ ] Write tests for createReatomConvex factory: client creation with auth wiring, isAuthenticated two-phase tracking
- [ ] Write tests for reatomQuery: reactive args, subscription lifecycle, error handling, data updates
- [ ] Write tests for reatomMutation: action creation, passes args to client
- [ ] Write tests for reatomAction: action creation, passes args to client
- [ ] Write test for clearAuth behavior
- [ ] Tests should mock ConvexClient (import from convex/browser)
- [ ] Run tests - they should fail (no implementation yet)

## Task 3: Implement reatom-convex integration

**Files:**
- Create: `src/reusables/convex/reatom-convex.ts`

- [ ] Export AuthProviderState type (isLoading, isAuthenticated, fetchAccessToken)
- [ ] Implement reatomConvexClient(url, name?) using reatomInstance import
- [ ] Implement createReatomConvex(url, authProviderState) returning { client, clearAuth, reatomQuery, reatomMutation, reatomAction }
  - client: wraps reatomConvexClient with withConnectHook for auth state subscription, exposes isAuthenticated computed
  - reatomQuery: reactive args via computed, effect-based subscription to ConvexClient.onUpdate, error atom, connect/disconnect lifecycle
  - reatomMutation: action wrapping client().mutation()
  - reatomAction: action wrapping client().action()
  - clearAuth: resets isServerAuthenticated and calls client.clearAuth()
- [ ] Run tests from Task 2 - must pass

## Task 4: Create jsrepo meta, example, and documentation

**Files:**
- Create: `src/reusables/convex/reatom-convex.meta.ts`
- Create: `src/reusables/convex/reatom-convex.example.ts`
- Create: `src/reusables/convex/reatom-convex.md`

- [ ] Create meta file with name: 'reatomConvex', type: 'reatom:integration', files list, and registryDependencies: ['reatomInstance'] + npmDependencies for convex
- [ ] Create example showing: setting up auth state atom, creating convex integration, using reatomQuery with reactive args, using reatomMutation
- [ ] Create documentation with function signatures, parameter tables, auth flow explanation, and usage patterns
- [ ] Run jsrepo build to verify meta is picked up correctly

## Task 5: Update swaghaus to use reusable

**Files** (in ~/ghq/github.com/JamesCowling/swaghaus):
- Modify: `src/reatom-convex.ts` (replace with import from reusables copy or keep as-is with note)
- Modify: `src/reatomInstance.ts` (align with reusables version)

- [ ] Copy the reusable reatom-convex.ts into swaghaus src/reatom-convex.ts (or set up jsrepo add)
- [ ] Align src/reatomInstance.ts with reusables version (resolve withAbort vs withAsyncData difference)
- [ ] Verify app builds: `npm run build`
- [ ] Smoke test: `npm run dev` starts without errors

## Verification

- [ ] Run `pnpm test` in reatom/reusables - all tests pass
- [ ] Run `pnpm run jsrepo:build` - registry includes reatomConvex
- [ ] Verify reatom-convex.ts has no app-specific imports (no Auth0, no env vars, no Vite)
- [ ] Verify reatomConvexClient properly depends on reatomInstance via import
- [ ] Run `npm run build` in swaghaus - app compiles

## Cleanup

- [ ] Move this plan to `docs/plans/completed/`
