# MVP-10：Scene Manifest

## 1. 任务目标

提供场景加载清单接口，让前端后续可以按场景加载设备，而不是只加载单个 lifter。MVP 阶段只返回 active 设备绑定和 Published GLB 设备，`tilesets` 先返回空数组。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-04 Manifest 查询接口已完成。
- MVP-06 资产版本状态与发布基线已完成。
- MVP-09 场景、设备实例、设备模型绑定已完成。
- 至少存在一个 active 设备模型绑定。

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
- 不允许实现前端按场景加载。
- 不允许实现 3D Tiles 生产化。
- 不允许实现设备状态或任务系统。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查默认场景和设备绑定是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义 scene manifest 响应 DTO。
5. 定义 scene node 摘要结构。
6. 定义 device manifest item 结构。
7. 定义 tileset item 结构，MVP 返回空数组。
8. 实现按 `sceneId` 查询场景。
9. 查询 enabled 场景节点。
10. 查询场景下 enabled 设备实例。
11. 查询每个设备的 active 模型绑定。
12. 校验 active 绑定指向 Published asset_version。
13. 为每个设备生成 `manifestUrl`。
14. 返回设备 position。
15. 返回设备 rotation。
16. 返回设备 scale。
17. 对无效绑定选择返回 409 或跳过并记录 warning，策略必须固定。
18. 在 Swagger 验证 scene manifest。
19. 验证只返回 active 设备绑定。
20. 验证只返回 Published 版本。
21. 验证无效绑定处理。
22. 运行 `dotnet build`。
23. 输出 API 响应样例、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `scene_node`
- `device_instance`
- `device_model_binding`
- `model_asset`
- `asset_version`

写入表：

- 原则上不写入表。
- 如需要测试数据，应通过 MVP-09 Seed 数据提供，不在本任务新增业务写入。

约束：

- 只返回 enabled 场景节点。
- 只返回 enabled 设备。
- 只返回 active 设备模型绑定。
- 只返回 Published 模型版本。

Migration 名称建议：

- 本任务不建议创建 Migration；如缺字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| GET | `/api/scenes/{sceneId}/manifest` |

Request:

- `sceneId`: 路径参数。

Response:

- `sceneId`
- `sceneName`
- `sceneNodes`
- `devices[]`
- `devices[].deviceId`
- `devices[].deviceCode`
- `devices[].deviceName`
- `devices[].modelAssetId`
- `devices[].assetVersionId`
- `devices[].manifestUrl`
- `devices[].position`
- `devices[].rotation`
- `devices[].scale`
- `tilesets`
- `warnings`

校验规则：

- 场景必须存在。
- 只返回 active 设备绑定。
- 只返回 Published 版本。
- MVP 阶段 `tilesets` 返回空数组。
- 无效绑定返回 409，或跳过并记录 warning；实现前必须固定策略。

错误码：

- `404`: 场景不存在。
- `409`: 存在未发布或无效模型绑定。

## 8. 前端变更

本任务不涉及前端变更。

后续 MVP-11 才允许前端读取 scene manifest 并按场景加载 GLB。

## 9. 验收标准

- GET scene manifest 返回设备列表。
- 只返回 active 设备绑定。
- 只返回 Published 版本。
- `tilesets` 返回空数组。
- 每个设备包含 `manifestUrl`。
- 每个设备包含 position / rotation / scale。
- 无效绑定返回 409 或记录 warning，行为一致。
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

- scene manifest 返回 Draft 版本，破坏 monitor 只读边界。
- 无效绑定被静默忽略，现场难以排查。
- `manifestUrl` 与 MVP-04 路由不一致。
- transform 坐标单位与前端解释不一致。
- 提前引入 3D Tiles 生产化字段，扩大 MVP 范围。

## 12. 回滚策略

- 删除本任务新增的 scene manifest Controller、Service、DTO。
- 保留 MVP-09 场景和设备绑定数据。
- 不删除模型资产和发布数据。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-10：Scene Manifest。

当前只执行本任务，不执行 MVP-11 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-10-scene-manifest.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现前端按场景加载、3D Tiles 生产化、设备状态或任务系统，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
