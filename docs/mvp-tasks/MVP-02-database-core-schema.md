# MVP-02：数据库核心实体与 Migration

## 1. 任务目标

建立 MVP 一期所需的核心领域实体、枚举、DbContext、EF Core 映射、唯一约束、外键关系、索引和初始 Migration，为后续 GLB 上传、manifest、object-tree、可动部件、motion target、场景绑定和转换任务状态提供数据基础。

## 2. 前置条件

- MVP-01 后端解决方案骨架已完成。
- `server/IdtsTwin.sln` 可构建。
- `IdtsTwin.Domain`、`IdtsTwin.Infrastructure`、`IdtsTwin.Api` 项目已存在。
- 数据库类型已选择为 PostgreSQL 或 SQL Server 的 MVP 开发环境之一。
- 已确认本任务只执行 MVP-02，不写业务 Controller。

## 3. 影响范围

预计影响范围：

- `server/src/IdtsTwin.Domain/**`
- `server/src/IdtsTwin.Infrastructure/**`
- `server/src/IdtsTwin.Api/**`
- `server/src/IdtsTwin.Contracts/**`
- `server/src/IdtsTwin.Infrastructure/Migrations/**`
- `server/**/appsettings*.json`
- `docs/**`

## 4. 禁止修改范围

- 不允许修改与本任务无关的 `src` 文件。
- 不允许修改 `public/models/lifter.glb`。
- 不允许格式化全仓库。
- 不允许引入非必要依赖。
- 不允许跨任务实现后续功能。
- 不允许实现上传接口。
- 不允许实现 manifest 查询接口。
- 不允许实现可动部件业务 Controller。
- 不允许修改前端源码。

## 5. 详细执行步骤

1. 输出本任务影响范围并等待确认。
2. 检查 MVP-01 项目结构是否存在。
3. 检查当前 git 状态，记录已有变更。
4. 确认 EF Core 8 相关包是否已在后端项目中配置。
5. 在 Domain 中创建模型资产相关实体。
6. 在 Domain 中创建资产版本相关实体。
7. 在 Domain 中创建转换任务相关实体。
8. 在 Domain 中创建 object-tree 索引实体。
9. 在 Domain 中创建 manifest 实体。
10. 在 Domain 中创建场景节点实体。
11. 在 Domain 中创建设备实例实体。
12. 在 Domain 中创建设备模型绑定实体。
13. 在 Domain 中创建可动部件绑定实体。
14. 在 Domain 中创建 motion target 实体。
15. 在 Domain 中创建操作审计实体。
16. 在 Domain 中创建工具包实体。
17. 在 Domain 中创建工具健康检查实体。
18. 在 Domain 中创建资产状态、任务状态、绑定状态、运动类型、轴模式等枚举。
19. 在 Infrastructure 中创建 `TwinDbContext`。
20. 配置所有表名为 snake_case。
21. 配置所有主键。
22. 配置所有外键。
23. 配置所有唯一约束。
24. 配置常用查询索引。
25. 配置 `model_asset.source_file_hash` MVP 全局唯一策略。
26. 配置同一 `device_instance` 只能有一个 active 绑定的约束策略。
27. 创建初始 Migration，建议命名 `InitTwinSchema`。
28. 执行数据库更新。
29. 运行 `dotnet build`。
30. 输出数据库表、约束、索引、构建结果和 git diff 摘要。

## 6. 数据库变更

新增表：

- `model_asset`
- `asset_version`
- `model_asset_variant`
- `model_conversion_job`
- `model_object_index`
- `asset_manifest`
- `scene_node`
- `device_instance`
- `device_model_binding`
- `movable_part_binding`
- `motion_target`
- `operation_audit`
- `tool_package`
- `tool_health_check`

关键字段：

- `model_asset`: `id`, `asset_code`, `asset_name`, `source_file_name`, `source_file_hash`, `source_file_type`, `asset_type`, `processing_status`, `current_version_id`, `created_time`, `updated_time`
- `asset_version`: `id`, `model_asset_id`, `version_no`, `version_status`, `created_time`, `published_time`, `archived_time`
- `model_asset_variant`: `id`, `model_asset_id`, `asset_version_id`, `variant_level`, `file_url`, `file_hash`, `file_size`, `triangle_count`, `vertex_count`, `mesh_count`, `material_count`, `texture_count`, `created_time`
- `model_conversion_job`: `id`, `model_asset_id`, `asset_version_id`, `job_type`, `status`, `progress`, `message`, `input_file`, `output_directory`, `stdout_log_url`, `stderr_log_url`, `exit_code`, `elapsed_ms`, `retry_count`, `started_time`, `finished_time`
- `model_object_index`: `id`, `model_asset_id`, `asset_version_id`, `object_uuid`, `object_name`, `object_path`, `parent_uuid`, `parent_path`, `object_type`, `bounding_box_min_x`, `bounding_box_min_y`, `bounding_box_min_z`, `bounding_box_max_x`, `bounding_box_max_y`, `bounding_box_max_z`, `mesh_fingerprint`, `created_time`
- `asset_manifest`: `id`, `model_asset_id`, `asset_version_id`, `manifest_json`, `model_stats_json`, `created_time`, `updated_time`
- `scene_node`: `id`, `parent_id`, `node_code`, `node_name`, `node_type`, `sort_no`, `enabled`, `created_time`, `updated_time`
- `device_instance`: `id`, `scene_node_id`, `device_code`, `device_name`, `device_type`, `position_x`, `position_y`, `position_z`, `rotation_x`, `rotation_y`, `rotation_z`, `scale_x`, `scale_y`, `scale_z`, `enabled`, `created_time`, `updated_time`
- `device_model_binding`: `id`, `device_instance_id`, `model_asset_id`, `asset_version_id`, `binding_status`, `active_from`, `active_to`, `created_time`, `updated_time`
- `movable_part_binding`: `id`, `asset_version_id`, `object_uuid`, `object_name`, `object_path`, `parent_uuid`, `parent_path`, `business_name`, `part_code`, `motion_type`, `axis_mode`, `axis`, `custom_axis_x`, `custom_axis_y`, `custom_axis_z`, `min_value`, `max_value`, `home_value`, `current_value`, `default_speed`, `binding_status`, `enabled`, `created_time`, `updated_time`
- `motion_target`: `id`, `movable_part_id`, `target_code`, `target_name`, `target_value`, `target_x`, `target_y`, `target_z`, `sort_no`, `enabled`, `created_time`, `updated_time`
- `operation_audit`: `id`, `operation_type`, `biz_type`, `biz_id`, `operator_id`, `operator_name`, `before_json`, `after_json`, `created_time`
- `tool_package`: `id`, `tool_name`, `version`, `download_url`, `sha256`, `install_path`, `license_type`, `supported_formats`, `health_check_command`, `required`, `enabled`, `created_time`, `updated_time`
- `tool_health_check`: `id`, `tool_package_id`, `tool_name`, `version`, `stdout`, `stderr`, `exit_code`, `checked_time`, `created_time`

关键约束：

- `model_asset.asset_code` 唯一。
- `model_asset.source_file_hash` MVP 一期全局唯一。
- `asset_version.model_asset_id + version_no` 唯一。
- `model_asset_variant.asset_version_id + variant_level` 唯一。
- `device_instance.device_code` 唯一。
- `device_model_binding.device_instance_id + asset_version_id` 唯一。
- 同一 `device_instance` 同一时间只能存在一个 active / Published 模型绑定。
- `movable_part_binding.asset_version_id + part_code` 唯一。
- `motion_target.movable_part_id + target_code` 唯一。
- `tool_health_check.tool_package_id` 外键到 `tool_package.id`。

索引：

- `model_asset.source_file_hash`
- `asset_version.model_asset_id + version_status`
- `model_object_index.asset_version_id + object_uuid`
- `model_object_index.asset_version_id + object_path`
- `device_model_binding.device_instance_id + binding_status`
- `movable_part_binding.asset_version_id + enabled`
- `motion_target.movable_part_id + enabled`
- `tool_health_check.tool_package_id + checked_time`

Migration 名称建议：

- `InitTwinSchema`

## 7. API 变更

本任务不涉及 API 变更。

不得新增业务 Controller，不得暴露上传、manifest、object-tree、可动部件、motion target 或 scene manifest 接口。

## 8. 前端变更

本任务不涉及前端变更。

不得修改前端 API 调用、状态、UI、fallback 或 Three.js 逻辑。

## 9. 验收标准

- `InitTwinSchema` Migration 创建成功。
- 数据库更新成功。
- 所有 MVP 核心表存在。
- 唯一约束存在。
- 外键关系存在。
- 常用查询索引存在。
- `model_asset.source_file_hash` 全局唯一策略有注释或配置说明。
- 同一设备 active 绑定唯一规则有数据库约束或服务层约束说明。
- `dotnet build` 通过。
- 未新增业务 Controller。
- 无前端源码改动。

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

- 表结构与 v1.2 ER 草案不一致。
- 枚举值命名与 API 契约不一致。
- 外键循环导致删除或发布流程难以处理。
- active / Published 唯一约束只写在文档，没有落到数据库或服务层规则。
- `source_file_hash` 全局唯一策略后续复用场景需要拆分 `source_blob` / `file_object`。
- Migration 绑定到错误数据库提供程序。

## 12. 回滚策略

- 删除 `InitTwinSchema` Migration。
- 回滚数据库到执行前状态。
- 删除本任务新增的实体、枚举、DbContext 映射和数据库配置。
- 保留 MVP-01 后端骨架。
- 不回滚用户已有前端或文档变更。

## 13. Codex 执行提示词

```text
请执行 MVP-02：数据库核心实体与 Migration。

当前只执行本任务，不执行 MVP-03 或任何后续任务。
请先读取 AGENTS.md、docs/idts-digital-twin-project-technical-plan.md、docs/idts-mvp-task-breakdown.md，以及 docs/mvp-tasks/MVP-02-database-core-schema.md。
先输出影响范围，等待我确认后再修改文件。
禁止跨任务扩展，禁止写业务 Controller，禁止实现上传、manifest、object-tree、可动部件、motion target 或 scene manifest，禁止修改前端源码，禁止修改 public/models/lifter.glb。
完成后输出修改文件路径、新增文件路径、是否有代码改动、是否有新增依赖、是否创建后端项目、Migration 名称、数据库更新结果、dotnet build 结果、验收情况、git status 摘要和 git diff --stat 摘要。
不要 commit，不要 push。
```
