# 模型性能优化边界

本文档用于收敛当前纯前端 Three.js Demo 的性能优化边界。当前项目没有后端服务，因此前端阶段只做性能观测、配置预留和交互验证，不承担 CAD 资产流水线职责。

## 当前纯前端 Demo 能做什么

当前前端允许做：

- 展示真实 GLB 模型。
- 观察运行时性能指标：
  - FPS
  - `renderer.info.render.calls`
  - `renderer.info.render.triangles`
  - `renderer.info.memory.geometries`
  - `renderer.info.memory.textures`
  - mesh 数
  - material 数
  - vertex 数
  - triangle 数
- 保留性能配置字段：
  - `performance.enableLod`
  - `performance.defaultLevel`
  - `performance.cachePolicy`
  - `performance.chunkPolicy`
  - `performance.preferHttpCache`
  - `performance.allowIndexedDbCache`
  - `performance.maxInitialLoadSizeMb`
- 展示配置摘要，作为后续后端或离线流水线接入前的占位。
- 保留现有 Demo 能力：
  - 模型加载
  - 对象选择
  - 查看子级 / 查看父级
  - 可动部件绑定
  - 任务下发 worldZ 移动
  - WASD / 鼠标视角
  - 异常模拟
  - 模型颜色配置
  - monitor / edit 模式

## 当前纯前端 Demo 不能做什么

当前阶段明确不实现：

- CAD 上传。
- CAD / STEP / IFC / DWG 转换。
- 后端缓存。
- 模型 hash 去重。
- chunk 生成。
- IndexedDB 大模型缓存。
- Service Worker 模型缓存。
- 在浏览器里自动简化大型 CAD 模型。
- 厂区级模型全量缓存。

这些能力需要后端服务、离线工具或资产流水线支持，不能只靠浏览器端可靠完成。

## 为什么必须依赖后端或离线处理

建筑 CAD / 厂区级模型通常具有以下特点：

- 源文件体积大，可能包含大量重复结构、隐藏面、细碎零件和非实时渲染几何。
- CAD / STEP / IFC / DWG 到 GLB 的转换依赖专业库或工具链，浏览器端不适合作为稳定转换环境。
- 模型简化、压缩、LOD、贴图处理、mesh 合并和 Draco / Meshopt 等优化会消耗较多 CPU、内存和时间。
- 厂区级模型需要按区域、楼层、设备拆分，并生成 manifest 才能做按需加载。
- 缓存、hash 去重和版本管理需要后端存储和一致性控制。

因此，纯前端阶段只能观测性能问题，不能从根本上解决 CAD 源模型过重问题。真正优化需要后端或离线资产流水线负责模型预处理。

## 后端接入后的推荐流程

推荐后续流程：

```text
CAD 上传
-> 计算 hash
-> 异步转换
-> 生成 GLB
-> 生成 high / medium / low
-> 生成 chunk
-> 生成 manifest
-> 存储缓存
-> 前端按需加载
```

说明：

- 首次转换慢可以接受。
- 第二次加载相同模型时，通过后端 hash 和缓存命中避免重复转换。
- 不应全量缓存厂区模型。
- 前端应按区域 / 楼层 / 设备按需加载。
- 前端可根据 manifest 选择 source / high / medium / low 或 chunk 资源。

## 当前前端保留的配置预留

当前 `public/model-configs/lifter.json` 中的 `performance` 字段只作为配置预留，不改变运行时加载逻辑。

示例字段含义：

- `enableLod`：是否启用 LOD 的配置开关。当前不改变加载策略。
- `defaultLevel`：默认模型级别描述。当前只用于展示和后续约定。
- `cachePolicy`：缓存策略描述。当前不实现真实缓存。
- `chunkPolicy`：区域切块策略描述。当前不生成真实 chunk。
- `preferHttpCache`：是否优先依赖浏览器 HTTP 缓存。
- `allowIndexedDbCache`：是否允许后续 IndexedDB 缓存。当前默认 `false`。
- `maxInitialLoadSizeMb`：首屏建议加载上限。当前不作为硬性拦截。

## 缓存边界

当前阶段不使用 IndexedDB / Service Worker 做第一阶段大模型缓存。

原因：

- 大 GLB 写入 IndexedDB 会引入浏览器存储上限、清理策略和版本一致性问题。
- Service Worker 缓存会引入资源更新、失效和调试复杂度。
- 当前没有后端版本号、hash、manifest 和缓存淘汰策略，前端不应自行持久化大型模型资产。

当前更合理的前端策略是依赖 HTTP Cache / ETag / Cache-Control。真正的大模型缓存应在后端或对象存储侧完成。
