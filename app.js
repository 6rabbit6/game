const STORAGE_KEY = "event-system-data-v1";
const AUTH_STORAGE_KEY = "event-system-auth-v1";
const AUTH_SESSION_KEY = "event-system-auth-session-v1";
const SUPABASE_URL = "https://vrismtdascvwxiyepxed.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OIBFAzMGjT4x3T6Dr90E0A_WB2ILWYE";
const CLOUD_TABLE_NAME = "app_state";

const defaultAuth = {
  username: "admin",
  password: "admin123456",
};

// 当前管理员登录只用于前端本地保护，不适合强安全场景。
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
  auth: loadAuth(),
  isAdminAuthenticated: loadAdminSession(),
  route: "home",
  selectedEventId: null,
  selectedDayId: null,
  selectedEntryId: null,
  selectedGroupId: null,
  adminEventId: null,
  adminDayId: null,
  adminEntryId: null,
  adminGroupId: null,
};

const app = document.querySelector("#app");
const topNav = document.querySelector("#topNav");
const brandName = document.querySelector("#brandName");
const systemName = document.querySelector("#systemName");
const pageFooter = document.querySelector("#pageFooter");

bootstrap();

function bootstrap() {
  syncSelections();
  renderShell();
  renderView();
  bindEvents();
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
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
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

  const parsedData = typeof row.data === "string" ? JSON.parse(row.data) : row.data;

  if (!isValidAppData(parsedData)) {
    throw new Error("云端数据结构不合法");
  }

  return parsedData;
}

async function saveCloudData(data) {
  ensureCloudClientReady();

  if (!isValidAppData(data)) {
    throw new Error("当前本地数据结构不合法，无法上传");
  }

  const existingRow = await getCloudStateRow();

  if (existingRow) {
    const { error } = await cloudClient.from(CLOUD_TABLE_NAME).update({ data }).eq("id", existingRow.id);
    if (error) {
      throw error;
    }
    return existingRow.id;
  }

  const { data: insertedRows, error } = await cloudClient
    .from(CLOUD_TABLE_NAME)
    .insert({ data })
    .select("id")
    .limit(1);

  if (error) {
    throw error;
  }

  return insertedRows?.[0]?.id || null;
}

function ensureCloudClientReady() {
  if (!cloudClient) {
    throw new Error("Supabase Publishable Key 未配置，或 SDK 尚未成功初始化。");
  }
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return clone(defaultAuth);
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.username || !parsed?.password) {
      return clone(defaultAuth);
    }
    return parsed;
  } catch (error) {
    console.warn("读取账号信息失败，已回退到默认账号。", error);
    return clone(defaultAuth);
  }
}

function saveAuth() {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
}

function loadAdminSession() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === "true";
}

function saveAdminSession(isLoggedIn) {
  if (isLoggedIn) {
    sessionStorage.setItem(AUTH_SESSION_KEY, "true");
    return;
  }
  sessionStorage.removeItem(AUTH_SESSION_KEY);
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

    <section class="section-head">
      <div>
        <h2>${escapeHtml(state.data.site.homeSectionTitle)}</h2>
        <p>${escapeHtml(state.data.site.homeSectionDescription)}</p>
      </div>
      <div class="table-actions">
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
        <div class="badge-row">
          <span class="badge ${statusClass(event.status)}">${escapeHtml(event.status)}</span>
          <span class="badge">${escapeHtml(event.dateRange || "待定")}</span>
          <span class="badge">${escapeHtml(event.location || "待定场馆")}</span>
        </div>
      </div>
      <div class="toolbar-actions">
        <button class="cta-button" data-open-event="${event.id}" data-route-target="schedule">查看详情</button>
        <button class="ghost-button" data-open-event="${event.id}" data-route-target="groups">查看分组</button>
        <button class="danger-button" data-remove-event="${event.id}">删除赛事</button>
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
      <p class="table-note">说明：后台新增或修改条目后，这里的数据会同步更新。</p>
    </section>
  `;
}

function renderScheduleRow(entry) {
  if (entry.type === "break") {
    return `
      <tr class="timeline-break">
        <td>${escapeHtml(entry.time || "-")}</td>
        <td>${escapeHtml(entry.projectName || "休整")}</td>
        <td colspan="7">${escapeHtml(entry.round || "中场维护")}</td>
        <td><span class="subtle">无分组</span></td>
      </tr>
    `;
  }

  return `
    <tr>
      <td>${escapeHtml(entry.time || "")}</td>
      <td>${escapeHtml(entry.projectName || "")}</td>
      <td>${escapeHtml(entry.division || "")}</td>
      <td>${escapeHtml(entry.gender || "")}</td>
      <td>${escapeHtml(entry.round || "")}</td>
      <td>${escapeHtml(entry.participantCount || "")}</td>
      <td>${escapeHtml(entry.groupCount || "")}</td>
      <td>${escapeHtml(entry.qualification || "")}</td>
      <td>${escapeHtml(entry.note || "")}</td>
      <td>
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

  return `
    <section class="panel">
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

    <section class="selector-bar">
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

    <section class="table-card">
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
                        <td>${escapeHtml(athlete.rank || "")}</td>
                        <td>${escapeHtml(athlete.lane || "")}</td>
                        <td>${escapeHtml(athlete.bib || "")}</td>
                        <td>${escapeHtml(athlete.name || "")}</td>
                        <td>${escapeHtml(athlete.team || "")}</td>
                        <td>${escapeHtml(athlete.result || "")}</td>
                        <td>${escapeHtml(athlete.note || "")}</td>
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="7">当前分组还没有录入运动员名单。</td></tr>`
          }
        </tbody>
      </table>
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
            <p>只有输入正确的管理员账号和密码，才能访问后台管理页面。</p>
          </div>
          <div class="field-actions">
            <button class="ghost-button" data-auth-action="logout-admin">退出登录</button>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>管理员账号</label>
            <input value="${escapeAttribute(state.auth.username)}" readonly />
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
        <p class="hint">当前版本为本地浏览器账号系统，默认账号是“admin”，初始密码是“admin123456”。</p>
      </section>
    </section>
  `;
}

function renderAdminLoginView() {
  return `
    <section class="admin-card">
      <div class="admin-head">
        <h2>后台登录</h2>
        <p>请输入管理员账号和密码，验证通过后才可访问后台录入与编辑功能。</p>
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="login-username">管理员账号</label>
          <input id="login-username" value="${escapeAttribute(state.auth.username)}" autocomplete="username" />
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
      <p class="hint">默认账号：admin，默认密码：admin123456。登录后可在“账户安全”中修改密码。</p>
    </section>
  `;
}

function renderAthleteRow(athlete, athleteIndex, eventIndex, dayIndex, entryIndex, groupIndex) {
  const basePath = `events[${eventIndex}].days[${dayIndex}].entries[${entryIndex}].groups[${groupIndex}].athletes[${athleteIndex}]`;
  return `
    <tr>
      <td><input data-model="${basePath}.rank" value="${escapeAttribute(athlete.rank || "")}" /></td>
      <td><input data-model="${basePath}.lane" value="${escapeAttribute(athlete.lane || "")}" /></td>
      <td><input data-model="${basePath}.bib" value="${escapeAttribute(athlete.bib || "")}" /></td>
      <td><input data-model="${basePath}.name" value="${escapeAttribute(athlete.name || "")}" /></td>
      <td><input data-model="${basePath}.team" value="${escapeAttribute(athlete.team || "")}" /></td>
      <td><input data-model="${basePath}.result" value="${escapeAttribute(athlete.result || "")}" /></td>
      <td><input data-model="${basePath}.note" value="${escapeAttribute(athlete.note || "")}" /></td>
      <td><button class="danger-button" data-admin-action="remove-athlete" data-athlete-index="${athleteIndex}">删除</button></td>
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
  }
}

function handleChange(event) {
  const modelField = event.target.closest("[data-model]");
  if (modelField) {
    setByPath(state.data, modelField.dataset.model, modelField.value);
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
  if (!state.adminEventId || !state.data.events.length) return;
  removeEventById(state.adminEventId);
}

function addDay() {
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
  const event = getAdminEvent();
  if (!event || !state.adminDayId) return;
  event.days = event.days.filter((day) => day.id !== state.adminDayId);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addEntry() {
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
  const day = getAdminDay();
  if (!day || !state.adminEntryId) return;
  day.entries = day.entries.filter((entry) => entry.id !== state.adminEntryId);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addGroup() {
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
  const entry = getAdminEntry();
  if (!entry || !state.adminGroupId) return;
  entry.groups = entry.groups.filter((group) => group.id !== state.adminGroupId);
  entry.groupCount = String(entry.groups.length);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addAthlete() {
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
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function removeAthlete(index) {
  const group = getAdminGroup();
  if (!group || Number.isNaN(index)) return;
  group.athletes.splice(index, 1);
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
  state.data = clone(defaultData);
  saveLocalData(state.data);
  syncSelections();
  renderShell();
  renderView();
}

function loginAdmin() {
  const username = document.querySelector("#login-username")?.value.trim() || "";
  const password = document.querySelector("#login-password")?.value || "";

  if (!username || !password) {
    window.alert("请输入账号和密码。");
    return;
  }

  if (username !== state.auth.username || password !== state.auth.password) {
    window.alert("账号或密码不正确。");
    return;
  }

  state.isAdminAuthenticated = true;
  saveAdminSession(true);
  renderShell();
  renderView();
}

function logoutAdmin() {
  state.isAdminAuthenticated = false;
  saveAdminSession(false);
  renderShell();
  renderView();
}

function changePassword() {
  if (!state.isAdminAuthenticated) return;

  const oldPassword = document.querySelector("#old-password")?.value || "";
  const newPassword = document.querySelector("#new-password")?.value || "";
  const confirmPassword = document.querySelector("#confirm-password")?.value || "";

  if (!oldPassword || !newPassword || !confirmPassword) {
    window.alert("请完整填写旧密码、新密码和确认密码。");
    return;
  }

  if (oldPassword !== state.auth.password) {
    window.alert("旧密码不正确。");
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

  state.auth.password = newPassword;
  saveAuth();
  state.isAdminAuthenticated = false;
  saveAdminSession(false);
  window.alert("密码修改成功，请使用新密码重新登录。");
  renderShell();
  renderView();
}

function removeEventById(eventId) {
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
