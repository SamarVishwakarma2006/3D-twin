# Inside / Digital Twin Studio

An interactive educational product twin built with Next.js, React, TypeScript, React Three Fiber, Drei and Zustand. The included smartphone is a **procedural teaching model**, not manufacturer CAD. Its component relationships and repair information are labeled as demo data.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and choose **Try Interactive Demo**. No API key, database, remote font, model download or paid AI provider is required for the demo.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

For browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

To use an installed Edge browser instead of downloading Chromium, set `PLAYWRIGHT_CHANNEL=msedge` (PowerShell: `$env:PLAYWRIGHT_CHANNEL='msedge'`). Tests cover desktop and mobile viewports. GitHub Actions runs typecheck, lint, unit tests, production build and browser tests on pushes and pull requests.

## Working features

- Product name, manufacturer and model entry; up to six JPEG/PNG/WebP images with signature, decoded dimensions and size validation. Object URLs are released. Images remain in the browser.
- Honest local category matching with explicit candidate confirmation. Images are **not visually recognized** by the local provider.
- 15 components, a synchronized navigator and inspector, orbit/pan/zoom, camera reset, focus, isolation, hide/show, fullscreen, quality settings, light/dark themes and command search (Ctrl/Cmd+K).
- X-ray intensity; interpolated exploded transforms for a whole product or selected subsystem.
- Directed dependency graph with filtering, pan, zoom, selection, focus, status labels and links back to the 3D view.
- Deterministic failure/degradation propagation, structured what-if queries, baseline comparison, reset, undo and up to 20 session scenarios.
- Structured repair context, component-linked inspection steps, professional-service warnings, replacement requirements and explainable compatibility checks.
- A clearly labeled, deterministic local assistant grounded in the current product, selection, relationships, simulation, viewer state and repair context. Safe context actions require a click.
- Product JSON import/export from the navigator. Invalid definitions do not replace the current product. Missing/corrupt GLTF assets or invalid node mappings fall back to procedural geometry with an explicit notice.

## Architecture

`src/data/smartphone.ts` contains the demo definition. `src/lib/product.ts` defines Zod schemas and reference validation. Each important fact can override its component's source via `factSources`. Sources include type, title, optional URL, confidence, verification status and update date.

`src/lib/graph.ts` provides graph queries and cycle detection. Edges point **from provider to consumer**: battery → connector → power controller → board. Ancestors are upstream providers; descendants are downstream consumers. Cycles are reported and traversals use visited sets.

`src/lib/simulation.ts` uses a monotone, finite fixed-point traversal: healthy < degraded < failed. Required failure edges can disable a consumer; optional or degradation edges degrade it. A degraded provider cannot promote a consumer to complete failure. `propagation: none` stops propagation. Cycles terminate. This is a qualitative single-fault model, not electrical, thermal or mechanical physics.

`src/lib/store.ts` separates immutable product data from selection, visualization and simulation state. Selection is canonical across all views. Scenarios never edit the product definition. Reset clears the current scenario while retaining session history; undo removes the latest scenario and activates its predecessor.

`src/components/Viewer.tsx` lazily loads the WebGL renderer. Procedural components use explicit geometry and assembled/exploded positions. `src/lib/model.ts` validates GLTF mappings and clones/disposes per-instance materials without disposing cached source geometry. `PartDetail.tsx` generates small local textures for illustrative markings.

`src/lib/providers.ts` defines interfaces for identification, AI, product data, digital twins, parts and repair documentation. Implement only providers that are needed. The local assistant is deterministic and does not pretend to be an LLM. Provider exceptions route to the labeled local fallback.

## Add a product or component

1. Export the demo JSON from **Product dataset → Export JSON**, or use its typed definition as a starting point.
2. Assign a unique product ID, component IDs and system IDs. Every component must reference that product and a declared system.
3. Provide a function, purpose, specifications, provenance, supported failure modes, safety notes, repair data, replacement requirements, model-node mapping and fallback geometry.
4. Use `parentComponentId` for physical hierarchy. It is distinct from dependency direction. Hierarchy cycles, missing parents and broken repair references are rejected.
5. Import the JSON into the workspace. Schema/reference errors are shown and the existing product remains usable. Cycle/unconnected-component warnings are displayed.

The schema is category-independent. The built-in data and appearance markings demonstrate a smartphone; adding other categories does not require changing the graph or simulation engines.

## Add a GLTF/GLB model

Place a model in `public/models/` and set `model3D` to `{ "type": "gltf", "url": "/models/device.glb" }`. HTTPS assets are also supported if the host permits CORS. Add each logical component's exact node names to `modelNodeIds`; names are not inferred from component labels. One component may map to multiple nodes. Assign each node to only one logical component. Use non-overlapping node roots when configuring explosion; an ancestor and descendant both mapped for motion can compound offsets.

Use scene units consistent with the fallback geometry and exploded offsets. Procedural geometry remains required as a fallback. Skinned models, CAD conversion, compressed asset pipelines and automatic scale normalization are not implemented. No copyrighted CAD assets are bundled.

## Dependencies, failures and repair data

Each dependency declares its type, criticality, whether it is required, propagation behavior, description and provenance. Only explicitly allowed component failure states can be injected. Binary failure, disconnect and other supported non-degraded states use the declared edge rules; degraded, intermittent, overheating and reduced-performance states propagate degradation. Do not add a physical failure mode without supporting data.

Repair steps reference `componentIds` to focus corresponding geometry. The demo supplies educational inspection context, **not a model-specific disassembly procedure**. Add manufacturer documentation and service steps only with source evidence. Real battery, high-voltage or other hazardous repairs need appropriate professional guidance.

## Replacement and compatibility

`replacement.requirements` is an extensible record of model, generation, connector, dimensions, voltage/current, protocol, mounting, firmware, thermal and other constraints. A known mismatch yields `NOT_COMPATIBLE`. Missing values remain unknown. Partial matches produce `POTENTIALLY_COMPATIBLE`; zero known matches produce `UNKNOWN`. `VERIFIED_COMPATIBLE` requires all recorded checks to match plus trusted verified source evidence. User-entered candidate values never establish verification. Search links open a generic web search; no inventory or purchasing integration is implied.

## Configure an AI provider

No external adapter is enabled. `.env.example` lists an optional future server-side credential name only. Setting `AI_API_KEY` alone does **not** enable a provider.

Implement `AIProvider` in a server-only module and add a bounded, validated route for its calls. Build context from trusted product definitions and the deterministic engine; never let generated text choose propagation results or certify compatibility. Pass the adapter to `withLocalFallback`, label the actual provider/source, and keep all credentials on the server (never `NEXT_PUBLIC_*`). Add provider-specific timeout, rate limiting, response validation and integration tests before enabling it. The existing `/api/identify` route demonstrates validated metadata input; the browser uses the local matcher directly so demo intake does not need a network request.

## Known limitations

- One bundled educational dataset. No exact product recognition, image-to-3D, manufacturer catalogue, real parts inventory or external LLM adapter.
- State and history are temporary; no account, database or persistent chat. Export product definitions before leaving.
- AI answers are constrained local explanations; open-ended factual questions are declined. What-if parsing supports named/selected components and a small explicit verb vocabulary.
- The graph represents functional relationships, not calibrated physical simulation. Multiple simultaneous injected faults and numeric electrothermal analysis are not supported.
- Mobile uses a viewer-first layout with collapsible panels below it. Touch orbit/pinch/pan come from OrbitControls.
- WebGL failure preserves non-3D tools. Device and browser GPU support still determine rendering availability. A Three.js clock deprecation warning may originate from React Three Fiber; it does not prevent rendering.
- Public deployment should add request-level rate limits and monitoring appropriate to the host before connecting paid providers or accepting persistent uploads.

## Validation

Unit tests cover parsing, invalid references, paths/cycles, failure propagation and immutability, what-if rules, compatibility, shared workspace state, identification/API validation, image validation, local assistant fallback and model material ownership. Browser tests exercise the primary journey on desktop and mobile. No real credentials, user images or generated build output are committed.
