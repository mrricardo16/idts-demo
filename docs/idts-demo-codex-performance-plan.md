# idts-demo 厂区级数字孪生性能优化 Codex 分步执行方案

> 适用项目：`idts-demo`  
> 技术栈：Vue3 + Vite + TypeScript + Three.js + GLB/glTF + 静态配置 / mock 数据  
> 目标：让 Codex 按阶段执行性能优化，且每一阶段都有明确回归验证。只有验证通过，才允许进入下一阶段。

---

## 0. 核心原则

本方案不是让 Codex 一次性重构整个项目，而是把厂区级性能优化拆成可验证的小阶段。

当前项目已经发生过的回归问题必须避免：

1. 为了 proxy 优化，首屏显示了突兀空盒子。
2. 为了点击加载 high 模型，破坏了模型部件点击选择。
3. 为了模型姿态修正，导致 localZ 和 worldZ 方向混淆。
4. 为了 LOD 切换，触发模型重新加载，影响对象树和可动部件绑定。

因此，本方案的最高原则是：

```text
先保住现有核心交互，再逐步增加性能能力。
```

任何性能优化都不能破坏以下基线功能：

```text
真实模型首屏展示
模型部件点击选择
模型对象树选择
手动设置可动部件
任务下发 worldZ 移动
模型校准
手动 LOD 切换
npm run build 通过
```

---

## 1. Codex 每次任务前必须执行的固定流程

每个阶段开始前，都先让 Codex 执行下面这个提示词。

### 通用启动提示词

```text
请先读取项目根目录的 AGENTS.md，并严格遵守其中规则。

本次任务必须采用最小变更原则。

开始修改代码前，请先输出：
1. 本阶段目标
2. 计划修改的文件
3. 可能影响的功能
4. 不会触碰的功能
5. 回归验证清单

在我确认前，不要修改代码。
```

如果 Codex 直接开始大改，停止该任务，重新要求它先读 `AGENTS.md` 并输出影响范围。

---

## 2. 每个阶段完成后的通用验收门禁

每个阶段结束后，必须执行下面的验证。没有全部通过，不允许进入下一阶段。

### 通用构建验证

```bash
npm run build
```

必须通过。

### 通用交互回归

人工打开页面验证：

```text
1. 页面首屏显示真实 GLB 或 low / medium 模型。
2. 页面首屏不显示自动生成的空盒子。
3. 点击模型部件不会出现“模型加载中”。
4. 点击模型部件不会触发模型重新加载。
5. 点击模型部件能高亮对象。
6. 右侧能显示对象信息。
7. 模型对象树能展开。
8. 点击对象树节点能选中对象。
9. 能将选中对象设为可动部件。
10. 下发任务后，可动部件沿 worldZ 正确上下移动。
11. 手动切换模型级别失败时，当前模型不消失。
12. proxy 文件不存在时，不自动生成盒子。
```

### 通用状态边界验证

确认下面状态没有混用：

```text
selectedObject 只由点击选择改变
movableObject 只由“设为可动部件”改变
modelLoading 只由模型级别切换改变
currentModelLevel 只由手动切换改变
taskRunning 只由任务下发改变
```

### 通用提交要求

每个阶段单独提交，不要多个阶段混在一起。

```bash
git status
npm run build
git add .
git commit -m "<阶段提交信息>"
```

提交前必须确认未提交：

```text
source-models/*.STEP
source-models/*.STP
source-models/*.step
source-models/*.stp
node_modules
dist
```

---

# 阶段 0：冻结当前交互基线

## 目标

先修复并冻结当前 Demo 的核心交互，确保后续性能优化不会继续破坏点击、对象树、可动部件和任务下发。

## 不做什么

本阶段不做：

```text
不新增自动 LOD
不生成 proxy box
不接入 3D Tiles
不做多设备场景
不引入 Web Worker
不引入 GPU Picking
不做大规模重构
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 0，冻结当前交互基线。

目标：
修复并确认当前 Demo 的核心交互功能稳定，后续性能优化不得破坏这些功能。

请检查并修复以下问题：

1. 页面首屏必须优先显示真实 GLB 或 low / medium 模型。
2. 不允许自动生成 BoxGeometry / Wireframe 空盒子作为 proxy。
3. 点击模型只做对象选择，不允许触发模型加载。
4. 点击模型时不得设置 modelLoading = true。
5. 点击模型时不得调用 loadLevel / switchLevel / reloadModel / loadSelectedLevel。
6. 模型对象树必须能展示真实 GLB 的 Group / Mesh 层级。
7. 点击对象树节点能高亮对应对象。
8. 用户能将任意选中对象设为可动部件，不强制要求对象名为 lifter-platform。
9. 任务下发必须使用 worldZ 移动，不允许直接使用 local position.z 作为业务上移。
10. LOD 切换只能通过右侧按钮手动触发。
11. 手动切换失败时，保留当前模型，不清空场景，不生成盒子。

本阶段请优先检查：
- InteractionManager
- LODModelLoader
- ModelLoader
- ModelTreePanel
- AnimationManager
- TwinDemo 相关组件
- public/model-configs/lifter.json

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 首屏显示真实模型或 low / medium 模型
[ ] 不出现自动空盒子
[ ] 点击模型不出现“模型加载中”
[ ] 点击模型不触发重载
[ ] 点击模型能选中 mesh
[ ] 对象树可展开
[ ] 对象树节点可选择
[ ] 可手动设置可动部件
[ ] 任务上移视觉向上
[ ] 任务下移视觉向下
[ ] LOD 只能通过按钮手动切换
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "fix: stabilize model interaction baseline"
```

---

# 阶段 1：新增性能观测面板

## 目标

先建立可观测能力。没有性能数据，不继续做优化。

需要显示：

```text
FPS
renderer.info.render.calls
renderer.info.render.triangles
renderer.info.memory.geometries
renderer.info.memory.textures
当前模型级别
当前模型 URL
mesh 数
material 数
vertex 数
triangle 数
```

## 不做什么

本阶段不做：

```text
不改变模型加载策略
不改变点击逻辑
不改变 LOD 逻辑
不新增模型优化脚本
不新增 proxy
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 1，新增性能观测面板。

目标：
在不改变现有模型加载、点击选择、对象树、可动部件绑定、任务下发逻辑的前提下，增加性能观测能力。

请实现：

1. 新增 PerformanceMonitor / PerformancePanel。
2. 每秒或固定间隔采样并显示：
   - FPS
   - renderer.info.render.calls
   - renderer.info.render.triangles
   - renderer.info.memory.geometries
   - renderer.info.memory.textures
   - 当前模型级别 currentModelLevel
   - 当前模型 URL
3. 加载模型后统计模型结构：
   - mesh 数
   - material 数
   - vertex 数
   - triangle 数
4. 性能面板只读展示，不允许触发模型加载或切换。
5. 性能统计不能影响 selectedObject、movableObject、taskRunning。
6. 统计逻辑要和渲染循环解耦，避免每帧深度 traverse 整个模型。
7. README 增加“性能观测指标”说明。

本阶段禁止修改：
- 点击模型选择逻辑
- LOD 切换逻辑
- 任务下发逻辑
- 模型校准逻辑

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 性能面板能显示 FPS
[ ] 能显示 draw calls
[ ] 能显示 triangles
[ ] 能显示 geometries / textures
[ ] 能显示模型 mesh / material / vertex / triangle 统计
[ ] 点击模型仍然只选择部件
[ ] 对象树仍可用
[ ] 可动部件仍可设置
[ ] 任务下发仍可移动
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add threejs performance monitor"
```

---

# 阶段 2：新增模型体检脚本 inspect-model

## 目标

建立离线模型体检能力，先看模型问题在哪里。

本阶段只新增脚本，不改变前端运行逻辑。

## 预期文件

```text
scripts/inspect-model.mjs
reports/model-inspect/
README.md
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 2，新增模型体检脚本。

目标：
新增离线模型 inspect 能力，用于分析 GLB 模型的大小、mesh 数、材质数、三角数、draw call 风险等信息。

要求：

1. 新增 scripts/inspect-model.mjs。
2. 脚本默认读取 public/models/lifter.glb，允许通过命令行参数传入模型路径。
3. 如果系统存在 gltf-transform CLI，则调用：
   gltf-transform inspect <input.glb>
4. 如果系统不存在 gltf-transform CLI：
   - 输出安装提示
   - 不导致前端项目运行失败
   - 不影响 npm run build
5. 将 inspect 输出保存到 reports/model-inspect/ 目录。
6. package.json 增加脚本：
   "model:inspect": "node scripts/inspect-model.mjs"
7. README 增加使用说明。
8. 脚本不能读取或提交 source-models 下的 STEP/STP 源文件。
9. 本阶段不修改任何 Three.js 运行时代码。

修改前先输出影响范围。
修改后运行：
- npm run build
- npm run model:inspect

如果 model:inspect 因未安装 gltf-transform 而无法执行，应给出明确提示，但不能影响 build。
```

## 回归验证清单

```text
[ ] npm run build 通过
[ ] npm run model:inspect 有明确输出
[ ] 未安装 gltf-transform 时有安装提示
[ ] 已安装 gltf-transform 时能生成 inspect 报告
[ ] 前端点击和任务功能完全不变
[ ] 未提交 STEP/STP 源文件
```

## 通过后提交

```bash
git commit -m "chore: add glb inspect script"
```

---

# 阶段 3：模型 manifest 与加载配置标准化

## 目标

把模型资源路径、档位、姿态、绑定信息统一到 manifest/config 中，为后续 LOD 和厂区级分块做准备。

## 关键原则

本阶段只标准化配置，不开启自动 LOD。

```text
点击模型仍然只是选择对象
LOD 仍然只能手动按钮切换
不允许自动生成盒子
```

## 预期文件

```text
public/model-configs/lifter.json
public/models/lifter/manifest.json
src/types/modelManifest.ts
src/engine/ModelManifestLoader.ts
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 3，模型 manifest 与加载配置标准化。

目标：
将模型资源配置标准化，为后续 high / medium / low 和厂区级模型分块做准备。

要求：

1. 新增或调整 public/models/lifter/manifest.json。
2. manifest 至少包含：
   - modelId
   - modelName
   - levels.source
   - levels.high
   - levels.medium
   - levels.low
   - levels.proxy
   - defaultLevel
   - transform.rotationDeg
   - transform.position
   - transform.scale
   - semantic.movableParts
   - semantic.selectableParts
3. 如果当前只有一个真实模型，应将它配置为 source。
4. defaultLevel 当前建议为 source。
5. autoLoadHighOnSelect 必须为 false。
6. allowGeneratedProxy 必须为 false。
7. proxy 只有真实 proxy.glb 存在时才可用。
8. 新增 TypeScript 类型 ModelManifest。
9. 新增 ModelManifestLoader，只负责读取和校验 manifest，不触发模型切换。
10. 保持现有首屏真实模型展示。
11. 保持点击模型选择部件。
12. 保持对象树、可动部件、任务下发不变。

本阶段不要实现自动 LOD。
本阶段不要生成低模。
本阶段不要生成 proxy box。

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## manifest 示例

```json
{
  "modelId": "lifter-001",
  "modelName": "提升机 001",
  "defaultLevel": "source",
  "levels": {
    "source": "/models/lifter.glb",
    "high": "/models/lifter/lifter.high.glb",
    "medium": "/models/lifter/lifter.medium.glb",
    "low": "/models/lifter/lifter.low.glb",
    "proxy": "/models/lifter/lifter.proxy.glb"
  },
  "lod": {
    "autoLoadHighOnSelect": false,
    "allowGeneratedProxy": false
  },
  "transform": {
    "upAxis": "Z",
    "rotationDeg": { "x": 180, "y": 0, "z": 0 },
    "position": { "x": 0, "y": 0, "z": 0 },
    "scale": { "x": 1, "y": 1, "z": 1 }
  },
  "semantic": {
    "movableParts": [],
    "selectableParts": []
  }
}
```

## 回归验证清单

```text
[ ] manifest 能被读取
[ ] source 模型能加载
[ ] 首屏不显示盒子
[ ] 点击模型不触发加载
[ ] 对象树仍可用
[ ] 任务下发仍可用
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add model manifest config"
```

---

# 阶段 4：生成 high / medium / low 模型变体

## 目标

以当前提升机模型为样本，建立单模型多档资源生成流程。

本阶段重点是离线资产流程，不直接改前端交互。

## 关键原则

自动简化不能破坏业务语义。

如果模型中有已知可动部件，必须验证它在 medium / low 中是否还存在。如果不存在，要在报告中明确写出风险，不允许假装成功。

## 预期文件

```text
scripts/generate-lod.mjs
public/models/lifter/lifter.high.glb
public/models/lifter/lifter.medium.glb
public/models/lifter/lifter.low.glb
reports/model-lod/
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 4，生成 high / medium / low 模型变体。

目标：
用当前真实 GLB 生成 high / medium / low 三档模型资源，并输出对比报告。

要求：

1. 新增 scripts/generate-lod.mjs。
2. 脚本默认输入 public/models/lifter.glb。
3. 输出目录 public/models/lifter/。
4. 输出文件：
   - lifter.high.glb
   - lifter.medium.glb
   - lifter.low.glb
5. high 可以先复制 source 或做轻量 optimize。
6. medium 使用 gltf-transform optimize / meshopt。
7. low 使用 simplify，ratio 初始建议 0.25。
8. 如果 gltf-transform 未安装：
   - 输出安装提示
   - 不影响 npm run build
9. 生成 reports/model-lod/lifter-lod-report.md，包含：
   - 每档文件大小
   - mesh 数
   - material 数
   - vertex 数
   - triangle 数
   - 是否发现已配置的 movableParts
   - 是否存在语义丢失风险
10. 更新 manifest 中对应 levels 路径。
11. 不允许生成自动 BoxGeometry proxy。
12. 不允许提交 source-models 下的 STEP/STP 文件。
13. 不要修改点击逻辑、对象树逻辑、任务下发逻辑。

修改前先输出影响范围。
修改后运行：
- npm run build
- npm run model:inspect
- npm run model:lod，如果你新增了该命令

输出生成结果和风险说明。
```

## 回归验证清单

```text
[ ] lifter.high.glb 存在
[ ] lifter.medium.glb 存在，或有明确失败原因
[ ] lifter.low.glb 存在，或有明确失败原因
[ ] 有 LOD 对比报告
[ ] manifest 路径正确
[ ] 不生成空盒子
[ ] 不破坏前端交互
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "chore: generate lifter lod variants"
```

---

# 阶段 5：手动 LOD 切换

## 目标

在 UI 中允许用户手动切换 source / high / medium / low，用于性能对比。

注意：仍然不做自动 LOD。

## 关键原则

```text
点击模型 = 选择部件
点击 LOD 按钮 = 切换模型级别
```

这两个职责必须分开。

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 5，手动 LOD 切换。

目标：
在右侧 UI 中提供 source / high / medium / low 手动切换按钮，用于性能对比，但不能破坏模型点击选择和任务下发。

要求：

1. UI 增加模型级别切换按钮：
   - source
   - high
   - medium
   - low
2. 只有用户点击按钮时，才允许切换模型。
3. 点击模型本体不允许切换模型。
4. 点击模型本体不允许显示“模型加载中”。
5. 如果目标级别文件不存在：
   - 显示提示
   - 保留当前模型
   - 不清空场景
   - 不生成盒子
6. 如果目标级别加载失败：
   - 保留当前模型
   - 显示失败原因
   - 不影响 selectedObject / movableObject，除非模型已经成功替换
7. 切换成功后：
   - 应用 manifest transform
   - 重建 modelTree
   - 重建 raycastTargets
   - 清空 selectedObject 或尝试按 name/uuid 恢复
   - 如果原 movableObject 在新模型中找不到，明确提示用户重新选择
8. 模型切换过程中的 loading 只出现在点击 LOD 按钮时。
9. 任务下发逻辑不因 LOD 切换而自动执行。
10. README 增加说明：
    - 当前是手动 LOD
    - 自动 LOD 后续阶段再做
    - 点击模型不触发 LOD

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 点击模型仍然只选择部件
[ ] 点击 LOD 按钮才切换模型
[ ] 切换到存在的模型能成功
[ ] 切换到不存在的模型不会清空当前模型
[ ] 切换成功后对象树重建
[ ] 切换成功后可重新设置可动部件
[ ] 不生成空盒子
[ ] 性能面板能展示不同档位差异
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add manual lod switching"
```

---

# 阶段 6：资源释放与内存回收

## 目标

建立模型切换、区域切换、页面销毁时的资源释放机制，避免厂区级场景长期运行后内存泄漏。

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 6，资源释放与内存回收。

目标：
增加 Three.js 资源释放工具，确保模型切换和页面销毁时能释放 geometry、material、texture 等资源。

要求：

1. 新增 src/engine/ResourceDisposer.ts。
2. 实现 disposeObject3D(object)。
3. 释放：
   - geometry
   - material
   - material.map
   - material.normalMap
   - material.roughnessMap
   - material.metalnessMap
   - material.emissiveMap
   - material.aoMap
   - material.alphaMap
   - material.envMap 注意不要误释放全局共享环境贴图
4. 处理 material 数组。
5. 模型级别切换成功后，释放旧模型资源。
6. 模型级别切换失败时，不释放当前正在显示的模型。
7. 页面销毁时释放当前模型和监听事件。
8. 性能面板显示 geometries / textures，便于观察是否持续增长。
9. 不修改点击选择职责。
10. 不修改任务移动职责。

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 多次切换模型后页面不崩溃
[ ] 切换失败不释放当前模型
[ ] 几何体和纹理数量没有持续异常增长
[ ] 点击选择仍可用
[ ] 对象树仍可用
[ ] 任务下发仍可用
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add threejs resource disposer"
```

---

# 阶段 7：小区域多设备压力 Demo

## 目标

从单提升机扩展到小区域，验证 10~30 个设备模型同时存在时的加载、点击和性能。

## 关键原则

不要一开始就做全厂区。先做小区域。

## 预期能力

```text
区域 manifest
多设备 mock 数据
加载队列
设备级状态
性能面板
点击设备
选中设备后进入部件选择模式
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 7，小区域多设备压力 Demo。

目标：
在不破坏单设备详情能力的基础上，新增一个小区域多设备场景，用于验证 10~30 台设备同时显示时的性能。

要求：

1. 新增 mock 区域配置：
   - areaId
   - areaName
   - devices[]
2. devices 中每个设备包含：
   - deviceId
   - deviceName
   - modelId
   - position
   - rotation
   - scale
   - status
3. 初始可以复用同一个 lifter 模型模拟多个设备。
4. 默认只加载 source / medium / low 中当前可用的一档。
5. 不要加载 high 作为多设备默认档。
6. 增加简单加载队列，避免同时发起大量 GLB 请求。
7. 多设备场景下，点击设备整体即可选中设备。
8. 只有进入单设备详情或选择某设备后，才允许展开内部对象树。
9. 当前单提升机 Demo 的部件级选择和任务下发能力必须保留。
10. 不要引入自动 box proxy。
11. 不要引入自动点击加载 high。
12. 性能面板显示当前设备数量、模型数量、draw calls、triangles、FPS。

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 单设备 Demo 仍可用
[ ] 小区域能显示 10~30 台设备
[ ] 首屏不显示空盒子
[ ] 多设备场景 FPS 可观察
[ ] 点击设备不会触发无意义重载
[ ] 选中设备后可进入部件选择
[ ] 原任务下发功能仍可验证
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add small area multi-device demo"
```

---

# 阶段 8：分层点击检测 HitBoxManager

## 目标

为厂区级场景准备分层拾取能力，避免 Raycaster 每次点击都遍历所有精细 mesh。

## 策略

```text
多设备场景：
先点设备级 hitbox

单设备详情：
再点真实 mesh / 对象树
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 8，分层点击检测 HitBoxManager。

目标：
新增设备级 hitbox 点击检测能力，用于多设备场景中快速选中设备；同时保留单设备详情中的内部 mesh 点击能力。

要求：

1. 新增 HitBoxManager。
2. 多设备场景中，为每个设备创建透明 hitbox。
3. hitbox 只用于设备整体选择。
4. hitbox.userData 必须包含：
   - deviceId
   - modelId
   - deviceName
5. Raycaster 分两种模式：
   - areaMode：只检测设备 hitbox
   - detailMode：检测当前选中设备内部真实 mesh
6. areaMode 下点击设备不加载 high，不展开所有内部 mesh。
7. detailMode 下点击内部 mesh 能选择部件。
8. hitbox 不能覆盖或破坏单设备详情里的内部部件选择。
9. 不允许把 hitbox 当成可动部件。
10. 不生成可见盒子。hitbox 必须透明或不可见。
11. README 增加“分层点击检测”说明。

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 多设备场景能点击设备整体
[ ] hitbox 不可见，不影响观感
[ ] 单设备详情仍可点击内部 mesh
[ ] 可动部件不能误设为 hitbox
[ ] 点击不会触发模型重新加载
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add layered hitbox picking"
```

---

# 阶段 9：重复对象实例化验证

## 目标

验证 `InstancedMesh` 对重复对象的收益，为厂区级货架、托盘、传感器、标准设备提供技术基础。

## 适用对象

只对重复静态对象使用实例化。

允许：

```text
托盘
货架立柱
围栏
传感器
标准灯具
标准电机外壳
```

禁止：

```text
可动部件
需要单独点击的内部部件
需要独立告警的关键部件
任务下发目标
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 9，重复对象实例化验证。

目标：
新增一个 InstancedMesh 示例，用于验证大量重复静态对象的渲染性能收益。

要求：

1. 新增实例化 Demo 区域，模拟 100 / 500 / 1000 个重复对象。
2. 使用 THREE.InstancedMesh。
3. UI 可以切换：
   - 普通 Mesh 模式
   - InstancedMesh 模式
4. 性能面板对比 draw calls、triangles、FPS。
5. 实例化对象只作为静态重复物测试。
6. 不要将当前提升机可动部件实例化。
7. 不要影响模型对象树和可动部件选择。
8. README 增加说明：
   - 什么对象适合实例化
   - 什么对象不适合实例化
   - 实例化对 draw call 的影响

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 普通 Mesh 模式可显示
[ ] InstancedMesh 模式可显示
[ ] 性能面板能看到 draw calls 差异
[ ] 单提升机部件选择不受影响
[ ] 任务下发不受影响
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add instanced mesh performance demo"
```

---

# 阶段 10：模型质量门禁与 CI 草案

## 目标

建立模型资产进入项目的质量标准，防止未来新模型把项目性能拖垮。

## 质量门禁内容

```text
文件大小
mesh 数
material 数
vertex 数
triangle 数
是否存在语义对象
是否存在 movable parts
是否存在 source / medium / low
是否误提交 STEP/STP
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 10，模型质量门禁与 CI 草案。

目标：
新增模型质量检查脚本和文档，用于后续厂区级模型资产管控。

要求：

1. 新增 scripts/check-model-budget.mjs。
2. 新增 config/model-budget.json。
3. 检查项至少包括：
   - 单模型文件大小
   - mesh 数
   - material 数
   - vertex 数
   - triangle 数
   - 是否存在 manifest
   - 是否存在默认模型路径
   - 是否存在可选的 high / medium / low
4. 检查到超过预算时：
   - 输出 warning 或 error
   - 当前阶段可以先 warning，不阻断 build
5. 新增 npm script：
   - model:budget
6. 新增 docs/model-asset-guideline.md，说明：
   - CAD/STEP 不能直接作为运行时资产
   - GLB 命名规范
   - high / medium / low 规则
   - 可动部件命名规则
   - 不允许自动盒子 proxy
   - 不允许为性能破坏业务语义
7. 不修改 Three.js 运行时代码。
8. 不影响当前 Demo。

修改前先输出影响范围。
修改后运行：
- npm run build
- npm run model:budget
并输出结果。
```

## 回归验证清单

```text
[ ] model:budget 能执行
[ ] 超预算有明确提示
[ ] 文档说明清楚
[ ] 不影响前端运行
[ ] 不影响点击和任务
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "chore: add model budget checks"
```

---

# 阶段 11：区域分块与加载队列

## 目标

为厂区级场景建立分块加载基础。

空间结构：

```text
厂区
└─ 楼栋
   └─ 楼层
      └─ 区域
         └─ 设备
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 11，区域分块与加载队列。

目标：
建立区域 chunk 配置和加载队列，使后续厂区级场景可以按楼栋 / 楼层 / 区域加载模型，而不是一次性加载全部模型。

要求：

1. 新增区域 chunk 类型：
   - campusId
   - buildingId
   - floorId
   - areaId
   - bounds
   - devices
   - modelRefs
2. 新增 mock chunk 配置。
3. 新增 ChunkLoader。
4. ChunkLoader 负责：
   - 加载当前区域
   - 卸载离开区域
   - 保留当前选中设备
   - 失败时回滚到上一个稳定区域
5. 新增加载队列 PriorityModelLoader。
6. 加载优先级：
   - 当前选中设备
   - 当前视野区域
   - 邻近区域预取
   - 背景资源
7. 不允许一次性加载全部厂区。
8. 不允许 generated proxy。
9. 区域切换时必须释放离开区域资源。
10. README 增加区域分块策略说明。

修改前先输出影响范围。
修改后运行 npm run build，并输出回归验证结果。
```

## 回归验证清单

```text
[ ] 可加载当前区域
[ ] 可卸载离开区域
[ ] 区域切换不崩溃
[ ] 区域切换后性能指标可观察
[ ] 不一次性加载全部设备
[ ] 当前单设备详情仍可用
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "feat: add area chunk loading foundation"
```

---

# 阶段 12：长期技术预研，不直接改主线

## 目标

评估更高级能力，但不直接合并到主线：

```text
3D Tiles
OffscreenCanvas
GPU Picking
KTX2 纹理压缩
Meshopt 默认压缩
Draco 补充策略
真实厂区资产流水线
```

## Codex 执行提示词

```text
请先读取 AGENTS.md。

当前阶段：阶段 12，长期技术预研文档。

目标：
只新增技术预研文档，不修改现有运行时代码。

请新增 docs/factory-scale-roadmap.md，内容包括：

1. 什么时候需要 3D Tiles：
   - 多楼栋
   - 大范围漫游
   - GLB manifest 难维护
   - 需要真正流式加载
2. 什么时候需要 OffscreenCanvas：
   - 主线程 UI 卡顿
   - Three.js 渲染和 Vue 面板互相影响明显
3. 什么时候需要 GPU Picking：
   - Raycaster 命中延迟 P95 > 150ms
   - 海量设备对象点击压力过大
4. 什么时候需要 KTX2：
   - 纹理显存压力高
   - textures 数量持续增长
   - 大量 PBR 贴图
5. Meshopt / Draco 选择原则：
   - Meshopt 默认优先
   - Draco 用于极端带宽或点云/特殊几何压缩
6. 厂区级最终架构建议：
   - 离线资产流水线
   - manifest / chunk
   - low / medium / high
   - hitbox / 分层点击
   - telemetry / budget check
   - CI / 回滚
7. 明确说明：
   - 当前阶段不直接实现这些高级能力
   - 只有阶段 0 到 11 稳定后再评估

不修改任何业务代码。
修改后运行 npm run build。
```

## 回归验证清单

```text
[ ] 只新增文档
[ ] 不修改运行时代码
[ ] npm run build 通过
```

## 通过后提交

```bash
git commit -m "docs: add factory scale roadmap"
```

---

# 总体执行顺序

必须按顺序执行：

```text
阶段 0：冻结交互基线
阶段 1：性能观测面板
阶段 2：模型体检脚本
阶段 3：manifest 标准化
阶段 4：生成 high / medium / low
阶段 5：手动 LOD 切换
阶段 6：资源释放
阶段 7：小区域多设备 Demo
阶段 8：分层点击 HitBoxManager
阶段 9：重复对象实例化验证
阶段 10：模型质量门禁
阶段 11：区域分块与加载队列
阶段 12：长期技术预研文档
```

不允许跳过阶段直接做厂区级重构。

---

# 每阶段完成后的 Codex 汇报模板

要求 Codex 每次完成后按这个格式汇报：

```text
## 本阶段完成情况

阶段：
目标：
是否完成：

## 修改文件

- 文件1：修改说明
- 文件2：修改说明

## 影响范围

影响了：
未影响：

## 构建结果

npm run build：通过 / 失败

## 回归验证结果

[ ] 首屏真实模型
[ ] 不显示空盒子
[ ] 点击模型不触发加载
[ ] 对象树可用
[ ] 可动部件可设置
[ ] 任务下发可用
[ ] LOD 只由按钮触发
[ ] 性能面板正常
[ ] 其他本阶段专属验证

## 风险点

- 风险1
- 风险2

## 是否允许进入下一阶段

允许 / 不允许
原因：
```

---

# 失败处理规则

如果某阶段失败，不允许继续下一阶段。

## 构建失败

处理方式：

```text
先修 npm run build。
不允许继续新增功能。
不允许提交失败状态。
```

## 点击回归失败

如果出现：

```text
点击模型触发加载
点击模型显示“模型加载中”
点击模型不能选部件
对象树不能选择
```

处理方式：

```text
立即停止当前阶段。
回到阶段 0 的交互基线修复。
```

## 任务下发失败

如果出现：

```text
上移变下移
任务移动对象错误
找不到可动部件后无法手动选择
```

处理方式：

```text
停止性能优化。
优先修复 worldZ 移动和可动部件绑定。
```

## 观感失败

如果出现：

```text
首屏空盒子
模型突然消失
切换失败后场景空白
```

处理方式：

```text
禁止继续 LOD。
恢复首屏真实模型和失败保留旧模型策略。
```

---

# 给用户的实际执行建议

如果你现在要立刻让 Codex 开始，不要把整份文档一次性叫它全部执行。

正确方式是：

```text
先把本文档保存为 docs/idts-demo-codex-performance-plan.md。
然后一次只发一个阶段给 Codex。
每个阶段通过后再发下一阶段。
```

建议第一条 Codex 任务：

```text
请读取 AGENTS.md 和 docs/idts-demo-codex-performance-plan.md。
当前只执行阶段 0：冻结当前交互基线。
不要执行后续阶段。
修改前先输出影响范围，等待我确认。
```

等阶段 0 通过后，再执行阶段 1。

---

# 最终结论

厂区级性能优化不是一次性重构，而是一条逐步收敛的工程路线：

```text
先稳定交互
再建立观测
再建立模型体检
再生成多档模型
再手动 LOD
再资源释放
再多设备压力测试
再分层点击
再实例化
再模型质量门禁
再区域分块
最后评估 3D Tiles / OffscreenCanvas / GPU Picking
```

每一步都必须有回归验证。  
验证没过，不进入下一步。
