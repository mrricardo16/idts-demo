# MVP-06：资产版本状态与发布基线

## 1. 任务目标

建立 Draft / Ready / Published / Archived / Failed / Invalid 的资产版本状态流转，形成发布、归档、回滚和发布前门禁的最小闭环，确保 monitor 模式只读取 Published 配置。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-03 已能创建模型资产和 Draft 版本。
- MVP-04 已能查询 manifest。
- MVP-05 已能保存 object-tree 和 model-stats。

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
- 不允许实现可动部件编辑 API。
- 不允许实现 motion target API。
- 不允许实现场景设备绑定。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查资产、版本、manifest、object-tree 和 model-stats 数据是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义资产版本状态枚举的允许流转规则。
5. 实现 Draft 标记为 Ready 的应用服务。
6. 在 mark-ready 前检查 manifest 是否存在。
7. 在 mark-ready 前检查 object-tree 是否存在。
8. 在 mark-ready 前检查 model-stats 是否存在。
9. 实现 Ready 发布为 Published 的应用服务。
10. 发布前检查 Failed / Invalid 禁止发布。
11. 发布前检查 model-stats 超预算策略。
12. 发布前检查 enabled 可动部件绑定状态；如 MVP-07 尚未执行，应保留空集合通过规则。
13. 发布前检查 motion target 配置；如 MVP-08 尚未执行，应保留空集合通过规则。
14. 发布新版本时归档同一 `model_asset` 的旧 Published 版本。
15. 发布新版本时更新 `model_asset.current_version_id`。
16. 写入 `operation_audit` 发布记录。
17. 实现 archive 接口。
18. 实现 rollback 接口。
19. 回滚时恢复上一 Published 版本。
20. 回滚时保证同一 `model_asset` 只有一个 Published 版本。
21. 回滚时保证同一 `device_instance` 同一时间只有一个 active 绑定；如 MVP-09 尚未执行，应保留服务层检查入口。
22. 在 Swagger 验证 mark-ready。
23. 在 Swagger 验证 publish。
24. 在 Swagger 验证 archive。
25. 在 Swagger 验证 rollback。
26. 验证 Failed / Invalid 不能发布。
27. 验证发布后旧 Published 归档。
28. 运行 `dotnet build`。
29. 输出 API 响应、状态流转结果、审计记录、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `model_asset`
- `asset_version`
- `asset_manifest`
- `model_object_index`
- `movable_part_binding`
- `motion_target`
- `device_model_binding`

写入表：

- `asset_version`
- `model_asset`
- `operation_audit`
- `device_model_binding`，仅在 MVP-09 已存在 active 绑定时更新归档状态。

关键字段：

- `asset_version.version_status`
- `asset_version.published_time`
- `asset_version.archived_time`
- `model_asset.current_version_id`
- `operation_audit.operation_type`
- `operation_audit.before_json`
- `operation_audit.after_json`

约束：

- 同一 `model_asset` 只能有一个 Published 版本。
- Failed / Invalid 禁止发布。
- 回滚后仍只能有一个 Published 版本。
- 同一 `device_instance` 同一时间只能存在一个 active / Published 模型绑定。

Migration 名称建议：

- 本任务不建议创建 Migration；如缺少状态字段或审计字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| POST | `/api/model-assets/{assetId}/versions/{versionId}/mark-ready` |
| POST | `/api/model-assets/{assetId}/versions/{versionId}/publish` |
| POST | `/api/model-assets/{assetId}/versions/{versionId}/archive` |
| POST | `/api/model-assets/{assetId}/versions/{versionId}/rollback` |

Request:

- `assetId`: 路径参数。
- `versionId`: 路径参数。
- `reason`: 可选，发布、归档或回滚原因。

Response:

- `assetId`
- `versionId`
- `previousStatus`
- `currentStatus`
- `message`

校验规则：

- 资产和版本必须存在。
- 版本必须属于资产。
- Draft 可以标记 Ready。
- Ready 可以发布。
- Published 可以归档。
- Failed / Invalid 禁止发布。
- 发布前 manifest、object-tree、model-stats 必须存在。

错误码：

- `400`: 状态流转非法或请求无效。
- `404`: 资产或版本不存在。
- `409`: 发布门禁失败、已有冲突 Published、绑定状态无效。

## 8. 前端变更

本任务不涉及前端变更。

后续前端只在 edit 模式使用发布能力，本任务不修改前端页面或状态。

## 9. 验收标准

- Ready 版本可发布。
- 发布后旧 Published 归档。
- 同一 `model_asset` 只有一个 Published。
- Failed / Invalid 不能发布。
- 发布前缺少 manifest 会阻断。
- 发布前缺少 object-tree 会阻断。
- 发布前缺少 model-stats 会阻断。
- 发布写入 `operation_audit`。
- rollback 可恢复上一 Published 版本。
- 回滚后 Published 唯一。
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

- 状态流转散落在 Controller 中，后续难以维护。
- 发布时旧 Published 未归档，monitor 读取到多个版本。
- 回滚只改版本状态，未同步设备 active 绑定。
- 发布门禁依赖 MVP-07 / MVP-08 数据时处理空集合不清晰。
- 审计记录缺失，无法追踪发布误操作。

## 12. 回滚策略

- 删除本任务新增的版本状态 Controller、Service、DTO。
- 恢复测试数据的版本状态。
- 删除本任务产生的测试审计记录。
- 保留资产上传、manifest、object-tree 和 model-stats 能力。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-06：资产版本状态与发布基线。

当前只执行本任务，不执行 MVP-07 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-06-asset-version-publish-baseline.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现可动部件 API、motion target API、场景设备绑定或前端接入，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、发布和回滚验证结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
