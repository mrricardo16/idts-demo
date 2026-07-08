# MVP-05：Object-tree / Model-stats

## 1. 任务目标

建立后端保存和查询 object-tree / model-stats 的能力。MVP 推荐先由前端或脚本提取后上传，后端负责校验、保存、查询和供发布门禁使用，不在本任务中实现 Worker 自动解析 GLB。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-03 至少已有可用模型资产和资产版本。
- `model_object_index` 和 `asset_manifest` 表可用。

## 3. 影响范围

预计影响范围：

- `server/src/IdtsTwin.Api/**`
- `server/src/IdtsTwin.Application/**`
- `server/src/IdtsTwin.Contracts/**`
- `server/src/IdtsTwin.Domain/**`
- `server/src/IdtsTwin.Infrastructure/**`
- `doc/**`

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许实现 Worker 自动解析 GLB。
- 不允许实现 glTF Transform。
- 不允许实现 LOD。
- 不允许实现可动部件 API。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查模型资产和资产版本数据是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义 object-tree 保存请求 DTO。
5. 定义 object-tree 查询响应 DTO。
6. 定义 model-stats 保存请求 DTO。
7. 定义 model-stats 查询响应 DTO。
8. 校验 `assetId` 和 `versionId` 存在。
9. 校验版本属于指定资产。
10. 实现保存 object-tree 前删除同版本旧索引的策略。
11. 将 object-tree 节点写入 `model_object_index`。
12. 为 `object_uuid` 和 `object_path` 保持可查性。
13. 实现查询 object-tree。
14. 校验 model-stats 必需字段。
15. 将 model-stats 写入 manifest 快照或独立 JSON 字段。
16. 实现查询 model-stats。
17. 标记 model-stats 是否超预算。
18. 在 Swagger 验证保存 object-tree。
19. 在 Swagger 验证查询 object-tree。
20. 在 Swagger 验证保存 model-stats。
21. 在 Swagger 验证查询 model-stats。
22. 验证 object-tree 不存在时返回 404。
23. 验证字段缺失时返回 400。
24. 运行 `dotnet build`。
25. 输出 API 响应样例、数据库记录、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

写入表：

- `model_object_index`
- `asset_manifest`，用于保存或更新 `model_stats_json`

读取表：

- `model_asset`
- `asset_version`
- `model_object_index`
- `asset_manifest`

关键字段：

- `object_uuid`
- `object_name`
- `object_path`
- `parent_uuid`
- `parent_path`
- `object_type`
- `bounding_box_min_x/y/z`
- `bounding_box_max_x/y/z`
- `mesh_fingerprint`
- `model_stats_json`

约束：

- 同一 `asset_version_id` 下 `object_uuid` 建议可重复容忍但应可查询。
- 同一 `asset_version_id` 下 `object_path` 应尽量唯一；若实际 GLB 产生重复路径，应返回警告。
- object-tree 保存应以 `asset_version_id` 为边界。

索引：

- 使用 MVP-02 已建立的 `asset_version_id + object_uuid`。
- 使用 MVP-02 已建立的 `asset_version_id + object_path`。

Migration 名称建议：

- 本任务不建议创建 Migration；如发现缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| PUT | `/api/model-assets/{assetId}/versions/{versionId}/object-tree` |
| GET | `/api/model-assets/{assetId}/object-tree` |
| PUT | `/api/model-assets/{assetId}/versions/{versionId}/model-stats` |
| GET | `/api/model-assets/{assetId}/versions/{versionId}/model-stats` |

Object-tree Request:

- `nodes[]`
- `objectUuid`
- `objectName`
- `objectPath`
- `parentUuid`
- `parentPath`
- `objectType`
- `boundingBox`
- `meshFingerprint`

Model-stats Request:

- `fileSizeMb`
- `meshCount`
- `materialCount`
- `textureCount`
- `vertexCount`
- `triangleCount`
- `drawCallEstimate`
- `maxTextureSize`
- `hasMovableCandidates`
- `hasDuplicatedNames`
- `hasInvalidMaterials`
- `isOverBudget`
- `budgetMessages`

校验规则：

- 资产和版本必须存在。
- 版本必须属于资产。
- object-tree 节点必须包含 `objectPath` 或 `objectUuid`。
- model-stats 数值字段不能为负数。
- Published 版本是否允许覆盖 object-tree 需要明确策略，建议禁止直接覆盖。

错误码：

- `400`: 请求结构无效或字段缺失。
- `404`: 资产、版本、object-tree 或 model-stats 不存在。
- `409`: 版本状态不允许覆盖。

## 8. 前端变更

本任务不涉及前端变更。

后续 MVP-11 才允许前端读取 object-tree；后续工具或脚本可调用保存接口，但本任务不修改前端源码。

## 9. 验收标准

- 能保存 object-tree。
- 能查询 object-tree。
- `object_uuid` 可查。
- `object_path` 可查。
- 能保存 model-stats。
- 能查询 model-stats。
- model-stats 可用于发布门禁。
- object-tree 不存在时返回 404。
- 字段无效时返回 400。
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

- object-tree 覆盖策略不清导致丢失人工绑定依据。
- `objectUuid` 在模型重新导出后变化，不能作为唯一可靠绑定依据。
- `objectPath` 重复导致可动部件绑定歧义。
- model-stats 保存位置不清，影响 MVP-06 发布门禁。
- 在本任务中过早引入 Worker 自动解析，扩大范围。

## 12. 回滚策略

- 删除本任务新增的 object-tree 和 model-stats Controller、Service、DTO。
- 删除测试写入的 `model_object_index` 数据。
- 删除测试写入的 `model_stats_json`。
- 保留模型资产、文件上传和基础表结构。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-05：Object-tree / Model-stats。

当前只执行本任务，不执行 MVP-06 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-05-object-tree-model-stats.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现 Worker 自动解析 GLB、glTF Transform、LOD、可动部件、motion target、发布流程或前端接入，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、数据库记录验证、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
