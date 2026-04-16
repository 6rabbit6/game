const STORAGE_KEY = "event-system-data-v1";
const SUPABASE_URL = "https://vrismtdascvwxiyepxed.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OIBFAzMGjT4x3T6Dr90E0A_WB2ILWYE";
const CLOUD_TABLE_NAME = "app_state";
const CLOUD_FIRST_HOSTS = ["6rabbit6.github.io", "game.lcty.online"];
const cloudClient = createCloudClient();

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

const state = {
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
};

const app = document.querySelector("#app");
const topNav = document.querySelector("#topNav");
const brandName = document.querySelector("#brandName");
const systemName = document.querySelector("#systemName");
const pageFooter = document.querySelector("#pageFooter");

bootstrap();

async function bootstrap() {
  await initializeAdminAuth();
  syncSelections();
  renderShell();
  renderView();
  bindEvents();

  if (shouldPreferCloudOnStartup()) {
    await hydrateCloudStateOnStartup();
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createCloudClient() {
  if (!window.supabase?.createClient) {
    console.warn("Supabase SDK 未加载，云端发布功能不可用。");
    return null;
  }

  if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === "REPLACE_WITH_PUBLISHABLE_KEY") {
    console.warn("Supabase Publishable Key 未配置，云端发布功能不可用。");
    return null;
  }

  return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

function isValidAppData(value) {
  return Boolean(value?.site) && Array.isArray(value?.events);
}

function normalizeCloudAppData(value) {
  if (typeof value === "string") {
    return normalizeCloudAppData(JSON.parse(value));
  }

  if (isValidAppData(value)) {
    return value;
  }

  // 兼容一些早期/错误写入格式，例如 { data: {...真实业务数据...} }
  if (value && typeof value === "object" && isValidAppData(value.data)) {
    return value.data;
  }

  return null;
}

function parseCompetitionTime(value) {
  if (value == null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/[，]/g, ".")
    .replace(/[：]/g, ":")
    .replace(/[”″′’‘“]/g, '"')
    .replace(/\s+/g, "");

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const parseSecondsPart = (secondsText) => {
    const cleaned = secondsText
      .replace(/["']+$/g, "")
      .replace(/["']+/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\./, "")
      .replace(/\.$/, "");

    if (!cleaned || !/^\d+(?:\.\d+)?$/.test(cleaned)) {
      return null;
    }

    return Number(cleaned);
  };

  if (normalized.includes(":")) {
    const [minutesText, secondsText] = normalized.split(":");
    if (!/^\d+$/.test(minutesText)) {
      return null;
    }

    const secondsValue = parseSecondsPart(secondsText);
    if (secondsValue == null) {
      return null;
    }

    return Number(minutesText) * 60 + secondsValue;
  }

  return parseSecondsPart(normalized);
}

function recalculateGroupRanks(group) {
  if (!group?.athletes?.length) {
    return;
  }

  const athletesWithTime = group.athletes
    .map((athlete, index) => ({
      athlete,
      index,
      timeValue: parseCompetitionTime(athlete.result),
    }))
    .filter((item) => item.timeValue != null)
    .sort((left, right) => left.timeValue - right.timeValue);

  group.athletes.forEach((athlete) => {
    athlete.rank = "";
  });

  let previousTime = null;
  let previousRank = 0;

  athletesWithTime.forEach((item, index) => {
    const currentRank =
      previousTime != null && Math.abs(item.timeValue - previousTime) < 1e-9 ? previousRank : index + 1;

    item.athlete.rank = String(currentRank);
    previousTime = item.timeValue;
    previousRank = currentRank;
  });
}

function recalculateAllGroupRanks(data) {
  data.events?.forEach((event) => {
    event.days?.forEach((day) => {
      day.entries?.forEach((entry) => {
        entry.groups?.forEach((group) => {
          recalculateGroupRanks(group);
        });
      });
    });
  });
}

function getGroupFromAthleteModelPath(path) {
  const match = path.match(/^events\[(\d+)\]\.days\[(\d+)\]\.entries\[(\d+)\]\.groups\[(\d+)\]\.athletes\[(\d+)\]\.result$/);
  if (!match) {
    return null;
  }

  const [, eventIndexText, dayIndexText, entryIndexText, groupIndexText] = match;
  const eventIndex = Number(eventIndexText);
  const dayIndex = Number(dayIndexText);
  const entryIndex = Number(entryIndexText);
  const groupIndex = Number(groupIndexText);

  return state.data.events?.[eventIndex]?.days?.[dayIndex]?.entries?.[entryIndex]?.groups?.[groupIndex] || null;
}

// 本地模式：页面启动和日常录入都优先读写浏览器 localStorage。
function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultData);
    }
    const parsed = JSON.parse(raw);
    if (!isValidAppData(parsed)) {
      return clone(defaultData);
    }
    recalculateAllGroupRanks(parsed);
    return parsed;
  } catch (error) {
    console.warn("读取本地数据失败，已回退到默认数据。", error);
    return clone(defaultData);
  }
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function getCloudStateRow() {
  ensureCloudClientReady();

  const { data, error } = await cloudClient
    .from(CLOUD_TABLE_NAME)
    .select("id, data, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

// 云端模式：只在手动点击按钮时访问 Supabase，不参与字段输入时的自动保存。
async function loadCloudData() {
  const row = await getCloudStateRow();
  if (!row) {
    return null;
  }

  const parsedData = normalizeCloudAppData(row.data);

  if (!parsedData) {
    throw new Error("云端当前不是有效的赛事系统数据，请先重新上传一次完整数据");
  }

  return parsedData;
}

async function saveCloudData(data) {
  ensureCloudClientReady();

  if (!isValidAppData(data)) {
    throw new Error("当前本地数据结构不合法，无法上传");
  }

  // app_state 被设计为单行正式数据表：存在记录时只更新该行，不额外插入历史副本。
  const existingRow = await getCloudStateRow();

  if (existingRow) {
    const { data: updatedRows, error } = await cloudClient
      .from(CLOUD_TABLE_NAME)
      .update({ data })
      .eq("id", existingRow.id)
      .select("id")
      .limit(1);
    if (error) {
      throw error;
    }
    if (!updatedRows?.length) {
      throw new Error("云端记录存在，但当前账号没有权限更新 app_state");
    }
    return updatedRows[0].id;
  }

  const { data: insertedRows, error } = await cloudClient
    .from(CLOUD_TABLE_NAME)
    .insert({ data })
    .select("id")
    .limit(1);

  if (error) {
    throw error;
  }

  if (!insertedRows?.length) {
    throw new Error("云端未实际写入，请检查当前账号是否允许向 app_state 新增正式数据");
  }

  return insertedRows?.[0]?.id || null;
}

function ensureCloudClientReady() {
  if (!cloudClient) {
    throw new Error("Supabase Publishable Key 未配置，或 SDK 尚未成功初始化。");
  }
}

async function initializeAdminAuth() {
  if (!cloudClient?.auth) {
    console.warn("Supabase Auth 未初始化，后台登录不可用。");
    return;
  }

  try {
    const {
      data: { session },
      error,
    } = await cloudClient.auth.getSession();

    if (error) {
      throw error;
    }

    applyAdminSession(session);

    cloudClient.auth.onAuthStateChange((_event, nextSession) => {
      applyAdminSession(nextSession);
      renderShell();
      renderView();
    });
  } catch (error) {
    console.warn("初始化后台登录状态失败，后台将保持未登录。", error);
  }
}

function applyAdminSession(session) {
  state.authSession = session || null;
  state.adminEmail = session?.user?.email || "";
  state.isAdminAuthenticated = Boolean(session?.user);
}

function shouldPreferCloudOnStartup() {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return false;
  }

  return CLOUD_FIRST_HOSTS.some((host) => window.location.hostname === host);
}

async function hydrateCloudStateOnStartup() {
  try {
    const cloudData = await loadCloudData();
    if (!cloudData) {
      return;
    }

    state.data = clone(cloudData);
    saveLocalData(state.data);
    syncSelections();
    renderShell();
    renderView();
  } catch (error) {
    console.warn("启动时拉取云端正式数据失败，已保留本地数据。", error);
  }
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function syncSelections() {
  const events = state.data.events;
  const firstEvent = events[0] || null;
  const currentEvent = events.find((event) => event.id === state.selectedEventId) || firstEvent;
  state.selectedEventId = currentEvent?.id || null;
  state.adminEventId =
    events.find((event) => event.id === state.adminEventId)?.id || currentEvent?.id || null;

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

function setRoute(route) {
  state.route = route;
  if (route === "groups") {
    ensureEntryWithGroups();
  }
  renderShell();
  renderView();
}

function renderShell() {
  brandName.textContent = state.data.site.brandName;
  systemName.textContent = state.data.site.systemName;
  pageFooter.textContent = state.data.site.footerText;
  topNav.className = state.route === "home" ? "topnav topnav-home" : "topnav";

  const navItems = [
    { id: "home", label: "首页" },
    { id: "schedule", label: "赛事日程" },
    { id: "groups", label: "分组详情" },
    { id: "admin", label: "后台管理" },
  ];

  topNav.innerHTML = navItems
    .map(
      (item) => `
        <button class="nav-pill ${state.route === item.id ? "active" : ""}" data-route="${item.id}">
          ${item.label}
        </button>
      `
    )
    .join("");
}

function renderView() {
  syncSelections();

  if (!state.data.events.length && state.route !== "admin") {
    app.innerHTML = `
      <section class="empty-card">
        <h2>还没有赛事数据</h2>
        <p class="hint">请先进入后台创建赛事，或者恢复默认演示数据。</p>
        <div class="table-actions">
          <button class="cta-button" data-route="admin">进入后台</button>
          <button class="ghost-button" data-admin-action="reset-default-data">恢复默认数据</button>
        </div>
      </section>
    `;
    return;
  }

  switch (state.route) {
    case "schedule":
      app.innerHTML = renderScheduleView();
      break;
    case "groups":
      app.innerHTML = renderGroupsView();
      break;
    case "admin":
      app.innerHTML = renderAdminView();
      break;
    default:
      app.innerHTML = renderHomeView();
      break;
  }
}

function renderHomeView() {
  const total = state.data.events.length;
  const live = state.data.events.filter((event) => event.status === "进行中").length;
  const waiting = state.data.events.filter((event) => event.status === "未开始").length;

  return `
    <section class="hero-card">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(state.data.site.heroEyebrow)}</span>
          <h2 class="hero-title">${escapeHtml(state.data.site.heroTitle)}</h2>
          <p class="hero-desc">${escapeHtml(state.data.site.heroDescription)}</p>
        </div>
        <div class="hero-stat-stack">
          ${renderStatCard(total, "全部赛事")}
          ${renderStatCard(live, "进行中")}
          ${renderStatCard(waiting, "未开始")}
        </div>
      </div>
    </section>

    <section class="section-head home-section-head">
      <div>
        <h2>${escapeHtml(state.data.site.homeSectionTitle)}</h2>
        <p>${escapeHtml(state.data.site.homeSectionDescription)}</p>
      </div>
      <div class="table-actions home-section-actions">
        <button class="ghost-button" data-route="admin">录入后台数据</button>
      </div>
    </section>

    <section class="event-list">
      ${state.data.events.map(renderEventCard).join("")}
    </section>
  `;
}

function renderStatCard(value, label) {
  return `
    <article class="stat-card">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function renderEventCard(event) {
  return `
    <article class="event-card panel">
      <div class="event-meta">
        <h3>${escapeHtml(event.name)} <span class="subtle">${escapeHtml(event.stageLabel || "")}</span></h3>
        <p>${escapeHtml(event.summary || "")}</p>
        <div class="badge-row event-card-badge-row">
          <span class="badge ${statusClass(event.status)}">${escapeHtml(event.status)}</span>
          <span class="badge">${escapeHtml(event.dateRange || "待定")}</span>
          <button class="cta-button event-card-mobile-cta" data-open-event="${event.id}" data-route-target="schedule">查看详情</button>
          <span class="badge event-card-location">${escapeHtml(event.location || "待定场馆")}</span>
        </div>
      </div>
      <div class="toolbar-actions event-card-actions ${state.isAdminAuthenticated ? "has-admin-action" : "no-admin-action"}">
        <button class="cta-button event-card-desktop-cta" data-open-event="${event.id}" data-route-target="schedule">查看详情</button>
        ${
          state.isAdminAuthenticated
            ? `<button class="danger-button" data-remove-event="${event.id}">删除赛事</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderScheduleView() {
  const event = getCurrentEvent();
  const day = getCurrentDay();
  if (!event) {
    return renderMissingState("当前没有可查看的赛事。");
  }

  return `
    <section class="panel">
      <div class="event-header">
        <h2>${escapeHtml(event.name)} <span class="subtle">${escapeHtml(event.stageLabel || "")}</span></h2>
        <p>${escapeHtml(event.description || "")}</p>
      </div>

      <div class="toolbar">
        <div class="chips">
          ${state.data.events
            .map(
              (item) => `
                <button class="chip ${item.id === event.id ? "active" : ""}" data-open-event="${item.id}" data-route-target="schedule">
                  ${escapeHtml(item.name)}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" data-route="home">返回首页</button>
          <button class="cta-button" data-route="admin">进入后台</button>
        </div>
      </div>
    </section>

    <section class="section-head">
      <div>
        <h2>竞赛日程</h2>
        <p>${escapeHtml(event.dateRange || "")}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</p>
      </div>
    </section>

    <section class="selector-bar">
      <div class="toolbar">
        <div class="chips">
          ${(event.days || [])
            .map(
              (item) => `
                <button class="chip ${item.id === day?.id ? "active" : ""}" data-select-day="${item.id}">
                  ${escapeHtml(item.label)} · ${escapeHtml(item.date)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
      <p class="hint">${escapeHtml(day?.note || "请选择比赛日查看详细赛程。")}</p>
    </section>

    <section class="table-card">
      <div class="table-scroll-x">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>比赛时间</th>
              <th>项目名称</th>
              <th>组别</th>
              <th>性别</th>
              <th>赛别</th>
              <th>人数</th>
              <th>组数</th>
              <th>录取规则</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${(day?.entries || []).map(renderScheduleRow).join("") || `
              <tr>
                <td colspan="10">当前比赛日还没有录入赛程。</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      <p class="table-note">说明：后台新增或修改条目后，这里的数据会同步更新。</p>
    </section>
  `;
}

function renderScheduleRow(entry) {
  if (entry.type === "break") {
    return `
      <tr class="timeline-break">
        <td data-label="比赛时间">${escapeHtml(entry.time || "-")}</td>
        <td data-label="项目名称">${escapeHtml(entry.projectName || "休整")}</td>
        <td data-label="组别" colspan="7">${escapeHtml(entry.round || "中场维护")}</td>
        <td data-label="操作"><span class="subtle">无分组</span></td>
      </tr>
    `;
  }

  const rowAction =
    entry.groups?.length
      ? ` class="row-clickable" data-open-entry-row="${entry.id}"`
      : "";

  return `
    <tr${rowAction}>
      <td data-label="比赛时间">${escapeHtml(entry.time || "")}</td>
      <td data-label="项目名称">${escapeHtml(entry.projectName || "")}</td>
      <td data-label="组别">${escapeHtml(entry.division || "")}</td>
      <td data-label="性别">${escapeHtml(entry.gender || "")}</td>
      <td data-label="赛别">${escapeHtml(entry.round || "")}</td>
      <td data-label="人数">${escapeHtml(entry.participantCount || "")}</td>
      <td data-label="组数">${escapeHtml(entry.groupCount || "")}</td>
      <td data-label="录取规则">${escapeHtml(entry.qualification || "")}</td>
      <td data-label="备注">${escapeHtml(entry.note || "")}</td>
      <td data-label="操作">
        ${
          entry.groups?.length
            ? `<button class="tiny-button" data-open-entry="${entry.id}">查看分组</button>`
            : `<span class="subtle">未录入</span>`
        }
      </td>
    </tr>
  `;
}

function renderGroupsView() {
  const event = getCurrentEvent();
  const day = getCurrentDay();
  const entry = getCurrentEntry();

  if (!event || !entry) {
    return renderMissingState("当前项目还没有可查看的分组信息。");
  }

  if (!entry.groups?.length) {
    return `
      <section class="empty-card">
        <h2>这个项目还没有录入分组</h2>
        <p class="hint">你可以去后台给该项目新增分组和运动员名单。</p>
        <div class="table-actions">
          <button class="ghost-button" data-route="schedule">回到赛程</button>
          <button class="cta-button" data-route="admin">进入后台录入</button>
        </div>
      </section>
    `;
  }

  const currentGroup = getCurrentGroup();
  const currentGroupIndex = Math.max(
    0,
    entry.groups.findIndex((group) => group.id === currentGroup?.id)
  );
  const previousGroup = entry.groups[currentGroupIndex - 1] || null;
  const nextGroup = entry.groups[currentGroupIndex + 1] || null;

  return `
    <section class="panel group-desktop-header">
      <div class="group-header">
        <h2>${escapeHtml(event.name)}</h2>
        <p>${escapeHtml(`${entry.division || ""}${entry.gender || ""}${entry.projectName || ""} ${entry.round || ""}`)}</p>
      </div>
      <div class="toolbar">
        <div class="badge-row">
          <span class="badge">${escapeHtml(day?.label || "")}</span>
          <span class="badge">${escapeHtml(day?.date || "")}</span>
          <span class="badge">${escapeHtml(entry.time || "")}</span>
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" data-route="schedule">返回日程</button>
          <button class="cta-button" data-route="admin">编辑分组</button>
        </div>
      </div>
    </section>

    <section class="selector-bar group-desktop-selector">
      <div class="toolbar">
        <div>
          <div class="entry-title">${escapeHtml(currentGroup?.name || "")} / 共 ${entry.groups.length} 组</div>
          <p class="hint">${escapeHtml(currentGroup?.summary || "可在后台补充分组说明。")}</p>
        </div>
        <div class="chips">
          ${entry.groups
            .map(
              (group) => `
                <button class="chip ${group.id === currentGroup?.id ? "active" : ""}" data-select-group="${group.id}">
                  ${escapeHtml(group.name)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="group-mobile-hero">
      <div class="group-mobile-hero-card">
        <p class="group-mobile-hero-kicker">赛事分组</p>
        <h2>${escapeHtml(event.name)}</h2>
        <p>${escapeHtml(`${entry.division || ""}${entry.gender || ""}${entry.projectName || ""} ${entry.round || ""}`)}</p>
      </div>
    </section>

    <section class="group-mobile-switcher">
      <div class="group-mobile-switcher-card">
        <div class="group-mobile-nav">
          <button
            class="group-mobile-nav-button"
            ${previousGroup ? `data-select-group="${previousGroup.id}"` : "disabled"}
            aria-label="上一组"
          >
            ‹
          </button>
          <div class="group-mobile-nav-center">
            <p class="group-mobile-nav-meta">当前第 ${currentGroupIndex + 1} 组 / 共 ${entry.groups.length} 组</p>
            <div class="group-mobile-nav-title">${escapeHtml(currentGroup?.name || "")}</div>
          </div>
          <button
            class="group-mobile-nav-button"
            ${nextGroup ? `data-select-group="${nextGroup.id}"` : "disabled"}
            aria-label="下一组"
          >
            ›
          </button>
        </div>
        <div class="field">
          <label for="group-mobile-select">切换分组</label>
          <select id="group-mobile-select" data-group-select-mobile>
            ${entry.groups
              .map(
                (group) => `
                  <option value="${group.id}" ${group.id === currentGroup?.id ? "selected" : ""}>
                    ${escapeHtml(group.name)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
        <p class="hint">${escapeHtml(currentGroup?.summary || "可在后台补充分组说明。")}</p>
      </div>
    </section>

    <section class="group-mobile-list">
      ${
        currentGroup?.athletes?.length
          ? currentGroup.athletes
              .map(
                (athlete) => `
                  <article class="athlete-mobile-card">
                    <div class="athlete-mobile-rank">
                      <span class="athlete-mobile-rank-label">名次</span>
                      <strong>${escapeHtml(athlete.rank || "-")}</strong>
                    </div>
                    <div class="athlete-mobile-main">
                      <div class="athlete-mobile-head">
                        <span class="athlete-mobile-bib">${escapeHtml(athlete.bib || "-")}</span>
                        <h3>${escapeHtml(athlete.name || "-")}</h3>
                      </div>
                      <p class="athlete-mobile-team">${escapeHtml(athlete.team || "-")}</p>
                      <div class="athlete-mobile-meta">
                        <span class="athlete-mobile-chip">道次 ${escapeHtml(athlete.lane || "-")}</span>
                        <span class="athlete-mobile-chip">成绩 ${escapeHtml(athlete.result || "-")}</span>
                        <span class="athlete-mobile-chip">备注 ${escapeHtml(athlete.note || "-")}</span>
                      </div>
                    </div>
                  </article>
                `
              )
              .join("")
          : `<div class="empty-card"><p class="hint">当前分组还没有录入运动员名单。</p></div>`
      }
    </section>

    <section class="table-card group-desktop-table">
      <div class="table-scroll-x">
        <table class="group-table">
          <thead>
            <tr>
              <th>名次</th>
              <th>道次</th>
              <th>号码</th>
              <th>姓名</th>
              <th>单位</th>
              <th>成绩</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            ${
              currentGroup?.athletes?.length
                ? currentGroup.athletes
                    .map(
                      (athlete) => `
                        <tr>
                          <td data-label="名次">${escapeHtml(athlete.rank || "")}</td>
                          <td data-label="道次">${escapeHtml(athlete.lane || "")}</td>
                          <td data-label="号码">${escapeHtml(athlete.bib || "")}</td>
                          <td data-label="姓名">${escapeHtml(athlete.name || "")}</td>
                          <td data-label="单位">${escapeHtml(athlete.team || "")}</td>
                          <td data-label="成绩">${escapeHtml(athlete.result || "")}</td>
                          <td data-label="备注">${escapeHtml(athlete.note || "")}</td>
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="7">当前分组还没有录入运动员名单。</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAdminView() {
  if (!state.isAdminAuthenticated) {
    return renderAdminLoginView();
  }

  const adminEvent = getAdminEvent();
  const adminDay = getAdminDay();
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();

  return `
    <section class="admin-card">
      <div class="admin-head">
        <h2>${escapeHtml(state.data.site.adminTitle)}</h2>
        <p>${escapeHtml(state.data.site.adminDescription)}</p>
      </div>

      <div class="selector-bar">
        <div class="toolbar">
          <div class="selector-grid">
            <div class="field">
              <label for="admin-event-select">当前赛事</label>
              <select id="admin-event-select" class="inline-select" data-admin-select="event">
                ${state.data.events
                  .map(
                    (event) => `
                      <option value="${event.id}" ${event.id === adminEvent?.id ? "selected" : ""}>
                        ${escapeHtml(event.name)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="admin-day-select">当前比赛日</label>
              <select id="admin-day-select" class="inline-select" data-admin-select="day">
                ${(adminEvent?.days || [])
                  .map(
                    (day) => `
                      <option value="${day.id}" ${day.id === adminDay?.id ? "selected" : ""}>
                        ${escapeHtml(day.label)} · ${escapeHtml(day.date)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="admin-entry-select">当前赛程条目</label>
              <select id="admin-entry-select" class="inline-select" data-admin-select="entry">
                ${(adminDay?.entries || [])
                  .map(
                    (entry) => `
                      <option value="${entry.id}" ${entry.id === adminEntry?.id ? "selected" : ""}>
                        ${escapeHtml(entry.time || "--")} · ${escapeHtml(entry.projectName || "未命名项目")}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="admin-group-select">当前分组</label>
              <select id="admin-group-select" class="inline-select" data-admin-select="group">
                ${(adminEntry?.groups || [])
                  .map(
                    (group) => `
                      <option value="${group.id}" ${group.id === adminGroup?.id ? "selected" : ""}>
                        ${escapeHtml(group.name)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
          </div>
          <div class="selector-actions">
            <button class="tiny-button" data-admin-action="add-event">新增赛事</button>
            <button class="tiny-button" data-admin-action="add-day">新增比赛日</button>
            <button class="tiny-button" data-admin-action="add-entry">新增赛程</button>
            <button class="tiny-button" data-admin-action="add-group">新增分组</button>
          </div>
        </div>
        <div class="selector-actions">
          <span class="badge">已自动保存到本地</span>
          <button class="ghost-button" data-admin-action="download-cloud">从云端拉取</button>
          <button class="cta-button" data-admin-action="upload-cloud">上传到云端</button>
          <button class="danger-button" data-admin-action="reset-default-data">恢复默认演示数据</button>
        </div>
        <div class="selector-actions">
          <button class="ghost-button" data-admin-action="export-json">导出 JSON</button>
          <button class="ghost-button" data-admin-action="import-json">导入 JSON</button>
        </div>
        <p class="hint">
          本地模式用于日常录入与调试，字段修改后只会保存到当前浏览器；只有手动点击“上传到云端”，才会覆盖 Supabase 中的正式数据。
          GitHub Pages 正式站点打开时会自动优先读取云端正式数据，并同步刷新站点本地缓存。
          ${
            cloudClient
              ? ""
              : " 当前 Supabase Publishable Key 仍是占位值，云端拉取/上传按钮在替换真实 key 前无法成功执行。"
          }
        </p>
      </div>

      <section class="admin-section">
        <div class="toolbar">
          <div>
            <h3>赛程条目</h3>
            <p>这里管理具体项目、时间、人数、分组数量、录取规则，以及是否属于浇冰等间隔条目。</p>
          </div>
          ${
            adminEntry
              ? `<div class="field-actions"><button class="danger-button" data-admin-action="remove-entry">删除当前赛程</button></div>`
              : ""
          }
        </div>
        ${
          adminEntry && adminEvent && adminDay
            ? `
              <div class="field-grid-3">
                ${renderField(
                  "时间",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].time`,
                  adminEntry.time
                )}
                ${renderField(
                  "项目名称",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].projectName`,
                  adminEntry.projectName
                )}
                ${renderField(
                  "条目类型",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].type`,
                  adminEntry.type,
                  "entryType"
                )}
                ${renderField(
                  "组别",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].division`,
                  adminEntry.division
                )}
                ${renderField(
                  "性别",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].gender`,
                  adminEntry.gender
                )}
                ${renderField(
                  "赛别",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].round`,
                  adminEntry.round
                )}
                ${renderField(
                  "人数",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].participantCount`,
                  adminEntry.participantCount
                )}
                ${renderField(
                  "组数",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].groupCount`,
                  adminEntry.groupCount
                )}
                ${renderField(
                  "录取规则",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].qualification`,
                  adminEntry.qualification
                )}
              </div>
              <div class="form-grid">
                ${renderTextarea(
                  "备注",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].note`,
                  adminEntry.note
                )}
              </div>
            `
            : renderHintCard("当前比赛日还没有赛程，请点击“新增赛程”。")
        }
      </section>

      <section class="admin-section">
        <div class="toolbar">
          <div>
            <h3>分组与运动员</h3>
            <p>分组名称、摘要和名单可直接维护，前台“分组详情”页会实时展示。</p>
          </div>
          ${
            adminGroup
              ? `<div class="field-actions"><button class="danger-button" data-admin-action="remove-group">删除当前分组</button></div>`
              : ""
          }
        </div>
        ${
          adminGroup && adminEntry && adminEvent && adminDay
            ? `
              <div class="form-grid">
                ${renderField(
                  "分组名称",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].groups[${findGroupIndex(adminEntry, adminGroup.id)}].name`,
                  adminGroup.name
                )}
                ${renderField(
                  "分组摘要",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].groups[${findGroupIndex(adminEntry, adminGroup.id)}].summary`,
                  adminGroup.summary
                )}
              </div>
              <div class="toolbar">
                <div>
                  <h3>运动员名单</h3>
                  <p>当前分组共 ${adminGroup.athletes.length} 名运动员。</p>
                </div>
                <div class="field-actions">
                  <button class="ghost-button" data-admin-action="sort-athletes-by-rank">按名次排序</button>
                  <button class="tiny-button" data-admin-action="add-athlete">新增运动员</button>
                </div>
              </div>
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>名次</th>
                    <th>道次</th>
                    <th>号码</th>
                    <th>姓名</th>
                    <th>单位</th>
                    <th>成绩</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    adminGroup.athletes.length
                      ? adminGroup.athletes
                          .map((athlete, athleteIndex) =>
                            renderAthleteRow(
                              athlete,
                              athleteIndex,
                              findEventIndex(adminEvent.id),
                              findDayIndex(adminEvent, adminDay.id),
                              findEntryIndex(adminDay, adminEntry.id),
                              findGroupIndex(adminEntry, adminGroup.id)
                            )
                          )
                          .join("")
                      : `<tr><td colspan="8">当前分组还没有运动员名单，点击右上角新增即可。</td></tr>`
                  }
                </tbody>
              </table>
            `
            : renderHintCard("当前赛程还没有分组，请点击“新增分组”。")
        }
      </section>

      <section class="admin-section">
        <div class="toolbar">
          <div>
            <h3>赛事基础信息</h3>
            <p>赛事名称、状态、场馆、说明等字段，会同步展示在首页和赛事详情页。</p>
          </div>
          ${
            adminEvent
              ? `<div class="field-actions"><button class="danger-button" data-admin-action="remove-event">删除当前赛事</button></div>`
              : ""
          }
        </div>
        ${
          adminEvent
            ? `
              <div class="form-grid">
                ${renderField("赛事名称", `events[${findEventIndex(adminEvent.id)}].name`, adminEvent.name)}
                ${renderField("阶段标签", `events[${findEventIndex(adminEvent.id)}].stageLabel`, adminEvent.stageLabel)}
                ${renderField("赛事状态", `events[${findEventIndex(adminEvent.id)}].status`, adminEvent.status, "status")}
                ${renderField("比赛时间", `events[${findEventIndex(adminEvent.id)}].dateRange`, adminEvent.dateRange)}
                ${renderField("比赛场馆", `events[${findEventIndex(adminEvent.id)}].location`, adminEvent.location)}
                ${renderField("首页摘要", `events[${findEventIndex(adminEvent.id)}].summary`, adminEvent.summary)}
              </div>
              ${renderTextarea(
                "赛事详情说明",
                `events[${findEventIndex(adminEvent.id)}].description`,
                adminEvent.description
              )}
            `
            : renderHintCard("请先新增一个赛事。")
        }
      </section>

      <section class="admin-section">
        <div class="toolbar">
          <div>
            <h3>比赛日设置</h3>
            <p>用来维护“第几天 / 日期 / 当日备注”等信息。</p>
          </div>
          ${
            adminDay
              ? `<div class="field-actions"><button class="danger-button" data-admin-action="remove-day">删除当前比赛日</button></div>`
              : ""
          }
        </div>
        ${
          adminDay && adminEvent
            ? `
              <div class="form-grid">
                ${renderField(
                  "比赛日名称",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].label`,
                  adminDay.label
                )}
                ${renderField(
                  "日期",
                  `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].date`,
                  adminDay.date
                )}
              </div>
              ${renderTextarea(
                "比赛日备注",
                `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].note`,
                adminDay.note
              )}
            `
            : renderHintCard("当前赛事还没有比赛日，请点击“新增比赛日”。")
        }
      </section>

      <section class="admin-section">
        <h3>站点文案</h3>
        <p>首页标题、说明文案、后台标题和页脚文案都可以在这里直接修改。</p>
        <div class="form-grid">
          ${renderField("品牌名称", "site.brandName", state.data.site.brandName)}
          ${renderField("系统名称", "site.systemName", state.data.site.systemName)}
          ${renderField("首页标签", "site.heroEyebrow", state.data.site.heroEyebrow)}
          ${renderField("首页区块标题", "site.homeSectionTitle", state.data.site.homeSectionTitle)}
        </div>
        <div class="admin-section">
          ${renderTextarea("首页主标题", "site.heroTitle", state.data.site.heroTitle)}
          ${renderTextarea("首页介绍", "site.heroDescription", state.data.site.heroDescription)}
          ${renderTextarea("赛事列表说明", "site.homeSectionDescription", state.data.site.homeSectionDescription)}
          ${renderTextarea("后台标题", "site.adminTitle", state.data.site.adminTitle)}
          ${renderTextarea("后台说明", "site.adminDescription", state.data.site.adminDescription)}
          ${renderTextarea("页脚文案", "site.footerText", state.data.site.footerText)}
        </div>
      </section>

      <section class="admin-section">
        <div class="toolbar">
          <div>
            <h3>账户安全</h3>
            <p>后台改为使用 Supabase Auth 统一登录。只有云端管理员账号登录成功后，才能执行后台编辑与云端发布。</p>
          </div>
          <div class="field-actions">
            <button class="ghost-button" data-auth-action="logout-admin">退出登录</button>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>管理员邮箱</label>
            <input value="${escapeAttribute(state.adminEmail || "未登录")}" readonly />
          </div>
          <div class="field">
            <label>登录状态</label>
            <input value="已登录" readonly />
          </div>
        </div>
        <div class="field-grid-3">
          <div class="field">
            <label for="old-password">旧密码</label>
            <input id="old-password" type="password" placeholder="请输入旧密码" />
          </div>
          <div class="field">
            <label for="new-password">新密码</label>
            <input id="new-password" type="password" placeholder="请输入新密码" />
          </div>
          <div class="field">
            <label for="confirm-password">确认新密码</label>
            <input id="confirm-password" type="password" placeholder="请再次输入新密码" />
          </div>
        </div>
        <div class="field-actions">
          <button class="cta-button" data-auth-action="change-password">修改密码</button>
        </div>
        <p class="hint">密码修改会写入 Supabase Auth，所有设备下次登录都会同步生效。旧密码会先进行云端校验，然后才允许改成新密码。</p>
      </section>
    </section>
  `;
}

function renderAdminLoginView() {
  return `
    <section class="admin-card">
      <div class="admin-head">
        <h2>后台登录</h2>
        <p>请输入 Supabase Auth 中已创建的管理员邮箱和密码，验证通过后才可访问后台录入与编辑功能。</p>
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="login-email">管理员邮箱</label>
          <input id="login-email" type="email" placeholder="请输入管理员邮箱" autocomplete="username" />
        </div>
        <div class="field">
          <label for="login-password">管理员密码</label>
          <input id="login-password" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </div>
      </div>
      <div class="field-actions">
        <button class="cta-button" data-auth-action="login-admin">登录后台</button>
        <button class="ghost-button" data-route="home">返回首页</button>
      </div>
      <p class="hint">请先在 Supabase 控制台的 Auth 用户列表中创建管理员账号。登录后可在“账户安全”中修改密码。</p>
    </section>
  `;
}

function renderAthleteRow(athlete, athleteIndex, eventIndex, dayIndex, entryIndex, groupIndex) {
  const basePath = `events[${eventIndex}].days[${dayIndex}].entries[${entryIndex}].groups[${groupIndex}].athletes[${athleteIndex}]`;
  const promotePanelHtml = renderPromotePanelRow(athleteIndex);
  const actionMenuHtml = renderAthleteActionMenu(athleteIndex);
  return `
    <tr>
      <td data-label="名次"><input value="${escapeAttribute(athlete.rank || "")}" readonly placeholder="自动计算" /></td>
      <td data-label="道次"><input data-model="${basePath}.lane" value="${escapeAttribute(athlete.lane || "")}" /></td>
      <td data-label="号码"><input data-model="${basePath}.bib" value="${escapeAttribute(athlete.bib || "")}" /></td>
      <td data-label="姓名"><input data-model="${basePath}.name" value="${escapeAttribute(athlete.name || "")}" /></td>
      <td data-label="单位"><input data-model="${basePath}.team" value="${escapeAttribute(athlete.team || "")}" /></td>
      <td data-label="成绩"><input data-model="${basePath}.result" value="${escapeAttribute(athlete.result || "")}" /></td>
      <td data-label="备注"><input data-model="${basePath}.note" value="${escapeAttribute(athlete.note || "")}" /></td>
      <td data-label="操作">
        <div class="athlete-action-wrap" data-athlete-menu-container>
          <button
            class="tiny-button athlete-action-toggle"
            type="button"
            aria-label="更多操作"
            data-athlete-menu-toggle
            data-athlete-index="${athleteIndex}"
          >
            ⋯
          </button>
          ${actionMenuHtml}
        </div>
      </td>
    </tr>
    ${promotePanelHtml}
  `;
}

function renderAthleteActionMenu(athleteIndex) {
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();
  const menu = state.athleteActionMenu;

  if (
    !menu.isOpen ||
    menu.athleteIndex !== athleteIndex ||
    menu.sourceEntryId !== adminEntry?.id ||
    menu.sourceGroupId !== adminGroup?.id
  ) {
    return "";
  }

  return `
    <div class="athlete-action-menu">
      <button class="athlete-action-item" type="button" data-admin-action="promote-athlete" data-athlete-index="${athleteIndex}">
        晋级到
      </button>
      <button class="athlete-action-item danger" type="button" data-admin-action="remove-athlete" data-athlete-index="${athleteIndex}">
        删除
      </button>
    </div>
  `;
}

function renderPromotePanelRow(athleteIndex) {
  const adminDay = getAdminDay();
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();
  const panel = state.promotePanel;

  if (
    !panel.isOpen ||
    panel.athleteIndex !== athleteIndex ||
    panel.sourceEntryId !== adminEntry?.id ||
    panel.sourceGroupId !== adminGroup?.id ||
    !adminDay
  ) {
    return "";
  }

  const entryOptions = adminDay.entries || [];
  const targetEntry = entryOptions.find((entry) => entry.id === panel.targetEntryId) || null;
  const groupOptions = getAvailablePromoteGroups(targetEntry, adminEntry, adminGroup);
  const hasGroups = groupOptions.length > 0;
  const selectedTargetGroupId = hasGroups ? panel.targetGroupId : "";
  const isSameGroup = panel.targetEntryId === adminEntry?.id && selectedTargetGroupId === adminGroup?.id;
  const canConfirm = Boolean(panel.targetEntryId && selectedTargetGroupId && hasGroups && !isSameGroup);

  return `
    <tr class="promote-panel-row">
      <td colspan="8">
        <div class="empty-card">
          <div class="field-grid-3">
            <div class="field">
              <label>目标赛程</label>
              <select data-promote-select="entry">
                <option value="">请选择目标赛程</option>
                ${entryOptions
                  .map(
                    (entry) => `
                      <option value="${escapeAttribute(entry.id)}" ${panel.targetEntryId === entry.id ? "selected" : ""}>
                        ${escapeHtml(`${entry.time || "待定"} · ${entry.projectName || "未命名项目"} · ${entry.round || "未定赛别"}`)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label>目标分组</label>
              <select data-promote-select="group" ${hasGroups ? "" : "disabled"}>
                <option value="">${hasGroups ? "请选择目标分组" : "目标赛程还没有分组"}</option>
                ${groupOptions
                  .map(
                    (group) => `
                      <option value="${escapeAttribute(group.id)}" ${selectedTargetGroupId === group.id ? "selected" : ""}>
                        ${escapeHtml(group.name || "未命名分组")}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label>操作</label>
              <div class="field-actions">
                <button class="cta-button" data-admin-action="confirm-promote-athlete" ${canConfirm ? "" : "disabled"}>确认晋级</button>
                <button class="ghost-button" data-admin-action="cancel-promote-athlete">取消</button>
              </div>
            </div>
          </div>
          ${
            !panel.targetEntryId
              ? '<p class="hint">请选择目标赛程和目标分组后再确认晋级。</p>'
              : !hasGroups
                ? '<p class="hint">当前目标赛程没有可晋级的分组。</p>'
                : isSameGroup
                  ? '<p class="hint">不能晋级到当前同一个分组，请选择其他分组。</p>'
                  : '<p class="hint">晋级会复制当前运动员的号码、姓名和单位，并清空道次、成绩、名次与备注。</p>'
          }
        </div>
      </td>
    </tr>
  `;
}

function renderField(label, path, value, type = "text") {
  if (type === "status") {
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <select data-model="${path}">
          ${["进行中", "未开始", "已结束"]
            .map(
              (item) => `
                <option value="${item}" ${value === item ? "selected" : ""}>${item}</option>
              `
            )
            .join("")}
        </select>
      </div>
    `;
  }

  if (type === "entryType") {
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <select data-model="${path}">
          ${["race", "break"]
            .map(
              (item) => `
                <option value="${item}" ${value === item ? "selected" : ""}>${item}</option>
              `
            )
            .join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input data-model="${path}" value="${escapeAttribute(value || "")}" />
    </div>
  `;
}

function renderTextarea(label, path, value) {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <textarea data-model="${path}">${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

function renderHintCard(text) {
  return `<div class="empty-card"><p class="hint">${escapeHtml(text)}</p></div>`;
}

function renderMissingState(text) {
  return `
    <section class="empty-card">
      <h2>暂无内容</h2>
      <p class="hint">${escapeHtml(text)}</p>
      <div class="table-actions">
        <button class="ghost-button" data-route="home">返回首页</button>
        <button class="cta-button" data-route="admin">进入后台</button>
      </div>
    </section>
  `;
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
}

function handleClick(event) {
  const actionMenuToggle = event.target.closest("[data-athlete-menu-toggle]");
  if (actionMenuToggle) {
    toggleAthleteActionMenu(Number(actionMenuToggle.dataset.athleteIndex));
    return;
  }

  const openEntryRow = event.target.closest("[data-open-entry-row]");
  if (openEntryRow && window.matchMedia("(max-width: 720px)").matches) {
    state.selectedEntryId = openEntryRow.dataset.openEntryRow;
    ensureEntryWithGroups();
    setRoute("groups");
    return;
  }

  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    setRoute(routeTarget.dataset.route);
    return;
  }

  const openEventButton = event.target.closest("[data-open-event]");
  if (openEventButton) {
    state.selectedEventId = openEventButton.dataset.openEvent;
    syncSelections();
    const nextRoute = openEventButton.dataset.routeTarget || "schedule";
    setRoute(nextRoute);
    return;
  }

  const removeEventButton = event.target.closest("[data-remove-event]");
  if (removeEventButton) {
    if (!ensureAdminAuthenticated()) {
      return;
    }

    const eventId = removeEventButton.dataset.removeEvent;
    const eventItem = state.data.events.find((item) => item.id === eventId);
    if (!eventItem) return;

    const confirmed = window.confirm(`确认删除赛事“${eventItem.name}”吗？此操作会同时删除它的赛程和分组数据。`);
    if (!confirmed) return;

    removeEventById(eventId);
    return;
  }

  const selectDayButton = event.target.closest("[data-select-day]");
  if (selectDayButton) {
    state.selectedDayId = selectDayButton.dataset.selectDay;
    syncSelections();
    renderView();
    return;
  }

  const openEntryButton = event.target.closest("[data-open-entry]");
  if (openEntryButton) {
    state.selectedEntryId = openEntryButton.dataset.openEntry;
    ensureEntryWithGroups();
    setRoute("groups");
    return;
  }

  const selectGroupButton = event.target.closest("[data-select-group]");
  if (selectGroupButton) {
    state.selectedGroupId = selectGroupButton.dataset.selectGroup;
    syncSelections();
    renderView();
    return;
  }

  const adminAction = event.target.closest("[data-admin-action]");
  if (adminAction) {
    runAdminAction(adminAction.dataset.adminAction, adminAction.dataset);
    return;
  }

  const authAction = event.target.closest("[data-auth-action]");
  if (authAction) {
    runAuthAction(authAction.dataset.authAction);
    return;
  }

  if (
    state.athleteActionMenu.isOpen &&
    !event.target.closest("[data-athlete-menu-container]")
  ) {
    closeAthleteActionMenu();
    renderView();
  }
}

function handleChange(event) {
  const modelField = event.target.closest("[data-model]");
  if (modelField) {
    setByPath(state.data, modelField.dataset.model, modelField.value);
    const targetGroup = getGroupFromAthleteModelPath(modelField.dataset.model);
    if (targetGroup) {
      recalculateGroupRanks(targetGroup);
    }
    // 字段修改后仅自动写入本地，不自动上传云端。
    saveLocalData(state.data);
    renderShell();
    renderView();
    return;
  }

  const adminSelect = event.target.closest("[data-admin-select]");
  if (adminSelect) {
    if (adminSelect.dataset.adminSelect === "event") {
      state.adminEventId = adminSelect.value;
    }
    if (adminSelect.dataset.adminSelect === "day") {
      state.adminDayId = adminSelect.value;
    }
    if (adminSelect.dataset.adminSelect === "entry") {
      state.adminEntryId = adminSelect.value;
    }
    if (adminSelect.dataset.adminSelect === "group") {
      state.adminGroupId = adminSelect.value;
    }
    syncSelections();
    renderView();
    return;
  }

  const mobileGroupSelect = event.target.closest("[data-group-select-mobile]");
  if (mobileGroupSelect) {
    state.selectedGroupId = mobileGroupSelect.value;
    syncSelections();
    renderView();
    return;
  }

  const promoteSelect = event.target.closest("[data-promote-select]");
  if (promoteSelect) {
    if (promoteSelect.dataset.promoteSelect === "entry") {
      const nextEntryId = promoteSelect.value;
      state.promotePanel.targetEntryId = nextEntryId;
      const adminDay = getAdminDay();
      const targetEntry = adminDay?.entries.find((entry) => entry.id === nextEntryId) || null;
      state.promotePanel.targetGroupId = targetEntry?.groups?.[0]?.id || "";
    }

    if (promoteSelect.dataset.promoteSelect === "group") {
      state.promotePanel.targetGroupId = promoteSelect.value;
    }

    syncPromotePanelState();
    renderView();
  }
}

function runAdminAction(action, dataset = {}) {
  switch (action) {
    case "add-event":
      addEvent();
      break;
    case "remove-event":
      removeEvent();
      break;
    case "add-day":
      addDay();
      break;
    case "remove-day":
      removeDay();
      break;
    case "add-entry":
      addEntry();
      break;
    case "remove-entry":
      removeEntry();
      break;
    case "add-group":
      addGroup();
      break;
    case "remove-group":
      removeGroup();
      break;
    case "add-athlete":
      addAthlete();
      break;
    case "sort-athletes-by-rank":
      sortCurrentGroupAthletesByRank();
      break;
    case "promote-athlete":
      promoteAthlete(Number(dataset.athleteIndex));
      break;
    case "confirm-promote-athlete":
      confirmPromoteAthlete();
      break;
    case "cancel-promote-athlete":
      closePromotePanel();
      renderView();
      break;
    case "remove-athlete":
      removeAthlete(Number(dataset.athleteIndex));
      break;
    case "export-json":
      exportJson();
      break;
    case "import-json":
      importJson();
      break;
    case "download-cloud":
      downloadFromCloud();
      break;
    case "upload-cloud":
      uploadToCloud();
      break;
    case "reset-default-data":
      resetToDefaultData();
      break;
    default:
      break;
  }
}

function runAuthAction(action) {
  switch (action) {
    case "login-admin":
      loginAdmin();
      break;
    case "logout-admin":
      logoutAdmin();
      break;
    case "change-password":
      changePassword();
      break;
    default:
      break;
  }
}

function addEvent() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const nextEvent = {
    id: uid("event"),
    name: "新建赛事",
    stageLabel: "待完善",
    status: "未开始",
    dateRange: "待定",
    location: "待定场馆",
    summary: "请在后台补充赛事摘要。",
    description: "请在后台补充赛事说明。",
    days: [
      {
        id: uid("day"),
        label: "第 1 天",
        date: "待定",
        note: "请补充比赛日说明。",
        entries: [],
      },
    ],
  };
  state.data.events.push(nextEvent);
  state.adminEventId = nextEvent.id;
  state.selectedEventId = nextEvent.id;
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function removeEvent() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  if (!state.adminEventId || !state.data.events.length) return;
  removeEventById(state.adminEventId);
}

function addDay() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  if (!event) return;
  const nextDay = {
    id: uid("day"),
    label: `第 ${event.days.length + 1} 天`,
    date: "待定",
    note: "请补充比赛日说明。",
    entries: [],
  };
  event.days.push(nextDay);
  state.adminDayId = nextDay.id;
  if (event.id === state.selectedEventId) {
    state.selectedDayId = nextDay.id;
  }
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function removeDay() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  if (!event || !state.adminDayId) return;
  event.days = event.days.filter((day) => day.id !== state.adminDayId);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addEntry() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const day = getAdminDay();
  if (!day) return;
  const nextEntry = {
    id: uid("entry"),
    time: "09:00",
    projectName: "新项目",
    division: "待定组别",
    gender: "待定",
    round: "预赛",
    participantCount: "0",
    groupCount: "0",
    qualification: "待定",
    note: "",
    type: "race",
    groups: [],
  };
  day.entries.push(nextEntry);
  state.adminEntryId = nextEntry.id;
  if (day.id === state.selectedDayId) {
    state.selectedEntryId = nextEntry.id;
  }
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function removeEntry() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const day = getAdminDay();
  if (!day || !state.adminEntryId) return;
  day.entries = day.entries.filter((entry) => entry.id !== state.adminEntryId);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addGroup() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const entry = getAdminEntry();
  if (!entry) return;
  const nextGroup = {
    id: uid("group"),
    name: `第${entry.groups.length + 1}组`,
    summary: "请补充分组说明。",
    athletes: [],
  };
  entry.groups.push(nextGroup);
  entry.groupCount = String(entry.groups.length);
  state.adminGroupId = nextGroup.id;
  if (entry.id === state.selectedEntryId) {
    state.selectedGroupId = nextGroup.id;
  }
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function removeGroup() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const entry = getAdminEntry();
  if (!entry || !state.adminGroupId) return;
  entry.groups = entry.groups.filter((group) => group.id !== state.adminGroupId);
  entry.groupCount = String(entry.groups.length);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addAthlete() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const group = getAdminGroup();
  if (!group) return;
  group.athletes.push({
    rank: "",
    lane: "",
    bib: "",
    name: "新运动员",
    team: "",
    result: "",
    note: "",
  });
  recalculateGroupRanks(group);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function sortCurrentGroupAthletesByRank() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const group = getAdminGroup();
  if (!group?.athletes?.length) return;

  recalculateGroupRanks(group);

  const parseRankValue = (value) => {
    if (value == null || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  group.athletes = group.athletes
    .map((athlete, originalIndex) => ({
      athlete,
      originalIndex,
      rankValue: parseRankValue(athlete.rank),
      timeValue: parseCompetitionTime(athlete.result),
    }))
    .sort((left, right) => {
      const leftHasRank = left.rankValue != null;
      const rightHasRank = right.rankValue != null;

      if (leftHasRank && !rightHasRank) return -1;
      if (!leftHasRank && rightHasRank) return 1;

      if (leftHasRank && rightHasRank && left.rankValue !== right.rankValue) {
        return left.rankValue - right.rankValue;
      }

      const leftHasTime = left.timeValue != null;
      const rightHasTime = right.timeValue != null;

      if (leftHasTime && rightHasTime && left.timeValue !== right.timeValue) {
        return left.timeValue - right.timeValue;
      }

      if (leftHasTime && !rightHasTime) return -1;
      if (!leftHasTime && rightHasTime) return 1;

      return left.originalIndex - right.originalIndex;
    })
    .map((item) => item.athlete);

  closeAthleteActionMenu();
  closePromotePanel();
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function promoteAthlete(athleteIndex) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const day = getAdminDay();
  const sourceEntry = getAdminEntry();
  const sourceGroup = getAdminGroup();

  if (!day || !sourceEntry || !sourceGroup) {
    window.alert("请先在后台选中当前比赛日、赛程和分组。");
    return;
  }

  if (Number.isNaN(athleteIndex) || !sourceGroup.athletes?.[athleteIndex]) {
    window.alert("未找到要晋级的运动员。");
    return;
  }

  if (!day.entries?.length) {
    window.alert("当前比赛日还没有可晋级的目标赛程。");
    return;
  }

  closeAthleteActionMenu();

  if (
    state.promotePanel.isOpen &&
    state.promotePanel.athleteIndex === athleteIndex &&
    state.promotePanel.sourceEntryId === sourceEntry.id &&
    state.promotePanel.sourceGroupId === sourceGroup.id
  ) {
    closePromotePanel();
    renderView();
    return;
  }

  openPromotePanel(athleteIndex, sourceEntry, sourceGroup, day);
  renderView();
}

function openPromotePanel(athleteIndex, sourceEntry, sourceGroup, day) {
  const defaultTargetEntry =
    day.entries.find((entry) => entry.id !== sourceEntry.id && entry.groups?.length) ||
    day.entries.find((entry) => entry.id !== sourceEntry.id) ||
    day.entries[0] ||
    null;

  state.promotePanel = {
    athleteIndex,
    sourceEntryId: sourceEntry.id,
    sourceGroupId: sourceGroup.id,
    targetEntryId: defaultTargetEntry?.id || "",
    targetGroupId: defaultTargetEntry?.groups?.[0]?.id || "",
    isOpen: true,
  };

  syncPromotePanelState();
}

function closePromotePanel() {
  state.promotePanel = {
    athleteIndex: null,
    sourceEntryId: null,
    sourceGroupId: null,
    targetEntryId: "",
    targetGroupId: "",
    isOpen: false,
  };
}

function toggleAthleteActionMenu(athleteIndex) {
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();

  if (!adminEntry || !adminGroup || Number.isNaN(athleteIndex)) {
    return;
  }

  const isSameMenu =
    state.athleteActionMenu.isOpen &&
    state.athleteActionMenu.athleteIndex === athleteIndex &&
    state.athleteActionMenu.sourceEntryId === adminEntry.id &&
    state.athleteActionMenu.sourceGroupId === adminGroup.id;

  if (isSameMenu) {
    closeAthleteActionMenu();
  } else {
    state.athleteActionMenu = {
      athleteIndex,
      sourceEntryId: adminEntry.id,
      sourceGroupId: adminGroup.id,
      isOpen: true,
    };
  }

  renderView();
}

function closeAthleteActionMenu() {
  state.athleteActionMenu = {
    athleteIndex: null,
    sourceEntryId: null,
    sourceGroupId: null,
    isOpen: false,
  };
}

function syncAthleteActionMenuState() {
  const menu = state.athleteActionMenu;
  if (!menu?.isOpen) {
    return;
  }

  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();

  if (!adminEntry || !adminGroup) {
    closeAthleteActionMenu();
    return;
  }

  if (menu.sourceEntryId !== adminEntry.id || menu.sourceGroupId !== adminGroup.id) {
    closeAthleteActionMenu();
    return;
  }

  if (!adminGroup.athletes?.[menu.athleteIndex]) {
    closeAthleteActionMenu();
  }
}

function syncPromotePanelState() {
  const panel = state.promotePanel;
  if (!panel?.isOpen) {
    return;
  }

  const adminDay = getAdminDay();
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();

  if (!adminDay || !adminEntry || !adminGroup) {
    closePromotePanel();
    return;
  }

  if (panel.sourceEntryId !== adminEntry.id || panel.sourceGroupId !== adminGroup.id) {
    closePromotePanel();
    return;
  }

  if (!adminGroup.athletes?.[panel.athleteIndex]) {
    closePromotePanel();
    return;
  }

  const targetEntry = adminDay.entries.find((entry) => entry.id === panel.targetEntryId) || null;
  if (!targetEntry) {
    panel.targetEntryId = adminDay.entries[0]?.id || "";
  }

  const normalizedTargetEntry = adminDay.entries.find((entry) => entry.id === panel.targetEntryId) || null;
  const targetGroups = getAvailablePromoteGroups(normalizedTargetEntry, adminEntry, adminGroup);
  if (!targetGroups.length) {
    panel.targetGroupId = "";
    return;
  }

  const targetGroup = targetGroups.find((group) => group.id === panel.targetGroupId) || targetGroups[0] || null;
  panel.targetGroupId = targetGroup?.id || "";
}

function getAvailablePromoteGroups(targetEntry, sourceEntry, sourceGroup) {
  if (!targetEntry?.groups?.length) {
    return [];
  }

  return targetEntry.groups.filter((group) => {
    if (targetEntry.id !== sourceEntry?.id) {
      return true;
    }

    return group.id !== sourceGroup?.id;
  });
}

function confirmPromoteAthlete() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const panel = state.promotePanel;
  const day = getAdminDay();
  const sourceEntry = getAdminEntry();
  const sourceGroup = getAdminGroup();

  if (!panel?.isOpen || !day || !sourceEntry || !sourceGroup) {
    window.alert("当前没有可确认的晋级操作。");
    return;
  }

  const sourceAthlete = sourceGroup.athletes?.[panel.athleteIndex];
  if (!sourceAthlete) {
    closePromotePanel();
    renderView();
    window.alert("未找到要晋级的运动员。");
    return;
  }

  const targetEntry = day.entries.find((entry) => entry.id === panel.targetEntryId) || null;
  if (!targetEntry) {
    window.alert("请选择有效的目标赛程。");
    return;
  }

  const targetGroup = targetEntry.groups?.find((group) => group.id === panel.targetGroupId) || null;
  if (!targetGroup) {
    window.alert("目标赛程还没有分组。");
    return;
  }

  if (targetEntry.id === sourceEntry.id && targetGroup.id === sourceGroup.id) {
    window.alert("不能晋级到当前同一个分组。");
    return;
  }

  const sourceBib = String(sourceAthlete.bib || "").trim();
  const sourceName = String(sourceAthlete.name || "").trim();
  const duplicateAthlete = targetGroup.athletes?.find((athlete) => {
    const targetBib = String(athlete.bib || "").trim();
    const targetName = String(athlete.name || "").trim();
    const sameBib = sourceBib && targetBib && sourceBib === targetBib;
    const sameName = sourceName && targetName && sourceName === targetName;
    return sameBib || sameName;
  });

  if (duplicateAthlete) {
    window.alert("目标分组里已存在同号码或同姓名的运动员，不能重复添加。");
    return;
  }

  targetGroup.athletes.push({
    rank: "",
    lane: "",
    bib: sourceAthlete.bib || "",
    name: sourceAthlete.name || "",
    team: sourceAthlete.team || "",
    result: "",
    note: "",
  });

  recalculateGroupRanks(targetGroup);
  closeAthleteActionMenu();
  closePromotePanel();
  saveLocalData(state.data);
  syncSelections();
  renderView();
  window.alert("晋级成功");
}

function removeAthlete(index) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const group = getAdminGroup();
  if (!group || Number.isNaN(index)) return;
  const athlete = group.athletes[index];
  if (!athlete) return;

  const confirmed = window.confirm(`确认删除运动员“${athlete.name || "未命名运动员"}”吗？`);
  if (!confirmed) {
    return;
  }

  closeAthleteActionMenu();
  if (state.promotePanel.isOpen && state.promotePanel.athleteIndex === index) {
    closePromotePanel();
  }
  group.athletes.splice(index, 1);
  recalculateGroupRanks(group);
  syncPromotePanelState();
  saveLocalData(state.data);
  renderView();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "event-system-data.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.addEventListener("change", () => {
    const [file] = input.files || [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isValidAppData(parsed)) {
          throw new Error("JSON 结构不合法");
        }
        recalculateAllGroupRanks(parsed);
        state.data = parsed;
        saveLocalData(state.data);
        syncSelections();
        renderShell();
        renderView();
      } catch (error) {
        window.alert(`导入失败：${error.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  });
  input.click();
}

// 手动发布：把当前本地 state.data 整份推送到 Supabase 正式数据表。
async function uploadToCloud() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const confirmed = window.confirm("是否用当前本地数据覆盖云端正式数据？");
  if (!confirmed) {
    return;
  }

  try {
    await saveCloudData(state.data);
    window.alert("上传成功，云端正式数据已被当前本地数据覆盖。");
  } catch (error) {
    console.error("上传云端失败：", error);
    window.alert(`上传失败：${error.message || "请检查 Supabase 配置或表权限。"}`);
  }
}

// 手动拉取：从 Supabase 读取正式数据，并覆盖当前本地数据。
async function downloadFromCloud() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const confirmed = window.confirm("是否用云端正式数据覆盖当前本地数据？");
  if (!confirmed) {
    return;
  }

  try {
    const cloudData = await loadCloudData();
    if (!cloudData) {
      window.alert("云端还没有正式数据，当前不会覆盖本地数据。");
      return;
    }

    recalculateAllGroupRanks(cloudData);
    state.data = clone(cloudData);
    saveLocalData(state.data);
    syncSelections();
    renderShell();
    renderView();
    window.alert("拉取成功，当前本地数据已被云端正式数据覆盖。");
  } catch (error) {
    console.error("拉取云端数据失败：", error);
    window.alert(`拉取失败：${error.message || "请检查 Supabase 配置或表权限。"}`);
  }
}

function resetToDefaultData() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  state.data = clone(defaultData);
  saveLocalData(state.data);
  syncSelections();
  renderShell();
  renderView();
}

function ensureAdminAuthenticated() {
  if (state.isAdminAuthenticated) {
    return true;
  }

  window.alert("请先登录后台管理员账号。");
  setRoute("admin");
  return false;
}

async function loginAdmin() {
  const email = document.querySelector("#login-email")?.value.trim() || "";
  const password = document.querySelector("#login-password")?.value || "";

  if (!email || !password) {
    window.alert("请输入管理员邮箱和密码。");
    return;
  }

  if (!cloudClient?.auth) {
    window.alert("Supabase Auth 尚未初始化，当前无法登录后台。");
    return;
  }

  try {
    const { error } = await cloudClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    window.alert("登录成功。");
  } catch (error) {
    console.error("后台登录失败：", error);
    window.alert(`登录失败：${error.message || "请检查邮箱或密码。"}`);
  }
}

async function logoutAdmin() {
  if (!cloudClient?.auth) {
    applyAdminSession(null);
    renderShell();
    renderView();
    return;
  }

  try {
    const { error } = await cloudClient.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("退出后台失败：", error);
    window.alert(`退出失败：${error.message || "请稍后再试。"}`);
  }
}

async function changePassword() {
  if (!ensureAdminAuthenticated()) return;

  const oldPassword = document.querySelector("#old-password")?.value || "";
  const newPassword = document.querySelector("#new-password")?.value || "";
  const confirmPassword = document.querySelector("#confirm-password")?.value || "";

  if (!oldPassword || !newPassword || !confirmPassword) {
    window.alert("请完整填写旧密码、新密码和确认密码。");
    return;
  }

  if (!state.adminEmail) {
    window.alert("当前未获取到管理员邮箱，请重新登录后再试。");
    return;
  }

  if (newPassword.length < 6) {
    window.alert("新密码至少需要 6 位。");
    return;
  }

  if (newPassword !== confirmPassword) {
    window.alert("两次输入的新密码不一致。");
    return;
  }

  try {
    const { error: verifyError } = await cloudClient.auth.signInWithPassword({
      email: state.adminEmail,
      password: oldPassword,
    });

    if (verifyError) {
      throw new Error("旧密码不正确。");
    }

    const { error: updateError } = await cloudClient.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    await cloudClient.auth.signOut();
    window.alert("密码修改成功，请使用新密码重新登录。");
  } catch (error) {
    console.error("修改后台密码失败：", error);
    window.alert(`修改失败：${error.message || "请稍后重试。"}`);
  }
}

function removeEventById(eventId) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  state.data.events = state.data.events.filter((event) => event.id !== eventId);
  if (state.selectedEventId === eventId) {
    state.selectedEventId = null;
  }
  if (state.adminEventId === eventId) {
    state.adminEventId = null;
  }
  saveLocalData(state.data);
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
  return state.data.events.find((event) => event.id === state.adminEventId) || state.data.events[0] || null;
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

function statusClass(status) {
  if (status === "进行中") return "status-live";
  if (status === "未开始") return "status-waiting";
  return "status-finished";
}

function setByPath(target, path, value) {
  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  const keys = normalized.split(".").filter(Boolean);
  let current = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    current = current[keys[index]];
  }

  current[keys[keys.length - 1]] = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
