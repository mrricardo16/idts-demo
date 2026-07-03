# idts-demo

`idts-demo` 是一个独立的 WebGL / Three.js 数字孪生技术预研 Demo，不属于现有 `HZ.IDTS.UI` 或 `HZ.IDTS.API` 项目。

## 项目目的

本 Demo 用于验证浏览器端加载工业设备三维模型、点击查看模型对象、查看模型结构、手动绑定可动部件、下发 mock 任务并驱动提升机可动部件沿 Z 轴移动。第一版只做纯前端 Demo，不接入真实后端、数据库、登录权限或正式菜单体系。

## 技术栈

- Vue3
- Vite
- TypeScript
- Three.js
- GLTFLoader
- FreeLookControls
- 普通 CSS

## 运行命令

建议使用 Node.js 18 或更高版本。当前本机可通过 `nvm use 24.15.0` 切换到 Node 24。

```bash
npm install
npm run dev
npm run build
```

开发服务启动后访问命令行输出的本地地址。

## Demo 功能

- 初始化 Three.js 场景、相机、渲染器、灯光、Z-up 固定地面和自由视角控制器。
- 按 `public/model-configs/lifter.json` 中的 LOD 配置加载真实 GLB。
- 如果所有配置的 GLB 都不存在或加载失败，只显示错误提示，不自动生成空盒子占位。
- 支持左键拖动改变观察方向、滚轮沿相机方向前进 / 后退和点击模型对象。
- 加载后输出模型性能统计和模型对象树。
- 右侧面板显示模型对象树，点击节点后可在 3D 场景中高亮该对象。
- 使用 mock 数据显示设备状态；真实 GLB 测试模式默认不让 mock 状态改写模型材质颜色。
- 支持提升机任务下发，按目标楼层把当前绑定的可动部件沿 Z 轴移动到指定位置。

## 坐标系约定

项目统一采用 Z-up 坐标约定：

- Z 轴为竖直方向。
- X/Y 为地面平面。
- Three.js 固定地面是位于 `z = 0` 的 X/Y 平面。
- GridHelper 网格线默认关闭，避免和天空背景、固定地面产生视觉错位。
- Camera 和自由视角控制器使用 Z 轴作为 up 方向。

真实模型姿态使用外部静态配置：

```text
public/model-configs/lifter.json
```

运行时访问路径为：

```text
/model-configs/lifter.json
```

可通过该文件配置模型的 `modelUrl`、`rotationDeg`、`scale`、`position`、`autoCenter`、`groundToZero`、`movablePartName` 和 `moveAxis`，不要把模型姿态修正参数散落在业务代码中。Demo 阶段可以直接修改该 JSON 调整模型姿态，不需要重新构建前端。

## 当前模型状态

当前已生成并放置真实运行模型：

```text
public/models/lifter.glb
```

该文件由 `source-models` 下的模型转换产物复制而来。Demo 会按 LOD 配置优先尝试 `medium / low / source / high / proxy`；如果低模尚未生成，会继续回退到 `sourceUrl` 指向的现有 `lifter.glb`。如果所有配置的 GLB 都不存在或加载失败，页面只显示错误提示，不自动创建盒子占位模型。

当前真实 GLB 已能加载，但模型内部节点名仍主要是 CAD Assistant 导出的 `NAUO...` 等名称，尚未包含 `lifter-platform` 等业务 meshName。因此：

- 可以整体展示真实 GLB。
- 可以查看模型对象树。
- 可以整体高亮或调试节点。
- 当前没有 `lifter-platform`，Demo 不再默认绑定 `NAUO447`。
- 页面会提示用户从 3D 模型或对象树中手动选择疑似箱体 / 轿厢 / 载货台对象，并点击“设为可动部件”。

如果没有任何真实 GLB 加载成功，任务下发会被禁用，并提示“未加载真实模型，无法执行提升机移动任务”。

## 模型外部配置与校准

模型配置文件位于：

```text
public/model-configs/lifter.json
```

加载真实 GLB 前，前端会先读取 `/model-configs/lifter.json`，再根据其中的 `modelUrl` 加载模型，并统一应用 `rotationDeg`、`scale`、`position`、`autoCenter` 和 `groundToZero`。角度配置使用 degree，代码中会转换为 radian。

如果模型上下放反，可以先尝试：

```json
{
  "transform": {
    "rotationDeg": {
      "x": 180,
      "y": 0,
      "z": 0
    }
  }
}
```

如果 X 轴 180 度后前后方向不对，可以改为 `rotationDeg.y = 180`。不推荐使用 `scale.z = -1` 这类负缩放方式修正朝向，负缩放容易影响法线、包围盒和交互判断。

右侧“模型校准”面板支持实时调整旋转、缩放、位置、自动居中和贴地参数。点击“复制 JSON”后，可以得到可直接粘贴回 `public/model-configs/lifter.json` 的配置。修改该文件后刷新页面即可生效，不需要重新打包或重新导出模型。

正式部署时，可以继续把 `model-configs` 作为静态配置目录，也可以由后端接口返回同结构配置。正式项目建议维护模型配置表，字段至少包括 `modelUrl`、`rotation`、`scale`、`position`、`movablePartName`、`moveAxis`。

## 视角控制说明

相机和自由视角配置位于：

```text
src/config/cameraControlConfig.ts
```

当前 Demo 固定采用自由视角交互，不再使用 OrbitControls 的“围绕 target 旋转 / 缩放”作为主控制方式：

- 左键点击：选择模型部件，高亮对象并在右侧显示对象信息。
- 左键拖动：只改变相机朝向，也就是 FPS / free-look 风格的 yaw / pitch，不旋转模型本体。
- 右键拖动：当前禁用，不再作为旋转或平移入口。
- 中键 / 滚轮：沿当前 `camera.forward` 前进或后退，直接移动 `camera.position`，不修改 `controls.target`。
- W / S：沿当前相机视角方向前进 / 后退。
- A / D：沿当前相机右方向左移 / 右移。
- Q / E：沿世界 Z 轴下降 / 上升。
- Shift：按住后提高键盘移动速度。

已禁用以下非标准交互：

- 鼠标光标焦点缩放。
- 自定义 `wheel` / `focusPoint` 缩放。
- `Ctrl + wheel` 或 `Alt + wheel` 焦点缩放。
- 右键拖动旋转模型本体。
- 滚轮过程中动态修改 `controls.target` 的逻辑。

这些逻辑在当前工业模型 Demo 中容易导致 `controls.target` 漂移、缩放手感异常或点击选择回归。普通滚轮缩放由 `src/engine/FreeLookControls.ts` 处理，只移动相机位置，不做 Raycaster 焦点缩放，也不触发模型加载或 LOD 切换。

当前 WASD 默认使用 `keyboardMoveMode = "fly"`：W/S 使用完整 `camera.forward`，A/D 使用当前相机右方向，Q/E 仍使用世界 Z 轴。如果后续需要厂区地面漫游，可以再切回 `ground` 模式，将 W/S 投影到 X/Y 地面平面。

当前导航使用固定速度配置，不做模型尺寸或厂区范围自适应：

- W/A/S/D 基础移动速度：`keyMoveSpeed = 12.0`。
- Shift 加速倍率：`keyBoostMultiplier = 4.0`。
- 滚轮移动速度：`wheelMoveSpeed = 4.0`。

如果后续觉得移动过快或过慢，直接修改 `src/config/cameraControlConfig.ts` 中对应数值。

键盘移动只要求页面有焦点，不需要先点击 3D canvas。用户在 `input`、`textarea`、`select` 或 `contenteditable` 中输入 W/A/S/D 时，不会移动相机。

当前缩放配置：

```ts
{
  enableZoom: true,
  zoomToCursor: false,
  zoomSpeed: 1.2
}
```

当前视角控制不依赖 `controls.target`。显式聚焦按钮只会计算模型或对象包围球，移动相机位置并更新相机朝向：

- 模型加载完成后初始化到模型中心。
- 点击“聚焦整机”。
- 点击“聚焦当前对象”。
- 点击“重置视角”。

自由视角仍保留基于模型包围球的距离参考。模型加载完成后，Demo 会根据 `Box3().setFromObject(model)` 计算模型包围球，并自动调整：

- `controls.minDistance = Math.max(radius * 0.001, 0.01)`。
- `controls.maxDistance = Math.max(radius * 50, 500)`。
- `camera.far = maxSize * 50`，并设置保守上限，避免过大的远裁剪面影响深度精度。

`camera.far` 过小会导致远处模型不可见；`camera.near` 过小、`camera.far` 过大都可能造成深度精度问题，表现为远处表面闪烁或遮挡异常。不同尺寸模型应优先通过配置默认值和加载后的包围盒自适配共同处理，不要只写死一个固定 `maxDistance`。

右侧对象信息区域提供显式视角按钮：

- “聚焦当前对象”：聚焦当前选中对象，并为小部件临时使用更适合的距离参考。
- “聚焦整机”：聚焦当前模型整体中心，相机移动到能完整看到模型的位置。
- “重置视角”：恢复默认观察偏移，将相机朝向更新到模型中心，并恢复整机距离参考。

右侧性能 / 调试面板会显示 `navigation mode = free-look`、`orbit controls = disabled`、`zoom mode = move-along-camera-forward`、`camera.forward`、`yaw / pitch`、`wheel speed`、`look sensitivity`、`look invert X/Y`、`keyboard move mode`、`keyboard active source`、`pressed keys` 和 `canvas active`。点击模型、点击对象树、设为可动部件、任务下发移动当前绑定对象都不应触发模型重新加载。

## 世界 Z 轴移动

项目的业务运动统一使用世界坐标 Z 轴：

- “上移”表示世界坐标 `+Z`。
- “下移”表示世界坐标 `-Z`。
- 测试上移 / 下移每次都基于当前可动部件的实时 `world position`，例如上移 1m = 当前 `worldZ + 1`。
- F1 / F2 / F3 / F4 的 `z` 值表示相对于整机模型底部 `modelMinZ` 的目标高度偏移。
- 任务目标会换算为 `modelMinZ + floorOffsetZ + 可动部件底部偏移`，再限制在整机模型 world boundingBox 的高度范围内。
- 所有目标高度都会 clamp 到 `minAllowedWorldZ ~ maxAllowedWorldZ`，避免载货台 / 箱体 / 轿厢移动到整机模型高度之外。

模型经过 `rotationDeg` 修正后，子对象的 local axis 可能和世界 axis 不一致。如果直接修改 `object.position.z`，实际移动方向会沿父级局部 Z 轴执行，可能出现“点击上移但视觉上向下移动”的问题。

当前任务下发和测试移动会先计算目标世界坐标，再通过 `parent.worldToLocal(targetWorldPosition)` 转换成父级局部坐标，最后对 local position 做插值动画。动画每一帧也会重新检查 worldZ 边界，防止数值误差导致越界。

## 前端异常模拟

异常模拟配置位于 `public/model-configs/lifter.json` 的 `faultSimulation` 字段，当前只做前端 mock，不接后端。

- `faultSimulation.enabled` 控制默认是否开启异常模拟；页面右侧也提供开启 / 关闭按钮。
- `activeFaults` 中的异常对象优先用 `objectUuid` 匹配模型对象，`objectUuid` 为空时用 `objectName` 匹配。
- 找不到对象时，右侧会提示“异常部件未匹配到模型对象”，页面不会崩溃。
- 异常颜色从 `materialConfig.faultColor` 读取，未配置时使用 `#ff3333`。
- 异常高亮会 clone mesh material，关闭异常或切换模型时恢复原始材质，避免永久污染 GLB 材质。
- 异常红色优先级高于选中高亮、可动部件高亮、对象自定义颜色和默认颜色。

点击异常部件仍然走原有对象选择逻辑；右侧会额外显示故障码、故障等级、故障信息、部件名称、关联对象和处理建议。点击非异常部件时显示“当前对象无异常”。

## 模型颜色配置

模型基础颜色配置位于 `public/model-configs/lifter.json` 的 `materialConfig` 字段。

- `preserveOriginalMaterial = true` 时默认保留 GLB 原始材质，只对 `objectColors` 明确配置的对象覆盖颜色。
- `preserveOriginalMaterial = false` 时，未命中 `objectColors` 的 mesh 会使用 `defaultColor/defaultOpacity`。
- `objectColors` 匹配规则是 `objectUuid` 优先，`objectUuid` 为空或找不到时用 `objectName` 匹配。
- `objectName` 可以指向 Group 或 Mesh；命中 Group 时会对其子级 Mesh 应用配置色。
- 应用颜色前会 clone material，避免共用材质的其他对象被一起改色。
- 模型切换、LOD 切换或页面销毁时会释放配置颜色 clone 出来的材质。

颜色显示优先级为：异常 `faultColor` > 当前选中辅助框 `selectionColor` > 当前可动部件辅助框 `movablePartColor` > `objectColors` > `defaultColor` > 原始材质。异常关闭后会恢复到配置颜色或原始材质。

## Monitor / Edit 模式

页面支持两种前端模式：

- `monitor`：监控模式，默认入口。保留模型展示、对象点击、查看子级 / 父级、异常模拟、可动部件设置、任务下发、WASD / 鼠标视角和 LOD 手动切换；禁止编辑整机模型配置。
- `edit`：编辑模式。当前只编辑整机模型 root 的配置，不编辑子部件，不把可动部件任务位置保存为模型配置。

模式默认值来自 `public/model-configs/lifter.json` 的 `modeConfig.defaultMode`，未配置时使用 `monitor`。编辑模式下可以实时预览：

- `transform.position.x/y/z`
- `transform.rotationDeg.x/y/z`
- `transform.scale.x/y/z`
- `transform.flip.x/y/z`
- `transform.autoCenter`
- `transform.groundToZero`
- `materialConfig.defaultColor`
- `materialConfig.defaultOpacity`
- `materialConfig.preserveOriginalMaterial`

`flip` 不通过长期保存负 scale 实现；前端应用时转换为 root 旋转修正，并重新计算 boundingBox、`modelMinZ / modelMaxZ` 和可动部件安全移动边界。`groundToZero = true` 时，变换后会重新贴地。

纯前端 Demo 不会写回 `public/model-configs/lifter.json`。点击“保存到本地”会写入 localStorage：

```text
idts-demo:model-config:lifter-001
```

保存内容包含当前完整配置、`updatedAt` 和 `source: "localStorage"`。加载优先级为 localStorage 配置 > `public/model-configs/lifter.json` > 内置默认配置。点击“清除本地配置”后，刷新页面会恢复静态 JSON 配置。

## 性能观测指标

右侧“模型性能统计”面板是只读观测面板，不触发模型加载、LOD 切换、对象选择或任务下发。当前展示：

- `FPS`
- `renderer.info.render.calls`
- `renderer.info.render.triangles`
- `renderer.info.memory.geometries`
- `renderer.info.memory.textures`
- 当前模型级别
- 当前模型 URL
- 当前模型 mesh、material、texture、vertex、triangle 数量
- `performance.enableLod`
- `performance.defaultLevel`
- `performance.cachePolicy`
- `performance.chunkPolicy`

模型结构统计在模型加载或手动切换成功后执行一次；运行时只按固定间隔读取 renderer.info 和 FPS，避免每帧深度遍历整个 GLB。

`public/model-configs/lifter.json` 中的 `performance` 字段当前只作为前端性能方案预留，不改变模型加载主流程，不实现后端上传、异步转换、真实缓存或分块加载。建筑 CAD / 厂区级模型后续需要后端提供上传、转换、压缩、chunk manifest 和资源版本管理。

当前阶段不主动把大 GLB 写入 IndexedDB，也不新增 Service Worker。浏览器侧优先依赖 HTTP Cache / ETag / Cache-Control；`allowIndexedDbCache` 只作为后续能力开关预留。

更详细的性能优化边界见 [docs/model-performance-boundary.md](docs/model-performance-boundary.md)。

## Three.js 资源释放

模型切换和页面销毁会通过 `src/engine/ResourceDisposer.ts` 集中释放 Three.js 资源：

- `geometry`
- `material`
- `material.map`
- `material.normalMap`
- `material.roughnessMap`
- `material.metalnessMap`
- `material.emissiveMap`
- `material.aoMap`
- `material.alphaMap`
- 其他常见材质纹理贴图

`material.envMap` 默认不释放，避免误释放后续可能由全局天空、HDR / EXR 或共享环境光统一管理的纹理。模型级别手动切换成功后才释放旧模型；切换失败时保留当前正在显示的模型和可动部件绑定。页面销毁时会清理当前模型、hitBox、选中框、可动部件辅助框、移动辅助线、自由视角控制器、背景和 renderer。

右侧性能面板中的 `renderer.info.memory.geometries` / `renderer.info.memory.textures` 可用于观察多次切换后资源数量是否持续异常增长。

## 小区域多设备 Demo

第 7 阶段增加了一个“小区域压力 Demo”模式，用于在不改后端、不改模型文件的前提下验证 10~30 台设备同时存在时的性能和交互。当前 mock 配置位于：

```text
src/mock/areaDemo.ts
```

配置包含 `areaId`、`areaName` 和 `devices[]`；每个设备包含 `deviceId`、`deviceName`、`modelId`、`position`、`rotationDeg`、`scale`、`status`。当前 Demo 复用同一个提升机 GLB 生成 12 台设备实例。

区域模式规则：

- 默认按 `medium -> low -> source` 尝试加载，不默认加载 `high`。
- 如果 `medium / low` 尚未生成，会自动回退到现有 `source`，不生成 Box proxy。
- 使用简单加载队列串行准备设备实例，避免一次性发起大量模型准备任务。
- 多设备场景点击任意设备 mesh 时，先选中设备整体。
- 选中设备后，右侧对象树只展示该设备内部 Group / Mesh，仍可手动选择可动部件。
- 任务下发仍沿用当前绑定对象的 worldZ 移动逻辑。
- 性能面板会显示 `scene mode`、`device count`、`model count`、draw calls、triangles 和 FPS。

单设备详情模式仍是默认入口，保留模型校准、对象搜索、部件绑定、测试上移/下移和任务下发能力。

## 分层点击检测

第 8 阶段将多设备场景的拾取逻辑拆成两层：

- `areaMode`：只检测设备级透明 hitbox，用于快速选中设备整体。
- `detailMode`：选中某台设备后，只检测该设备内部真实 mesh，用于部件查看、对象树选择和可动部件绑定。

设备级 hitbox 由 `src/engine/HitBoxManager.ts` 创建，`userData` 包含 `deviceId`、`deviceName`、`modelId`、`meshName` 等信息。hitbox 是透明点击体，不作为展示模型，不生成可见 Box proxy，也不允许被设为可动部件。

单设备详情模式不使用设备级 hitbox 做内部部件选择，仍直接对真实 GLB mesh 做 raycast，因此点击部件、对象高亮、手动绑定和任务下发能力保持不变。点击设备或部件不会自动加载 high，也不会触发无意义模型重载。

## InstancedMesh 重复对象验证

第 9 阶段增加了 `InstancedMesh Demo` 面板，用于对比大量重复静态对象在普通 Mesh 模式和 `THREE.InstancedMesh` 模式下的渲染差异。当前示例对象是静态托盘测试块，可切换：

- 数量：`100 / 500 / 1000`
- 模式：`Mesh / InstancedMesh`

适合实例化的对象：

- 托盘
- 货架立柱
- 围栏
- 传感器
- 标准灯具
- 标准设备外壳

不适合实例化的对象：

- 提升机可动部件
- 需要单独点击的内部部件
- 需要独立告警、独立状态或独立业务绑定的关键部件
- 任务下发目标

实例化的主要收益是降低重复对象的 draw call。普通 Mesh 模式下，重复对象数量增加通常会带来更多 draw calls；`InstancedMesh` 模式下，同一几何体和材质的重复对象可以由一个实例化绘制提交完成。实例化不能替代业务语义拆分，也不能把需要独立选择、独立移动的提升机部件合并成实例。

当前实例化 Demo 只作为静态重复物性能验证，不加入模型对象树，不作为 Raycaster 部件选择目标，也不会影响可动部件绑定和任务下发。

## 区域分块加载基础

第 11 阶段增加了厂区级分块加载的基础结构，用于后续从“单区域 Demo”演进到“园区 / 楼栋 / 楼层 / 区域 / 设备”的按需加载。

新增结构：

- `src/mock/areaChunks.ts`：mock chunk 配置，包含 `campusId`、`buildingId`、`floorId`、`areaId`、`bounds`、`devices`、`modelRefs` 和 `neighborChunkIds`。
- `src/engine/ChunkLoader.ts`：记录当前加载 chunk、稳定 chunk、失败回滚状态和已加载 chunk。
- `src/engine/PriorityModelLoader.ts`：维护模型加载优先级队列。

当前加载优先级：

1. `selected-device`
2. `visible-area`
3. `neighbor-prefetch`
4. `background`

当前 Demo 默认只加载 `CHUNK-LIFTER-A`，`CHUNK-LIFTER-B` 作为邻近区域配置存在，不会一次性加载全部 mock 厂区。区域切换失败时，`ChunkLoader` 会保留上一个稳定 chunk 的状态，不生成 proxy，不清空当前稳定模型。

阶段 11 仍然不接后端，不做真实厂区流式调度，只建立前端配置、加载队列和状态展示基础。右侧“场景模式”面板会显示当前 chunk、已加载 chunk、优先级队列数量和 chunk message。

## 模型性能优化策略

CAD 高精模型不适合作为大场景长期运行时模型直接使用。单台设备可以接受，但多设备组合后，mesh、triangle、material、texture 和 draw call 都会快速放大。当前 Demo 增加了以下前端和模型处理策略：

- 使用 `medium / low / source / high / proxy` 分级加载，初始化按配置顺序尝试，选中设备或手动切换时再加载更高精度。
- Demo 已移除自动 Box proxy，不再根据包围盒自动生成半透明盒子或线框占位。
- 如果需要 proxy，必须提供真实的 `public/models/lifter.proxy.glb`；点击 `proxy` 只会尝试加载这个真实文件。
- 如果某档 GLB 不存在，会提示该级别加载失败；手动切换失败时保留当前已加载模型，不生成盒子。
- 如果所有配置的 GLB 都不存在或加载失败，只显示错误提示，不往 3D 场景添加突兀占位模型。
- 使用 hitBox 做点击检测，避免 Raycaster 直接遍历高精模型所有 mesh。
- 远景模型应尽量使用简化材质，避免对所有模型开启阴影。
- 阴影、透明材质和后处理都会增加渲染压力；Demo 默认不启用高成本后处理。
- 大场景优化仍推荐使用 `low / medium / high` 多档 GLB，而不是自动盒子占位。
- 自动简化不能代替业务语义拆分，可动部件和业务对象仍然需要模型命名或配置绑定。

当前模型 LOD 配置位于：

```text
public/model-configs/lifter.json
public/models/lifter/manifest.json
```

示例配置：

```json
"lod": {
  "sourceUrl": "/models/lifter.glb",
  "proxyUrl": "/models/lifter/lifter.proxy.glb",
  "lowUrl": "/models/lifter/lifter.low.glb",
  "mediumUrl": "/models/lifter/lifter.medium.glb",
  "highUrl": "/models/lifter/lifter.high.glb",
  "defaultLevel": "source",
  "selectedLevel": "high",
  "autoLoadHighOnSelect": false,
  "allowGeneratedProxy": false,
  "initialFallbackOrder": ["medium", "low", "source", "high", "proxy"],
  "nearDistance": 20,
  "farDistance": 80
}
```

`public/models/lifter/manifest.json` 是面向后续多档模型和厂区级分块的标准资源描述文件，包含 `levels.source/high/medium/low/proxy`、`transform`、`lod` 和 `semantic` 信息。当前只有一个真实模型时，`levels.source` 指向 `/models/lifter.glb`，`defaultLevel` 为 `source`。

当前阶段仍然是手动 LOD：

- `autoLoadHighOnSelect` 必须为 `false`。
- `allowGeneratedProxy` 必须为 `false`。
- 点击模型只选择部件，不触发 high / medium / low / proxy 加载。
- 右侧只提供 `source / high / medium / low` 手动切换按钮，只有点击按钮才会切换模型级别。
- 切换成功后会重建对象树、Raycaster 目标和选中状态；如果原可动部件无法在新模型中恢复，需要重新从对象树或 3D 模型中选择。
- proxy 仍可作为配置项保留，但当前 UI 不默认提供 proxy 切换入口；如后续需要 proxy，必须提供真实 `lifter.proxy.glb`，不会自动生成盒子。

右侧“模型性能统计”面板会显示：

- `FPS`
- `renderer.info.render.calls`
- `renderer.info.render.triangles`
- `renderer.info.memory.geometries`
- `renderer.info.memory.textures`
- 当前加载模型级别
- 当前模型 URL
- 当前模型 mesh、material、texture、vertex、triangle 数量

### glTF Transform

本地模型后处理脚本位于：

```text
scripts/inspect-model.mjs
scripts/optimize-model.mjs
scripts/generate-lod.mjs
```

模型体检脚本用于离线查看当前 GLB 的结构和复杂度：

```bash
npm run model:inspect
npm run model:inspect -- public/models/lifter.glb
```

默认输入为 `public/models/lifter.glb`，报告输出到：

```text
reports/model-inspect/lifter-inspect-report.md
```

该脚本只读取 GLB 运行时模型，不读取 `source-models` 下的 STEP / STP / CAD 源模型目录。如果当前环境未安装 glTF Transform CLI，脚本会输出安装提示并生成 skipped 报告，不影响 `npm run build`。

如果当前环境未安装 glTF Transform CLI，请先安装：

```bash
npm install --global @gltf-transform/cli
```

常用命令示例：

```bash
gltf-transform inspect input.glb
gltf-transform optimize input.glb output.glb --compress draco --texture-compress webp
gltf-transform simplify input.glb output.low.glb --ratio 0.25
gltf-transform simplify input.glb output.proxy.glb --ratio 0.05
```

如果命令参数和当前 CLI 版本不兼容，请以 `gltf-transform help`、`gltf-transform optimize --help`、`gltf-transform simplify --help` 为准。

Demo 脚本默认输出：

```text
public/models/lifter/lifter.high.glb
public/models/lifter/lifter.medium.glb
public/models/lifter/lifter.low.glb
```

生成命令：

```bash
npm run model:lod
```

`lifter.high.glb` 当前可以先复制 source 模型作为高精档；`medium` 和 `low` 依赖 glTF Transform CLI。脚本会输出对比报告：

```text
reports/model-lod/lifter-lod-report.md
```

阶段 4 不生成自动 BoxGeometry proxy；如后续需要 proxy，必须单独提供真实 `lifter.proxy.glb`。

## 业务对象绑定

提升机绑定配置位于：

```text
src/config/lifterBindingConfig.ts
public/model-configs/lifter.json
```

`src/config/lifterBindingConfig.ts` 继续提供任务楼层、速度和 fallback 默认值；真实模型加载时会优先读取 `public/model-configs/lifter.json` 中的 `bindings.movablePartName` 与 `bindings.moveAxis`。关键配置包括：

- `deviceId: "LIFTER-001"`
- `mainObjectName: "lifter-main"`
- `staticPartNames: ["lifter-frame", "lifter-main"]`
- `movablePartName: "lifter-platform"`
- `candidateMovablePartNames: []`
- `moveAxis: "z"`
- `minZ`
- `maxZ`
- `defaultZ`

任务目标位置当前使用 mock 配置：

- `F1: z = 0`
- `F2: z = 4`
- `F3: z = 8`
- `F4: z = 12`

## CAD 转换模型的手动绑定

当前真实 GLB 来自 CAD/STEP 转换，模型对象名主要是 `NAUOxxx`、`NAUOxxx_1` 或 `unnamed_mesh_xxx` 这类自动编号，没有稳定的业务语义。当前模型暂未包含正式的 `lifter-platform`，因此不能只依赖固定名称完成内部部件控制。

Demo 现在支持在右侧“模型对象树”中搜索对象名或 `parentName`，点击节点后查看 `name`、`uuid`、`parentName`、包围盒尺寸和位置，并可手动点击“设为可动部件”。设为可动部件后，任务下发会移动当前绑定对象，而不是强行移动整机。

`NAUO447` 已测试可以被绑定并沿 Z 轴移动，但它不是期望的箱体 / 轿厢 / 载货台，因此不再作为默认候选对象。当前阶段需要通过 3D 点击、对象树搜索、父级/子级查看、定位和 1m 上下移动测试，人工找出正确可动对象。找到正确对象后，可以临时记录其 `name` / `uuid` 作为测试绑定依据。

正式 GLB 处理完成前，不要把 `NAUOxxx` 这类自动编号当作长期稳定的业务绑定。

正式模型仍建议在 Blender/CAD 中完成预处理：

1. 拆分固定框架和移动平台。
2. 给移动平台命名为 `lifter-platform`。
3. 给固定框架命名为 `lifter-frame`。
4. 调整可动部件 origin，确保沿 Z 轴移动符合业务预期。
5. 减面压缩，降低浏览器端渲染压力。
6. 重新导出 GLB。

## 模型预处理要求

后续正式模型需要在 Blender、CAD 或模型转换流程中完成预处理：

1. 调整坐标轴为 Z-up。
2. 修正比例单位，避免导入后过大或过小。
3. 拆分固定框架和可移动平台。
4. 给关键对象命名，例如 `lifter-main`、`lifter-frame`、`lifter-platform`。
5. 给可移动部件设置合理 origin，便于沿 Z 轴移动。
6. 删除无关零件或降低面数。
7. 导出 GLB。
8. 放入 `public/models/lifter.glb`。

如果真实 GLB 未包含 `lifter-platform` 等业务 meshName，Demo 只能通过对象树手动绑定来临时验证移动逻辑；正式模型仍应补齐稳定业务命名。

## 调试开关

调试配置位于：

```text
src/config/debugConfig.ts
```

当前真实 GLB 测试模式默认：

- `enableMockStatusTimer: false`，不随机刷新 mock 状态。
- `enableMockStatusColor: false`，不让 mock 状态改写真实 GLB 材质颜色。
- `enableSelectionHighlight: true`，保留当前选中对象辅助框。
- `enableMovablePartHighlight: true`，保留当前可动部件辅助框。
- `enableMoveHelperLine: true`，移动时显示 Z 轴方向参考线。
- `enableGridHelper: false`，默认不显示 GridHelper 网格线；坐标轴显示和网格显示分开控制。

## 天空背景

当前 Demo 支持写实天空背景，背景配置位于：

```text
src/config/backgroundConfig.ts
```

默认天空背景资源位置：

```text
public/backgrounds/sky-panorama.png
```

Vite 运行时访问路径为：

```text
/backgrounds/sky-panorama.png
```

场景会优先通过 Three.js `TextureLoader` 加载该图片，并作为 `scene.background` 使用。该天空图只作为背景，不作为 Three.js 世界地面，不会投射到地面，也不会替代真实地面。当前使用的是普通 PNG/JPG 全景图，不是 HDRI，也不会默认设置 `scene.environment`，避免影响模型材质和调试观感。

世界地面由 Three.js 固定生成：使用浅灰色 X/Y 平面，位于 `z = 0`，默认不叠加 GridHelper 网格线。提升机模型站在这个固定地面上，鼠标拖动只改变相机观察方向，不改变地面世界坐标。

如果该文件不存在或加载失败，会自动回退到浅蓝渐变背景，不会回退到纯黑背景。如果把带地面的 360 全景图直接作为 `scene.background`，图中的地面容易和 Z-up 工业场景的固定地面不匹配，出现翻转、倾斜或模型地面错位；当前更推荐使用纯天空全景图 + 固定 Three.js 地面。

如果后续需要更真实的环境光，可以升级为 HDR / EXR，并在确认材质效果后启用 `scene.environment`。

背景素材可以提交到 Git，前提是文件体积合理；GLB / STEP / STP 大模型文件仍然不提交 Git。

## STEP 文件说明

当前源模型位于：

```text
source-models/TSW6120-00 提升机总装4#楼.STEP
```

该文件是 CAD STEP 源模型，不是 Three.js 可以直接加载的运行时模型。浏览器端推荐加载 `.glb` 或 `.gltf`。

## 为什么 STEP 不提交到 GitHub

- STEP/STP/IGES/FBX 通常体积较大，会明显增加仓库体积。
- CAD 源模型可能包含工程设计细节，不适合作为前端 Demo 源码一起发布。
- 前端运行只需要轻量化后的 GLB，不需要原始 CAD 文件。

`.gitignore` 已忽略 `source-models` 下的 STEP/STP/IGES/FBX/GLB/GLTF 源模型或转换中间产物。

## STEP 转 GLB 方案

### 方案 A：FreeCAD + Blender

1. 使用 FreeCAD 打开 STEP 文件。
2. 检查单位、层级、零件数量和模型朝向。
3. 从 FreeCAD 导出 OBJ / DAE / STL。
4. 使用 Blender 导入中间格式。
5. 清理模型、降低面数、删除无用零件。
6. 拆分固定框架和可移动平台。
7. 保留关键对象命名。
8. 从 Blender 导出 GLB。
9. 放入 `public/models/lifter.glb`。

### 方案 B：CAD Assistant / Online Converter / assimp

本机已提供 CAD Assistant 路径：

```text
D:\tool\CAD Assistant
```

可先使用 `D:\tool\CAD Assistant\CADAssistant.exe` 打开 STEP 文件，尝试导出 glTF / GLB / OBJ。若导出的模型体积过大，再进入 Blender 做减面和清理。

## 后续接入真实数据

后续如果需要接入真实 WebSocket 或后端接口，建议只替换状态数据来源：

- 保留 `TwinDevice` 类型。
- 保留 `meshName` 和业务设备 ID 的绑定关系。
- 将 `src/mock/deviceStatus.ts` 替换为 API 或 WebSocket 数据适配层。
- 不要在 Three.js 模块中直接写 HTTP 请求。

当前版本不接入真实后端，也不修改任何现有正式项目。
