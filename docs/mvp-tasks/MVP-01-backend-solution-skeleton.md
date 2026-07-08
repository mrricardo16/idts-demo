# MVP-01：后端解决方案骨架

## 1. 任务目标

建立 IDTS 数字孪生正式项目的 .NET 8 后端解决方案骨架，只完成工程结构、项目引用、Swagger、基础日志、异常处理占位和 Worker 可启动能力，不实现任何业务实体、Migration 或业务 Controller。

## 2. 前置条件

- 已阅读 `AGENTS.md`。
- 已阅读 `docs/idts-digital-twin-project-technical-plan.md`。
- 已阅读 `docs/idts-mvp-task-breakdown.md`。
- 已确认本任务只执行 MVP-01。
- 未开始 MVP-02 数据库实体与 Migration。

## 3. 影响范围

预计影响范围：

- `server/global.json`
- `server/IdtsTwin.sln`
- `server/src/IdtsTwin.Api/**`
- `server/src/IdtsTwin.Application/**`
- `server/src/IdtsTwin.Domain/**`
- `server/src/IdtsTwin.Infrastructure/**`
- `server/src/IdtsTwin.Worker/**`
- `server/src/IdtsTwin.Contracts/**`
- `docs/**`

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许创建数据库实体。
- 不允许创建 Migration。
- 不允许实现 GLB 上传。
- 不允许实现 manifest、object-tree、可动部件、motion target 或场景业务 API。
- 不允许修改前端源码。
- 不设计完整错误码体系。
- 不设计业务异常枚举。
- 不设计 `Result<T>` 全量框架。
- 不引入数据库日志。
- 不引入 OpenTelemetry。
- Serilog、统一异常处理、统一响应结构只做最小占位。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查当前 git 状态，记录已有变更。
3. 确认本机 .NET SDK 可用并记录 `dotnet --info`。
4. 创建 `server/global.json` 并锁定 .NET 8 SDK。
5. 创建 `server/IdtsTwin.sln`。
6. 创建 `IdtsTwin.Api` Web API 项目。
7. 创建 `IdtsTwin.Application` 类库项目。
8. 创建 `IdtsTwin.Domain` 类库项目。
9. 创建 `IdtsTwin.Infrastructure` 类库项目。
10. 创建 `IdtsTwin.Contracts` 类库项目。
11. 创建 `IdtsTwin.Worker` Worker Service 项目。
12. 将所有项目加入解决方案。
13. 配置 `Api -> Application` 引用。
14. 配置 `Application -> Domain` 引用。
15. 配置 `Application -> Contracts` 引用。
16. 配置 `Infrastructure -> Domain` 引用。
17. 配置 `Infrastructure -> Application` 引用。
18. 配置 `Api -> Infrastructure` 引用。
19. 配置 `Worker -> Application` 引用。
20. 配置 `Worker -> Infrastructure` 引用。
21. 保留 Swagger / OpenAPI 基础访问。
22. 配置 Serilog 基础日志占位。
23. 配置统一异常处理中间件占位。
24. 配置统一响应结构占位。
25. 启动 API 验证 Swagger 可访问。
26. 启动 Worker 验证进程可启动。
27. 运行 `dotnet build`。
28. 输出验收情况、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不涉及数据库变更。

禁止在本任务中新增表、实体、DbContext、Migration 或数据库更新命令。

## 7. API 变更

本任务不涉及业务 API 变更。

允许保留 Web API 模板自带的 Swagger 基础能力；如项目模板生成示例接口，应在后续正式业务开发前清理或替换，不得把示例接口当作 MVP 业务接口。

## 8. 前端变更

本任务不涉及前端变更。

不得修改：

- `src/api/**`
- `src/views/**`
- `src/engine/**`
- `src/styles/**`
- `package.json`
- `package-lock.json`
- `vite.config.*`
- `tsconfig.*`

## 9. 验收标准

- `server/global.json` 存在并锁定 .NET 8。
- `server/IdtsTwin.sln` 存在。
- Api / Application / Domain / Infrastructure / Worker / Contracts 项目存在。
- 项目引用关系清晰且无循环引用。
- `dotnet build` 通过。
- `IdtsTwin.Api` 可启动。
- Swagger 可访问。
- `IdtsTwin.Worker` 可启动。
- 无前端源码改动。
- 未创建数据库 Migration。

## 10. 回归测试

本任务不修改前端运行逻辑，但完成后仍需确认以下能力未被触碰：

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

- .NET SDK 版本与 `global.json` 不一致。
- 项目引用方向错误导致后续分层混乱。
- 模板生成的示例代码被误认为正式 API。
- 过早引入数据库、上传或业务 Controller，造成任务边界失控。
- 日志、异常、响应结构占位做成复杂框架，增加后续维护成本。

## 12. 回滚策略

- 删除 `server/` 下本任务新增的解决方案和项目文件。
- 删除本任务新增的后端项目引用。
- 保留本任务前已有的文档和前端文件。
- 如只需回滚部分错误配置，优先用最小补丁恢复项目文件，不执行全仓库重置。

## 13. Codex 执行提示词

```text
请执行 MVP-01：后端解决方案骨架。

当前只执行本任务，不执行 MVP-02 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-01-backend-solution-skeleton.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止创建数据库实体或 Migration，禁止实现业务 API，禁止修改前端源码，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、是否创建后端项目、构建结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
