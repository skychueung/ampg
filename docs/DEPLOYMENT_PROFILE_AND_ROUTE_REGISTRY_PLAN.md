# AMPGen Deployment Profile and Route Registry Plan

Date: 2026-06-11
Scope: Standard Demo and Server-Only UI parity planning
Status: design only

## Boundary

This document is a planning artifact. It does not change runtime behavior, start
or stop services, submit generation jobs, run large batches, enable
`SERVER_PRODUCTION`, or modify STAMP.

The goal is to make the UI route surface explicit so Standard Demo and
Server-Only deployments can share code without accidentally exposing the wrong
workflow.

## Problem

AMPGen currently has at least two deployment surfaces:

- Standard Demo: public/demo-oriented navigation and generation flow.
- Server-Only UI: server-bound navigation and backend-backed generation flow.

When route availability and generation behavior are encoded ad hoc in
components, the project becomes harder to audit:

- Sidebar parity becomes manual.
- Server-only restrictions are easy to miss.
- Demo-only routes may appear in server deployments.
- Scientific boundary text can drift across views.
- Runtime config checks are spread across components.

## Design Goals

- Make deployment identity explicit.
- Centralize route visibility and navigation labels.
- Centralize generation permissions by profile.
- Preserve existing working routes during migration.
- Support smoke tests that can prove the active deployment surface.
- Keep scientific disclaimers and validation boundaries visible where needed.

## Proposed Deployment Profile

Add a small typed profile module later, for example:

```ts
export type DeploymentProfileName = "standard-demo" | "server-only";

export interface DeploymentProfile {
  name: DeploymentProfileName;
  displayName: string;
  backendBaseUrl: string;
  allowLocalDemoGeneration: boolean;
  allowServerGeneration: boolean;
  requireServerProduction: boolean;
  showScientificBoundary: boolean;
}
```

Possible source file:

```text
app/src/config/deploymentProfile.ts
```

The profile should be selected from explicit build/runtime configuration, not
from incidental route state.

## Proposed Route Registry

Add a central route registry later, for example:

```ts
export interface AppRouteDefinition {
  id: string;
  path: string;
  label: string;
  component: React.ComponentType;
  profiles: DeploymentProfileName[];
  sidebar: boolean;
  requiresBackend: boolean;
  requiresServerGeneration: boolean;
  riskLevel: "safe" | "server-bound" | "restricted";
  disabledReason?: string;
}
```

Possible source file:

```text
app/src/routes/routeRegistry.tsx
```

The sidebar and router should eventually read from the same registry so the UI
cannot show a route that the router does not own.

## Candidate Route Policy

| Route kind | Standard Demo | Server-Only | Notes |
| --- | --- | --- | --- |
| Home / status | Visible | Visible | Should show active profile clearly |
| Sequence scoring | Visible | Visible | Backend availability determines action state |
| Local demo generation | Visible if demo-safe | Hidden or disabled | Server-only must not silently use local demo behavior |
| Server generation | Disabled unless configured | Visible when backend policy allows | Must respect `SERVER_PRODUCTION` boundary |
| Batch views | Demo-safe only | Server-bound only | No automatic batch submission |
| Scientific boundary / validation note | Visible | Visible | Wording should be shared |

## Generation Policy

Route visibility is not enough. The generation action should also have a
profile-aware policy:

```ts
export interface GenerationPolicy {
  allowSubmit: boolean;
  submitMode: "none" | "demo" | "server";
  requiresBackend: boolean;
  requiresServerProduction: boolean;
  disabledReason?: string;
}
```

Expected rules:

- Standard Demo may expose demo-safe actions only.
- Server-Only must use backend-backed routes for generation.
- If server production mode is required but not enabled, the submit control
  must be disabled with an explicit reason.
- UI parity should not mean identical risk behavior.

## Migration Plan

### Phase 0: Planning

- Record this plan.
- Do not change app routing yet.
- Do not change generation behavior yet.

### Phase 1: Passive Profile

- Add a profile module.
- Render or log the active profile in development-safe ways.
- Keep current route behavior unchanged.

### Phase 2: Passive Route Registry

- Add route definitions that mirror current routes.
- Add tests that compare registry paths to existing router paths.
- Keep sidebar behavior unchanged until parity is proven.

### Phase 3: Sidebar From Registry

- Generate navigation from route registry.
- Preserve current visual order.
- Add smoke checks for Standard Demo and Server-Only navigation.

### Phase 4: Router From Registry

- Move router ownership to the route registry.
- Preserve redirects and fallback behavior.
- Add profile-specific route smoke tests.

### Phase 5: Generation Policy

- Move submit enablement rules to a profile-aware generation policy.
- Add tests for disabled states, backend-required states, and
  server-production-required states.
- Keep real compute out of tests unless explicitly approved.

## Smoke Criteria

For each profile:

- The app loads.
- Sidebar labels match allowed route definitions.
- Forbidden routes are absent or explicitly disabled.
- Generation submit state matches profile policy.
- Scientific boundary text is present where required.
- No call is made to batch or real generation endpoints during smoke.

## Non-Goals

- No batch generation.
- No `SERVER_PRODUCTION` enablement.
- No service restart.
- No deployment push.
- No artifact, database, or model-weight movement.
- No STAMP changes.

## Open Questions

- Should the active profile be selected by build-time env, backend endpoint, or
  a combination?
- Should the backend expose a profile/status endpoint consumed by the frontend?
- Which routes are truly shared, and which are visually similar but
  scientifically different?
- Should route registry tests run in frontend unit tests, Playwright smoke, or
  both?
