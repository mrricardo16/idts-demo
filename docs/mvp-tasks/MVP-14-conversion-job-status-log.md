# MVP-14：转换任务状态与基础日志

## 1. 任务目标

建立转换任务查询能力。MVP 不做完整 CAD 转换，只记录上传、inspect、object-tree、model-stats 等任务状态和基础日志字段，让上传后创建的 job 可被查询和排查失败原因。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- MVP-02 数据库核心实体与 Migration 已完成。
- MVP-03 GLB 上传与文件存储已完成。
- `model_conversion_job` 表已有上传或 inspect 任务记录。
- Worker 可以启动，但不要求执行完整 CAD 转换。

## 3. 影响范围

预计影响范围：

- `server/src/IdtsTwin.Api/**`
- `server/src/IdtsTwin.Application/**`
- `server/src/IdtsTwin.Contracts/**`
- `server/src/IdtsTwin.Domain/**`
- `server/src/IdtsTwin.Infrastructure/**`
- `server/src/IdtsTwin.Worker/**`
- `doc/**`

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许实现完整 CAD 转换。
- 不允许实现 STEP / IFC 转换。
- 不允许实现 3D Tiles 切片。
- 不允许实现完整 Worker 队列系统。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查 `model_conversion_job` 表和上传任务记录是否可用。
3. 检查当前 git 状态，记录已有变更。
4. 定义转换任务查询响应 DTO。
5. 实现按 `jobId` 查询转换任务。
6. 返回 `jobId`。
7. 返回 `assetId`。
8. 返回 `versionId`。
9. 返回 `jobType`。
10. 返回 `status`。
11. 返回 `progress`。
12. 返回 `message`。
13. 返回 `exitCode`。
14. 返回 `startedTime`。
15. 返回 `finishedTime`。
16. 返回 `logUrl`。
17. 返回 `stdoutLogUrl`。
18. 返回 `stderrLogUrl`。
19. 处理任务不存在返回 404。
20. 提供任务状态更新的应用服务入口。
21. 支持 pending 到 running 的状态更新。
22. 支持 running 到 completed 的状态更新。
23. 支持 running 到 failed 的状态更新。
24. 失败时保存 message、stderr、exitCode。
25. MVP Worker 可写入基础日志字段，但不执行完整转换。
26. 在 Swagger 验证查询已有 job。
27. 验证任务不存在返回 404。
28. 验证失败任务可看到 message。
29. 运行 `dotnet build`。
30. 输出 API 响应、任务状态样例、构建结果和 git diff 摘要。

## 6. 数据库变更

本任务不新增表。

读取表：

- `model_conversion_job`
- `model_asset`
- `asset_version`

写入表：

- `model_conversion_job`

关键字段：

- `job_type`
- `status`
- `progress`
- `message`
- `input_file`
- `output_directory`
- `stdout_log_url`
- `stderr_log_url`
- `exit_code`
- `elapsed_ms`
- `retry_count`
- `started_time`
- `finished_time`

状态值：

- `pending`
- `running`
- `completed`
- `failed`
- `canceled`

Migration 名称建议：

- 本任务不建议创建 Migration；如缺少日志字段，应停止并回到 MVP-02 修正。

## 7. API 变更

新增 API：

| Method | Route |
|---|---|
| GET | `/api/model-conversion-jobs/{jobId}` |

Request:

- `jobId`: 路径参数。

Response:

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
- `stdoutLogUrl`
- `stderrLogUrl`

校验规则：

- `jobId` 必须存在。
- 查询接口只返回当前用户或当前环境允许查看的任务；MVP 可先不做权限，但保留边界说明。
- 失败任务必须返回 message。

错误码：

- `404`: 任务不存在。
- `500`: 查询任务状态失败。

## 8. 前端变更

本任务不涉及前端变更。

后续如需要上传进度或转换状态页面，应另拆前端任务。

## 9. 验收标准

- 上传后可查询 job。
- 任务状态可从 pending / running / completed / failed 流转。
- 失败时可看到 message。
- 日志字段存在。
- 任务不存在返回 404。
- `dotnet build` 通过。
- 无前端源码改动。
- 不执行完整 CAD 转换。

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

- 查询接口暴露本地服务器绝对路径。
- failed 状态没有保存 stderr 或 exitCode，现场无法排查。
- Worker 边界被扩大为完整 CAD 转换。
- 状态流转可逆或无约束，导致任务状态混乱。
- 上传任务和 inspect 任务 jobType 语义不清。

## 12. 回滚策略

- 删除本任务新增的转换任务查询 Controller、Service、DTO。
- 删除本任务新增的 Worker 基础日志写入逻辑。
- 保留 MVP-03 创建的 `model_conversion_job` 记录能力。
- 不删除测试上传文件，除非它们由本任务专门创建。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-14：转换任务状态与基础日志。

当前只执行本任务，不执行任何后续开发任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-14-conversion-job-status-log.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止实现完整 CAD 转换、STEP / IFC 转换、3D Tiles 切片、完整 Worker 队列系统或前端状态页面，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、API 验证结果、任务状态验证、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
