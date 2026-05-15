# RLS 权限收口计划

本阶段只记录计划，不直接执行 RLS 修改。等确认网页前台和小程序都不依赖 `app_state` 后，再逐步收紧权限。

## 收口前提

- 首页数据源为 `structured-events`。
- 赛事日程数据源为 `structured-schedule`。
- 分组详情数据源为 `structured-groups`。
- 成绩查询数据源为 `structured-results`。
- 普通用户正式域名路径不主动读取 `app_state`。
- 普通用户访问 `index.html` 时处于 `frontend` mode，不显示后台入口。
- 管理员访问 `admin.html` 时处于 `admin` mode，默认进入后台登录/管理页。
- 正式域名下 `?admin=1` 不会让 `index.html` 进入后台模式。
- `frontend` mode 已通过路由守卫阻止 `admin` route。
- `frontend` mode 已通过后台 action 守卫阻止导入、导出、发布、删除、规则修改等写操作。
- `frontend` mode 已禁止 `app_state` fallback，即使浏览器里残留管理员登录态也不走整包兼容。
- 后台管理员发布、导入、成绩录入、秩序册导出均正常。

## 第 7 阶段软分离状态

当前阶段只做入口和运行模式软分离，不是最终安全隔离：

- `index.html` 固定设置 `window.APP_MODE = "frontend"`。
- `admin.html` 固定设置 `window.APP_MODE = "admin"`，并带 `noindex,nofollow`。
- `getAppMode()` 统一判断运行模式。
- `canAccessRoute(route)` 限制普通前台只能访问 `home / schedule / groups / results`。
- `assertAdminMode(actionName)` 作为后台写操作的统一软守卫。
- `allowAppStateFallback()` 在正式前台一律返回 false，后台和本地调试仍可使用兼容数据。

因为前后台仍复用同一套 JS，浏览器仍可能下载后台代码。真正权限安全必须依赖后续 RLS 收口、Edge Function 和前后台 JS 拆包。

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
