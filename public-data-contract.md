# 公开数据层契约

本文件定义网页前台和未来小程序共同消费的公开数据格式。后台完整编辑数据仍保留在 `app_state`，但普通用户前台不应读取 `app_state.data` 整包。

## 公开数据来源

普通用户网页前台和未来小程序只读取以下表：

- `publish_versions`
- `published_events`
- `published_event_days`
- `published_schedule_entries`
- `published_entry_groups`
- `published_group_athletes`
- `published_results`

后台管理员仍可使用 `app_state`、报名导入、赛前变更、手动补录和完整 `state.data`。

## PublishedEvent

用于赛事列表页。

```ts
type PublishedEvent = {
  eventId: string;
  name: string;
  status: string;
  stageLabel: string;
  dateRange: string;
  location: string;
  summary: string;
  description: string;
  displayOrder: number;
};
```

当前网页读取函数：`loadPublishedEvents()`。

## PublishedSchedule

用于赛事日程页。

```ts
type PublishedSchedule = {
  eventId: string;
  dayId: string;
  dayLabel: string;
  dayDate: string;
  dayNote: string;
  entryId: string;
  time: string;
  projectName: string;
  division: string;
  gender: string;
  roundName: string;
  type: string;
  participantCount: number;
  groupCount: number;
  qualification: string;
  scheduleStatus: string;
  note: string;
  isMergedRace: boolean;
  raceMergeMode: string;
};
```

当前网页读取函数：`loadPublishedSchedule(eventId)`，内部读取 `loadPublishedEventDetail()`、`loadPublishedEventDays()` 和 `loadPublishedScheduleEntries()`。

## PublishedGroupDetail

用于分组详情页。

```ts
type PublishedGroupDetail = {
  eventId: string;
  entryId: string;
  groupId: string;
  groupName: string;
  groupSummary: string;
  athletes: PublishedGroupAthlete[];
};

type PublishedGroupAthlete = {
  athleteId: string;
  bib: string;
  lane: string;
  name: string;
  organization: string;
  gender: string;
  birthDate: string;
  result: string;
  rank: string;
  mergedOverallRank: string;
  originalRank: string;
  qualificationType: string;
  note: string;
  source: string;
  mergeType: string;
  originalGroupName: string;
  originalProjectName: string;
};
```

当前网页读取函数：`loadPublishedGroupsForEntry(entryId)`。

## PublishedResult

用于成绩查询页。

```ts
type PublishedResult = {
  eventId: string;
  eventName: string;
  dayId: string;
  dayLabel: string;
  dayDate: string;
  entryId: string;
  groupId: string;
  groupName: string;
  time: string;
  bib: string;
  lane: string;
  name: string;
  organization: string;
  projectName: string;
  division: string;
  gender: string;
  roundName: string;
  result: string;
  rank: string;
  mergedOverallRank: string;
  originalRank: string;
  qualificationType: string;
  note: string;
  originalGroupName: string;
  originalProjectName: string;
};
```

当前网页读取函数：`loadPublishedResults(eventId)`、`loadPublishedResultsForEntry(entryId)` 和 `searchPublishedResults(keyword)`。

## 禁止公开字段

公开前台和小程序不得返回以下字段：

- `certificateNumber`
- `phone`
- `paymentStatus`
- `reviewStatus`
- 原始报名 JSON
- `manual_registrations`
- `change_records`
- 后台规则草稿
- `app_state.data` 整包

如后续小程序或公开 API 需要新增字段，应先确认该字段是否属于公开展示数据，再更新本契约。
