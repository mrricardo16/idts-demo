# Model Asset Guideline

This document is the model asset rule set for the IDTS Three.js demo and later factory-scale research.

## Runtime Asset Boundary

- CAD source files such as STEP, STP, IGES, and FBX are not runtime assets.
- Runtime assets should be GLB files under `public/models`.
- Large GLB files, STEP files, and STP files should stay out of Git unless the team explicitly approves the size and purpose.
- `source-models` may keep only placeholder files such as `.gitkeep` in the repository.

## GLB Naming

- The default source model is `public/models/lifter.glb`.
- Generated LOD models should use:
  - `public/models/lifter/lifter.high.glb`
  - `public/models/lifter/lifter.medium.glb`
  - `public/models/lifter/lifter.low.glb`
  - `public/models/lifter/lifter.proxy.glb`, only when a real proxy model is provided
- Model resource metadata should be described by `public/models/lifter/manifest.json`.

## LOD Rules

- `source` is the original converted GLB for debugging and semantic verification.
- `high` is the detailed display level for close inspection.
- `medium` is the default target for normal device-level viewing.
- `low` is the target for area and overview scenes.
- `proxy` is optional and must be a real GLB. The demo does not generate BoxGeometry proxy placeholders.

Do not load all high-detail models at once in a large scene. Use `medium` or `low` by default and load higher detail only through explicit UI or later controlled streaming logic.

## Semantic Object Rules

Business-critical parts must keep stable names in the GLB:

- fixed frame: `lifter-frame`
- whole device root: `lifter-main`
- movable platform: `lifter-platform`

If a converted CAD model only contains auto-generated names such as `NAUOxxx`, those names may be used temporarily for debugging, but they should not become long-term business bindings.

## Movable Part Rules

- Movable parts must be separated from static frame objects.
- Movable part origins should be placed so world-Z movement is predictable after model transform.
- Do not instance movable parts.
- Do not merge movable parts into a static optimized mesh.
- Task targets should move by world Z, not by child local Z.

## Optimization Rules

- Use glTF Transform or equivalent tooling to generate `high / medium / low` models.
- Use mesh simplification, texture compression, and material cleanup where the visual target allows it.
- Use `InstancedMesh` only for repeated static objects such as pallets, fence posts, sensors, lights, or standard shells.
- Do not use instancing for objects that need independent selection, alarm state, animation, or task execution.

## Performance Budget

The current budget check is configured in:

```text
config/model-budget.json
```

Run:

```bash
npm run model:budget
```

The current stage reports warnings only. Later CI can change `warnOnly` to `false` to fail the check when assets exceed the budget.

The budget check covers:

- file size
- mesh count
- material count
- vertex count
- triangle count
- manifest existence
- default model path existence
- optional `high / medium / low` files
- accidental STEP / STP / IGES / FBX files

## CI Draft

A later CI job can run:

```bash
npm run model:budget
npm run build
```

CI should block accidental source-model commits and models that exceed agreed runtime budgets. The current demo keeps checks non-blocking so the existing high-detail research model can still be used while LOD files are being prepared.
