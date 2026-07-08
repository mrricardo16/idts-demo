# MVP-09：场景 / 设备实例 / 设备模型绑定

## 1. 任务目标

建立“哪个区域放了哪些设备，每个设备绑定哪个模型版本”的 MVP 数据能力。优先用 Seed 数据建立默认场景、默认设备和 active 设备模型绑定，不急于开放完整管理页面。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-06 资产版本状态与发布基线已完成。
- 至少存在一个 Published `asset_version`。
- `scene_node`、`device_instance`、`device_model_binding` 表可用。

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
- 不允许实现 scene manifest。
- 不允许实现前端按场景加载。
- 不允许实现完整场景管理后台。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查 Published 资产版本是否存在。
3. 检查当前 git 状态，记录已有变更。
4. 定义默认场景 Seed 数据。
5. 创建默认厂区 `scene_node`。
6. 创建默认区域 `scene_node`。
7. 创建默认设备 `device_instance`，设备编码建议 `LIFTER-001`。
8. 为默认设备配置 position。
9. 为默认设备配置 rotation。
10. 为默认设备配置 scale。
11. 创建默认 `device_model_binding`。
12. 校验绑定的 `asset_version` 必须存在。
13. 校验 monitor 模式只允许绑定 Published 版本。
14. 校验同一 `device_instance` 同一时间只能有一个 active binding。
15. 发布新 active binding 时归档旧 active binding。
16. 回滚或切换绑定时继续保证 active 唯一。
17. 如需要最小 API，定义场景列表查询接口。
18. 如需要最小 API，定义场景设备查询接口。
19. 如需要最小 API，定义设备模型绑定更新接口。
20. 在 Swagger 或数据库中验证默认 scene_node 存在。
21. 验证默认 device_instance 存在。
22. 验证设备绑定 Published 版本。
23. 验证 active binding 唯一。
24. 运行 `dotnet build`。
25. 输出 Seed 数据、绑定验证、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `asset_version`
- `model_asset`
- `scene_node`
- `device_instance`
- `device_model_binding`

写入表：

- `scene_node`
- `device_instance`
- `device_model_binding`
- `operation_audit`，如实现绑定变更审计。

关键字段：

- `scene_node.parent_id`
- `scene_node.node_code`
- `scene_node.node_name`
- `scene_node.node_type`
- `scene_node.enabled`
- `device_instance.scene_node_id`
- `device_instance.device_code`
- `device_instance.device_name`
- `device_instance.position_x/y/z`
- `device_instance.rotation_x/y/z`
- `device_instance.scale_x/y/z`
- `device_model_binding.device_instance_id`
- `device_model_binding.model_asset_id`
- `device_model_binding.asset_version_id`
- `device_model_binding.binding_status`
- `device_model_binding.active_from`
- `device_model_binding.active_to`

约束：

- `device_instance.device_code` 唯一。
- `device_model_binding.device_instance_id + asset_version_id` 唯一。
- 同一 `device_instance` 同一时间只能有一个 active binding。
- active binding 必须指向 Published asset_version。

Migration 名称建议：

- 本任务不建议创建 Migration；如缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

本任务优先使用 Seed 数据，可不开放完整管理 API。

可选 API：

| Method | Route |
|---|---|
| POST | `/api/scenes` |
| GET | `/api/scenes` |
| POST | `/api/scenes/{sceneId}/devices` |
| GET | `/api/scenes/{sceneId}/devices` |
| PUT | `/api/devices/{deviceId}/model-binding` |

Request:

- 场景创建：`nodeCode`, `nodeName`, `parentId`, `nodeType`, `enabled`
- 设备创建：`deviceCode`, `deviceName`, `deviceType`, `position`, `rotation`, `scale`
- 绑定更新：`modelAssetId`, `assetVersionId`, `reason`

Response:

- `sceneId`
- `deviceId`
- `bindingId`
- `bindingStatus`
- `message`

校验规则：

- 设备必须属于某个 scene_node。
- 绑定的 asset_version 必须存在。
- monitor 模式只允许绑定 Published 版本。
- 同一 device_instance 同一时间只能有一个 active binding。
- 发布新绑定时旧 active 绑定必须归档。

错误码：

- `400`: 请求字段无效。
- `404`: 场景、设备、模型资产或版本不存在。
- `409`: 版本未 Published 或 active 绑定冲突。

## 8. 前端变更

本任务不涉及前端变更。

后续 MVP-10 提供 scene manifest，MVP-11 才允许前端按场景加载设备。

## 9. 验收标准

- 数据库有默认 scene_node。
- 数据库有默认 device_instance。
- 设备绑定 Published asset_version。
- 同一 device_instance 只能有一个 active binding。
- 发布新绑定时旧 active 归档。
- 回滚或切换绑定时仍保证 active 唯一。
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

- active binding 唯一规则只在代码中口头约束，没有落到可验证逻辑。
- 设备绑定 Draft 版本导致 monitor 加载未发布配置。
- Seed 数据重复执行产生重复设备。
- 坐标 transform 与前端坐标系语义不一致。
- 过早实现完整场景管理 API，扩大任务范围。

## 12. 回滚策略

- 删除本任务新增的 Seed 数据配置、场景设备服务和可选 Controller。
- 删除测试写入的 scene_node、device_instance、device_model_binding 数据。
- 保留模型资产、版本发布和 manifest 能力。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-09：场景 / 设备实例 / 设备模型绑定。

当前只执行本任务，不执行 MVP-10 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-09-scene-device-binding.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现 scene manifest、前端按场景加载、完整场景管理后台或 3D Tiles，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、Seed 数据验证、active 绑定验证、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
