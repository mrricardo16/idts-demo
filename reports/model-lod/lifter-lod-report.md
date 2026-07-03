# 提升机 LOD 生成报告

- 输入模型：public/models/lifter.glb
- 输出目录：public/models/lifter
- 生成时间：2026-06-30T09:27:00.691Z
- gltf-transform：未安装

## 输出结果

| level | file | status | size | message |
| --- | --- | --- | --- | --- |
| high | public/models/lifter/lifter.high.glb | success | 279.61 MB | high 已复制 source 模型，用作当前高精档。 |
| medium | public/models/lifter/lifter.medium.glb | skipped | - | 未检测到 gltf-transform CLI，medium / low 未生成。请安装：npm install --global @gltf-transform/cli |
| low | public/models/lifter/lifter.low.glb | skipped | - | 未检测到 gltf-transform CLI，medium / low 未生成。请安装：npm install --global @gltf-transform/cli |

## 模型复杂度

当前阶段未内置 GLB 解析器，mesh / material / vertex / triangle 统计依赖 `gltf-transform inspect`。如果 CLI 未安装或命令失败，请先运行：

```bash
npm install --global @gltf-transform/cli
npm run model:inspect
```

## 语义对象检查

- 当前 manifest 中 `semantic.movableParts` 为空，无法自动验证可动部件是否在 medium / low 中保留。
- 自动简化不能代替业务语义拆分；正式模型仍需要在 CAD / Blender 中拆分并命名可动部件。

## 风险说明

- 本脚本不生成 BoxGeometry proxy。
- 本脚本不读取 `source-models` 下的 STEP / STP / CAD 源模型。
- 如果 medium / low 生成失败，前端仍会按现有策略回退到 source，并保留当前模型。
