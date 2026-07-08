# MVP-07：可动部件配置 API

## 1. 任务目标

把“设为可动部件”从前端临时状态升级为后端数据库配置，提供按模型资产版本管理的可动部件查询、新增、更新、删除或禁用 API，并校验绑定对象是否存在于当前版本 object-tree。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-05 object-tree 可保存和查询。
- MVP-06 资产版本状态流转已完成。
- Draft / Ready / Published 的编辑边界已明确。

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
- 不允许实现 motion target API。
- 不允许实现前端 edit 保存。
- 不允许修改前端源码。
- 不允许改动模型文件。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查 object-tree 数据是否可用。
3. 检查资产版本状态流转是否可用。
4. 检查当前 git 状态，记录已有变更。
5. 定义可动部件查询响应 DTO。
6. 定义可动部件新增请求 DTO。
7. 定义可动部件更新请求 DTO。
8. 实现按 `assetId` 和 `versionId` 查询可动部件列表。
9. 实现新增可动部件。
10. 新增前校验资产和版本存在。
11. 新增前校验版本属于资产。
12. 新增前校验版本不是 Published。
13. 新增前校验 `partCode` 在同一 assetVersion 内唯一。
14. 新增前校验 `objectUuid` 或 `objectPath` 存在于 object-tree。
15. 新增前校验同一对象不重复绑定为多个 enabled 可动部件。
16. 新增前校验 `minValue <= homeValue <= maxValue`。
17. 新增前校验 `motionType`、`axisMode`、`axis` 组合合法。
18. 实现更新可动部件。
19. 更新前执行与新增一致的状态和字段校验。
20. 实现删除或禁用可动部件。
21. Published 版本禁止直接物理删除。
22. 删除 Draft / Ready 版本可物理删除或置 `enabled=false`，策略必须固定。
23. 写入操作审计。
24. 在 Swagger 验证查询接口。
25. 在 Swagger 验证新增接口。
26. 在 Swagger 验证重复 `partCode` 返回 409。
27. 在 Swagger 验证对象不存在返回 400 或 404。
28. 在 Swagger 验证范围错误返回 400。
29. 在 Swagger 验证 Published 版本禁止修改。
30. 运行 `dotnet build`。
31. 输出 API 响应、数据库记录、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `model_asset`
- `asset_version`
- `model_object_index`
- `movable_part_binding`

写入表：

- `movable_part_binding`
- `operation_audit`

关键字段：

- `asset_version_id`
- `object_uuid`
- `object_name`
- `object_path`
- `parent_uuid`
- `parent_path`
- `business_name`
- `part_code`
- `motion_type`
- `axis_mode`
- `axis`
- `custom_axis_x`
- `custom_axis_y`
- `custom_axis_z`
- `min_value`
- `max_value`
- `home_value`
- `current_value`
- `default_speed`
- `binding_status`
- `enabled`

约束：

- `asset_version_id + part_code` 唯一。
- 同一对象不应重复绑定为多个 enabled 可动部件。
- `objectUuid` 或 `objectPath` 必须存在于 object-tree。
- Published 版本不能直接修改。

索引：

- 使用 MVP-02 已建立的 `movable_part_binding.asset_version_id + enabled`。

Migration 名称建议：

- 本任务不建议创建 Migration；如缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| GET | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts` |
| POST | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts` |
| PUT | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts/{partId}` |
| DELETE | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts/{partId}` |

Request:

- `objectUuid`
- `objectName`
- `objectPath`
- `parentUuid`
- `parentPath`
- `businessName`
- `partCode`
- `motionType`
- `axisMode`
- `axis`
- `customAxisX`
- `customAxisY`
- `customAxisZ`
- `minValue`
- `maxValue`
- `homeValue`
- `currentValue`
- `defaultSpeed`
- `bindingStatus`
- `enabled`

Response:

- `partId`
- `assetId`
- `versionId`
- `businessName`
- `partCode`
- `bindingStatus`
- `enabled`
- `message`

校验规则：

- `partCode` 在同一 assetVersion 内唯一。
- `businessName` 建议在同一 assetVersion 内唯一。
- `objectUuid` 或 `objectPath` 必须存在于 object-tree。
- `minValue <= homeValue <= maxValue`。
- Published 版本不能直接修改。
- 同一对象不应重复绑定为多个 enabled 可动部件。

错误码：

- `400`: 字段缺失、范围错误、运动配置非法。
- `404`: 资产、版本、对象或可动部件不存在。
- `409`: `partCode` 重复、对象已绑定、版本状态不允许修改。

## 8. 前端变更

本任务不涉及前端变更。

后续 MVP-12 才允许前端在 edit 模式调用这些 API 保存配置。

## 9. 验收标准

- 可查询可动部件列表。
- 可新增可动部件。
- 可更新可动部件。
- 可删除或禁用可动部件。
- 重复 `partCode` 返回 409。
- 对象不存在返回 400 或 404。
- 范围错误返回 400。
- Published 版本禁止修改。
- 同一对象重复 enabled 绑定被拒绝。
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

- API 路由挂错到旧的 `/api/models/{modelId}/movable-parts`。
- Published 版本被直接修改，影响 monitor 稳定性。
- 只按 `objectUuid` 绑定，模型重新导出后失效。
- `partCode` 唯一范围错误，导致不同版本互相冲突。
- 运动轴配置校验不足，后续动画执行异常。

## 12. 回滚策略

- 删除本任务新增的可动部件 Controller、Service、DTO。
- 删除测试写入的 `movable_part_binding` 数据。
- 删除测试产生的操作审计记录。
- 保留 object-tree、asset version 和发布基础能力。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-07：可动部件配置 API。

当前只执行本任务，不执行 MVP-08 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-07-movable-part-api.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现 motion target API、前端 edit 保存、monitor 动画或 scene manifest，禁止使用 /api/models/{modelId}/movable-parts 旧路由，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
