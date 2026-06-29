# AGENTS.md

本文件是 `idts-demo` 后续维护规则。

## 项目边界

1. 本项目是独立 WebGL / Three.js 技术预研 Demo，不属于 `HZ.IDTS.UI` 或 `HZ.IDTS.API`。
2. 不允许修改任何旧项目代码。
3. 不允许接入真实后端、数据库、登录、权限或正式菜单，除非用户明确要求。
4. 状态数据先使用 mock。
5. 没有 `public/models/lifter.glb` 时必须 fallback 到几何体场景。

## 模型文件规则

1. 不允许提交 STEP / STP / IGES / FBX 等 CAD 源模型文件。
2. `source-models` 可以保留 `.gitkeep`。
3. 转换后的轻量 GLB 放入 `public/models/lifter.glb`。
4. 真实 GLB 中关键对象应保留可识别的 `mesh.name`。

## 代码规则

1. Three.js 逻辑必须模块化，不要全部堆在 Vue 文件中。
2. 变更前必须说明影响范围。
3. README 必须随功能或模型处理流程同步更新。
4. 提交前必须运行：

```bash
npm run build
```

## 编码规则

修改代码时必须保持文件编码为 UTF-8，不要使用 ANSI/GBK。不要把已有中文注释、中文文案、中文日志改成乱码。如果发现文件疑似非 UTF-8 编码，先提示用户确认，不要直接重写整个文件。
