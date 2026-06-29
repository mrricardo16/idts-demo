# idts-demo

`idts-demo` 是一个独立的 WebGL / Three.js 数字孪生技术预研 Demo，不属于现有 `HZ.IDTS.UI` 或 `HZ.IDTS.API` 项目。

## 项目目的

本 Demo 用于验证浏览器端加载工业设备三维模型、点击查看设备信息、根据设备状态变色、执行简单动画和使用 mock 数据模拟实时变化的效果。第一版只做纯前端 Demo，不接入真实后端、数据库、登录权限或正式菜单体系。

## 技术栈

- Vue3
- Vite
- TypeScript
- Three.js
- GLTFLoader
- OrbitControls
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

- 初始化 Three.js 场景、相机、渲染器、灯光、网格和 OrbitControls。
- 优先加载 `public/models/lifter.glb`。
- 如果 `lifter.glb` 不存在或加载失败，自动切换到几何体 fallback 提升机场景。
- 支持鼠标旋转、缩放、平移和点击设备对象。
- 点击设备后高亮对象，并在右侧面板显示设备编号、名称、类型、状态和更新时间。
- 使用 mock 数据每 2 秒随机刷新部分设备状态。
- 根据 `normal`、`running`、`warning`、`error`、`stopped` 状态改变模型颜色。
- 提升机载货台上下移动，托盘沿输送线水平移动。

## 当前模型状态

当前已生成并放置真实运行模型：

```text
public/models/lifter.glb
```

该文件由 `source-models` 下的模型转换产物复制而来，大小约 48.5MB。Demo 会优先加载该 GLB；如果该文件不存在或加载失败，会使用 Three.js fallback 几何体场景。

当前 GLB 可以加载，但节点名仍是 CAD Assistant 导出的 `NAUO...` 等名称，尚未包含 `lifter-main`、`lifter-platform`、`conveyor-01`、`motor-01`、`pallet-01`、`pallet-02` 这类业务语义命名。因此当前代码会在未发现业务 meshName 时，把整个真实 GLB 保底绑定为 `lifter-main`，用于验证真实模型加载、整体点击和整体状态变色。后续需要在 Blender 或模型处理阶段补齐关键对象命名，才能实现真实模型内的分部件点击、分部件变色和分部件动画。

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

`.gitignore` 已忽略 `source-models` 下的 STEP/STP/IGES/FBX 源模型文件。

## STEP 转 GLB 方案

### 方案 A：FreeCAD + Blender

1. 使用 FreeCAD 打开 STEP 文件。
2. 检查单位、层级、零件数量和模型朝向。
3. 从 FreeCAD 导出 OBJ / DAE / STL。
4. 使用 Blender 导入中间格式。
5. 清理模型、降低面数、删除无用零件。
6. 保留关键对象命名。
7. 从 Blender 导出 GLB。
8. 放入 `public/models/lifter.glb`。

### 方案 B：CAD Assistant / Online Converter / assimp

本机已提供 CAD Assistant 路径：

```text
D:\tool\CAD Assistant
```

可先使用 `D:\tool\CAD Assistant\CADAssistant.exe` 打开 STEP 文件，尝试导出 glTF / GLB / OBJ。若导出的模型体积过大，再进入 Blender 做减面和清理。

建议流程：

1. 将 STEP 转成 glTF / GLB / OBJ。
2. 检查模型体积、单位和朝向。
3. 如果超过 50MB，进入 Blender 减面、拆分或删除无关零件。
4. 导出 GLB。
5. 放入 `public/models/lifter.glb`。

### 注意事项

- Demo 阶段模型建议控制在 10MB 到 50MB 内。
- 如果 GLB 超过 50MB，需要压缩或拆分。
- 不要把所有零件合并成一个 mesh。
- 关键设备对象需要有可识别的 `mesh.name`。
- `mesh.name` 需要和业务设备 ID 绑定，才能支持点击、变色、动画和实时状态更新。

## 如何替换真实 GLB 模型

1. 将转换后的模型命名为 `lifter.glb`。
2. 放入：

```text
public/models/lifter.glb
```

3. 确认模型内关键对象命名至少包含：

```text
lifter-main
lifter-platform
conveyor-01
motor-01
pallet-01
pallet-02
```

4. 运行 `npm run dev` 检查是否优先加载真实 GLB。

## meshName 和业务设备 ID 绑定

mock 数据定义在：

```text
src/mock/deviceStatus.ts
```

其中 `meshName` 必须和 Three.js 对象名一致。例如：

```ts
{
  id: "LIFTER-001",
  name: "提升机主体",
  type: "lifter",
  status: "normal",
  meshName: "lifter-main",
  updateTime: "..."
}
```

真实 GLB 中对应对象也应命名为 `lifter-main`。加载成功后，程序会根据 `meshName` 设置颜色、响应点击并展示设备信息。

## 后续接入真实数据

后续如果需要接入真实 WebSocket 或后端接口，建议只替换状态数据来源：

- 保留 `TwinDevice` 类型。
- 保留 `meshName` 和业务设备 ID 的绑定关系。
- 将 `src/mock/deviceStatus.ts` 替换为 API 或 WebSocket 数据适配层。
- 不要在 Three.js 模块中直接写 HTTP 请求。

当前版本不接入真实后端，也不修改任何现有正式项目。
