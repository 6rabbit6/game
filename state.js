// 默认演示数据与全局运行态。
const defaultData = {
  site: {
    brandName: "赛事通",
    systemName: "短道速滑赛事信息系统 · 网页版",
    heroEyebrow: "赛事总览",
    heroTitle: "把赛事首页、赛程详情、分组名单和后台管理放到同一个网页里",
    heroDescription:
      "面向俱乐部、裁判、教练和家长的一体化赛事展示系统。前台适合快速查看，后台支持录入和维护所有赛事文字、日程、分组与运动员信息。",
    homeSectionTitle: "赛事列表",
    homeSectionDescription: "点击任意赛事可进入日程详情，再进一步查看每个项目的分组名单。",
    footerText: "短道速滑赛事信息系统",
    adminTitle: "后台管理",
    adminDescription: "所有页面展示的数据都来自这里，修改后会自动保存在当前浏览器。",
  },
  importSettings: {
    bibMode: "global_auto",
    startBibNo: 1,
    bibDigits: 3,
    maxAthletesPerGroup: 6,
    roundPlanMaxExpectedAthletes: 100,
    eventFormationSettings: {
      enabled: true,
      minParticipants: 3,
      underfilledAction: "suggest_merge",
      mergePriority: [
        "upper_division_same_event",
        "same_division_larger_event",
        "cancel",
      ],
      raceMergeMode: "race_together_rank_separately",
      importedGroupDefinitions: [],
      groupDefinitions: [],
      groupChains: [],
      groupOrder: [],
    },
  },
  events: [
    {
      id: "event-bj-2026-1",
      name: "2026年北京市短道速滑联赛",
      stageLabel: "第一站",
      status: "已结束",
      dateRange: "2026/4/11 - 2026/4/12",
      location: "北京朝阳体育中心",
      summary:
        "本场赛事包含 U15、U18、成年组多个项目，支持在网页中查看赛程安排、分组信息与运动员名单。",
      description:
        "赛事系统将首页、赛程日历和分组详情串联起来，方便大家通过一个页面查看当前比赛情况。",
      days: [
        {
          id: "day-1",
          label: "第 1 天",
          date: "2026/4/11",
          note: "上午场以 1500 米项目为主，穿插浇冰时段。",
          entries: [
            {
              id: "entry-1",
              time: "8:00",
              projectName: "1500米",
              division: "U15组",
              gender: "男子",
              round: "1/4赛",
              participantCount: "44",
              groupCount: "7",
              qualification: "1+14",
              note: "1-7",
              type: "race",
              groups: [
                {
                  id: "group-1",
                  name: "第1组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [
                    {
                      rank: "1",
                      lane: "1",
                      bib: "601",
                      name: "商煜",
                      team: "北京市朝阳区第三少儿业余体校",
                      result: "02:28.916",
                      note: "Q",
                    },
                    {
                      rank: "2",
                      lane: "6",
                      bib: "638",
                      name: "吴沙臣",
                      team: "北京市延庆区",
                      result: "02:29.607",
                      note: "q",
                    },
                    {
                      rank: "3",
                      lane: "3",
                      bib: "576",
                      name: "吕皓然",
                      team: "北京启鸣冰雪体育文化有限公司",
                      result: "02:30.146",
                      note: "q",
                    },
                    {
                      rank: "4",
                      lane: "4",
                      bib: "483",
                      name: "徐敬民",
                      team: "北京冰雪轮滑（滑冰）俱乐部",
                      result: "02:32.709",
                      note: "",
                    },
                    {
                      rank: "5",
                      lane: "5",
                      bib: "801",
                      name: "曹梓晨",
                      team: "梦起源俱乐部",
                      result: "02:33.158",
                      note: "",
                    },
                    {
                      rank: "6",
                      lane: "2",
                      bib: "771",
                      name: "常锦圣",
                      team: "北京市第十二中学体育分校",
                      result: "02:37.913",
                      note: "",
                    },
                  ],
                },
                {
                  id: "group-2",
                  name: "第2组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [
                    {
                      rank: "1",
                      lane: "2",
                      bib: "526",
                      name: "李承泽",
                      team: "北京丰台俱乐部",
                      result: "02:29.301",
                      note: "Q",
                    },
                    {
                      rank: "2",
                      lane: "5",
                      bib: "702",
                      name: "张宇坤",
                      team: "北京海淀青训",
                      result: "02:30.054",
                      note: "q",
                    },
                  ],
                },
                {
                  id: "group-3",
                  name: "第3组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [],
                },
                {
                  id: "group-4",
                  name: "第4组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [],
                },
                {
                  id: "group-5",
                  name: "第5组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [],
                },
                {
                  id: "group-6",
                  name: "第6组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [],
                },
                {
                  id: "group-7",
                  name: "第7组",
                  summary: "U15组男子1500米 1/4赛",
                  athletes: [],
                },
              ],
            },
            {
              id: "entry-2",
              time: "8:35",
              projectName: "1500米",
              division: "U18组",
              gender: "女子",
              round: "半决赛",
              participantCount: "13",
              groupCount: "2",
              qualification: "1+5",
              note: "8-9",
              type: "race",
              groups: [
                {
                  id: "group-8",
                  name: "第1组",
                  summary: "U18组女子1500米 半决赛",
                  athletes: [],
                },
                {
                  id: "group-9",
                  name: "第2组",
                  summary: "U18组女子1500米 半决赛",
                  athletes: [],
                },
              ],
            },
            {
              id: "entry-3",
              time: "8:45",
              projectName: "1500米",
              division: "U18组",
              gender: "男子",
              round: "半决赛",
              participantCount: "12",
              groupCount: "2",
              qualification: "1+5",
              note: "10-11",
              type: "race",
              groups: [],
            },
            {
              id: "entry-4",
              time: "8:55",
              projectName: "浇冰",
              division: "",
              gender: "",
              round: "跑道维护",
              participantCount: "",
              groupCount: "",
              qualification: "",
              note: "",
              type: "break",
              groups: [],
            },
            {
              id: "entry-5",
              time: "9:05",
              projectName: "1500米",
              division: "U15组",
              gender: "女子",
              round: "半决赛",
              participantCount: "21",
              groupCount: "3",
              qualification: "1+4",
              note: "12-14",
              type: "race",
              groups: [],
            },
            {
              id: "entry-6",
              time: "9:20",
              projectName: "1500米",
              division: "U15组",
              gender: "男子",
              round: "半决赛",
              participantCount: "21",
              groupCount: "3",
              qualification: "2+1",
              note: "15-17",
              type: "race",
              groups: [],
            },
            {
              id: "entry-7",
              time: "9:35",
              projectName: "浇冰",
              division: "",
              gender: "",
              round: "跑道维护",
              participantCount: "",
              groupCount: "",
              qualification: "",
              note: "",
              type: "break",
              groups: [],
            },
            {
              id: "entry-8",
              time: "9:45",
              projectName: "1500米",
              division: "成年组",
              gender: "男子",
              round: "决赛",
              participantCount: "5",
              groupCount: "1",
              qualification: "3+0",
              note: "",
              type: "race",
              groups: [],
            },
          ],
        },
        {
          id: "day-2",
          label: "第 2 天",
          date: "2026/4/12",
          note: "第二天安排 500 米和接力项目。",
          entries: [
            {
              id: "entry-9",
              time: "8:30",
              projectName: "500米",
              division: "U15组",
              gender: "男子",
              round: "预赛",
              participantCount: "32",
              groupCount: "4",
              qualification: "前2名",
              note: "A-D组",
              type: "race",
              groups: [],
            },
            {
              id: "entry-10",
              time: "9:10",
              projectName: "2000米接力",
              division: "U18组",
              gender: "混合",
              round: "决赛",
              participantCount: "8",
              groupCount: "1",
              qualification: "决出名次",
              note: "",
              type: "race",
              groups: [],
            },
          ],
        },
      ],
    },
    {
      id: "event-bj-2026-2",
      name: "2026年北京市青少年冰上挑战赛",
      stageLabel: "筹备中",
      status: "未开始",
      dateRange: "2026/6/20 - 2026/6/21",
      location: "首钢滑冰馆",
      summary: "赛事基础信息已创建，等待后台继续录入赛程和分组名单。",
      description: "可在后台中继续完善比赛项目、赛程安排、运动员名单与备注信息。",
      days: [
        {
          id: "day-3",
          label: "第 1 天",
          date: "2026/6/20",
          note: "待录入",
          entries: [],
        },
      ],
    },
  ],
};

let state = null;

function initializeState() {
  state = {
  data: loadLocalData(),
  authSession: null,
  adminEmail: "",
  isAdminAuthenticated: false,
  route: "home",
  selectedEventId: null,
  selectedDayId: null,
  selectedEntryId: null,
  selectedGroupId: null,
  adminEventId: null,
  adminDayId: null,
  adminEntryId: null,
  adminGroupId: null,
  resultSearchKeyword: "",
  resultSearchProjectName: "",
  resultSearchEventId: "",
  registrationImportExpanded: false,
  adminUi: {
    activeAdminTab: "overview",
    expandedPanels: {},
    scrollTop: 0,
    focusedFieldKey: "",
  },
  preRaceChange: {
    keyword: "",
    selectedAthleteKey: "",
    actionType: "change_group",
    targetGroupKey: "",
    targetGroup: null,
    riskLevel: "",
    riskReason: "",
    targetEventKey: "",
    targetCancelEventKey: "",
    withdrawScope: "all",
    reason: "",
    basicName: "",
    basicOrganization: "",
    basicCertificateNumber: "",
    basicPhone: "",
    preview: null,
    highRiskUnlocked: false,
    changeGroupComboboxOpen: false,
  },
  athleteActionMenu: {
    athleteIndex: null,
    sourceEntryId: null,
    sourceGroupId: null,
    isOpen: false,
  },
  promotePanel: {
    athleteIndex: null,
    sourceEntryId: null,
    sourceGroupId: null,
    targetEntryId: "",
    targetGroupId: "",
    isOpen: false,
  },
  manualRegistrationPanel: {
    isOpen: false,
    source: "",
    entryId: "",
    groupId: "",
    values: {},
  },
  pendingRegistrationImport: null,
  dataSource: "localStorage/defaultData",
  cloudRuntime: {
    sdkLoaded: false,
    clientReady: false,
    host: "",
    cloudFirst: false,
    dataSource: "localStorage/defaultData",
    cloudLoadStatus: "idle",
    failureReason: "",
    localCacheStatus: "unknown",
    localCacheError: "",
    lastLocalCacheAt: "",
    appStatePublishStatus: "idle",
    appStatePublishError: "",
    structuredPublishStatus: "idle",
    structuredPublishError: "",
    activePublishVersion: "",
    structuredPublishCounts: null,
    buildVersion: "",
    lastCloudSyncAt: "",
  },
};
  return state;
}

function syncSelections() {
  const events = state.data.events;
  const firstEvent = events[0] || null;
  const currentEvent = events.find((event) => event.id === state.selectedEventId) || firstEvent;
  state.selectedEventId = currentEvent?.id || null;
  if (state.adminEventId && !events.some((event) => event.id === state.adminEventId)) {
    state.adminEventId = null;
  }

  const scheduleEvent = getCurrentEvent();
  const scheduleDays = scheduleEvent?.days || [];
  const firstDay = scheduleDays[0] || null;
  const currentDay = scheduleDays.find((day) => day.id === state.selectedDayId) || firstDay;
  state.selectedDayId = currentDay?.id || null;

  const entries = currentDay?.entries || [];
  const firstEntryWithGroups = entries.find((entry) => entry.groups?.length) || entries[0] || null;
  const currentEntry =
    entries.find((entry) => entry.id === state.selectedEntryId) || firstEntryWithGroups;
  state.selectedEntryId = currentEntry?.id || null;

  const groups = currentEntry?.groups || [];
  const firstGroup = groups[0] || null;
  const currentGroup = groups.find((group) => group.id === state.selectedGroupId) || firstGroup;
  state.selectedGroupId = currentGroup?.id || null;

  const adminEvent = getAdminEvent();
  if (!adminEvent) {
    state.adminDayId = null;
    state.adminEntryId = null;
    state.adminGroupId = null;
    syncAthleteActionMenuState();
    syncPromotePanelState();
    return;
  }

  const adminDays = adminEvent?.days || [];
  const firstAdminDay = adminDays[0] || null;
  const currentAdminDay =
    adminDays.find((day) => day.id === state.adminDayId) || firstAdminDay;
  state.adminDayId = currentAdminDay?.id || null;

  const adminEntries = currentAdminDay?.entries || [];
  const firstAdminEntry = adminEntries[0] || null;
  const currentAdminEntry =
    adminEntries.find((entry) => entry.id === state.adminEntryId) || firstAdminEntry;
  state.adminEntryId = currentAdminEntry?.id || null;

  const adminGroups = currentAdminEntry?.groups || [];
  const firstAdminGroup = adminGroups[0] || null;
  const currentAdminGroup =
    adminGroups.find((group) => group.id === state.adminGroupId) || firstAdminGroup;
  state.adminGroupId = currentAdminGroup?.id || null;

  syncAthleteActionMenuState();
  syncPromotePanelState();
}

function getHistoryState() {
  return {
    appHistory: true,
    route: state.route,
    selectedEventId: state.selectedEventId,
    selectedDayId: state.selectedDayId,
    selectedEntryId: state.selectedEntryId,
    selectedGroupId: state.selectedGroupId,
    adminEventId: state.adminEventId,
    adminDayId: state.adminDayId,
    adminEntryId: state.adminEntryId,
    adminGroupId: state.adminGroupId,
  };
}

function isSameHistoryState(left, right) {
  if (!left || !right) {
    return false;
  }

  return [
    "route",
    "selectedEventId",
    "selectedDayId",
    "selectedEntryId",
    "selectedGroupId",
    "adminEventId",
    "adminDayId",
    "adminEntryId",
    "adminGroupId",
  ].every((key) => left[key] === right[key]);
}

function pushHistoryState() {
  const nextState = getHistoryState();
  if (isSameHistoryState(window.history.state, nextState)) {
    return;
  }
  window.history.pushState(nextState, "", window.location.href);
}

function replaceHistoryState() {
  window.history.replaceState(getHistoryState(), "", window.location.href);
}

function applyHistoryState(historyState) {
  state.route = historyState.route || "home";
  state.selectedEventId = historyState.selectedEventId || null;
  state.selectedDayId = historyState.selectedDayId || null;
  state.selectedEntryId = historyState.selectedEntryId || null;
  state.selectedGroupId = historyState.selectedGroupId || null;
  state.adminEventId = historyState.adminEventId || null;
  state.adminDayId = historyState.adminDayId || null;
  state.adminEntryId = historyState.adminEntryId || null;
  state.adminGroupId = historyState.adminGroupId || null;
}

function restoreInitialHistoryState() {
  if (window.history.state?.appHistory) {
    applyHistoryState(window.history.state);
  }
}

function restoreHistoryState(historyState) {
  if (!historyState?.appHistory) {
    return;
  }

  applyHistoryState(historyState);
  syncSelections();
  renderShell();
  renderView();
}

function ensureEntryWithGroups() {
  const event = getCurrentEvent();
  if (!event) return;

  const currentDay = getCurrentDay();
  const currentEntry = currentDay?.entries.find((item) => item.id === state.selectedEntryId);
  if (currentEntry?.groups?.length) {
    state.selectedGroupId = currentEntry.groups[0]?.id || null;
    return;
  }

  const located = event.days
    .map((day) => ({
      day,
      entry: day.entries.find((item) => item.groups?.length),
    }))
    .find((item) => item.entry);

  if (located) {
    state.selectedDayId = located.day.id;
    state.selectedEntryId = located.entry.id;
    state.selectedGroupId = located.entry.groups[0]?.id || null;
    return;
  }

  state.selectedDayId = event.days[0]?.id || null;
  state.selectedEntryId = event.days[0]?.entries[0]?.id || null;
  state.selectedGroupId = null;
}

function getCurrentEvent() {
  return state.data.events.find((event) => event.id === state.selectedEventId) || null;
}

function getCurrentDay() {
  const event = getCurrentEvent();
  return event?.days.find((day) => day.id === state.selectedDayId) || event?.days[0] || null;
}

function getCurrentEntry() {
  const day = getCurrentDay();
  return day?.entries.find((entry) => entry.id === state.selectedEntryId) || day?.entries[0] || null;
}

function getCurrentGroup() {
  const entry = getCurrentEntry();
  return (
    entry?.groups.find((group) => group.id === state.selectedGroupId) || entry?.groups[0] || null
  );
}

function getAdminEvent() {
  return state.data.events.find((event) => event.id === state.adminEventId) || null;
}

function getAdminDay() {
  const event = getAdminEvent();
  return event?.days.find((day) => day.id === state.adminDayId) || event?.days[0] || null;
}

function getAdminEntry() {
  const day = getAdminDay();
  return day?.entries.find((entry) => entry.id === state.adminEntryId) || day?.entries[0] || null;
}

function getAdminGroup() {
  const entry = getAdminEntry();
  return entry?.groups.find((group) => group.id === state.adminGroupId) || entry?.groups[0] || null;
}

function findEventIndex(eventId) {
  return state.data.events.findIndex((event) => event.id === eventId);
}

function findDayIndex(event, dayId) {
  return event.days.findIndex((day) => day.id === dayId);
}

function findEntryIndex(day, entryId) {
  return day.entries.findIndex((entry) => entry.id === entryId);
}

function findGroupIndex(entry, groupId) {
  return entry.groups.findIndex((group) => group.id === groupId);
}

function formatEntryOptionLabel(entry) {
  const parts = [
    entry?.time,
    entry?.projectName || "未命名项目",
    typeof formatGroupNameForDisplay === "function"
      ? formatGroupNameForDisplay(entry?.division || entry?.groupName)
      : entry?.division || entry?.groupName,
    entry?.gender,
    typeof getEntryRoundName === "function" ? getEntryRoundName(entry) : entry?.roundName || entry?.round,
    typeof getEntryDisplayScheduleStatus === "function" ? getEntryDisplayScheduleStatus(entry) : entry?.scheduleStatus,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.join(" · ");
}
