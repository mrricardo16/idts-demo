---
name: idts-demo-maintenance
description: Maintain the local idts-demo WebGL / Three.js proof-of-concept project. Use when Codex changes, reviews, builds, or diagnoses this repository, especially Three.js scene logic, Vue UI, mock data, model loading, GLB processing, fallback geometry, README updates, npm build verification, or project-boundary decisions.
---

# IDTS Demo Maintenance

## Scope

Treat this repository as the independent `idts-demo` technical demo for industrial digital twin WebGL / Three.js validation.

- Do not modify `HZ.IDTS.UI`, `HZ.IDTS.API`, or any legacy project code from this skill.
- Do not connect to a real backend, database, login system, permission system, or formal menu unless the user explicitly asks.
- Keep runtime state and business data mocked by default.
- Keep the work scoped to this repository and the named feature, page, scene, model, or workflow.

## Change Workflow

Before editing files:

1. State the expected impact scope in Chinese.
2. Read the current source involved in the requested change.
3. Preserve UTF-8 encoding. If a file appears non-UTF-8 or Chinese text looks corrupted, stop and ask the user before rewriting it.

When changing functionality:

- Keep Three.js logic modular under engine/config/helper modules. Do not pile scene, loader, interaction, status, and render logic into a Vue component.
- Prefer existing project patterns and existing modules over new abstractions.
- Use mock data unless the user explicitly changes the project boundary.
- Update `README.md` whenever behavior, feature workflow, model handling, model optimization, fallback behavior, or developer commands change.

Before finishing code changes, run:

```bash
npm run build
```

Report build success or the exact failure.

## Model Rules

- Do not commit STEP, STP, IGES, FBX, or other CAD source model files.
- Keep `source-models/.gitkeep` if the folder needs to stay in the tree.
- Put the converted lightweight runtime model at `public/models/lifter.glb`.
- Preserve recognizable `mesh.name` values in real GLB objects when processing or replacing the model.
- If `public/models/lifter.glb` is missing, the app must fall back to a geometry-based scene instead of failing blank.

## Encoding Rules

- Keep all edited files UTF-8.
- Do not convert files to ANSI or GBK.
- Do not corrupt existing Chinese comments, UI copy, logs, README text, or config labels.
- If encoding is uncertain, ask the user before doing broad rewrites or format-only edits.
