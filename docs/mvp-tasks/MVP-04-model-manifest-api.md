# MVP-04：Manifest 查询接口

## 1. 任务目标

实现模型资产 manifest 查询接口，让前端后续可以通过后端返回的 manifest 加载模型文件、版本状态、transform 和可动部件摘要，避免前端长期硬编码模型路径。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-03 GLB 上传与文件存储已完成或已有可用 `model_asset`、`asset_version`、`model_asset_variant` 数据。
- `asset_manifest` 表可用。

## 3. 影响范围

预计影响范围：

- `server/src/IdtsTwin.Api/**`
- `server/src/IdtsTwin.Application/**`
- `server/src/IdtsTwin.Contracts/**`
- `server/src/IdtsTwin.Domain/**`
- `server/src/IdtsTwin.Infrastructure/**`
- `docs/**`

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许实现上传能力之外的新文件处理流程。
- 不允许实现 object-tree 保存接口。
- 不允许实现可动部件编辑 API。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查 MVP-03 上传产生的模型资产数据是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义 manifest 查询响应 DTO。
5. 定义 levels 资源结构。
6. 定义 transform 结构。
7. 定义 movableParts 摘要结构。
8. 实现按 `assetId` 查询模型资产。
9. 实现 `versionId` 可选查询。
10. 实现不传 `versionId` 时选择当前 Published 或 current version 的规则。
11. 实现 `mode=monitor` 只允许 Published 版本。
12. 实现 `mode=edit` 可读取 Draft / Ready 版本。
13. 查询 `model_asset_variant` 生成 levels。
14. 查询 `asset_manifest` 生成 manifest 快照。
15. manifest 不存在时返回 404。
16. 版本状态不允许时返回 409。
17. 确保文件 URL 由后端生成，不由前端拼接。
18. 在 Swagger 验证 manifest 查询。
19. 验证 Published 版本可返回。
20. 验证 Draft 在 monitor 模式被拒绝。
21. 验证不存在 manifest 返回 404。
22. 运行 `dotnet build`。
23. 输出 API 响应样例、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `model_asset`
- `asset_version`
- `model_asset_variant`
- `asset_manifest`
- `movable_part_binding`，可选读取摘要。

写入表：

- 原则上不写入表。
- 如 MVP-03 尚未生成基础 manifest，可允许写入最小 `asset_manifest` 测试数据，但必须说明来源和用途。

Migration 名称建议：

- 本任务不建议创建 Migration；如发现缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| GET | `/api/model-assets/{assetId}/manifest` |

Request:

- `assetId`: 路径参数。
- `versionId`: 可选 query。
- `mode`: 可选 query，默认 `monitor`。

Response:

- `assetId`
- `versionId`
- `assetCode`
- `assetName`
- `versionStatus`
- `levels`
- `transform`
- `movableParts`

校验规则：

- `assetId` 必须存在。
- 指定 `versionId` 时版本必须属于该资产。
- `monitor` 模式只能返回 Published 版本。
- Draft / Failed / Invalid 版本不能被 monitor 加载。
- manifest 文件 URL 必须由后端生成。

错误码：

- `404`: 资产、版本或 manifest 不存在。
- `409`: 版本状态不允许加载。
- `400`: mode 参数无效。

## 8. 前端变更

本任务不涉及前端变更。

后续 MVP-11 才允许前端读取该接口。

## 9. 验收标准

- 已发布版本能返回 manifest。
- Draft 在 monitor 模式被拒绝。
- edit 模式可读取 Draft / Ready。
- 不存在 manifest 返回 404。
- 版本状态不允许返回 409。
- manifest 中的文件 URL 由后端生成。
- `dotnet build` 通过。
- 无前端源码改动。

## 10. 回归测试

本任务不修改前端运行逻辑，但完成后仍需确认以下能力未被触碰：

- GLB 加载。
- 对象树。
- 查看子级 / 父级。
- 异常高亮。
- 异常 callout。
- WASD / 鼠标视角。
- monitor / edit guard。
- localStorage fallback。
- worldZ 任务移动。

## 11. 风险点

- monitor 模式误返回 Draft 或 Failed 版本。
- 文件 URL 拼接规则散落在多个地方。
- manifest 快照与实际文件变体不一致。
- 没有处理 asset 与 version 不匹配。
- 可动部件摘要过早做复杂，影响 MVP 边界。

## 12. 回滚策略

- 删除本任务新增的 manifest Controller、Application Service 和 DTO。
- 删除本任务新增的 manifest 测试数据。
- 保留 MVP-03 上传和文件存储能力。
- 不回滚数据库基础表。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-04：Manifest 查询接口。

当前只执行本任务，不执行 MVP-05 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-04-model-manifest-api.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现 object-tree 保存、model-stats、可动部件、motion target、scene manifest 或前端接入，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
