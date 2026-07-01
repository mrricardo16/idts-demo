# Factory Scale Roadmap

This document records later-stage research directions for factory-scale digital twin scenes. These items are not implemented in the current demo. They should only be evaluated after stages 0 to 11 are stable.

## When To Consider 3D Tiles

Use 3D Tiles when the scene grows beyond a manageable set of GLB chunks:

- multiple buildings
- large-range roaming
- many floors and areas visible across long distances
- GLB manifest and chunk files become hard to maintain manually
- real streaming and tile-level culling are required
- asset updates need spatial hierarchy instead of per-device manual wiring

3D Tiles should not be the first optimization step for the current lifter demo. The current path should remain:

1. GLB preprocessing
2. `high / medium / low` LOD
3. chunk manifest
4. hitbox picking
5. budget checks
6. then evaluate 3D Tiles

## When To Consider OffscreenCanvas

Use OffscreenCanvas only when main-thread contention becomes measurable:

- Vue panel interactions become delayed while Three.js renders.
- frame time spikes correlate with UI state updates.
- renderer work and business panels clearly block each other.
- performance traces show main-thread render pressure that cannot be solved by model optimization or lower LOD.

OffscreenCanvas adds communication complexity. It should not be used to hide an over-detailed asset pipeline problem.

## When To Consider GPU Picking

Use GPU picking when CPU Raycaster no longer meets interaction targets:

- Raycaster hit-test latency P95 is greater than 150 ms.
- area scenes contain too many selectable objects for CPU raycasting.
- users need dense object picking in a large visible area.
- layered hitbox picking is no longer enough.

Before GPU picking, keep the current layered approach:

- overview mode picks device-level hitboxes.
- detail mode picks only selected-device descendants.
- business task targets are bound manually or by semantic names.

GPU picking can improve large selection sets, but it also adds render passes, ID encoding, and readback concerns.

## When To Consider KTX2

Use KTX2 texture compression when texture memory becomes the bottleneck:

- `renderer.info.memory.textures` keeps increasing.
- large PBR texture sets dominate load time or memory.
- many repeated assets use uncompressed PNG/JPG textures.
- mobile or integrated GPU targets are in scope.

The current demo uses ordinary PNG/JPG resources and does not force `scene.environment`. KTX2 should be evaluated after a real texture-heavy GLB set exists.

## Meshopt And Draco

Default preference:

- Use Meshopt for general mesh compression and runtime performance.
- Use Draco when network bandwidth is the dominant constraint or the asset type benefits from heavier geometry compression.

Tradeoffs:

- Meshopt usually has better decode/runtime characteristics for interactive web scenes.
- Draco can reduce geometry transfer size significantly, but decode cost and tooling compatibility must be measured.
- Compression cannot replace semantic model splitting. A compressed monolithic GLB is still hard to bind to business objects.

## Final Factory-Scale Architecture

Recommended long-term architecture:

- offline asset pipeline
- CAD/STEP preprocessing outside the runtime app
- GLB semantic naming and origin correction
- `source / high / medium / low / proxy` asset levels
- model manifest and area chunk manifest
- chunk loader with priority queue
- low/medium default loading for overview
- high detail only for explicit selection or close inspection
- transparent device hitboxes for overview picking
- selected-device mesh picking for internal parts
- world-axis task movement for business animation
- telemetry for FPS, draw calls, triangles, geometries, and textures
- model budget check in CI
- rollback strategy for bad model assets

## CI And Rollback

CI should eventually run:

```bash
npm run model:budget
npm run build
```

When the model budget check becomes blocking, asset teams must provide either:

- a lighter GLB
- generated LOD levels
- corrected semantic names
- a documented exception with expected performance impact

Runtime releases should be able to roll back to the previous manifest or previous model asset set if a new model causes severe performance or interaction regressions.

## Current Stage Boundary

The current stage does not implement:

- 3D Tiles
- OffscreenCanvas
- GPU Picking
- KTX2 pipeline
- Meshopt loader changes
- Draco loader changes
- real backend-driven asset streaming

These remain research topics until the current GLB manifest, LOD, chunk loading, hitbox picking, resource disposal, and model budget checks are stable.
