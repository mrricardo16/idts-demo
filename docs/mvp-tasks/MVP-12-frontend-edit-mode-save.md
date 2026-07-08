# MVP-12：前端 Edit 模式保存可动部件与目标点位

## 1. 任务目标

让前端 edit 模式下的“设置可动部件”和 motion target 配置保存到后端，而不是只存在 localStorage 或前端运行态。monitor 模式继续保持只读，禁止修改配置。

## 2. 前置条件

- MVP-07 可动部件配置 API 已完成。
- MVP-08 Motion Target API 已完成。
- MVP-11 前端已能读取后端 manifest / object-tree。
- 前端已有 monitor / edit 模式边界。
- 后端可返回明确错误码和错误信息。

## 3. 影响范围

预计影响范围：

- `src/api/**`
- `src/engine/**`
- `src/views/TwinDemo.vue`
- `src/styles/**`
- `docs/**`

实际执行时必须先扫描当前 edit 模式、可动部件配置、localStorage 和目标点位相关代码后再确认精确范围。

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许修改 monitor 模式为可编辑。
- 不允许移除本地 fallback。
- 不允许修改 worldZ 动画执行算法。
- 不允许实现完整权限审批流。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 读取当前 monitor / edit 模式 guard 代码。
3. 读取当前设置可动部件逻辑。
4. 读取当前 motion target 或 F1/F2/F3/F4 配置来源。
5. 读取当前 localStorage 配置读写逻辑。
6. 检查当前 git 状态，记录已有变更。
7. 新增或扩展可动部件 API 调用。
8. 新增或扩展 motion target API 调用。
9. edit 模式下允许选择对象。
10. edit 模式下允许设置为可动部件。
11. edit 模式下允许填写 `businessName`。
12. edit 模式下允许填写 `partCode`。
13. edit 模式下允许填写 `motionType`。
14. edit 模式下允许填写 `axisMode` 和 `axis`。
15. edit 模式下允许填写 `minValue`、`maxValue`、`homeValue`。
16. edit 模式下允许填写 `defaultSpeed`。
17. edit 模式下允许配置 motion target。
18. 保存可动部件时调用后端 POST 或 PUT。
19. 保存 motion target 时调用后端 POST 或 PUT。
20. 后端返回 400 时显示字段错误。
21. 后端返回 404 时提示对象或配置不存在。
22. 后端返回 409 时提示 `partCode` 或 `targetCode` 冲突。
23. monitor 模式下隐藏或禁用保存入口。
24. monitor 模式下禁止设置可动部件。
25. monitor 模式下禁止修改 motion target。
26. 刷新页面后从后端重新读取配置。
27. 后端不可用时保留本地 fallback，但不得伪装为已保存到后端。
28. 运行 `cmd /c npm run build`。
29. 验证 edit 保存可动部件。
30. 验证 edit 保存 motion target。
31. 验证 monitor 禁止保存。
32. 输出构建结果、回归结果和 git diff 摘要。

## 6. 数据库变更

本任务不涉及数据库变更。

数据库写入由 MVP-07 和 MVP-08 后端 API 完成。

## 7. API 变更

本任务不新增后端 API。

前端消费 API：

| Method | Route |
|---|---|
| GET | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts` |
| POST | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts` |
| PUT | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts/{partId}` |
| DELETE | `/api/model-assets/{assetId}/versions/{versionId}/movable-parts/{partId}` |
| GET | `/api/movable-parts/{partId}/motion-targets` |
| POST | `/api/movable-parts/{partId}/motion-targets` |
| PUT | `/api/movable-parts/{partId}/motion-targets/{targetId}` |
| DELETE | `/api/movable-parts/{partId}/motion-targets/{targetId}` |

错误处理：

- `400`: 显示字段校验失败。
- `404`: 显示对象、可动部件或目标点位不存在。
- `409`: 显示编码冲突或版本状态不允许修改。
- 网络错误: 显示后端不可用，不标记为后端保存成功。

## 8. 前端变更

API 调用：

- edit 模式保存可动部件。
- edit 模式保存 motion target。
- 刷新后读取后端配置。

状态变化：

- 增加保存中状态。
- 增加保存成功状态。
- 增加保存失败状态。
- 区分后端配置和本地 fallback 配置。

UI 变化：

- edit 模式显示保存入口。
- monitor 模式隐藏或禁用保存入口。
- 后端错误显示明确提示。

fallback 规则：

- 后端可用时以后端配置为准。
- 后端不可用时可读本地 fallback。
- 本地 fallback 不代表正式保存成功。

回归范围：

- monitor / edit guard。
- localStorage fallback。
- 对象选择。
- 可动部件标记展示。
- worldZ 任务移动。

## 9. 验收标准

- edit 模式可保存可动部件。
- edit 模式可保存 motion target。
- monitor 模式不能保存可动部件。
- monitor 模式不能修改 motion target。
- 刷新后可从后端读取配置。
- 重复 `partCode` 有提示。
- 重复 `targetCode` 有提示。
- object 不存在有提示。
- 后端失败时前端有错误提示。
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

- monitor 模式误开放保存入口。
- 后端保存失败但 UI 显示成功。
- localStorage fallback 覆盖后端配置。
- 编辑 Draft 配置误影响 Published monitor 配置。
- 前端字段名与后端 DTO 不一致。
- 目标点位保存顺序和可动部件保存顺序不一致。

## 12. 回滚策略

- 删除本任务新增的前端保存 API 调用。
- 恢复 edit 模式为本地运行态配置。
- 保留后端 MVP-07 和 MVP-08 API。
- 保留本地 fallback。
- 不修改 `public/models/lifter.glb`。
- 不回滚用户已有无关前端变更。

## 13. Codex 执行提示词

```text
请执行 MVP-12：前端 Edit 模式保存可动部件与目标点位。

当前只执行本任务，不执行 MVP-13 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-12-frontend-edit-mode-save.md。
先扫描当前 edit 模式、monitor guard、可动部件、motion target、localStorage fallback 相关代码，输出精确影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止让 monitor 模式可编辑，禁止移除本地 fallback，禁止修改 public/models/lifter.glb，禁止重写无关 src 文件。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、npm build 结果、edit 保存验证、monitor 禁止编辑验证、回归测试情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
