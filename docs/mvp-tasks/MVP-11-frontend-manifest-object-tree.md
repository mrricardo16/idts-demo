# MVP-11：前端接后端 Manifest / Object-tree

## 1. 任务目标

让前端从后端读取 scene manifest、model manifest 和 object-tree，同时保留本地静态 JSON、`public/models/lifter.glb` 和几何体场景 fallback，避免后端不可用时 Demo 失效。

## 2. 前置条件

- MVP-03 GLB 上传和文件存储已有可用模型资产。
- MVP-04 Manifest 查询接口已完成。
- MVP-05 Object-tree / Model-stats 已完成。
- MVP-09 场景 / 设备实例 / 设备模型绑定已有可用数据。
- MVP-10 Scene Manifest 已完成。
- 后端服务可在本地启动。

## 3. 影响范围

预计影响范围：

- `src/api/**`
- `src/engine/**`
- `src/views/TwinDemo.vue`
- `src/styles/**`
- `config/**`
- `doc/**`

实际执行时必须先扫描当前源码后再确认精确范围。

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许修改任务 worldZ 算法。
- 不允许修改异常高亮主逻辑。
- 不允许修改 WASD / 鼠标视角主逻辑。
- 不允许接 CAD。
- 不允许接 3D Tiles。
- 不允许移除本地 fallback。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 读取当前前端模型加载代码。
3. 读取当前对象树生成和展示代码。
4. 读取当前 fallback 到 `public/models/lifter.glb` 的逻辑。
5. 读取当前异常模拟和 worldZ 任务动画逻辑。
6. 检查当前 git 状态，记录已有变更。
7. 定义后端 API base URL 配置来源。
8. 新增或扩展 scene manifest API 调用。
9. 新增或扩展 model manifest API 调用。
10. 新增或扩展 object-tree API 调用。
11. 实现加载优先级：后端 scene manifest。
12. 实现加载优先级：后端 model manifest。
13. 实现加载优先级：后端 object-tree。
14. 实现加载优先级：本地静态 JSON fallback。
15. 实现加载优先级：`public/models/lifter.glb` fallback。
16. 保留 GLB 缺失时几何体 fallback。
17. 将后端 manifest 的文件 URL 交给模型加载层。
18. 将后端 object-tree 交给对象树展示层。
19. 后端不可用时显示非阻塞提示。
20. 后端返回 404 / 409 时进入 fallback 并记录原因。
21. 确保对象点击仍能定位到对象树节点。
22. 确保查看子级 / 父级仍正常。
23. 确保异常模拟仍正常。
24. 确保 worldZ 任务移动仍正常。
25. 运行 `cmd /c npm run build`。
26. 如有本地后端可用，验证后端优先加载。
27. 关闭或断开后端，验证 fallback 正常。
28. 输出构建结果、回归结果和 git diff 摘要。

## 6. 数据库变更

本任务不涉及数据库变更。

## 7. API 变更

本任务不新增后端 API。

前端消费 API：

| Method | Route |
|---|---|
| GET | `/api/scenes/{sceneId}/manifest` |
| GET | `/api/model-assets/{assetId}/manifest` |
| GET | `/api/model-assets/{assetId}/object-tree` |

前端处理规则：

- `200`: 使用后端返回数据。
- `404`: 进入本地 fallback。
- `409`: 进入本地 fallback，并提示版本状态或绑定状态不允许加载。
- 网络错误: 进入本地 fallback。

## 8. 前端变更

API 调用：

- 新增 scene manifest 获取能力。
- 新增 model manifest 获取能力。
- 新增 object-tree 获取能力。

状态变化：

- 增加数据来源状态，例如 `backend`、`local-json`、`local-glb`、`geometry-fallback`。
- 增加后端加载失败原因。

UI 变化：

- 可显示当前数据来源。
- 后端不可用时显示非阻塞提示。
- 不新增复杂管理页面。

fallback 规则：

```text
后端 scene manifest
→ 后端 model manifest
→ 后端 object-tree
→ 本地静态 JSON fallback
→ public/models/lifter.glb fallback
→ 几何体 fallback
```

回归范围：

- 模型加载。
- 对象树。
- 对象点击。
- 查看子级 / 父级。
- 异常模拟。
- worldZ 任务移动。

## 9. 验收标准

- 后端启动时，前端能从后端 scene manifest 加载设备。
- 后端启动时，前端能从后端 model manifest 加载 GLB。
- 后端启动时，对象树优先使用后端 object-tree。
- 后端关闭时，前端 fallback 到本地模型。
- 后端 404 / 409 时 fallback 行为可见。
- 对象点击正常。
- 查看子级 / 父级正常。
- 异常模拟正常。
- worldZ 任务移动正常。
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

- 后端加载失败后没有 fallback，导致页面空白。
- 后端 object-tree 与 GLB runtime 对象无法匹配。
- 修改模型加载流程时破坏资源释放。
- API base URL 写死，现场部署不可配置。
- 过早移除 localStorage 或静态 JSON，影响 Demo 自包含能力。

## 12. 回滚策略

- 删除本任务新增的前端 API 调用模块。
- 恢复模型加载入口到本地静态 JSON / GLB 优先。
- 保留后端已有 API，不回滚后端任务。
- 不修改 `public/models/lifter.glb`。
- 不回滚用户已有无关前端变更。

## 13. Codex 执行提示词

```text
请执行 MVP-11：前端接后端 Manifest / Object-tree。

当前只执行本任务，不执行 MVP-12 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-11-frontend-manifest-object-tree.md。
先扫描当前前端模型加载、对象树、fallback、异常模拟和 worldZ 动画代码，输出精确影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止修改 public/models/lifter.glb，禁止接 CAD，禁止接 3D Tiles，禁止移除本地 fallback，禁止重写无关 src 文件。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、npm build 结果、后端可用和不可用两种加载验证、回归测试情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
