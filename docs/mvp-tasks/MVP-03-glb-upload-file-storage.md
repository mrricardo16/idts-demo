# MVP-03：文件存储与 GLB 上传

## 1. 任务目标

实现 MVP 一期 GLB 上传入口，完成文件校验、SHA256 计算、文件落盘、模型资产记录创建、资产版本创建、source 变体记录创建和转换任务记录创建。该任务只支持 GLB，不做 CAD 转换、LOD、3D Tiles 或前端接入。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- `model_asset`、`asset_version`、`model_asset_variant`、`model_conversion_job` 表可用。
- 文件存储根目录策略已明确，开发环境可先使用本地目录。

## 3. 影响范围

预计影响范围：

- `server/src/IdtsTwin.Api/**`
- `server/src/IdtsTwin.Application/**`
- `server/src/IdtsTwin.Contracts/**`
- `server/src/IdtsTwin.Domain/**`
- `server/src/IdtsTwin.Infrastructure/**`
- `server/**/appsettings*.json`
- `doc/**`

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许实现 manifest 查询。
- 不允许实现 object-tree / model-stats。
- 不允许实现可动部件或 motion target。
- 不允许接入 3D Tiles。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查 MVP-02 数据库表是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义上传请求 DTO。
5. 定义上传响应 DTO。
6. 定义文件存储配置项。
7. 实现文件扩展名校验，只允许 `.glb`。
8. 实现 MIME 辅助校验，不把 MIME 作为唯一依据。
9. 实现空文件校验。
10. 实现文件大小限制校验。
11. 实现 SHA256 计算。
12. 查询 `model_asset.source_file_hash` 是否已存在。
13. 处理 hash 未命中场景。
14. 保存原始 GLB 文件到配置目录。
15. 创建 `model_asset` 记录。
16. 创建 `asset_version` Draft 记录。
17. 创建 `model_asset_variant` source 记录。
18. 创建 `model_conversion_job` upload / inspect 记录。
19. 处理 hash 命中场景。
20. 明确 hash 命中时返回已有资产或创建新版本的 MVP 策略。
21. 增加上传失败时的文件清理逻辑。
22. 增加上传失败时的数据库事务回滚。
23. 在 Swagger 验证上传接口。
24. 使用合法 GLB 验证成功上传。
25. 使用非 GLB 文件验证拒绝。
26. 使用重复 GLB 验证 hash 识别。
27. 运行 `dotnet build`。
28. 输出 API 响应、数据库记录、文件落盘路径、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

写入表：

- `model_asset`
- `asset_version`
- `model_asset_variant`
- `model_conversion_job`

关键写入字段：

- `model_asset.asset_code`
- `model_asset.asset_name`
- `model_asset.source_file_name`
- `model_asset.source_file_hash`
- `model_asset.source_file_type = glb`
- `model_asset.asset_type = device_glb` 或 `static_glb`
- `model_asset.processing_status`
- `asset_version.version_status = Draft`
- `model_asset_variant.variant_level = source`
- `model_asset_variant.file_url`
- `model_asset_variant.file_hash`
- `model_asset_variant.file_size`
- `model_conversion_job.job_type = upload` 或 `inspect`
- `model_conversion_job.status = pending`

约束：

- `assetCode` 冲突返回 409。
- `source_file_hash` 命中按 MVP 策略复用已有资产或创建新版本。

Migration 名称建议：

- 本任务不建议创建 Migration；如发现 MVP-02 缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| POST | `/api/model-assets/upload` |

Request:

- `file`: GLB 文件。
- `assetCode`: 资产编码。
- `assetName`: 资产名称。
- `assetType`: `device_glb` 或 `static_glb`。
- `sourceFileType`: `glb`。

Response:

- `assetId`
- `versionId`
- `jobId`
- `processingStatus`
- `message`

校验规则：

- 文件不能为空。
- 文件扩展名必须为 `.glb`。
- `sourceFileType` 必须为 `glb`。
- `assetType` 只能为 `device_glb` 或 `static_glb`。
- `assetCode` 必填且唯一。
- 文件大小不得超过配置上限。

错误码：

- `400`: 文件为空、格式不支持、字段缺失。
- `409`: `assetCode` 冲突。
- `413`: 文件超过上传限制。
- `500`: 文件存储失败或任务创建失败。

## 8. 前端变更

本任务不涉及前端变更。

不得新增前端上传页面，不得修改 `src/api/**`，不得修改模型加载逻辑。

## 9. 验收标准

- Swagger 可上传 GLB。
- 数据库出现 `model_asset`。
- 数据库出现 Draft `asset_version`。
- 数据库出现 source `model_asset_variant`。
- 数据库出现 `model_conversion_job`。
- 文件保存到配置目录。
- 重复文件 hash 可识别。
- 非 GLB 文件被拒绝。
- `assetCode` 冲突返回 409。
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

- 文件保存成功但数据库写入失败导致孤儿文件。
- 数据库写入成功但文件保存失败导致无效资产。
- 仅依赖 MIME 判断文件类型。
- hash 命中策略没有写清楚，后续版本管理混乱。
- 上传目录暴露路径不安全。
- 大文件上传限制与现场部署反向代理限制不一致。

## 12. 回滚策略

- 删除本任务新增的上传 Controller、Service、DTO、文件存储实现和配置。
- 删除测试上传产生的本地文件。
- 删除测试上传产生的数据库记录。
- 保留 MVP-01 和 MVP-02 基础结构。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-03：文件存储与 GLB 上传。

当前只执行本任务，不执行 MVP-04 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-03-glb-upload-file-storage.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现 manifest、object-tree、model-stats、可动部件、motion target、scene manifest 或前端接入，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、上传 API 验证结果、数据库记录验证、文件落盘结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
