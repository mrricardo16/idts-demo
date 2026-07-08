# MVP-08：Motion Target API

## 1. 任务目标

把 F1/F2/F3/F4 等目标点位从前端硬编码升级为后端配置，提供按可动部件管理的目标点位查询、新增、更新、删除或禁用 API，并校验目标值与可动部件运动范围一致。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-06 资产版本状态与发布基线已完成。
- MVP-07 可动部件配置 API 已完成。
- `movable_part_binding` 和 `motion_target` 表可用。

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
- 不允许实现前端 edit 保存。
- 不允许实现 monitor 动画。
- 不允许实现场景设备绑定。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查可动部件配置是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义 motion target 查询响应 DTO。
5. 定义 motion target 新增请求 DTO。
6. 定义 motion target 更新请求 DTO。
7. 实现按 `partId` 查询目标点位列表。
8. 实现新增目标点位。
9. 新增前校验可动部件存在。
10. 新增前校验所属版本不是 Published。
11. 新增前校验 `targetCode` 在同一 movablePart 下唯一。
12. 新增前校验 linear 模式必须提供 `targetValue`。
13. 新增前校验 `targetValue` 在 `minValue` 和 `maxValue` 范围内。
14. 新增前校验 `targetX/Y/Z` 与当前 MVP 支持范围一致。
15. 实现更新目标点位。
16. 更新前执行与新增一致的状态和字段校验。
17. 实现删除或禁用目标点位。
18. Published 版本目标点位禁止直接物理删除。
19. Draft / Ready 版本删除策略固定为物理删除或 `enabled=false`。
20. 写入操作审计。
21. 在 Swagger 验证查询接口。
22. 在 Swagger 验证新增接口。
23. 在 Swagger 验证重复 `targetCode` 返回 409。
24. 在 Swagger 验证超出运动范围返回 400。
25. 在 Swagger 验证 Published 版本禁止修改。
26. 运行 `dotnet build`。
27. 输出 API 响应、数据库记录、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `movable_part_binding`
- `motion_target`
- `asset_version`

写入表：

- `motion_target`
- `operation_audit`

关键字段：

- `movable_part_id`
- `target_code`
- `target_name`
- `target_value`
- `target_x`
- `target_y`
- `target_z`
- `sort_no`
- `enabled`

约束：

- `movable_part_id + target_code` 唯一。
- `targetValue` 应在可动部件 `minValue` / `maxValue` 范围内。
- Published 版本不能直接修改目标点位。

索引：

- 使用 MVP-02 已建立的 `motion_target.movable_part_id + enabled`。

Migration 名称建议：

- 本任务不建议创建 Migration；如缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| GET | `/api/movable-parts/{partId}/motion-targets` |
| POST | `/api/movable-parts/{partId}/motion-targets` |
| PUT | `/api/movable-parts/{partId}/motion-targets/{targetId}` |
| DELETE | `/api/movable-parts/{partId}/motion-targets/{targetId}` |

Request:

- `targetCode`
- `targetName`
- `targetValue`
- `targetX`
- `targetY`
- `targetZ`
- `sortNo`
- `enabled`

Response:

- `targetId`
- `partId`
- `targetCode`
- `targetName`
- `targetValue`
- `targetX`
- `targetY`
- `targetZ`
- `sortNo`
- `enabled`
- `message`

校验规则：

- `targetCode` 在同一 movablePart 下唯一。
- linear 模式至少需要 `targetValue`。
- `targetValue` 应在 `minValue` / `maxValue` 范围内。
- Published 版本不能直接修改。
- 删除 Published 版本目标点位时应走新版本草稿，不直接物理删除。

错误码：

- `400`: 目标值无效、字段缺失、范围错误。
- `404`: 可动部件或目标点位不存在。
- `409`: `targetCode` 重复或版本状态不允许修改。

## 8. 前端变更

本任务不涉及前端变更。

后续 MVP-12 才允许前端在 edit 模式保存目标点位；后续 MVP-13 才允许 monitor 模式读取目标点位驱动动画。

## 9. 验收标准

- 能新增目标点位。
- 能查询目标点位。
- 能更新目标点位。
- 能删除或禁用目标点位。
- 重复 `targetCode` 返回 409。
- 超出运动范围返回 400。
- Published 版本禁止修改。
- 监控端后续可读取 enabled 目标点位。
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

- 目标点位允许写入超出 min/max 的值。
- Published 版本被直接修改。
- `targetCode` 唯一范围错误。
- 三维 target 坐标和 linear targetValue 同时存在时语义不清。
- 前端旧硬编码 F1/F2/F3/F4 与后端配置并存时产生冲突。

## 12. 回滚策略

- 删除本任务新增的 motion target Controller、Service、DTO。
- 删除测试写入的 `motion_target` 数据。
- 删除测试产生的操作审计记录。
- 保留可动部件配置 API。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-08：Motion Target API。

当前只执行本任务，不执行 MVP-09 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-08-motion-target-api.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现前端 edit 保存、monitor 动画、场景设备绑定或 scene manifest，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
