# POC-3DT-01：Three.js + 3DTilesRendererJS 最小验证

## 1. 任务目标

验证 Three.js 中加载 3D Tiles 的可行性，重点确认坐标系、Z-up / Y-up、缩放比例、GLB 设备对齐、Raycaster 兼容性和资源释放。该任务只做技术验证，不并入 MVP 主功能闭环。

## 2. 前置条件

- 当前前端 Demo 可正常加载 GLB 或 fallback 几何体场景。
- 已明确 POC 与 MVP 主线隔离。
- 已准备最小 `tileset.json` 测试数据或可引用的公开测试 tileset。
- 如需要新增 `3d-tiles-renderer` 依赖，必须在执行前单独确认。

## 3. 影响范围

预计影响范围：

- `src/engine/tiles/**`
- `src/views/TilesetPoc.vue`
- `src/router/**`，如项目已有路由。
- `src/views/TwinDemo.vue`，仅允许新增非侵入入口时触碰。
- `public/tilesets/**`，仅允许放置最小测试 tileset。
- `doc/**`

实际执行时必须先扫描当前项目结构后再确认精确范围。

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许做厂区正式 tileset。
- 不允许做 CAD 切片。
- 不允许做生产级 manifest。
- 不允许改现有主流程。
- 不允许影响 MVP 主线。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 读取当前 Three.js 场景初始化代码。
3. 读取当前相机控制代码。
4. 读取当前 Raycaster 拾取代码。
5. 读取当前资源释放代码。
6. 检查当前 git 状态，记录已有变更。
7. 确认是否需要新增 3D Tiles renderer 依赖。
8. 如需要新增依赖，先停止并请求确认。
9. 创建独立 tiles engine 模块。
10. 创建最小 TilesetLayer。
11. 加载最小 `tileset.json`。
12. 在独立 POC 页面中初始化 Three.js 场景。
13. 将 tileset 加入场景。
14. 将现有 GLB 设备或 fallback 几何体加入同一场景。
15. 验证 Z-up / Y-up。
16. 验证缩放比例。
17. 验证 GLB 设备与 tileset 对齐方式。
18. 验证相机控制兼容性。
19. 验证 Raycaster 是否误选 tileset。
20. 验证 tileset dispose 后资源释放。
21. 记录 tileset 加载耗时。
22. 记录内存和渲染表现。
23. 保证原 TwinDemo 主流程不受影响。
24. 运行 `cmd /c npm run build`。
25. 输出技术验证记录。
26. 输出构建结果、截图或人工验证说明、git diff 摘要。

## 6. 数据库变更

本任务不涉及数据库变更。

## 7. API 变更

本任务不涉及 API 变更。

不得接入后端 3D Tiles manifest，不得新增生产 API。

## 8. 前端变更

API 调用：

- 本任务不新增业务 API 调用。

状态变化：

- POC 页面可维护 tileset 加载状态。
- POC 页面可记录加载失败原因。

UI 变化：

- 可新增独立 POC 页面或独立入口。
- 不改变 TwinDemo 主流程。

fallback 规则：

- tileset 加载失败时 POC 页面显示失败原因。
- GLB 设备仍应可显示或使用 fallback 几何体。

回归范围：

- TwinDemo 主流程。
- GLB 加载。
- 对象拾取。
- 资源释放。
- WASD / 鼠标视角。

## 9. 验收标准

- `cmd /c npm run build` 通过。
- 3D Tiles 可加载。
- GLB 设备或 fallback 几何体可同时显示。
- Z-up / Y-up 处理有记录。
- 缩放比例验证有记录。
- Raycaster 冲突验证有记录。
- tileset dispose 后资源释放有记录。
- 原 TwinDemo 主流程不受影响。
- 输出技术验证记录。

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

- 3D Tiles renderer 依赖体积影响主包。
- tileset 坐标系与 GLB 坐标系不一致。
- tileset 拾取与设备 GLB 拾取冲突。
- tileset dispose 不完整造成内存增长。
- POC 代码侵入主流程，影响 MVP 主线。
- 测试 tileset 体积过大，不适合提交仓库。

## 12. 回滚策略

- 删除本任务新增的 `src/engine/tiles/**`。
- 删除本任务新增的 POC 页面和入口。
- 删除本任务新增的最小测试 tileset。
- 如新增依赖，移除依赖并恢复 lock 文件。
- 保留原 TwinDemo 主流程。
- 不修改 `public/models/lifter.glb`。

## 13. Codex 执行提示词

```text
请执行 POC-3DT-01：Three.js + 3DTilesRendererJS 最小验证。

当前只执行本技术验证任务，不执行任何 MVP 主线开发任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/POC-3DT-01-threejs-3dtiles-renderer.md。
先扫描当前 Three.js 场景、相机、Raycaster、资源释放和路由结构，输出精确影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止做厂区正式 tileset，禁止做 CAD 切片，禁止做生产级 manifest，禁止影响 TwinDemo 主流程，禁止修改 public/models/lifter.glb。
如需要新增 3D Tiles renderer 依赖，必须先单独说明依赖名称、用途、版本和影响，等待确认后再安装。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、npm build 结果、3D Tiles 加载验证、GLB 共场景验证、资源释放验证、回归测试情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
