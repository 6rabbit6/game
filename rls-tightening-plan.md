# RLS 权限收口计划

本阶段只记录计划，不直接执行 RLS 修改。等确认网页前台和小程序都不依赖 `app_state` 后，再逐步收紧权限。

## 收口前提

- 首页数据源为 `structured-events`。
- 赛事日程数据源为 `structured-schedule`。
- 分组详情数据源为 `structured-groups`。
- 成绩查询数据源为 `structured-results`。
- 普通用户正式域名路径不主动读取 `app_state`。
- 后台管理员发布、导入、成绩录入、秩序册导出均正常。

## 匿名用户允许

匿名用户只允许读取 active 发布版本相关公开数据：

- `SELECT` active `publish_versions`
- `SELECT` `published_events`
- `SELECT` `published_event_days`
- `SELECT` `published_schedule_entries`
- `SELECT` `published_entry_groups`
- `SELECT` `published_group_athletes`
- `SELECT` `published_results`

建议策略：

- `publish_versions` 只允许读取 `status = 'active'`。
- 所有 `published_*` 查询只允许读取 active `publish_version` 对应的数据。

## 匿名用户禁止

匿名用户禁止：

- `SELECT app_state`
- `SELECT registration_imports`
- `SELECT manual_registrations`
- `SELECT change_records`
- `INSERT / UPDATE / DELETE` 所有表
- 读取手机号、证件号、付款状态、审核状态、后台备份快照

## 管理员允许

管理员登录后允许：

- 写入 `app_state` 快照。
- 写入 `published_*` staging 数据。
- 将 staging 发布版本切换为 active。
- 将旧 active 版本归档为 archived。

管理员仍不得在前端使用 `service_role` key。

## 建议执行顺序

1. 保持当前 RLS，不立即收紧。
2. 连续测试网页前台四条路径，确认不读 `app_state`。
3. 小程序 API 第一版上线后，确认小程序只读公开接口。
4. 对 `app_state` 禁止匿名 SELECT。
5. 对 `registration_imports`、`manual_registrations`、`change_records` 禁止匿名 SELECT。
6. 对所有表禁止匿名写入。
7. 只保留匿名 SELECT active published 数据。

## 回滚准备

执行 RLS 前先导出当前策略 SQL 或截图记录。若前台出现权限错误，可临时恢复 published 表的匿名 SELECT，但不要恢复 `app_state` 匿名读取，除非确认仍有老版本页面依赖。
