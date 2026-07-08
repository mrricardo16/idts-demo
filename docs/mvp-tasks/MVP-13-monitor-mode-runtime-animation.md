# MVP-13：Monitor 模式只读配置并驱动动画

## 1. 任务目标

让 monitor 模式从后端 Published 配置读取可动部件和 motion target，并以只读配置驱动 worldZ 动画，逐步替代前端硬编码的 F1/F2/F3/F4 目标点位。

## 2. 前置条件

- MVP-07 可动部件配置 API 已完成。
- MVP-08 Motion Target API 已完成。
- MVP-10 Scene Manifest 已完成。
- MVP-11 前端接后端 manifest / object-tree 已完成。
- MVP-12 edit 模式保存配置已完成。
- 已存在 Published 版本配置。

## 3. 影响范围

预计影响范围：

- `src/api/**`
- `src/engine/**`
- `src/views/TwinDemo.vue`
- `src/styles/**`
- `doc/**`

实际执行时必须先扫描当前任务动画、F1/F2/F3/F4、worldZ、monitor guard 和可动部件 runtime 状态代码后再确认精确范围。

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许开放 monitor 编辑能力。
- 不允许实现 local axis、rotate、path、AGV path 或 joint。
- 不允许接真实任务系统。
- 不允许移除本地 fallback。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 读取当前 worldZ 任务动画代码。
3. 读取当前 F1/F2/F3/F4 目标点位来源。
4. 读取当前 monitor / edit guard 代码。
5. 读取当前可动部件 runtime 状态代码。
6. 检查当前 git 状态，记录已有变更。
7. 新增或扩展 monitor 模式读取可动部件 API 调用。
8. 新增或扩展 monitor 模式读取 motion target API 调用。
9. monitor 加载 Published manifest。
10. monitor 加载 enabled movable-parts。
11. monitor 加载 enabled motion-targets。
12. 将后端 target 映射为任务目标选项。
13. 对 MVP 支持范围限定为 `motionType=linear`。
14. 对 MVP 支持范围限定为 `axisMode=world`。
15. 对 MVP 支持范围限定为 `axis=z`。
16. 点击目标点位后读取 `targetValue`。
17. 根据 `minValue` 和 `maxValue` 校验目标值。
18. 超出范围时 clamp 或拒绝，策略必须固定。
19. 使用现有 worldZ 动画执行移动。
20. 保持 monitor 模式禁止编辑配置。
21. 后端配置不可用时进入本地 fallback。
22. 本地 fallback 不再伪装为 Published 后端配置。
23. 保留异常模拟能力。
24. 保留对象树和对象点击能力。
25. 运行 `cmd /c npm run build`。
26. 验证 monitor 能读取可动部件。
27. 验证 monitor 能读取目标点位。
28. 验证点击目标点位后沿 worldZ 移动。
29. 验证 monitor 仍禁止编辑。
30. 输出构建结果、回归结果和 git diff 摘要。

## 6. 数据库变更

本任务不涉及数据库变更。

数据库读取由 MVP-07 和 MVP-08 后端 API 完成。

## 7. API 变更

本任务不新增后端 API。

前端消费 API：

| Method | Route |
|---|---|
| GET | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts` |
| GET | `/api/movable-parts/{partId}/motion-targets` |

前端校验规则：

- 只消费 Published 版本配置。
- 只消费 enabled 可动部件。
- 只消费 enabled 目标点位。
- MVP 只执行 `linear + world + z`。
- 超出 min/max 的 target 拒绝或 clamp，策略固定。

错误处理：

- `404`: 配置不存在，进入 fallback。
- `409`: 版本状态不允许，进入 fallback 并提示。
- 网络错误: 进入 fallback。

## 8. 前端变更

API 调用：

- monitor 模式读取可动部件。
- monitor 模式读取 motion target。

状态变化：

- 增加后端 Published motion config 状态。
- 增加目标点位加载状态。
- 增加目标点位加载失败原因。

UI 变化：

- 任务目标来源改为后端 target。
- monitor 模式只展示目标点位，不显示保存入口。

fallback 规则：

- 后端 Published 配置优先。
- 后端不可用时使用本地 fallback。
- fallback 不代表正式 Published 配置。

回归范围：

- worldZ 动画。
- monitor / edit guard。
- 对象树。
- 异常高亮。
- WASD / 鼠标视角。

## 9. 验收标准

- monitor 模式能读取后端可动部件。
- monitor 模式能读取后端目标点位。
- 点击目标点位后载货台沿 worldZ 移动。
- 不再依赖硬编码 F1/F2/F3/F4 作为唯一来源。
- 超出 min/max 时 clamp 或拒绝。
- monitor 模式仍禁止编辑配置。
- 后端不可用时 fallback 正常。
- `cmd /c npm run build` 通过。

## 10. 回归测试

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

- 任务动画直接依赖后端字段，缺少 fallback 导致不可用。
- monitor 模式误开放编辑入口。
- 硬编码目标点位未清理干净，和后端配置重复显示。
- local axis / rotate / path 被提前实现，扩大范围。
- targetValue 与当前模型坐标单位不一致。
- 动画执行后 currentValue 与后端状态语义不清。

## 12. 回滚策略

- 删除本任务新增的 monitor 读取 motion 配置逻辑。
- 恢复原本本地目标点位驱动方式。
- 保留 MVP-12 edit 保存能力。
- 保留本地 fallback。
- 不修改 `public/models/lifter.glb`。
- 不回滚用户已有无关前端变更。

## 13. Codex 执行提示词

```text
请执行 MVP-13：Monitor 模式只读配置并驱动动画。

当前只执行本任务，不执行 MVP-14 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-13-monitor-mode-runtime-animation.md。
先扫描当前 worldZ、F1/F2/F3/F4、monitor guard、可动部件 runtime 状态和 fallback 代码，输出精确影响范围，等待我确认后再修改文件。
禁止跨任务扩展，MVP 只支持 linear + world + z，禁止实现 local axis、rotate、path、AGV path、joint 或真实任务系统，禁止让 monitor 可编辑，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、npm build 结果、后端配置驱动动画验证、monitor 禁止编辑验证、回归测试情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
