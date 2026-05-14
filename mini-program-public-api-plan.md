# 小程序公开 API 规划

本规划用于后续将公开前台接入小程序。第一版建议使用 Supabase Edge Function 作为小程序公开 API 层，不建议小程序直接读 Supabase 表。

## 为什么使用 Edge Function

- 小程序不直接依赖数据库表结构。
- 字段变化时优先改接口映射，不需要同步改小程序多处页面。
- 可以统一权限、缓存、字段过滤和错误格式。
- 避免小程序端暴露过多表细节。
- 第一版小程序不读取 `app_state`。

## 数据来源

所有接口只读取 active 发布版本下的公开表：

- `publish_versions`
- `published_events`
- `published_event_days`
- `published_schedule_entries`
- `published_entry_groups`
- `published_group_athletes`
- `published_results`

不读取：

- `app_state`
- 原始报名 JSON
- `registration_imports`
- `manual_registrations`
- `change_records`
- 后台规则草稿

## API 设计

### getPublishVersion

参数：无。

返回：

```json
{
  "publishVersion": "pv-...",
  "publishedAt": "2026-05-14T00:00:00Z"
}
```

用途：小程序启动时判断缓存是否过期。

### getPublishedEvents

参数：无。

返回：`PublishedEvent[]`。

用途：首页赛事列表。

### getPublishedSchedule

参数：

```json
{
  "eventId": "event-..."
}
```

返回：

```json
{
  "event": "PublishedEvent",
  "days": ["PublishedSchedule day model"],
  "entries": ["PublishedSchedule entry model"]
}
```

用途：赛事日程页。

### getPublishedGroups

参数：

```json
{
  "entryId": "entry-..."
}
```

返回：`PublishedGroupDetail`。

用途：分组详情页。

### searchPublishedResults

参数：

```json
{
  "eventId": "event-...",
  "keyword": "017"
}
```

返回：`PublishedResult[]`。

用途：成绩查询。号码精确匹配应优先，其次姓名、单位、项目、组别。

## 小程序缓存策略

1. 启动时先请求 `getPublishVersion`。
2. 如果本地缓存版本等于 active `publishVersion`，优先使用本地公开数据缓存。
3. 如果版本变化，重新请求赛事列表、赛程或分组公开数据。
4. 成绩查询建议实时请求，不长期缓存。
5. 缓存只保存 published 公共数据，不保存后台数据。

## 错误处理建议

- 没有 active 版本：返回 `NO_ACTIVE_VERSION`，页面显示“当前赛事尚未发布”。
- 找不到赛事：返回 `EVENT_NOT_FOUND`。
- 找不到赛程：返回 `SCHEDULE_NOT_FOUND`。
- 找不到分组：返回 `GROUPS_NOT_FOUND`。
- 查询失败：返回 `PUBLIC_DATA_QUERY_FAILED`。

## 安全边界

- 小程序端只使用公开 API。
- 不把 Supabase `service_role` key 放入前端或小程序。
- 不返回证件号、电话、支付状态、审核状态、报名原始数据、赛前变更记录。
- 管理员发布仍由后台网页完成，小程序第一版只做公开查询。
