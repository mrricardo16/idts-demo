/**
 * 模型配置中的三维向量。
 * 用于 JSON 配置中的 rotation / position / scale 等字段，不直接代表 THREE.Vector3 实例。
 */
export interface Vector3Config {
  x: number;
  y: number;
  z: number;
}

/**
 * 模型配置中可声明的坐标轴。
 * 当前项目运行时统一使用 Z-up，配置轴只用于记录源模型和业务移动语义。
 */
export type ModelConfigAxis = "x" | "y" | "z";

/**
 * 模型配置中的 LOD 级别。
 * 用于性能策略说明和后续多档模型配置，不应在点击模型时自动触发高精加载。
 */
export type ModelConfigLODLevel = "proxy" | "low" | "medium" | "high" | "source";

/**
 * 模型运行配置的统一类型。
 * 该类型用于描述 `public/model-configs/*.json` 的结构和后续前端编辑态配置，不要求 JSON 文件写注释。
 * 配置本身只影响模型 root 的加载、显示、材质和调试策略；任务下发仍应通过当前绑定的可动部件和 worldZ 移动逻辑执行。
 */
export interface ModelConfig {
  /**
   * 模型唯一标识。
   * 用于缓存、编辑态 localStorage key、性能统计和后续后端配置表关联，不直接影响任务下发或可动部件移动。
   */
  modelId: string;

  /**
   * 模型显示名称。
   * 仅用于面板展示、日志和配置编辑提示，不参与模型坐标校准、任务下发或可动部件绑定。
   */
  modelName: string;

  /**
   * 默认模型资源地址。
   * Vite public 目录下资源应使用运行时路径，例如 `/models/lifter.glb`；修改该字段会影响模型加载入口，但不改变任务移动算法。
   */
  modelUrl: string;

  /**
   * 模型声明的向上轴。
   * 当前项目统一使用 Z-up；该字段用于记录源模型约定，具体姿态修正仍通过 `transform` 完成。
   */
  upAxis: ModelConfigAxis;

  /**
   * 整机模型 root 的姿态修正配置。
   * 只应用于模型 root，不应用于子部件任务移动；模型校准面板应读写该配置。
   */
  transform: ModelTransformConfig;

  /**
   * 业务对象绑定配置。
   * 用于记录 root、可动部件名称和移动轴；真实任务执行仍以当前绑定对象引用为准。
   */
  bindings: ModelBindingConfig;

  /**
   * 材质和颜色配置。
   * 用于默认色、选中高亮、可动部件提示和异常颜色；不应改变对象树、任务下发或模型坐标校准。
   */
  materialConfig: ModelMaterialConfig;

  /**
   * 前端异常模拟配置。
   * 当前阶段仅作为 mock 配置结构预留；后端接入后应由接口或 WebSocket 驱动，不应由 JSON 注释驱动。
   */
  faultSimulation: ModelFaultSimulationConfig;

  /**
   * 模型运行模式配置。
   * 用于后续查看模式 / 编辑模式切换；不应在普通查看模式下影响任务下发、可动部件移动或模型加载主流程。
   */
  modeConfig: ModelModeConfig;

  /**
   * LOD、缓存、分块等性能策略配置。
   * 用于后续性能优化和缓存策略，不应自动触发点击模型加载高精模型。
   */
  performance?: ModelPerformanceConfig;
}

/**
 * 整机模型 root 的姿态修正配置。
 * 该配置用于模型校准，不用于任务下发时移动子部件；子部件移动必须继续使用 worldZ 再转换为 parent local。
 */
export interface ModelTransformConfig {
  /**
   * 模型 root 的欧拉旋转角度，单位为 degree。
   * 用于修正 CAD / Blender 导出的整体姿态；修改后需要重新计算模型 boundingBox、groundToZero 和可动部件安全范围。
   */
  rotationDeg: Vector3Config;

  /**
   * 模型世界坐标偏移。
   * 只用于整机模型 root 的位置修正，不应用于子部件任务移动。
   */
  position: Vector3Config;

  /**
   * 模型 root 缩放。
   * 用于单位比例修正；会影响模型 boundingBox、可动部件安全高度范围和性能统计。
   */
  scale: Vector3Config;

  /**
   * 模型翻转配置。
   * 不推荐用 `scale.z = -1` 这类负 scale 长期保存翻转；翻转后必须重新计算 boundingBox、groundToZero 和可动部件安全范围。
   */
  flip?: ModelFlipConfig;

  /**
   * 是否在加载后自动将模型几何中心移动到世界原点附近。
   * 影响整机 root 的位置校准；不应用作任务下发或可动部件移动基准。
   */
  autoCenter: boolean;

  /**
   * 是否在加载后按当前项目 Z-up 约定将模型 bottom 贴到 `z = 0`。
   * 开启后会影响模型 root 位置，并要求重新计算整机 world boundingBox。
   */
  groundToZero: boolean;
}

/**
 * 模型 root 级翻转配置。
 * 该配置只用于预留显式翻转语义，不建议用负 scale 作为长期模型姿态配置。
 */
export interface ModelFlipConfig {
  /**
   * 是否沿 X 轴翻转模型 root。
   * 翻转会改变包围盒和地面贴合结果，执行后应重新计算 boundingBox 和 groundToZero。
   */
  x: boolean;

  /**
   * 是否沿 Y 轴翻转模型 root。
   * 翻转会改变对象的世界位置表现，不能替代可动部件的 worldZ 任务移动。
   */
  y: boolean;

  /**
   * 是否沿 Z 轴翻转模型 root。
   * 该选项可能导致上下方向反转；不推荐作为长期方案，正式模型应在 CAD / Blender 中处理坐标轴。
   */
  z: boolean;
}

/**
 * 模型材质与颜色配置。
 * 该配置用于前端显示策略，不应写入 GLB 资源本身。
 */
export interface ModelMaterialConfig {
  /**
   * 是否保留 GLB 原始材质。
   * 建议真实模型默认开启，避免破坏 CAD 转换后的材质观感；不影响任务下发。
   */
  preserveOriginalMaterial: boolean;

  /**
   * 没有对象级颜色配置时使用的默认颜色。
   * 仅用于允许覆盖材质的显示模式，不应恢复真实 GLB 的随机状态变色。
   */
  defaultColor?: string;

  /**
   * 默认透明度，范围建议为 0 到 1。
   * 透明材质会增加渲染成本，性能模式下应谨慎使用。
   */
  defaultOpacity?: number;

  /**
   * 选中对象高亮颜色。
   * 只用于交互反馈，不应修改对象材质源数据，也不应影响可动部件绑定。
   */
  selectionColor: string;

  /**
   * 当前可动部件提示颜色。
   * 用于辅助确认绑定对象；异常颜色优先级高于可动部件颜色。
   */
  movablePartColor: string;

  /**
   * 异常状态颜色。
   * 异常颜色优先级高于选中颜色和可动部件颜色，避免告警被调试高亮遮盖。
   */
  faultColor: string;

  /**
   * 指定对象的颜色覆盖列表。
   * 可按 uuid 或 name 绑定颜色；自动编号对象名不应作为正式项目长期稳定绑定。
   */
  objectColors: ModelObjectColorConfig[];
}

/**
 * 单个模型对象的颜色覆盖配置。
 * 可用于编辑模式、异常模拟或业务标注，但不应改变对象树结构和任务移动逻辑。
 */
export interface ModelObjectColorConfig {
  /**
   * THREE.Object3D 的 uuid。
   * uuid 精确但可能随重新导出变化；适合调试阶段，不建议作为正式业务长期唯一绑定。
   */
  objectUuid?: string;

  /**
   * THREE.Object3D 的 name。
   * 正式模型应在 CAD / Blender 中命名关键对象，例如 `lifter-platform`。
   */
  objectName?: string;

  /**
   * 对象显示颜色，建议使用 CSS hex，例如 `#ff4d4f`。
   * 仅作为前端显示覆盖，不改变 GLB 文件。
   */
  color: string;

  /**
   * 对象透明度，范围建议为 0 到 1。
   * 透明对象可能增加渲染压力，性能模式下应减少使用。
   */
  opacity?: number;

  /**
   * 配置说明。
   * 用于记录该颜色的业务含义或调试目的，不参与运行逻辑。
   */
  description?: string;
}

/**
 * 前端异常模拟配置。
 * 当前是前端 mock；后端接入后应由接口轮询或 WebSocket 推送驱动 activeFaults。
 */
export interface ModelFaultSimulationConfig {
  /**
   * 是否启用前端异常模拟。
   * 关闭时不得影响模型原始材质、选中高亮、可动部件绑定或任务下发。
   */
  enabled: boolean;

  /**
   * 设备编号。
   * 用于把异常信息关联到 mock 设备；正式接入后应来自后端设备实例。
   */
  deviceId: string;

  /**
   * 当前激活的异常列表。
   * 异常颜色显示优先级高于选中颜色和可动部件颜色，但不应改变 worldZ 移动逻辑。
   */
  activeFaults: ModelFaultInfo[];
}

/**
 * 单条异常信息。
 * 用于前端 mock 告警、对象颜色覆盖和提示文案；不负责真实故障判定。
 */
export interface ModelFaultInfo {
  /**
   * 异常编码。
   * 用于去重、状态同步和后续与后端告警字典对齐。
   */
  faultCode: string;

  /**
   * 异常等级。
   * 建议使用 `info`、`warning`、`error`、`critical` 等固定枚举值，便于映射颜色和排序。
   */
  faultLevel: string;

  /**
   * 异常提示文案。
   * 用于右侧面板或悬浮提示，不参与模型加载和任务移动。
   */
  faultMessage: string;

  /**
   * 业务部件名称。
   * 用于描述异常发生在提升机哪个部件，不要求等同于 GLB object.name。
   */
  partName?: string;

  /**
   * 关联的 Object3D name。
   * 找到对象后可用于颜色覆盖；找不到时只显示异常文本，不应中断页面。
   */
  objectName?: string;

  /**
   * 关联的 Object3D uuid。
   * 调试阶段可精确定位对象；正式模型重新导出后 uuid 可能变化。
   */
  objectUuid?: string;

  /**
   * 处理建议。
   * 仅用于前端说明，不触发真实维修流程或后端接口。
   */
  suggestion?: string;

  /**
   * 异常发生时间。
   * 前端 mock 可使用本地时间字符串；正式接入后应使用后端时间。
   */
  occurTime?: string;
}

/**
 * 模型运行模式配置。
 * 用于后续查看模式、编辑模式和本地编辑缓存，不影响当前任务下发逻辑。
 */
export interface ModelModeConfig {
  /**
   * 默认模式。
   * 建议普通运行时使用 `monitor`；编辑模式应显式开启，避免误改模型配置。
   */
  defaultMode: "monitor" | "edit";

  /**
   * 是否允许进入编辑模式。
   * 编辑模式只应调整前端配置和标注，不应修改 GLB / STEP / STP 源文件。
   */
  allowEditMode: boolean;

  /**
   * 本地编辑配置缓存 key。
   * 后续如果支持 localStorage，应优先读取该 key；当前阶段仅预留字段，不改变加载顺序。
   */
  localStorageKey: string;
}

/**
 * 模型性能策略配置。
 * 用于后续 LOD、缓存和分块加载，不应在点击模型内部部件时触发自动重载。
 */
export interface ModelPerformanceConfig {
  /**
   * 是否启用 LOD 分级模型。
   * 关闭时应按普通模型加载路径处理；开启也不应破坏对象选择和任务下发。
   */
  enableLod: boolean;

  /**
   * 默认加载级别。
   * 用于初始显示精度或性能面板展示；本阶段不改变现有模型加载主流程和 fallback 顺序。
   */
  defaultLevel: ModelConfigLODLevel;

  /**
   * 模型缓存策略。
   * 仅描述前端资源缓存策略，例如 `browser-http-cache`、`none`、`memory`、`indexeddb`；当前阶段不实现真实缓存。
   */
  cachePolicy?: "none" | "memory" | "indexeddb" | "browser-http-cache";

  /**
   * 大场景分块策略。
   * 仅描述区域切块策略，例如 `none`、`static`、`distance`；CAD 上传、chunk manifest 和分块调度需要后端接入后再实现。
   */
  chunkPolicy?: "none" | "static" | "distance";

  /**
   * 是否优先使用浏览器 HTTP 缓存。
   * 当前阶段只作为配置说明，实际缓存行为依赖服务器的 ETag / Cache-Control / Last-Modified 响应头。
   */
  preferHttpCache?: boolean;

  /**
   * 是否允许后续使用 IndexedDB 缓存模型资源。
   * 当前阶段不主动把大 GLB 写入 IndexedDB，避免占用浏览器存储和引入清理策略问题。
   */
  allowIndexedDbCache?: boolean;

  /**
   * 首屏建议加载体积上限，单位 MB。
   * 用于后续评估 source / low / medium / high 分级策略，不在当前前端阶段阻断模型加载。
   */
  maxInitialLoadSizeMb?: number;
}

/**
 * 模型业务绑定配置。
 * 用于描述 root、可动部件和移动轴；手动选择可动部件后，任务执行应以当前绑定对象引用为准。
 */
export interface ModelBindingConfig {
  /**
   * 整机主体对象名称。
   * 用于保护规则和对象树提示，不应被强行作为可动部件移动。
   */
  rootName: string;

  /**
   * 语义化可动部件名称。
   * 正式模型建议命名为 `lifter-platform`；找不到时允许用户从对象树手动选择。
   */
  movablePartName: string;

  /**
   * 业务移动轴。
   * 当前项目任务移动统一使用 worldZ；该字段用于配置记录和兼容，不代表直接修改 local position。
   */
  moveAxis: ModelConfigAxis;
}
