# IDTS 数字孪生正式项目总体技术方案与实施计划 v1.2

> 文档版本：v1.2  
> 修订日期：2026-07-08  
> 文档性质：正式项目落地审查报告  
> 适用范围：IDTS 数字孪生正式项目规划、技术选型、MVP 范围、数据库设计、API 契约、资产流水线、现场工具链、性能门禁和生产化治理  
> 固定技术约束：后端固定采用 **C# / ASP.NET Core Web API / .NET 8 / EF Core 8**；前端采用 **Vue 3 + TypeScript + Three.js**；保留 Three.js，不整体迁移到 CesiumJS。

---

## 0. 修订说明

本版将原“宏观规划”升级为“正式项目落地审查报告”，重点补齐项目一期可落地边界、数据库 ER 草案、API 契约、资产版本发布机制、可动部件绑定失效检测、后台任务边界、现场工具链交付和性能发布门禁。

本版明确：

1. 后端固定采用 `C# / ASP.NET Core Web API / .NET 8 / EF Core 8`。
2. 不建议直接改用其他 .NET 主版本；仅保留 .NET 8 生命周期风险控制说明。
3. 当前 `idts3ddemo` 是三维能力验证基础，不等同正式项目。
4. 正式项目不能长期依赖 localStorage、静态 JSON 或纯前端 mock。
5. 3D Tiles 拆为早期技术验证和后期生产化两阶段。
6. MVP 一期只覆盖可落地的模型资产、manifest、object-tree、可动部件配置和场景设备绑定。
7. 完整 CAD 自动转换、完整 3D Tiles 生产化、权限审批流、任务系统对接、告警系统对接、强实时推送、多厂区多租户和商业 CAD 全格式支持不进入 MVP 一期。

---

## 1. 项目定位

IDTS 数字孪生项目定位为正式工业软件平台，不再是简单 WebGL Demo。项目应支撑厂区、楼栋、楼层、区域、设备实例、可动部件、模型资产、模型转换、模型缓存、版本发布、任务状态、异常告警、现场交付和运维治理。

当前 `idts3ddemo` 已验证以下基础能力：

- Three.js 加载真实 GLB。
- 模型对象树、对象拾取、父子级查看。
- 可动部件绑定和 worldZ 任务动画验证。
- 异常模拟、高亮与异常提示。
- 模型颜色配置。
- monitor / edit 模式雏形。
- GLB LOD、hitbox、chunk loader、资源释放和性能观测方向。

正式项目必须升级为完整工程体系：

```text
前端三维可视化系统
+ .NET 8 后端 API
+ 后台模型资产处理 Worker
+ 数据库
+ 对象存储
+ 模型转换工具链
+ 发布 / 回滚 / 审计 / 部署 / 运维体系
```

---

## 2. 总体技术路线

推荐主路线：

```text
Vue 3 + Vite + TypeScript
+ Three.js
+ 设备 GLB 独立管理
+ 厂区静态底座 3D Tiles
+ Three.js 内集成 3DTilesRendererJS 或同类 3D Tiles renderer
+ ASP.NET Core Web API (.NET 8)
+ EF Core 8
+ 后端异步资产处理流水线
+ 数据库存储模型配置、对象索引、可动部件、设备实例、任务和告警
+ 对象存储保存原始模型和派生资产
```

核心判断：

1. **动态业务设备继续使用独立 GLB**。提升机、堆垛机、AGV、输送线关键段需要对象树、可动部件、任务动画、异常高亮和业务绑定，不应依赖 3D Tiles 内部节点。
2. **厂区、建筑、楼层、地面、固定货架、管廊等静态大场景采用 3D Tiles**。这些对象体量大、变化少，适合空间层级流式加载。
3. **Three.js 保留为主三维引擎**。当前已验证 GLB、拾取、业务动画、overlay 和自定义相机控制，整体迁移 CesiumJS 会推翻已有设备交互能力。
4. **后端缓存派生资产，不缓存浏览器 GPU 状态**。后端保存 source/high/medium/low/tiles/manifest/object-tree/model-stats/log，不保存 WebGL buffer、GPU texture、shader program 或某一帧渲染结果。
5. **模型转换由后端 Worker 或离线资产流水线负责**。CAD / STEP / IFC / GLB 转换、LOD 生成、3D Tiles 切片、manifest 生成不能由浏览器长期承担。

---

## 3. 固定技术选型

| 层级 | 固定 / 推荐技术 | 说明 |
|---|---|---|
| 前端框架 | Vue 3 + Vite + TypeScript | 管理页面、三维页面和工程化构建 |
| 三维引擎 | Three.js | 设备 GLB、对象拾取、任务动画、overlay |
| 3D Tiles 集成 | 3DTilesRendererJS 或同类 Three.js renderer | 在 Three.js 内加载 tileset，不整体迁移 CesiumJS |
| 设备模型 | GLB / glTF | 业务设备、可动部件、局部动画和异常高亮 |
| 厂区底座 | 3D Tiles | 厂区、建筑、楼层、固定结构、静态大场景 |
| 后端 API | ASP.NET Core Web API / .NET 8 | 固定 C# / .NET 8 |
| ORM | EF Core 8 | 与 .NET 8 对齐 |
| 后台任务 | Hangfire 优先，Quartz.NET 备选 | 调度转换、LOD、切片、失败重试 |
| Worker | .NET Worker Service | 长耗时转换和外部工具调用隔离 |
| 数据库 | PostgreSQL 优先，SQL Server 备选 | 存元数据、版本、绑定、任务、审计 |
| 文件存储 | 本地目录开发，MinIO / S3 生产 | 保存原始模型和派生资产 |
| 模型优化 | glTF Transform、Meshopt、Draco 选配 | GLB 优化、简化、压缩 |
| 实时通信 | HTTP polling 起步，SignalR 后续 | MVP 先轮询，后续再推送 |
| 日志 | Serilog | API、Worker、工具调用、异常日志 |
| 监控 | OpenTelemetry 预留 | 后续链路追踪和指标采集 |
| 接口文档 | Swagger / OpenAPI | 前后端协作和现场调试 |

---

## 4. .NET 8 固定采用与生命周期风险控制

### 4.1 固定采用 .NET 8

本项目后端固定采用：

```text
C#
ASP.NET Core Web API
.NET 8
EF Core 8
.NET Worker Service
```

本方案不建议在当前阶段直接切换到其他 .NET 主版本。

### 4.2 生命周期风险控制

.NET 8 是当前固定技术选型，但其生命周期窗口有限。项目需要通过工程管理控制风险：

1. 使用 `global.json` 锁定 .NET 8 SDK。
2. 使用统一 NuGet 版本管理，锁定 EF Core 8、ASP.NET Core 相关包和后台任务依赖版本。
3. 开发、测试、现场部署环境保持同一 .NET 8 patch 版本策略。
4. 生产部署记录 `dotnet --info`、SDK 版本、Runtime 版本和 NuGet 包版本。
5. 安全补丁由项目维护计划统一控制，不允许现场随意升级运行时。
6. 采用部署隔离，避免与现场其他 .NET 应用共享不可控运行时。
7. 将未来运行时升级作为维护计划中的评估项，但不影响当前 .NET 8 主线实施。

---

## 5. MVP 一期范围

MVP 一期目标是打通“模型资产入库、GLB 上传、manifest 加载、对象树、可动部件配置、motion target、场景设备绑定、前端从后端加载设备 GLB”的最小闭环。

一期只做：

- .NET 8 后端骨架。
- EF Core 8 数据库核心表。
- 文件存储服务。
- GLB 上传。
- `sourceFileHash` 去重。
- 模型资产元数据。
- manifest 查询。
- object-tree 生成或保存。
- model-stats 保存。
- 可动部件配置入库。
- motion target 入库。
- 场景设备实例绑定。
- 前端从后端 manifest 加载设备 GLB。
- 前端编辑模式保存可动部件配置。
- 监控模式只读配置并执行任务动画。
- 转换任务状态查询。
- 转换日志保存和基础失败信息记录。

一期验收重点：

```text
上传一个 GLB
→ 后端保存资产和 hash
→ 返回 manifest
→ 前端按 manifest 加载设备
→ 前端显示 object-tree
→ 编辑模式绑定可动部件
→ 保存 motion target
→ 监控模式加载 Published 配置
→ 下发本地验证任务动画
```

---

## 6. 非 MVP 范围

以下能力不进入 MVP 一期：

- 完整 CAD 自动转换。
- 完整 STEP / IFC / DWG / RVT / SolidWorks / CATIA 全格式支持。
- 完整 3D Tiles 生产化切片。
- 完整权限审批流。
- 完整任务系统对接。
- 完整告警系统对接。
- SignalR 强实时推送。
- 多厂区多租户。
- 商业 CAD 工具自动下载和授权管理生产化。
- GPU Picking。
- OffscreenCanvas。
- KTX2 全纹理管线。
- 复杂路径规划。
- 与旧 `HZ.IDTS.UI` / `HZ.IDTS.API` 的正式菜单、登录和权限融合。

这些能力可以在 MVP 闭环稳定后按阶段进入后续版本。

---

## 7. 总体系统架构

```text
用户浏览器
  └─ IDTS 数字孪生前端
      ├─ Vue 3 管理页面
      ├─ Three.js SceneEngine
      ├─ 3D Tiles 厂区底座层
      ├─ GLB 设备层
      ├─ InteractionLayer 对象拾取层
      ├─ OverlayLayer 告警 / 任务 / 状态浮层
      └─ RuntimeStateAdapter 后端状态适配层

ASP.NET Core API (.NET 8)
  ├─ 模型资产 API
  ├─ 场景 API
  ├─ 设备实例 API
  ├─ 可动部件 API
  ├─ Motion Target API
  ├─ 任务 API（后续）
  ├─ 告警 API（后续）
  ├─ 权限与审计 API（后续）
  └─ SignalR / 轮询状态接口

后台任务与转换服务
  ├─ Hangfire 调度
  ├─ .NET Worker Service 执行
  ├─ 模型上传校验
  ├─ GLB inspect / optimize
  ├─ LOD 生成
  ├─ object-tree / model-stats 生成
  ├─ 3D Tiles 技术验证切片
  ├─ manifest 生成
  └─ 转换日志与失败重试

数据层
  ├─ PostgreSQL / SQL Server
  ├─ MinIO / S3 / 本地文件系统
  ├─ 转换工具目录
  └─ 日志与监控
```

---

## 8. 关键架构边界

### 8.1 前端边界

前端负责：

- Three.js 渲染。
- 设备 GLB 加载。
- 3D Tiles 展示。
- 对象拾取。
- 对象树展示。
- 编辑模式配置界面。
- 监控模式状态展示。
- 任务动画执行。
- 性能观测。

前端不负责：

- CAD / STEP / IFC 转换。
- 资产 hash 去重。
- 资产版本一致性。
- 发布审批。
- 模型持久缓存。
- 正式业务数据的长期存储。

### 8.2 后端边界

后端负责：

- 模型上传。
- 元数据入库。
- 文件存储。
- 转换任务创建。
- 转换状态查询。
- manifest 生成和发布。
- 可动部件和 motion target 配置。
- 场景、设备实例、模型绑定。
- 版本发布和回滚。
- 审计日志。

后端 API 不直接执行长耗时转换；长任务由 Worker 执行。

### 8.3 Worker 边界

Worker 负责：

- 外部工具调用。
- GLB inspect。
- GLB optimize。
- LOD 生成。
- object-tree 生成。
- model-stats 生成。
- 3D Tiles 技术验证切片。
- stdout / stderr / exitCode / elapsedMs 记录。
- 失败重试。

---

## 9. 3D Tiles 与 GLB 职责边界

| 对象类型 | 推荐格式 | 处理方式 | 说明 |
|---|---|---|---|
| 厂房 / 建筑 / 楼层 / 地面 | 3D Tiles | 流式加载 | 静态、大体量、空间层级明显 |
| 固定货架 / 管廊 / 固定结构 | 3D Tiles 或低精 GLB | 静态展示 | 不参与任务动画 |
| 提升机 | GLB | 独立设备模型 | 可动部件、worldZ、异常、任务动画 |
| 堆垛机 | GLB | 独立设备模型 | 升降、横移、货叉伸缩 |
| AGV | GLB | 独立设备模型 | 路径移动、状态联动 |
| 输送线关键段 | GLB 或组合 GLB | 设备层控制 | 状态、异常、局部动画 |
| 大量重复静态小物件 | InstancedMesh / 合批 | 前端优化 | 降低 draw call |

原则：

1. 可动部件、任务动画、异常高亮、业务绑定不能依赖 3D Tiles 内部节点。
2. 3D Tiles 只作为静态底座和空间背景，不承担设备级控制。
3. 设备 GLB 与 tileset 通过统一场景坐标、设备 position/rotation/scale 和 transform 配置对齐。
4. 点击设备时优先使用设备层 hitbox 或 GLB mesh，不依赖 tileset 内部拾取。

---

## 10. 前端规划

### 10.1 核心模块

| 模块 | 职责 |
|---|---|
| `SceneEngine` | Three.js 场景、相机、渲染循环、资源释放 |
| `TilesetLayer` | 通过 3DTilesRendererJS 加载厂区 3D Tiles |
| `DeviceLayer` | 加载设备 GLB、设备实例、设备 LOD |
| `InteractionLayer` | Raycaster、hitbox、对象树、选中逻辑 |
| `OverlayLayer` | 告警标签、任务路径、设备状态浮层、异常 callout |
| `RuntimeStateAdapter` | 对接后端设备状态、任务、告警 |
| `AssetManifestLoader` | 消费后端 manifest，不直接拼接模型路径 |
| `ObjectTreeAdapter` | 消费后端 object-tree 或从 GLB 提取对象树 |
| `EditMode` | 模型校准、可动部件绑定、业务命名、配置保存 |
| `MonitorMode` | 状态查看、任务下发、告警查看、设备定位 |
| `PerformanceMonitor` | FPS、draw calls、triangles、纹理、内存观测 |
| `ResourceDisposer` | 模型切换、区域切换、页面销毁时释放资源 |

### 10.2 前端数据来源优先级

正式项目：

```text
后端 Published manifest
→ 后端 object-tree / movable-parts / motion-targets
→ 后端 scene manifest
→ 前端渲染
```

开发调试 fallback：

```text
本地静态 JSON
→ public/models/lifter.glb
→ mock 状态数据
```

正式运行不能长期依赖 localStorage 或静态 JSON。

---

## 11. Monitor / Edit 模式边界

### 11.1 monitor 模式允许

- 查看模型。
- 查看对象详情。
- 查看异常。
- 下发任务。
- 定位设备。
- 查看子级 / 父级。
- WASD / 鼠标视角控制。
- 查看 Published 版本信息。
- 查看当前可动部件配置，但不能修改。

### 11.2 monitor 模式禁止

- 上传模型。
- 保存模型配置。
- 编辑整机 transform。
- 设置可动部件。
- 取消可动部件。
- 修改业务名称。
- 修改 partCode。
- 修改运动类型。
- 修改运动轴。
- 修改上下限。
- 修改目标点位。
- 发布版本。

### 11.3 edit 模式允许

- 上传模型。
- 编辑 transform。
- 设置可动部件。
- 取消可动部件。
- 修改业务名。
- 修改 partCode。
- 修改运动类型。
- 修改运动轴。
- 修改上下限。
- 修改目标点位。
- 保存配置。
- 执行发布前校验。
- 发布 Ready 版本。

### 11.4 模式切换规则

1. edit 模式的草稿配置不影响 monitor 模式。
2. monitor 模式只加载 Published 版本。
3. Draft / Processing / Failed / Invalid 版本不能进入 monitor 模式。
4. edit 模式保存的是草稿或 Ready 配置；发布动作单独执行。

---

## 12. 后端规划

后端采用 .NET 8 分层结构：

```text
IdtsTwin.Api
IdtsTwin.Application
IdtsTwin.Domain
IdtsTwin.Infrastructure
IdtsTwin.Worker
IdtsTwin.Contracts
```

| 项目 | 职责 |
|---|---|
| `IdtsTwin.Api` | Controller、认证预留、Swagger、HTTP 接口、统一响应 |
| `IdtsTwin.Application` | 用例编排、DTO、事务边界、应用服务 |
| `IdtsTwin.Domain` | 领域对象、领域规则、枚举、值对象 |
| `IdtsTwin.Infrastructure` | EF Core、文件存储、对象存储、外部工具调用 |
| `IdtsTwin.Worker` | 后台转换任务、队列消费、失败重试、日志采集 |
| `IdtsTwin.Contracts` | 前后端共享契约、事件消息、枚举契约 |

后端应保持 API 与 Worker 分离，避免模型转换阻塞 API 线程。

---

## 13. 后台任务与 Worker 边界

### 13.1 职责分离

```text
API：上传、校验、创建任务、查询状态
Hangfire：任务调度、重试、状态记录
Worker：实际转换、外部工具调用、文件输出
Infrastructure/ToolRunner：封装 glTF Transform / CAD 工具调用
```

### 13.2 任务执行要求

长任务不能阻塞 API 线程。每个转换任务必须记录：

- `jobId`
- `modelAssetId`
- `jobType`
- `status`
- `progress`
- `message`
- `inputFile`
- `outputDirectory`
- `stdout`
- `stderr`
- `exitCode`
- `elapsedMs`
- `startedTime`
- `finishedTime`
- `retryCount`

### 13.3 失败处理

转换失败时必须：

1. 标记 `model_conversion_job.status = failed`。
2. 标记相关资产 `processing_status = failed`。
3. 保存 stdout、stderr、exitCode。
4. 保留输入文件和失败日志。
5. 支持人工重新执行任务。
6. 不允许 Failed 资产发布到 monitor 模式。

---

## 14. 核心领域对象

| 对象 | 说明 |
|---|---|
| `ModelAsset` | 模型资产主记录 |
| `ModelAssetVariant` | source / high / medium / low / tiles 资源 |
| `ModelConversionJob` | 模型转换任务 |
| `ModelObjectIndex` | 模型对象树索引 |
| `SceneNode` | 厂区 / 楼栋 / 楼层 / 区域 |
| `DeviceInstance` | 设备实例 |
| `DeviceModelBinding` | 设备实例与模型版本绑定关系 |
| `MovablePartBinding` | 可动部件绑定 |
| `MotionTarget` | 运动目标点位 |
| `AssetManifest` | 前端加载清单 |
| `AssetVersion` | 模型资产版本 |
| `OperationAudit` | 操作审计 |
| `ToolPackage` | 现场工具包定义 |
| `ToolHealthCheck` | 工具链健康检查结果 |

---

## 15. 数据库 ER 草案

### 15.1 `model_asset`

用途：模型资产主表。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `asset_code` | 模型资产编码，唯一 |
| `asset_name` | 模型资产名称 |
| `source_file_name` | 原始文件名 |
| `source_file_hash` | 原始文件 SHA256，唯一 |
| `source_file_type` | glb / step / ifc / other |
| `asset_type` | device_glb / factory_tiles / static_glb |
| `processing_status` | pending / processing / completed / failed |
| `current_version_id` | 当前版本，外键到 `asset_version.id` |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 唯一：`asset_code`
- 唯一：`source_file_hash`
- 外键：`current_version_id -> asset_version.id`

备注：MVP 一期暂采用 `source_file_hash` 全局唯一策略，hash 命中时复用已有资产，避免重复转换。若后续出现同一个源文件被多个业务资产复用的场景，应拆分 `source_blob` / `file_object` 与 `model_asset`：前者表示物理文件对象，后者表示业务模型资产，`model_asset` 通过外键引用物理文件对象。

### 15.2 `model_asset_variant`

用途：保存 source/high/medium/low/tiles 等派生资源。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `model_asset_id` | 外键到 `model_asset.id` |
| `asset_version_id` | 外键到 `asset_version.id` |
| `variant_level` | source / high / medium / low / tiles / thumbnail |
| `file_url` | 文件访问地址 |
| `file_hash` | 派生文件 hash |
| `file_size` | 文件大小 |
| `triangle_count` | 三角面数 |
| `vertex_count` | 顶点数 |
| `mesh_count` | mesh 数 |
| `material_count` | material 数 |
| `texture_count` | texture 数 |
| `created_time` | 创建时间 |

约束：

- 主键：`id`
- 外键：`model_asset_id -> model_asset.id`
- 外键：`asset_version_id -> asset_version.id`
- 唯一：`asset_version_id + variant_level`

### 15.3 `model_conversion_job`

用途：转换任务和状态表。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `model_asset_id` | 外键到 `model_asset.id` |
| `asset_version_id` | 外键到 `asset_version.id` |
| `job_type` | upload / inspect / optimize / lod / tile / manifest |
| `status` | pending / running / completed / failed / canceled |
| `progress` | 0-100 |
| `message` | 当前状态说明 |
| `input_file` | 输入路径 |
| `output_directory` | 输出目录 |
| `stdout_log_url` | stdout 日志 |
| `stderr_log_url` | stderr 日志 |
| `exit_code` | 外部工具退出码 |
| `elapsed_ms` | 耗时 |
| `retry_count` | 重试次数 |
| `started_time` | 开始时间 |
| `finished_time` | 完成时间 |

约束：

- 主键：`id`
- 外键：`model_asset_id -> model_asset.id`
- 外键：`asset_version_id -> asset_version.id`

### 15.4 `model_object_index`

用途：保存模型对象树索引。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `model_asset_id` | 外键到 `model_asset.id` |
| `asset_version_id` | 外键到 `asset_version.id` |
| `object_uuid` | GLB 对象 uuid |
| `object_name` | 对象名称 |
| `object_path` | 对象路径 |
| `parent_uuid` | 父对象 uuid |
| `parent_path` | 父对象路径 |
| `object_type` | Mesh / Group / Object3D |
| `bounding_box_min_x/y/z` | 包围盒最小点 |
| `bounding_box_max_x/y/z` | 包围盒最大点 |
| `mesh_fingerprint` | mesh 指纹，后续扩展 |
| `created_time` | 创建时间 |

约束：

- 主键：`id`
- 外键：`model_asset_id -> model_asset.id`
- 外键：`asset_version_id -> asset_version.id`
- 索引：`asset_version_id + object_uuid`
- 索引：`asset_version_id + object_path`

### 15.5 `scene_node`

用途：厂区 / 楼栋 / 楼层 / 区域树。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `parent_id` | 父节点 |
| `scene_code` | 场景编码 |
| `scene_name` | 场景名称 |
| `node_type` | campus / building / floor / area |
| `sort_no` | 排序 |
| `enabled` | 是否启用 |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 外键：`parent_id -> scene_node.id`
- 唯一：`scene_code`

### 15.6 `device_instance`

用途：设备实例表。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `device_code` | 设备编码，唯一 |
| `device_name` | 设备名称 |
| `device_type` | lifter / stacker / agv / conveyor |
| `scene_node_id` | 所属区域 |
| `position_x/y/z` | 场景位置 |
| `rotation_x/y/z` | 场景旋转 |
| `scale_x/y/z` | 场景缩放 |
| `status` | active / inactive / maintenance |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 唯一：`device_code`
- 外键：`scene_node_id -> scene_node.id`

### 15.7 `device_model_binding`

用途：设备实例与模型资产版本绑定。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `device_instance_id` | 外键到 `device_instance.id` |
| `model_asset_id` | 外键到 `model_asset.id` |
| `asset_version_id` | 外键到 `asset_version.id` |
| `binding_status` | draft / active / archived / invalid |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 外键：`device_instance_id -> device_instance.id`
- 外键：`model_asset_id -> model_asset.id`
- 外键：`asset_version_id -> asset_version.id`
- 唯一：`device_instance_id + asset_version_id`
- 业务约束：同一 `device_instance_id` 同一时间只能存在一个 `binding_status = active` 的模型绑定；该 active 绑定必须指向 Published 版本。

发布新模型版本时，应先将该设备旧 active 绑定归档为 `archived`，再创建或激活新版本绑定。回滚时同样必须保证同一设备只有一个 active / Published 模型绑定。

### 15.8 `movable_part_binding`

用途：可动部件绑定表。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `model_asset_id` | 外键到 `model_asset.id` |
| `asset_version_id` | 外键到 `asset_version.id` |
| `device_instance_id` | 外键到 `device_instance.id`，可为空 |
| `object_uuid` | 对象 uuid |
| `object_name` | 对象名称 |
| `object_path` | 对象路径 |
| `parent_uuid` | 父对象 uuid |
| `parent_path` | 父对象路径 |
| `original_name` | 原始对象名 |
| `business_name` | 业务名 |
| `part_code` | 业务编码 |
| `motion_type` | linear / rotate / path / joint / none |
| `axis_mode` | world / local / custom / path |
| `axis` | x / y / z |
| `custom_axis_x/y/z` | 自定义轴 |
| `min_value` | 最小值 |
| `max_value` | 最大值 |
| `home_value` | 初始值 |
| `current_value` | 当前值 |
| `default_speed` | 默认速度 |
| `binding_status` | valid / warning / invalid / unbound |
| `enabled` | 是否启用 |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 外键：`model_asset_id -> model_asset.id`
- 外键：`asset_version_id -> asset_version.id`
- 外键：`device_instance_id -> device_instance.id`
- 唯一：`asset_version_id + part_code`
- 索引：`asset_version_id + object_uuid`
- 索引：`asset_version_id + object_path`

### 15.9 `motion_target`

用途：运动目标点位。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `movable_part_id` | 外键到 `movable_part_binding.id` |
| `target_code` | 目标编码 |
| `target_name` | 目标名称 |
| `target_value` | 一维目标值 |
| `target_x/y/z` | 三维目标坐标，可选 |
| `sort_no` | 排序 |
| `enabled` | 是否启用 |

约束：

- 主键：`id`
- 外键：`movable_part_id -> movable_part_binding.id`
- 唯一：`movable_part_id + target_code`

### 15.10 `asset_manifest`

用途：前端加载清单快照。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `model_asset_id` | 外键到 `model_asset.id` |
| `asset_version_id` | 外键到 `asset_version.id` |
| `manifest_url` | manifest 文件地址 |
| `manifest_json` | manifest 快照，可选 |
| `created_time` | 创建时间 |

约束：

- 主键：`id`
- 外键：`model_asset_id -> model_asset.id`
- 外键：`asset_version_id -> asset_version.id`
- 唯一：`asset_version_id`

### 15.11 `asset_version`

用途：资产版本和发布状态。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `model_asset_id` | 外键到 `model_asset.id` |
| `version_no` | 版本号 |
| `version_status` | Draft / Processing / Ready / Published / Archived / Failed / Invalid |
| `publish_time` | 发布时间 |
| `published_by` | 发布人 |
| `publish_note` | 发布说明 |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 外键：`model_asset_id -> model_asset.id`
- 唯一：`model_asset_id + version_no`

### 15.12 `operation_audit`

用途：操作审计。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `operator_id` | 操作人 |
| `operation_type` | upload / edit / publish / rollback / delete |
| `target_type` | model_asset / asset_version / movable_part / scene |
| `target_id` | 目标 ID |
| `before_json` | 修改前 |
| `after_json` | 修改后 |
| `operation_time` | 操作时间 |
| `client_ip` | 客户端 IP |

约束：

- 主键：`id`
- 索引：`target_type + target_id`
- 索引：`operation_time`

### 15.13 `tool_package`

用途：记录现场工具包定义、下载地址、版本和健康检查命令。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `tool_name` | 工具名称 |
| `version` | 工具版本 |
| `download_url` | 下载地址，可为空以支持离线包 |
| `sha256` | 工具包 SHA256 |
| `install_path` | 建议安装路径 |
| `license_type` | open_source / commercial / internal / manual |
| `supported_formats` | 支持格式，JSON 或逗号分隔 |
| `health_check_command` | 健康检查命令 |
| `required` | 是否必需 |
| `enabled` | 是否启用 |
| `created_time` | 创建时间 |
| `updated_time` | 更新时间 |

约束：

- 主键：`id`
- 唯一：`tool_name + version`
- 索引：`enabled + required`

### 15.14 `tool_health_check`

用途：记录工具链健康检查结果。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `tool_package_id` | 外键到 `tool_package.id` |
| `tool_name` | 工具名称冗余，便于日志查询 |
| `version` | 检测到的工具版本 |
| `install_path` | 实际安装路径 |
| `stdout` | 健康检查 stdout |
| `stderr` | 健康检查 stderr |
| `exit_code` | 健康检查退出码 |
| `status` | passed / failed / skipped |
| `checked_time` | 检查时间 |

约束：

- 主键：`id`
- 外键：`tool_package_id -> tool_package.id`
- 索引：`tool_package_id + checked_time`

---

## 16. 资产版本状态与发布回滚机制

### 16.1 版本状态

```text
Draft：草稿，编辑中
Processing：处理中，转换或优化未完成
Ready：处理完成，可校验、可发布
Published：已发布，monitor 模式使用
Archived：已归档，历史版本
Failed：处理失败
Invalid：校验失败或绑定失效，不允许发布
```

### 16.2 正式发布流程

```text
上传模型
→ 创建 Draft 版本
→ 创建转换任务
→ Worker 转换 / inspect / 生成 manifest
→ 状态变为 Ready
→ 编辑模式校准 transform
→ 设置可动部件
→ 设置 motion target
→ 执行发布前校验
→ 校验通过后发布
→ monitor 模式加载 Published 版本
```

### 16.3 发布规则

1. Draft 不影响 monitor 端。
2. Processing 不允许加载到 monitor 端。
3. Ready 必须通过发布前校验才能变为 Published。
4. Failed 不能发布。
5. Invalid 不能发布。
6. 存在绑定失效的版本不能发布。
7. Published 版本必须可回滚。
8. 同一 `device_instance` 同一时间只能存在一个 active / Published 模型绑定；发布新版本时必须归档旧 active 绑定，再激活新版本绑定。

### 16.4 回滚规则

回滚到上一 Published 版本时，应恢复：

- manifest 快照。
- asset variant 文件引用。
- object-tree 版本。
- 可动部件绑定。
- motion target。
- 设备模型绑定。

回滚操作必须写入 `operation_audit`。

回滚时必须先归档当前 active 绑定，再恢复目标 Published 版本的设备模型绑定，确保同一设备不会同时指向两个 active / Published 模型版本。

---

## 17. 模型资产流水线

### 17.1 标准流程

```text
上传 GLB
→ 校验格式、大小、权限
→ 计算 sourceFileHash
→ hash 命中则复用资产
→ 未命中则创建 model_asset
→ 创建 asset_version Draft
→ 保存 source 文件
→ 创建 model_conversion_job
→ Worker 执行 inspect / stats / object-tree / manifest
→ 写入 model_asset_variant
→ 写入 model_object_index
→ 写入 asset_manifest
→ 状态变为 Ready
```

### 17.2 派生资产

MVP 一期必须至少支持：

- source GLB。
- manifest。
- object-tree。
- model-stats。
- 转换日志。

MVP 后续逐步支持：

- high GLB。
- medium GLB。
- low GLB。
- thumbnail。
- tileset.json。
- tiles 子资源。

### 17.3 缓存边界

后端缓存：

```text
原始文件
source.glb
high.glb
medium.glb
low.glb
tileset.json
tiles/
manifest.json
object-tree.json
model-stats.json
thumbnail.png
转换日志
```

不缓存：

```text
WebGL buffer
GPU texture object
shader program
浏览器内部编译结果
某一帧渲染图
```

---

## 18. 可动部件绑定失效检测与重绑定策略

### 18.1 问题背景

模型重新上传、重新转换、LOD 简化、mesh 合并或 CAD 重新导出后，原有 `objectUuid`、`objectName`、`objectPath` 可能变化。正式项目必须支持绑定失效检测，避免监控端任务移动错误对象。

### 18.2 多重匹配依据

系统应保存并使用以下匹配依据：

- `objectUuid`
- `objectPath`
- `objectName`
- `parentPath`
- `boundingBox`
- `meshFingerprint`，后续扩展
- `businessName`
- `partCode`

### 18.3 新版本校验流程

```text
生成新版本 object-tree
→ 按 objectUuid 匹配
→ 未命中则按 objectPath 匹配
→ 未命中则按 objectName + parentPath 匹配
→ 未命中则按 boundingBox 相似度提示疑似对象
→ 仍未命中则 binding_status = invalid
→ 编辑模式提示人工修复
→ 未修复禁止发布到 monitor 模式
```

### 18.4 绑定状态

```text
valid：绑定有效
warning：疑似匹配，需要人工确认
invalid：绑定失效，不允许发布
unbound：未绑定
```

### 18.5 发布前校验

发布前必须检查：

- 所有 enabled 的可动部件 `binding_status = valid`。
- `part_code` 无重复。
- `motion_target` 至少存在一个 enabled 目标，或业务明确允许为空。
- `min_value <= home_value <= max_value`。
- `axis_mode` 与 `motion_type` 匹配。
- 关键对象存在于当前 asset_version 的 object-tree 中。

---

## 19. 运动配置模型

正式项目不能硬编码 F1/F2/F3/F4、worldZ、固定移动距离。运动配置应由数据库驱动。

### 19.1 motion_type

```text
linear：直线移动
rotate：旋转
path：路径移动
joint：关节运动
none：不可动
```

### 19.2 axis_mode

```text
world：世界坐标轴
local：对象局部轴
custom：自定义向量
path：路径点序列
```

### 19.3 配置示例

```text
提升机载货台：motion_type = linear, axis_mode = world, axis = z
堆垛机横移：motion_type = linear, axis_mode = world, axis = x
货叉伸缩：motion_type = linear, axis_mode = local, axis = x
AGV：motion_type = path, axis_mode = path
旋转门：motion_type = rotate, axis_mode = local, axis = z
```

---

## 20. API 契约 v0.1

API v0.1 只覆盖 MVP 一期。

### 20.1 `POST /api/model-assets/upload`

用途：上传 GLB 并创建模型资产。

请求字段：

- `file`
- `assetCode`
- `assetName`
- `assetType`
- `sourceFileType`

响应字段：

- `assetId`
- `versionId`
- `jobId`
- `processingStatus`
- `message`

关键校验：

- 文件不能为空。
- 文件类型必须在允许列表中，MVP 仅允许 GLB。
- `assetCode` 唯一。
- 文件 hash 命中时返回已有资产或创建新版本，策略由服务端配置控制。

错误情况：

- `400`：文件为空、格式不支持、字段缺失。
- `409`：assetCode 冲突。
- `413`：文件超过上传限制。
- `500`：文件存储失败或任务创建失败。

### 20.2 `GET /api/model-assets/{assetId}`

用途：查询模型资产详情。

响应字段：

- `assetId`
- `assetCode`
- `assetName`
- `assetType`
- `sourceFileName`
- `sourceFileHash`
- `processingStatus`
- `currentVersionId`
- `createdTime`
- `updatedTime`

错误情况：

- `404`：资产不存在。

### 20.3 `GET /api/model-assets/{assetId}/manifest`

用途：获取当前 Published 或指定版本 manifest。

请求参数：

- `versionId`，可选。
- `mode`，可选，`monitor` 默认只返回 Published。

响应字段：

- `assetId`
- `versionId`
- `manifest`
- `levels`
- `transform`
- `semantic`
- `movableParts`

关键校验：

- monitor 模式只能返回 Published 版本。
- Draft / Failed / Invalid 版本不能被 monitor 加载。

错误情况：

- `404`：manifest 不存在。
- `409`：版本状态不允许加载。

### 20.4 `GET /api/model-assets/{assetId}/object-tree`

用途：获取模型对象树。

请求参数：

- `versionId`，可选。

响应字段：

- `assetId`
- `versionId`
- `nodes[]`
- `nodes[].objectUuid`
- `nodes[].objectName`
- `nodes[].objectPath`
- `nodes[].parentUuid`
- `nodes[].parentPath`
- `nodes[].objectType`
- `nodes[].boundingBox`

错误情况：

- `404`：资产或对象树不存在。

### 20.5 `GET /api/model-conversion-jobs/{jobId}`

用途：查询转换任务状态。

响应字段：

- `jobId`
- `assetId`
- `versionId`
- `jobType`
- `status`
- `progress`
- `message`
- `exitCode`
- `startedTime`
- `finishedTime`
- `logUrl`

错误情况：

- `404`：任务不存在。

### 20.6 `GET /api/scenes/{sceneId}/manifest`

用途：获取场景加载清单。

响应字段：

- `sceneId`
- `sceneName`
- `sceneNodes`
- `devices`
- `devices[].deviceId`
- `devices[].modelAssetId`
- `devices[].assetVersionId`
- `devices[].position`
- `devices[].rotation`
- `devices[].scale`
- `tilesets`

关键校验：

- 只返回 enabled 场景节点。
- monitor 模式只返回 Published 模型版本。

错误情况：

- `404`：场景不存在。
- `409`：存在未发布或无效模型绑定。

### 20.7 `GET /api/model-assets/{assetId}/versions/{versionId}/movable-parts`

用途：查询模型可动部件。

响应字段：

- `items[]`
- `partId`
- `businessName`
- `partCode`
- `objectUuid`
- `objectPath`
- `motionType`
- `axisMode`
- `axis`
- `bindingStatus`
- `enabled`

错误情况：

- `404`：模型资产、版本或可动部件配置不存在。

### 20.8 `POST /api/model-assets/{assetId}/versions/{versionId}/movable-parts`

用途：新增可动部件绑定。

请求字段：

- `assetVersionId`
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
- `minValue`
- `maxValue`
- `homeValue`
- `defaultSpeed`

响应字段：

- `partId`
- `bindingStatus`
- `message`

关键校验：

- `partCode` 在同一版本内唯一。
- `objectUuid` 或 `objectPath` 必须能匹配 object-tree。
- `minValue <= homeValue <= maxValue`。
- `versionId` 必须指向 Draft 或 Ready 版本；Published 版本不能直接修改。

错误情况：

- `400`：字段缺失或范围无效。
- `409`：partCode 重复或对象已绑定。
- `404`：模型版本或对象不存在。

### 20.9 `PUT /api/model-assets/{assetId}/versions/{versionId}/movable-parts/{partId}`

用途：更新可动部件绑定。

请求字段：同新增接口，可部分更新。

响应字段：

- `partId`
- `bindingStatus`
- `updatedTime`

错误情况：

- `400`：字段无效。
- `404`：可动部件不存在。
- `409`：partCode 重复或版本状态不允许修改。

### 20.10 `DELETE /api/model-assets/{assetId}/versions/{versionId}/movable-parts/{partId}`

用途：删除或禁用可动部件绑定。

响应字段：

- `success`
- `message`

关键校验：

- Published 版本不允许物理删除，只允许新草稿版本中禁用。

错误情况：

- `404`：可动部件不存在。
- `409`：版本状态不允许删除。

### 20.11 `GET /api/movable-parts/{partId}/motion-targets`

用途：查询可动部件目标点位。

响应字段：

- `items[]`
- `targetId`
- `targetCode`
- `targetName`
- `targetValue`
- `targetX`
- `targetY`
- `targetZ`
- `sortNo`
- `enabled`

错误情况：

- `404`：可动部件不存在。

### 20.12 `POST /api/movable-parts/{partId}/motion-targets`

用途：新增目标点位。

请求字段：

- `targetCode`
- `targetName`
- `targetValue`
- `targetX`
- `targetY`
- `targetZ`
- `sortNo`
- `enabled`

关键校验：

- `targetCode` 在同一可动部件下唯一。
- linear 模式必须提供 `targetValue` 或明确的三维目标。

错误情况：

- `400`：目标值无效。
- `409`：targetCode 重复。

### 20.13 `PUT /api/movable-parts/{partId}/motion-targets/{targetId}`

用途：更新目标点位。

错误情况：

- `400`：目标值无效。
- `404`：目标点位不存在。
- `409`：targetCode 重复。

### 20.14 `DELETE /api/movable-parts/{partId}/motion-targets/{targetId}`

用途：删除或禁用目标点位。

错误情况：

- `404`：目标点位不存在。
- `409`：版本状态不允许删除。

---

## 21. 后续 API 范围

MVP 后续再扩展：

```http
GET    /api/devices/{deviceId}/state
POST   /api/devices/{deviceId}/tasks
GET    /api/tasks/{taskId}
GET    /api/alarms/active
POST   /api/model-assets/{assetId}/publish
POST   /api/model-assets/{assetId}/rollback
GET    /api/tools
POST   /api/tools/{toolId}/health-check
```

实时推送后续再引入 SignalR，不进入 MVP 一期强约束。

---

## 22. 3D Tiles 早期技术验证

3D Tiles 不应等到项目后期才验证。建议在 MVP 期间并行做最小技术验证，但不进入 MVP 主功能闭环。

验证目标：

- Three.js + 3DTilesRendererJS 加载最小 tileset。
- 验证坐标系。
- 验证 Z-up / Y-up 处理。
- 验证缩放比例。
- 验证 GLB 设备与 tileset 对齐。
- 验证 tileset 与 GLB 设备共同渲染。
- 验证 Raycaster / picking 是否冲突。
- 验证资源释放。
- 验证 tileset dispose 后内存是否回落。

验证交付物：

- 最小 `TilesetLayer` 原型。
- 坐标系验证记录。
- GLB 对齐参数样例。
- 资源释放验证记录。
- 风险清单。

---

## 23. 3D Tiles 后期生产化

生产化阶段再做：

- 厂区底座正式 tileset。
- 分区加载。
- tileset manifest。
- tileset 版本发布。
- tileset 回滚。
- 性能门禁。
- 现场转换 / 切片流程。
- 与设备 GLB 的统一坐标基准。
- 大范围漫游性能验证。

生产化前置条件：

1. GLB 设备层稳定。
2. manifest / object-tree / 可动部件配置已由后端驱动。
3. 3D Tiles 技术验证已通过。
4. 资源释放策略明确。
5. 场景坐标系和设备定位规范已冻结。

---

## 24. 现场工具链交付方案

### 24.1 原则

不要把大型商业工具、CAD 转换器、安装包或授权 SDK 直接提交到 Git。

### 24.2 推荐目录

```text
tools/
  tool-manifest.json
  install-tools.ps1
  verify-tools.ps1
  convert-gltf.mjs
  generate-tiles.ps1
  README.md
```

### 24.3 `tool-manifest.json` 字段

```text
toolName
version
downloadUrl
sha256
installPath
licenseType
supportedFormats
healthCheckCommand
required
```

### 24.4 现场能力

现场工具链必须支持：

- 检查工具是否安装。
- 下载工具包。
- 校验 sha256。
- 查看工具版本。
- 执行测试转换。
- 查看转换日志。
- 失败重试。
- 支持离线工具包。
- 输出可给实施人员阅读的错误信息。

### 24.5 工具调用日志

每次调用外部工具必须记录：

```text
toolName
toolVersion
commandLine
workingDirectory
inputFile
outputDirectory
stdout
stderr
exitCode
elapsedMs
startedTime
finishedTime
```

---

## 25. 性能预算与发布门禁

### 25.1 初始预算建议

| 场景 | 指标 |
|---|---|
| 单设备详情模式 | FPS 建议 >= 45 |
| 小区域 10~30 台设备 | FPS 建议 >= 30 |
| 首屏可交互时间 | 建议 <= 5s，按现场网络调整 |
| 单设备 medium GLB | 建议 <= 30MB |
| 单设备 low GLB | 建议 <= 10MB |
| 单设备 high GLB | 超过 100MB 必须告警 |
| 模型切换 | 必须释放 geometry / material / texture |
| 区域加载 | 禁止一次性加载全厂所有设备 |

### 25.2 `model-stats` 必须包含

```text
fileSizeMb
meshCount
materialCount
textureCount
vertexCount
triangleCount
drawCallEstimate
maxTextureSize
hasMovableCandidates
hasDuplicatedNames
hasInvalidMaterials
isOverBudget
budgetMessages
```

### 25.3 发布门禁

发布前必须检查：

1. manifest 存在。
2. object-tree 存在。
3. model-stats 存在。
4. 可动部件绑定全部 valid。
5. motion target 配置合法。
6. medium / low 超预算时必须提示。
7. 超预算模型不能直接发布，必须人工确认或重新优化。
8. Failed / Invalid 版本不能发布。
9. 发布操作必须写入审计。

### 25.4 超预算处理

```text
warning：允许进入编辑模式，但提示优化
blocked：禁止发布到监控模式
manual_approval：允许管理员审批发布
```

---

## 26. 实施阶段计划

### 阶段 0：领域模型、接口契约、数据库核心表冻结

目标：

- 明确正式项目前后端边界。
- 明确 MVP 一期范围。
- 明确数据库 ER。
- 明确 API v0.1。
- 明确 GLB / 3D Tiles 分工。

交付物：

- v1.2 技术方案。
- 数据库 ER 草案。
- API 契约 v0.1。
- 模型资产规范。

### 阶段 1：.NET 8 后端骨架

目标：

- 建立 ASP.NET Core Web API。
- 建立分层结构。
- 接入 EF Core 8。
- 建立数据库迁移。
- 提供 Swagger。
- 建立统一响应和异常处理。

交付物：

- `IdtsTwin.Api`
- `IdtsTwin.Application`
- `IdtsTwin.Domain`
- `IdtsTwin.Infrastructure`
- 初始数据库迁移。

### 阶段 2：模型资产管理 MVP

目标：

- GLB 上传。
- SHA256 去重。
- 文件存储。
- 元数据入库。
- 转换任务创建。
- manifest 查询。

交付物：

- 模型上传 API。
- 资产表。
- 文件存储服务。
- hash 去重逻辑。
- manifest 查询接口。

### 阶段 3：前端消费后端 manifest / object-tree

目标：

- 前端从后端 manifest 加载 GLB。
- 前端从后端 object-tree 展示对象树。
- 本地静态 JSON 只作为开发 fallback。

交付物：

- `AssetManifestLoader`
- `ObjectTreeAdapter`
- 后端数据源优先策略。

### 阶段 4：可动部件配置入库

目标：

- 可动部件绑定入库。
- motion target 入库。
- 编辑模式保存配置。
- 监控模式只读并执行动画。
- 绑定失效检测。

交付物：

- 可动部件 API。
- motion target API。
- 发布前绑定校验。

### 阶段 5：后台转换流水线

目标：

- 接入 glTF Transform。
- 生成 model-stats。
- 生成 object-tree。
- 生成 LOD。
- 保存转换日志。
- 支持失败重试。

交付物：

- Hangfire 调度。
- Worker 执行器。
- ToolRunner。
- 转换任务记录。

### 阶段 6：3D Tiles 早期技术验证

目标：

- Three.js 加载最小 tileset。
- 验证坐标系、Z-up、缩放比例、GLB 对齐。
- 验证 picking 和资源释放。

交付物：

- `TilesetLayer` 原型。
- 技术验证报告。

### 阶段 7：场景与设备实例管理

目标：

- 建立场景树。
- 建立设备实例。
- 建立设备与模型版本绑定。
- 前端按区域加载设备。

交付物：

- 场景 API。
- 设备实例 API。
- 场景 manifest。

### 阶段 8：任务和告警联动

目标：

- 接入任务下发。
- 接入设备状态。
- 接入异常告警。
- 前端 overlay 展示。

交付物：

- 任务 API。
- 告警 API。
- 状态适配层。

### 阶段 9：3D Tiles 生产化

目标：

- 正式厂区 tileset。
- tileset manifest。
- 分区加载。
- 版本发布。
- 性能门禁。

交付物：

- 厂区底座资产管理。
- tileset 发布流程。
- 性能验证报告。

### 阶段 10：生产化治理

目标：

- 权限。
- 审计。
- 发布审批。
- 回滚。
- 部署脚本。
- CI/CD。
- 运行监控。

交付物：

- 权限体系。
- 审计日志。
- 资产版本管理。
- 发布 / 回滚流程。
- 部署文档。

---

## 27. 风险与控制

| 风险 | 说明 | 控制手段 |
|---|---|---|
| .NET 8 生命周期 | 支持窗口有限 | 版本锁定、补丁更新、部署隔离、后续维护计划 |
| CAD 转换复杂 | 不同格式兼容性差 | MVP 先支持 GLB，再评估 STEP / IFC |
| 工具授权风险 | 商业工具不能随仓库发布 | 工具清单 + 外部安装 + 离线包 |
| 节点名不稳定 | CAD 导出对象名可能变化 | 多重匹配 + 绑定失效检测 |
| 坐标系不一致 | 3D Tiles 与 GLB 难对齐 | 早期技术验证 + 统一 transform |
| 浏览器性能压力 | 大模型压垮内存和 FPS | LOD + 3D Tiles + 区域加载 + 资源释放 |
| 发布误伤监控端 | 草稿配置直接影响生产 | Draft / Published 分离 |
| API 范围失控 | 一期做成全量平台 | MVP API 收敛 |

---

## 28. 验收标准

### 28.1 MVP 验收

- 能上传 GLB。
- 能计算 sourceFileHash。
- 能记录模型资产元数据。
- 能生成或保存 manifest。
- 能生成或保存 object-tree。
- 能保存 model-stats。
- 能从前端加载后端 manifest。
- 能在编辑模式保存可动部件。
- 能保存 motion target。
- 能在 monitor 模式只读配置并执行动画。

### 28.2 后端验收

- API 不阻塞长耗时转换。
- Worker 能记录 stdout / stderr / exitCode。
- 转换失败可查询原因。
- 资产版本状态正确。
- 发布和回滚可审计。

### 28.3 前端验收

- 能加载设备 GLB。
- 能查看对象树。
- 能点击对象。
- 能显示可动部件。
- monitor 模式不能编辑配置。
- edit 模式可以保存配置。
- 模型切换释放资源。

---

## 29. 仍待后续决策的问题

1. 正式数据库最终选择 PostgreSQL 还是 SQL Server。
2. 对象存储采用 MinIO、本地 NAS 还是其他 S3 兼容服务。
3. GLB 上传文件大小上限。
4. source/high/medium/low 的正式性能预算阈值。
5. STEP / IFC 转换工具最终选型。
6. 商业 CAD 格式是否纳入正式范围。
7. 任务系统和告警系统的数据来源。
8. 权限系统是否复用既有 IDTS 体系。
9. 是否需要多厂区 / 多租户。
10. 3D Tiles 生产化切片工具和坐标基准。

---

## 30. 最终推荐

最终推荐采用：

```text
Vue 3 + Vite + TypeScript
+ Three.js
+ 3DTilesRendererJS
+ 3D Tiles 静态厂区层
+ GLB 业务设备层
+ ASP.NET Core Web API (.NET 8)
+ EF Core 8
+ Hangfire + .NET Worker Service
+ PostgreSQL / SQL Server
+ MinIO / S3 对象存储
+ glTF Transform 模型优化
+ 数据库驱动的可动部件配置
+ Draft / Ready / Published / Archived / Failed / Invalid 资产版本机制
```

不推荐：

```text
纯前端承担模型转换
所有模型塞进一个巨大 GLB
所有对象都做成 3D Tiles 后强行动画
后端缓存浏览器渲染状态
把大型 CAD 转换工具提交进 Git
长期依赖 localStorage 保存正式配置
monitor 模式开放模型编辑能力
没有发布校验就切换正式模型
```

推进顺序：

```text
先冻结领域模型、接口契约和数据库核心表
再建立 .NET 8 后端骨架和资产管理
再让前端消费后端 manifest / object-tree
再做可动部件配置入库
再做 GLB 优化和资产流水线
并行早期验证 Three.js + 3D Tiles 集成
再接任务、告警和设备状态
最后做 3D Tiles 生产化和权限审计治理
```

---

## 31. 参考资料

- Microsoft .NET 支持策略：https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- Microsoft .NET 生命周期：https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-and-net-core
- OGC 3D Tiles 标准：https://www.ogc.org/standards/3dtiles/
- NASA-AMMOS 3DTilesRendererJS：https://github.com/NASA-AMMOS/3DTilesRendererJS
- Khronos glTF：https://www.khronos.org/gltf/
- glTF Transform CLI：https://gltf-transform.dev/cli
- Hangfire：https://www.hangfire.io/
- ASP.NET Core SignalR：https://dotnet.microsoft.com/en-us/apps/aspnet/signalr
