# IDTS 数字孪生 MVP 任务卡索引

> 本目录只用于保存 MVP 开发任务的二次拆分任务卡。当前阶段严禁执行代码开发，严禁创建后端项目，严禁新增依赖，严禁修改前端源码。

## 1. 任务卡列表

| 任务编号 | 任务名称 | 文档 |
|---|---|---|
| MVP-01 | 后端解决方案骨架 | [MVP-01-backend-solution-skeleton.md](./MVP-01-backend-solution-skeleton.md) |
| MVP-02 | 数据库核心实体与 Migration | [MVP-02-database-core-schema.md](./MVP-02-database-core-schema.md) |
| MVP-03 | 文件存储与 GLB 上传 | [MVP-03-glb-upload-file-storage.md](./MVP-03-glb-upload-file-storage.md) |
| MVP-04 | Manifest 查询接口 | [MVP-04-model-manifest-api.md](./MVP-04-model-manifest-api.md) |
| MVP-05 | Object-tree / Model-stats | [MVP-05-object-tree-model-stats.md](./MVP-05-object-tree-model-stats.md) |
| MVP-06 | 资产版本状态与发布基线 | [MVP-06-asset-version-publish-baseline.md](./MVP-06-asset-version-publish-baseline.md) |
| MVP-07 | 可动部件配置 API | [MVP-07-movable-part-api.md](./MVP-07-movable-part-api.md) |
| MVP-08 | Motion Target API | [MVP-08-motion-target-api.md](./MVP-08-motion-target-api.md) |
| MVP-09 | 场景 / 设备实例 / 设备模型绑定 | [MVP-09-scene-device-binding.md](./MVP-09-scene-device-binding.md) |
| MVP-10 | Scene Manifest | [MVP-10-scene-manifest.md](./MVP-10-scene-manifest.md) |
| MVP-11 | 前端接后端 Manifest / Object-tree | [MVP-11-frontend-manifest-object-tree.md](./MVP-11-frontend-manifest-object-tree.md) |
| MVP-12 | 前端 Edit 模式保存配置 | [MVP-12-frontend-edit-mode-save.md](./MVP-12-frontend-edit-mode-save.md) |
| MVP-13 | Monitor 模式只读配置并驱动动画 | [MVP-13-monitor-mode-runtime-animation.md](./MVP-13-monitor-mode-runtime-animation.md) |
| MVP-14 | 转换任务状态与基础日志 | [MVP-14-conversion-job-status-log.md](./MVP-14-conversion-job-status-log.md) |
| POC-3DT-01 | Three.js + 3DTilesRendererJS 最小验证 | [POC-3DT-01-threejs-3dtiles-renderer.md](./POC-3DT-01-threejs-3dtiles-renderer.md) |

## 2. 推荐执行顺序

1. MVP-01 后端解决方案骨架。
2. MVP-02 数据库核心实体与 Migration。
3. MVP-03 文件存储与 GLB 上传。
4. MVP-04 Manifest 查询接口。
5. MVP-05 Object-tree / Model-stats。
6. MVP-06 资产版本状态与发布基线。
7. MVP-07 可动部件配置 API。
8. MVP-08 Motion Target API。
9. MVP-09 场景 / 设备实例 / 设备模型绑定。
10. MVP-10 Scene Manifest。
11. MVP-11 前端接后端 Manifest / Object-tree。
12. MVP-12 前端 Edit 模式保存可动部件和目标点位。
13. MVP-13 Monitor 模式只读配置并驱动 worldZ 动画。
14. MVP-14 转换任务状态与基础日志。

POC-3DT-01 可在 MVP 主线之外并行验证，但不得并入 MVP 主功能闭环。

## 3. 可并行任务

- POC-3DT-01 可与 MVP-01 到 MVP-10 并行，但必须单独分支或独立页面验证。
- MVP-04 可在 MVP-03 的上传返回结构稳定后提前设计契约，但不能先于 MVP-03 落地完整闭环。
- MVP-07 与 MVP-08 可连续执行，但建议分别验收。
- MVP-09 与 MVP-10 可连续执行，但建议分别验收。

## 4. 必须串行任务

- MVP-02 必须在 MVP-01 完成后执行。
- MVP-03 必须在 MVP-01、MVP-02 完成后执行。
- MVP-04 必须在 MVP-03 至少能产生 asset/version/file 记录后执行。
- MVP-05 必须在 MVP-02 表结构可用后执行。
- MVP-06 必须在 MVP-04、MVP-05 有可用数据后执行。
- MVP-07 必须在 MVP-05 object-tree 可用后执行。
- MVP-08 必须在 MVP-07 可动部件配置可用后执行。
- MVP-09 必须在 MVP-06 Published 版本机制可用后执行。
- MVP-10 必须在 MVP-09 active 设备绑定可用后执行。
- MVP-11 必须在 MVP-03、MVP-04、MVP-05、MVP-09、MVP-10 至少有可用接口后执行。
- MVP-12 必须在 MVP-07、MVP-08 可用后执行。
- MVP-13 必须在 MVP-10、MVP-12 可用后执行。
- MVP-14 必须在 MVP-03 的转换任务记录可用后执行。

## 5. 后端任务

- MVP-01 后端解决方案骨架。
- MVP-02 数据库核心实体与 Migration。
- MVP-03 文件存储与 GLB 上传。
- MVP-04 Manifest 查询接口。
- MVP-05 Object-tree / Model-stats。
- MVP-06 资产版本状态与发布基线。
- MVP-07 可动部件配置 API。
- MVP-08 Motion Target API。
- MVP-09 场景 / 设备实例 / 设备模型绑定。
- MVP-10 Scene Manifest。
- MVP-14 转换任务状态与基础日志。

## 6. 前端任务

- MVP-11 前端接后端 Manifest / Object-tree。
- MVP-12 前端 Edit 模式保存可动部件和目标点位。
- MVP-13 Monitor 模式只读配置并驱动 worldZ 动画。

## 7. 技术验证任务

- POC-3DT-01 Three.js + 3DTilesRendererJS 最小验证。

## 8. 当前禁止执行代码开发

当前只允许维护本目录下的任务卡文档。禁止执行以下事项：

- 创建 `server/`。
- 创建 .NET solution。
- 写 C# 代码。
- 写 Vue / TypeScript 代码。
- 修改 `src/**`。
- 修改 `public/models/lifter.glb`。
- 新增 package 依赖。
- 新增 NuGet 依赖。
- 执行 `dotnet new`。
- 执行 `npm install`。
- 执行数据库 migration。
- 执行任何 MVP 开发任务。
- commit。
- push。
