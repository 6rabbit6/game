const app = document.querySelector("#app");
const topNav = document.querySelector("#topNav");
const brandName = document.querySelector("#brandName");
const systemName = document.querySelector("#systemName");
const topBar = document.querySelector(".topbar");
const pageFooter = document.querySelector("#pageFooter");
const cloudClient = createCloudClient();
const appDialogActions = new Map();
let appNoticeTimer = null;
let preRaceSearchRenderTimer = null;

initializeState();
bootstrap();

async function bootstrap() {
  await initializeAdminAuth();
  restoreInitialHistoryState();
  syncSelections();
  renderShell();
  renderView();
  replaceHistoryState();
  bindEvents();

  if (shouldPreferCloudOnStartup()) {
    await hydrateCloudStateOnStartup();
  }
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
    replaceHistoryState();
  } catch (error) {
    console.warn("启动时拉取云端正式数据失败，已保留本地数据。", error);
  }
}

function setRoute(route) {
  state.route = route;
  if (route === "groups") {
    ensureEntryWithGroups();
  }
  renderShell();
  renderView();
  pushHistoryState();
}

function enterAdminFromRoute() {
  if (state.route === "home") {
    clearAdminSelection();
    setRoute("admin");
    return;
  }

  syncCurrentContextToAdminSelection();
  setRoute("admin");
}

function clearAdminSelection() {
  state.adminEventId = null;
  state.adminDayId = null;
  state.adminEntryId = null;
  state.adminGroupId = null;
}

function syncCurrentContextToAdminSelection() {
  const currentEvent = getCurrentEvent();
  const currentDay = getCurrentDay();
  const currentEntry = getCurrentEntry();
  const currentGroup = getCurrentGroup();

  state.adminEventId = currentEvent?.id || null;
  state.adminDayId = currentDay?.id || null;
  state.adminEntryId = currentEntry?.id || null;
  state.adminGroupId = currentGroup?.id || null;
}

function renderShell() {
  const hideTopBar = state.route === "schedule" || state.route === "groups";

  brandName.textContent = state.data.site.brandName;
  systemName.textContent = state.data.site.systemName;
  pageFooter.textContent = state.data.site.footerText;
  topBar.hidden = hideTopBar;
  app.className = hideTopBar ? "detail-page" : "";
  topNav.className = state.route === "home" ? "topnav topnav-home" : "topnav";

  const navItems = [
    { id: "home", label: "首页" },
    { id: "schedule", label: "赛事日程" },
    { id: "results", label: "成绩查询" },
    { id: "groups", label: "分组详情" },
    { id: "admin", label: "后台管理" },
  ].filter((item) => {
    if (state.route === "home" && item.id === "groups") return false;
    if (state.route === "admin" && item.id === "admin") return false;
    return true;
  });

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
  let viewHtml = "";

  if (!state.data.events.length && state.route !== "admin") {
    viewHtml = `
      <section class="empty-card">
        <h2>还没有赛事数据</h2>
        <p class="hint">请先进入后台创建赛事，或者恢复默认演示数据。</p>
        <div class="table-actions">
          <button class="cta-button" data-route="admin">进入后台</button>
          <button class="ghost-button" data-admin-action="reset-default-data">恢复默认数据</button>
        </div>
      </section>
    `;
    app.innerHTML = renderViewWithFeedback(viewHtml);
    syncPromoteModalLock();
    return;
  }

  switch (state.route) {
    case "schedule":
      viewHtml = renderScheduleView();
      break;
    case "groups":
      viewHtml = renderGroupsView();
      break;
    case "results":
      viewHtml = renderResultSearchView();
      break;
    case "admin":
      viewHtml = renderAdminView();
      break;
    default:
      viewHtml = renderHomeView();
      break;
  }

  app.innerHTML = renderViewWithFeedback(viewHtml);
  syncPromoteModalLock();
}

function renderViewWithFeedback(viewHtml) {
  return `${viewHtml}${renderAppNotice()}${renderAppDialog()}`;
}

function renderHomeView() {
  const homeEvents = getHomeEvents();
  const total = homeEvents.length;
  const live = homeEvents.filter((event) => event.status === "进行中").length;
  const waiting = homeEvents.filter((event) => event.status === "未开始").length;

  return `
    <section class="hero-card">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(state.data.site.heroEyebrow)}</span>
          <h2 class="hero-title">${escapeHtml(state.data.site.heroTitle)}</h2>
          <p class="hero-desc">${escapeHtml(state.data.site.heroDescription)}</p>
        </div>
        <div class="hero-stat-stack">
          ${renderStatCard(total, "全部赛事", true)}
          ${renderStatCard(live, "进行中", true)}
          ${renderStatCard(waiting, "未开始")}
        </div>
      </div>
    </section>

    <section class="section-head">
      <div>
        <h2>${escapeHtml(state.data.site.homeSectionTitle)}</h2>
        <p>${escapeHtml(state.data.site.homeSectionDescription)}</p>
      </div>
    </section>

    <section class="event-list" id="event-list">
      ${homeEvents.map(renderEventCard).join("") || renderHintCard("当前没有正在展示的赛事。")}
    </section>
  `;
}

function getHomeEvents() {
  return state.data.events
    .filter(shouldShowEventOnHome)
    .slice()
    .reverse();
}

function renderStatCard(value, label, isClickable = false) {
  return `
    <article class="stat-card ${isClickable ? "stat-card-clickable" : ""}" ${isClickable ? 'data-event-list-jump tabindex="0" role="button"' : ""}>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function renderEventCard(event) {
  return `
    <article class="event-card panel" data-open-event="${event.id}" data-route-target="schedule">
      <div class="event-meta">
        <h3>${escapeHtml(event.name)} <span class="subtle">${escapeHtml(event.stageLabel || "")}</span></h3>
        <p>${escapeHtml(event.summary || "")}</p>
        <div class="badge-row event-card-badge-row">
          <span class="badge ${statusClass(event.status)}">${escapeHtml(event.status)}</span>
          <span class="badge">${escapeHtml(event.dateRange || "待定")}</span>
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
    <section class="panel schedule-detail-panel">
      <div class="toolbar schedule-detail-toolbar">
        <div class="event-header schedule-detail-header">
          <h2>${escapeHtml(event.name)}</h2>
          <p>${escapeHtml(event.dateRange || "")}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</p>
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" data-route="home">返回首页</button>
          <button class="cta-button" data-route="admin">进入后台</button>
        </div>
      </div>
    </section>

    <section class="section-head schedule-section-head">
      <div>
        <h2>竞赛日程</h2>
      </div>
    </section>

    ${renderScheduleDayNavigator(event, day)}

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
              <th>状态</th>
              <th>人数</th>
              <th>组数</th>
              <th>录取规则</th>
              <th>备注</th>
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

function renderScheduleDayNavigator(event, day) {
  const days = event.days || [];
  const currentIndex = Math.max(0, days.findIndex((item) => item.id === day?.id));
  const previousDay = days[currentIndex - 1] || null;
  const nextDay = days[currentIndex + 1] || null;
  const entryCount = day?.entries?.length || 0;
  const groupedCount = (day?.entries || []).filter((entry) => entry.groups?.length).length;

  return `
    <section class="schedule-day-calendar">
      <div class="schedule-day-navigator" aria-label="比赛日切换">
        <button
          class="schedule-day-arrow"
          type="button"
          ${previousDay ? `data-select-day="${escapeAttribute(previousDay.id)}"` : "disabled"}
          aria-label="上一比赛日"
        >
          ←
        </button>
        <div class="schedule-day-current">
          <strong>${escapeHtml(day ? `${day.label || "比赛日"} · ${day.date || "待定"}` : "请选择比赛日")}</strong>
          <span>${entryCount} 个赛程 · ${groupedCount} 个已分组</span>
        </div>
        <button
          class="schedule-day-arrow"
          type="button"
          ${nextDay ? `data-select-day="${escapeAttribute(nextDay.id)}"` : "disabled"}
          aria-label="下一比赛日"
        >
          →
        </button>
      </div>
      ${
        days.length > 1
          ? `<div class="schedule-day-tabs">
              ${days
                .map(
                  (item) => `
                    <button class="schedule-day-tab ${item.id === day?.id ? "active" : ""}" data-select-day="${escapeAttribute(item.id)}">
                      <span>${escapeHtml(item.label || "比赛日")}</span>
                      <small>${escapeHtml(item.date || "待定")}</small>
                    </button>
                  `
                )
                .join("")}
            </div>`
          : ""
      }
      <p class="schedule-day-note">${escapeHtml(day?.note || "请选择比赛日查看详细赛程。")}</p>
    </section>
  `;
}

function renderScheduleRow(entry) {
  if (entry.type === "break") {
    return `
      <tr class="timeline-break schedule-row-break">
        <td data-label="比赛时间">${escapeHtml(entry.time || "-")}</td>
        <td data-label="项目名称">${escapeHtml(entry.projectName || "休整")}</td>
        <td data-label="组别">${escapeHtml(entry.division || "")}</td>
        <td data-label="性别">${escapeHtml(entry.gender || "")}</td>
        <td data-label="赛别">${escapeHtml(entry.round || "维护")}</td>
        <td data-label="状态"><span class="schedule-status-pill muted">休整</span></td>
        <td data-label="人数"></td>
        <td data-label="组数"></td>
        <td data-label="录取规则"></td>
        <td data-label="备注">${escapeHtml(entry.note || "")}</td>
      </tr>
    `;
  }

  const hasGroups = Boolean(entry.groups?.length);
  const rowAction =
    hasGroups
      ? ` class="schedule-row-grouped row-clickable" data-open-entry-row="${entry.id}"`
      : ` class="schedule-row-pending"`;
  const statusLabel = hasGroups ? "已分组" : getEntryDisplayScheduleStatus(entry);
  const statusClass = hasGroups ? "ready" : "waiting";
  const projectIcon = hasGroups ? "📊" : "⏳";

  return `
    <tr${rowAction}>
      <td data-label="比赛时间">${escapeHtml(entry.time || "")}</td>
      <td data-label="项目名称"><span class="schedule-project-title"><span aria-hidden="true">${projectIcon}</span>${escapeHtml(entry.projectName || "")}</span></td>
      <td data-label="组别">${escapeHtml(formatGroupNameForDisplay(entry.division || entry.groupName || ""))}</td>
      <td data-label="性别">${escapeHtml(entry.gender || "")}</td>
      <td data-label="赛别">${escapeHtml(getEntryRoundName(entry))}</td>
      <td data-label="状态"><span class="schedule-status-pill ${statusClass}">${escapeHtml(statusLabel)}</span></td>
      <td data-label="人数">${escapeHtml(entry.participantCount || "")}</td>
      <td data-label="组数">${escapeHtml(entry.groupCount || "")}</td>
      <td data-label="录取规则">${escapeHtml(entry.qualification && entry.qualification !== "待定" ? entry.qualification : formatQualificationRuleText(entry.qualificationRule, entry.targetRoundName || ""))}</td>
      <td data-label="备注">${escapeHtml(sanitizeRegistrationScheduleNote(entry.note || ""))}</td>
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
  const rankColumns = getEntryRankColumns(entry);
  const emptyGroupColspan = rankColumns.length + 7;

  return `
    <section class="panel group-desktop-header">
      <div class="group-header">
        <h2>${escapeHtml(event.name)}</h2>
        <p>${escapeHtml(formatEntryDisplayTitle(entry))}</p>
      </div>
      <div class="toolbar">
        <div class="badge-row">
          <span class="badge">${escapeHtml(day?.label || "")}</span>
          <span class="badge">${escapeHtml(day?.date || "")}</span>
          <span class="badge">${escapeHtml(entry.time || "")}</span>
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" data-route="schedule">返回日程</button>
          <button class="cta-button" data-admin-action="open-current-group-in-admin">编辑分组</button>
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
        <p>${escapeHtml(formatEntryDisplayTitle(entry))}</p>
        <div class="table-actions group-mobile-actions">
          <button class="ghost-button" data-route="schedule">返回日程</button>
          <button class="cta-button" data-admin-action="open-current-group-in-admin">编辑分组</button>
        </div>
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
      ${renderEntryRankNotice(entry)}
      ${
        currentGroup?.athletes?.length
          ? currentGroup.athletes
              .map(
                (athlete) => `
	                  <article class="athlete-mobile-card">
	                    <div class="athlete-mobile-rank">
	                      <span class="athlete-mobile-rank-label">名次</span>
	                      <strong>${escapeHtml(getAthleteDisplayRank(athlete, entry) || "-")}</strong>
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
                        <span class="athlete-mobile-chip athlete-mobile-note-chip">
                          备注
                          <span class="${athlete.note ? "athlete-mobile-note-value" : ""}">${escapeHtml(athlete.note || "-")}</span>
                        </span>
                        ${renderMergeInfoCell(athlete)}
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
      ${renderEntryRankNotice(entry)}
      <div class="table-scroll-x">
        <table class="group-table">
          <thead>
            <tr>
              ${rankColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
              <th>道次</th>
              <th>号码</th>
              <th>姓名</th>
              <th>单位</th>
              <th>来源</th>
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
	                          ${rankColumns.map((column) => `<td data-label="${escapeAttribute(column.label)}">${escapeHtml(getAthleteRankColumnValue(athlete, column))}</td>`).join("")}
	                          <td data-label="道次">${escapeHtml(athlete.lane || "")}</td>
                          <td data-label="号码">${escapeHtml(athlete.bib || "")}</td>
                          <td data-label="姓名">${escapeHtml(athlete.name || "")}</td>
                          <td data-label="单位">${escapeHtml(athlete.team || "")}</td>
                          <td data-label="来源">${renderMergeInfoCell(athlete)}</td>
                          <td data-label="成绩">${escapeHtml(athlete.result || "")}</td>
                          <td data-label="备注">${escapeHtml(athlete.note || "")}</td>
                        </tr>
                      `
                    )
                    .join("")
	                : `<tr><td colspan="${emptyGroupColspan}">当前分组还没有录入运动员名单。</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderResultSearchView() {
  const events = state.data.events || [];
  const selectedEventId = events.some((event) => event.id === state.resultSearchEventId)
    ? state.resultSearchEventId
    : "";
  const keyword = state.resultSearchKeyword || "";
  const projectName = state.resultSearchProjectName || "";
  const hasQuery = Boolean(normalizeText(keyword) || normalizeText(projectName));
  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;
  const rows = selectedEvent && hasQuery
    ? searchAthleteResults(keyword, {
        eventId: selectedEventId,
        projectName,
      })
    : [];

  return `
    <section class="panel result-search-panel">
      <div class="toolbar">
        <div>
          <h2>成绩查询</h2>
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" data-route="home">返回首页</button>
        </div>
      </div>
      <div class="result-search-grid">
        <div class="field">
          <label for="result-search-keyword">号码 / 姓名 / 单位</label>
          <input
            id="result-search-keyword"
            data-result-search-keyword
            value="${escapeAttribute(keyword)}"
            placeholder="例如 001、张三、龙辰"
          />
        </div>
        <div class="field">
          <label for="result-search-project">项目筛选</label>
          <input
            id="result-search-project"
            data-result-search-project
            value="${escapeAttribute(projectName)}"
            placeholder="可选，例如 300米"
          />
        </div>
        <div class="field">
          <label for="result-search-event">赛事</label>
          <select id="result-search-event" data-result-search-event>
            <option value="" ${selectedEvent ? "" : "selected"}>请选择赛事</option>
            ${events
              .map(
                (event) => `
                  <option value="${event.id}" ${event.id === selectedEventId ? "selected" : ""}>
                    ${escapeHtml(event.name)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
        <div class="result-search-actions">
          <button class="cta-button" data-result-search-submit>查询</button>
        </div>
      </div>
      ${
        selectedEvent && hasQuery
          ? `<p class="hint">当前查询赛事：${escapeHtml(selectedEvent.name || "未命名赛事")}，共找到 ${rows.length} 条参赛记录。</p>`
          : ""
      }
    </section>

    ${
      selectedEvent && hasQuery
        ? `<section class="result-card-list">
            ${
              rows.length
                ? rows.map(renderResultSearchCard).join("")
                : `<div class="empty-card">
                    <h2>没有查到匹配结果</h2>
                    <p class="hint">请换一个号码、姓名或单位关键词再试。</p>
                  </div>`
            }
          </section>`
        : ""
    }
  `;
}

function renderResultSearchCard(row) {
  const hasResult = Boolean(row.result);
  return `
    <article class="result-card">
      <div class="result-card-head">
        <span class="athlete-mobile-bib">${escapeHtml(row.bib || "-")}</span>
        <div>
          <h3>${escapeHtml(row.name || "-")}</h3>
          <p>${escapeHtml(row.team || "-")}</p>
        </div>
      </div>
      <div class="result-card-grid">
        <span>组别：${escapeHtml(row.originalGroupName || row.groupName || "-")}</span>
        <span>项目：${escapeHtml(row.originalProjectName || row.projectName || "-")}</span>
        ${
          row.isMergedRace
            ? `<span>合并比赛：${escapeHtml(row.mergedRaceName || row.projectName || "-")}</span>`
            : ""
        }
        <span>赛别：${escapeHtml(row.round || "-")}</span>
        <span>分组：${escapeHtml(row.raceGroupName || "-")}</span>
        <span>道次：${escapeHtml(row.lane || "-")}</span>
        <span>原小项名次：${escapeHtml(row.rank || "-")}</span>
        ${
          row.isMergedRace && row.mergedOverallRank
            ? `<span>合并总名次：${escapeHtml(row.mergedOverallRank)}</span>`
            : ""
        }
      </div>
      <div class="result-card-foot">
        <strong>${hasResult ? `成绩 ${escapeHtml(row.result)}` : "已报名 / 已分组，成绩暂未录入"}</strong>
        <span>${escapeHtml(row.note || row.scheduleStatus || "")}</span>
      </div>
    </article>
  `;
}

function renderAdminEventSelector(adminEvent, id = "admin-event-select") {
  return `
    <div class="field">
      <label for="${escapeAttribute(id)}">当前赛事</label>
      <select id="${escapeAttribute(id)}" class="inline-select" data-admin-select="event">
        <option value="" ${adminEvent ? "" : "selected"}>请选择赛事</option>
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
  `;
}

function renderAdminDaySelector(adminEvent, adminDay, id = "admin-day-select") {
  return `
    <div class="field">
      <label for="${escapeAttribute(id)}">当前比赛日</label>
      <select id="${escapeAttribute(id)}" class="inline-select" data-admin-select="day" ${adminEvent ? "" : "disabled"}>
        <option value="" ${adminDay ? "" : "selected"}>${adminEvent ? "请选择比赛日" : "请先选择赛事"}</option>
        ${adminEvent ? (adminEvent.days || [])
          .map(
            (day) => `
              <option value="${day.id}" ${day.id === adminDay?.id ? "selected" : ""}>
                ${escapeHtml(day.label)} · ${escapeHtml(day.date)}
              </option>
            `
          )
          .join("") : ""}
      </select>
    </div>
  `;
}

function renderAdminEntrySelector(adminDay, adminEntry, id = "admin-entry-select") {
  return `
    <div class="field">
      <label for="${escapeAttribute(id)}">当前赛程条目</label>
      <select id="${escapeAttribute(id)}" class="inline-select" data-admin-select="entry" ${adminDay ? "" : "disabled"}>
        <option value="" ${adminEntry ? "" : "selected"}>${adminDay ? "请选择赛程" : "请先选择比赛日"}</option>
        ${adminDay ? (adminDay.entries || [])
          .map(
            (entry) => `
              <option value="${entry.id}" ${entry.id === adminEntry?.id ? "selected" : ""}>
                ${escapeHtml(formatEntryOptionLabel(entry))}
              </option>
            `
          )
          .join("") : ""}
      </select>
    </div>
  `;
}

function renderAdminGroupSelector(adminEntry, adminGroup, id = "admin-group-select") {
  return `
    <div class="field">
      <label for="${escapeAttribute(id)}">当前分组</label>
      <select id="${escapeAttribute(id)}" class="inline-select" data-admin-select="group" ${adminEntry ? "" : "disabled"}>
        <option value="" ${adminGroup ? "" : "selected"}>${adminEntry ? "请选择分组" : "请先选择赛程"}</option>
        ${adminEntry ? (adminEntry.groups || [])
          .map(
            (group) => `
              <option value="${group.id}" ${group.id === adminGroup?.id ? "selected" : ""}>
                ${escapeHtml(group.name)}
              </option>
            `
          )
          .join("") : ""}
      </select>
    </div>
  `;
}

const ADMIN_TABS = [
  { id: "overview", label: "赛事概览", title: "赛事概览", desc: "查看当前赛事状态、核心统计和常用入口。" },
  { id: "import", label: "报名导入", title: "报名导入", desc: "导入报名 JSON，确认项目成立与合并处理，并查看导入后的正式名单。" },
  { id: "pre-race", label: "赛前变更", title: "赛前名单调整", desc: "比赛前处理改组、弃赛、补报和名单修正，并预览重算影响。" },
  { id: "rules", label: "规则设置", title: "规则设置", desc: "维护号码、自动分组、项目成立、赛制轮次和晋级规则。" },
  { id: "schedule", label: "赛程管理", title: "赛程管理", desc: "编辑当前赛程条目的时间、项目、人数、分组数量、备注和本轮晋级设置。" },
  { id: "groups", label: "分组名单", title: "分组名单", desc: "维护当前赛程下的分组摘要、批量导入和运动员名单。" },
  { id: "results", label: "成绩晋级", title: "成绩晋级", desc: "录入成绩、排序名次、计算晋级并应用到下一轮。" },
  { id: "export", label: "导出发布", title: "导出发布", desc: "导出备份和秩序册，将本地数据发布到云端正式数据。" },
  { id: "advanced", label: "高级操作", title: "高级操作", desc: "处理系统备份导入、站点文案、账户安全和危险恢复操作。" },
];

function renderAdminView() {
  if (!state.isAdminAuthenticated) {
    return renderAdminLoginView();
  }

  const adminEvent = getAdminEvent();
  const adminDay = getAdminDay();
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();
  const currentAdminEntryIndex = adminDay && adminEntry ? findEntryIndex(adminDay, adminEntry.id) : -1;
  const isFirstAdminEntry = currentAdminEntryIndex <= 0;
  const isLastAdminEntry =
    !adminDay?.entries?.length || currentAdminEntryIndex === adminDay.entries.length - 1;
  const isRaceAdminEntry = adminEntry?.type !== "break";
  const canRunQualification = hasExecutableQualificationRule(adminEntry);

  return renderAdminTabbedWorkspace({
    adminEvent,
    adminDay,
    adminEntry,
    adminGroup,
    isFirstAdminEntry,
    isLastAdminEntry,
    isRaceAdminEntry,
    canRunQualification,
  });

}

function getActiveAdminTab() {
  const adminUi = ensureAdminUiState();
  const tab = adminUi.activeAdminTab || "overview";
  return ADMIN_TABS.some((item) => item.id === tab) ? tab : "overview";
}

function setActiveAdminTab(tabId, options = {}) {
  const adminUi = ensureAdminUiState();
  adminUi.activeAdminTab = ADMIN_TABS.some((item) => item.id === tabId) ? tabId : "overview";
  if (options.render === false) {
    return;
  }
  renderView();
  requestAnimationFrame(() => {
    document.querySelector(".admin-tabs")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function renderAdminTabbedWorkspace(context) {
  const activeTab = getActiveAdminTab();
  const tabMeta = ADMIN_TABS.find((item) => item.id === activeTab) || ADMIN_TABS[0];
  return `
    <section class="admin-card">
      <div class="admin-head">
        <h2>${escapeHtml(state.data.site.adminTitle)}</h2>
        <p>${escapeHtml(state.data.site.adminDescription)}</p>
      </div>

      ${renderAdminCoreBar(context)}
      ${renderAdminTabs(activeTab)}

      <section class="admin-tab-panel">
        <div class="admin-workspace-head">
          <div>
            <h3 class="admin-workspace-title">${escapeHtml(tabMeta.title)}</h3>
            <p class="admin-workspace-desc">${escapeHtml(tabMeta.desc)}</p>
          </div>
        </div>
        ${renderAdminTabContent(activeTab, context)}
      </section>
    </section>
    ${renderPromoteModal()}
    ${renderManualRegistrationModal()}
    ${renderFormationConfirmationPanel()}
  `;
}

function renderAdminCoreBar({ adminEvent, adminDay }) {
  return `
    <div class="selector-bar admin-section-card admin-core-section admin-core-lite">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">后台工作台</h3>
          <p class="admin-section-summary-text">选择当前赛事和比赛日，然后进入对应分类处理具体事务。</p>
        </div>
        <div class="admin-section-summary">当前：${escapeHtml(adminEvent?.name || "未选择赛事")}</div>
      </div>
      <div class="admin-core-row">
        <div class="selector-grid admin-core-selectors">
          ${renderAdminEventSelector(adminEvent)}
          ${renderAdminDaySelector(adminEvent, adminDay)}
        </div>
        <div class="admin-status-strip">
          <span class="badge">${escapeHtml(adminEvent?.status || "未选择赛事")}</span>
          <span class="badge">${escapeHtml(adminDay ? `${adminDay.label} · ${adminDay.date}` : "未选择比赛日")}</span>
          <span class="badge">本地自动保存</span>
        </div>
      </div>
    </div>
  `;
}

function renderAdminTabs(activeTab) {
  return `
    <nav class="admin-tabs" aria-label="后台分类">
      ${ADMIN_TABS.map(
        (tab) => `
          <button
            class="admin-tab-button ${tab.id === activeTab ? "active" : ""}"
            type="button"
            data-admin-tab="${escapeAttribute(tab.id)}"
          >
            ${escapeHtml(tab.label)}
          </button>
        `
      ).join("")}
    </nav>
  `;
}

function renderAdminTabContent(tab, context) {
  switch (tab) {
    case "import":
      return renderAdminImportTab(context);
    case "pre-race":
      return renderPreRaceChangeTab(context);
    case "rules":
      return renderAdminRulesTab();
    case "schedule":
      return renderAdminScheduleTab(context);
    case "groups":
      return renderAdminGroupsTab(context);
    case "results":
      return renderAdminResultsTab(context);
    case "export":
      return renderAdminExportTab();
    case "advanced":
      return renderAdminAdvancedTab(context);
    case "overview":
    default:
      return renderAdminOverviewTab(context);
  }
}

function renderAdminOverviewTab(context) {
  const { adminEvent, adminDay } = context;
  const stats = getAdminEventStats(adminEvent);
  return `
    ${
      adminEvent
        ? `
          <section class="admin-section admin-section-card admin-compact-section">
            <div class="admin-section-header">
              <div class="admin-section-title-wrap">
                <h3 class="admin-section-title">当前赛事状态</h3>
                <p class="admin-section-summary-text">${escapeHtml(adminEvent.summary || "当前赛事暂无摘要。")}</p>
              </div>
              <div class="admin-section-summary">${escapeHtml([adminEvent.status, adminDay?.label, adminDay?.date].filter(Boolean).join("｜"))}</div>
            </div>
            <div class="admin-overview-stats">
              ${stats.map((item) => renderAdminStatCard(item.label, item.value, item.unit)).join("")}
            </div>
            <div class="admin-quick-actions">
              <button class="tiny-button" data-admin-action="add-event">新增赛事</button>
              <button class="tiny-button" data-admin-action="add-day">新增比赛日</button>
              <button class="ghost-button" data-admin-tab="import">去报名导入</button>
              <button class="ghost-button" data-admin-tab="schedule">去赛程管理</button>
              <button class="ghost-button" data-admin-tab="export">去导出发布</button>
            </div>
          </section>
          ${renderAdminEventInfoSection(context)}
          ${renderAdminDayInfoSection(context)}
        `
        : `<section class="admin-section admin-section-card">
            <div class="admin-quick-actions">
              <button class="tiny-button" data-admin-action="add-event">新增赛事</button>
            </div>
            ${renderHintCard("请先选择或新增赛事。")}
          </section>`
    }
  `;
}

function renderAdminImportTab({ adminEvent }) {
  return `
	    <section class="admin-section admin-section-card admin-compact-section">
	      <div class="admin-section-header">
	        <div class="admin-section-title-wrap">
	          <h3 class="admin-section-title">报名 JSON 导入</h3>
	          <p class="admin-section-summary-text">导入报名系统导出的 JSON 后，在这里确认项目成立、合并和取消处理。</p>
	        </div>
	      </div>
	      <div class="admin-quick-actions">
	        <button class="cta-button" data-admin-action="import-registration-json">导入报名 JSON</button>
	        <button class="ghost-button" data-admin-action="open-manual-registration">手动补录参赛人员</button>
	        <button class="ghost-button" data-admin-tab="pre-race">赛前名单调整</button>
	        <button class="ghost-button" data-admin-action="focus-formation-settings">修改项目成立规则</button>
	      </div>
	    </section>
    ${renderRegistrationImportPanel(adminEvent)}
  `;
}

function renderPreRaceChangeTab({ adminEvent }) {
  const importData = getEventRegistrationImport(adminEvent);
  if (!adminEvent) {
    return renderHintCard("请先选择或新增赛事，再进行赛前名单调整。");
  }
  if (!importData) {
    return `
      <section class="admin-section admin-section-card">
        <div class="admin-section-header">
          <div class="admin-section-title-wrap">
            <h3 class="admin-section-title">赛前名单调整</h3>
            <p class="admin-section-summary-text">请先导入报名 JSON。赛前变更需要基于报名源数据重新推导赛程和秩序册。</p>
          </div>
        </div>
        <div class="field-actions">
          <button class="cta-button" data-admin-tab="import">去报名导入</button>
        </div>
      </section>
    `;
  }

  const form = ensurePreRaceChangeState();
  const profiles = collectPreRaceAthleteProfiles(adminEvent);
  const searchResults = getPreRaceAthleteSearchResults(profiles, form.keyword);
  const exactBibMatches = getPreRaceExactBibMatches(profiles, form.keyword);
  const selectedProfile = profiles.find((profile) => profile.athleteKey === form.selectedAthleteKey) || null;
  const groupOptions = getPreRaceGroupOptions(adminEvent);
  const eventOptions = getPreRaceEventOptions(adminEvent);
  const cancelEventOptions = selectedProfile?.entries || [];
  const preview = form.preview;

  return `
    <section class="admin-section admin-section-card pre-race-panel">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">赛前名单调整</h3>
          <p class="admin-section-summary-text">通过“调整记录 + 影响预览 + 确认应用”处理改组、弃赛和补报；确认前不会直接改动分组名单。</p>
        </div>
        <div class="admin-section-summary">已记录 ${escapeHtml(getPreRaceChangeRecords(adminEvent).length)} 条变更</div>
      </div>

      <div class="pre-race-flow-grid">
        <div class="pre-race-card">
          <h4>1. 搜索运动员</h4>
          <div class="pre-race-search-row">
            <input
              data-prerace-field="keyword"
              value="${escapeAttribute(form.keyword || "")}"
              placeholder="输入号码、姓名、单位、证件号或报名号"
            />
            <button class="ghost-button" data-admin-action="refresh-prerace-search">搜索</button>
          </div>
          ${
            exactBibMatches.length > 1
              ? `<p class="pre-race-search-warning">检测到 ${escapeHtml(exactBibMatches.length)} 个号码精确匹配，请人工确认后选择。</p>`
              : ""
          }
          <div class="pre-race-search-results">
            ${
              searchResults.length
                ? searchResults
                    .map(
                      (profile) => `
                        <button
                          class="pre-race-athlete-result ${profile.athleteKey === selectedProfile?.athleteKey ? "active" : ""}"
                          type="button"
                          data-admin-action="select-prerace-athlete"
                          data-athlete-key="${escapeAttribute(profile.athleteKey)}"
                        >
                          <strong>${escapeHtml(profile.bibNo || "-")} ${escapeHtml(profile.name || "-")}</strong>
                          <span>${escapeHtml(profile.organization || EMPTY_ORGANIZATION_LABEL)}｜${escapeHtml(profile.groupName || "-")}｜${escapeHtml(profile.events.map((item) => item.eventName).filter(Boolean).join("、") || "暂无项目")}</span>
                        </button>
                      `
                    )
                    .join("")
                : `<p class="hint">请输入关键词搜索，或从当前报名名单中选择运动员。</p>`
            }
          </div>
        </div>

        <div class="pre-race-card">
          <h4>2. 当前运动员信息</h4>
          ${selectedProfile ? renderPreRaceAthleteSummary(selectedProfile) : `<p class="hint">请选择一名运动员后再生成变更。</p>`}
        </div>
      </div>

      ${selectedProfile ? renderPreRaceChangeEditor(selectedProfile, form, groupOptions, eventOptions, cancelEventOptions) : ""}
      ${preview ? renderPreRaceImpactPreview(preview, form.highRiskUnlocked) : ""}
      ${renderPreRaceChangeRecordList(adminEvent)}
    </section>
  `;
}

function renderPreRaceAthleteSummary(profile) {
  const statusTags = [
    profile.hasResult ? "已有成绩" : "",
    profile.hasPrinted ? "已打印" : "",
    profile.hasQualification ? "已计算晋级" : "",
    profile.hasPromoted ? "已应用晋级" : "",
  ].filter(Boolean);
  return `
    <div class="pre-race-athlete-card">
      <div>
        <span>号码</span>
        <strong>${escapeHtml(profile.bibNo || "-")}</strong>
      </div>
      <div>
        <span>姓名</span>
        <strong>${escapeHtml(profile.name || "-")}</strong>
      </div>
      <div>
        <span>单位</span>
        <strong>${escapeHtml(profile.organization || EMPTY_ORGANIZATION_LABEL)}</strong>
      </div>
      <div>
        <span>当前组别</span>
        <strong>${escapeHtml(profile.groupName || "-")}</strong>
      </div>
      <div>
        <span>当前项目</span>
        <strong>${escapeHtml(profile.events.map((item) => item.eventName).filter(Boolean).join("、") || "-")}</strong>
      </div>
      <div>
        <span>风险状态</span>
        <strong>${escapeHtml(statusTags.join("、") || "赛前未见成绩风险")}</strong>
      </div>
    </div>
  `;
}

function renderPreRaceChangeEditor(profile, form, groupOptions, eventOptions, cancelEventOptions) {
  const actionType = form.actionType || "change_group";
  return `
    <div class="pre-race-card pre-race-editor">
      <div class="admin-section-header compact">
        <div class="admin-section-title-wrap">
          <h4>3. 选择调整动作</h4>
          <p class="admin-section-summary-text">保存草稿只记录原因；生成影响预览会重新推导受影响赛程，但确认应用前不会写入正式分组。</p>
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>变更类型</label>
          <select data-prerace-field="actionType">
            <option value="change_group" ${actionType === "change_group" ? "selected" : ""}>改组别</option>
            <option value="withdraw" ${actionType === "withdraw" ? "selected" : ""}>弃赛</option>
            <option value="restore" ${actionType === "restore" ? "selected" : ""}>恢复参赛</option>
            <option value="add_event" ${actionType === "add_event" ? "selected" : ""}>补报项目</option>
            <option value="cancel_event" ${actionType === "cancel_event" ? "selected" : ""}>取消某项目</option>
            <option value="edit_basic_info" ${actionType === "edit_basic_info" ? "selected" : ""}>修改基础信息</option>
          </select>
        </div>
        ${
              actionType === "change_group"
            ? renderPreRaceGroupCombobox(profile, form, groupOptions)
            : ""
        }
        ${
          actionType === "add_event"
            ? `<div class="field">
                <label>补报项目</label>
                <select data-prerace-field="targetEventKey">
                  <option value="">请选择项目</option>
                  ${eventOptions
                    .map((item) => `<option value="${escapeAttribute(item.eventId)}" ${form.targetEventKey === item.eventId ? "selected" : ""}>${escapeHtml(item.label)}</option>`)
                    .join("")}
                </select>
              </div>`
            : ""
        }
        ${
          actionType === "cancel_event"
            ? `<div class="field">
                <label>取消项目</label>
                <select data-prerace-field="targetCancelEventKey">
                  <option value="">请选择要取消的项目</option>
                  ${cancelEventOptions
                    .map((item) => `<option value="${escapeAttribute(item.eventId || item.eventName)}" ${form.targetCancelEventKey === (item.eventId || item.eventName) ? "selected" : ""}>${escapeHtml(item.eventName || item.eventId || "-")}</option>`)
                    .join("")}
                </select>
              </div>`
            : ""
        }
        ${
          actionType === "withdraw"
            ? `<div class="field">
                <label>弃赛范围</label>
                <select data-prerace-field="withdrawScope">
                  <option value="all" ${form.withdrawScope !== "event" ? "selected" : ""}>全部项目弃赛</option>
                  <option value="event" ${form.withdrawScope === "event" ? "selected" : ""}>仅单个项目弃赛</option>
                </select>
              </div>
              ${
                form.withdrawScope === "event"
                  ? `<div class="field">
                      <label>弃赛项目</label>
                      <select data-prerace-field="targetCancelEventKey">
                        <option value="">请选择项目</option>
                        ${cancelEventOptions
                          .map((item) => `<option value="${escapeAttribute(item.eventId || item.eventName)}" ${form.targetCancelEventKey === (item.eventId || item.eventName) ? "selected" : ""}>${escapeHtml(item.eventName || item.eventId || "-")}</option>`)
                          .join("")}
                      </select>
                    </div>`
                  : ""
              }`
            : ""
        }
        ${
          actionType === "edit_basic_info"
            ? `
              <div class="field"><label>姓名</label><input data-prerace-field="basicName" value="${escapeAttribute(form.basicName || profile.name || "")}" /></div>
              <div class="field"><label>单位</label><input data-prerace-field="basicOrganization" value="${escapeAttribute(form.basicOrganization || profile.organization || "")}" /></div>
              <div class="field"><label>证件号</label><input data-prerace-field="basicCertificateNumber" value="${escapeAttribute(form.basicCertificateNumber || profile.certificateNumber || "")}" /></div>
              <div class="field"><label>电话</label><input data-prerace-field="basicPhone" value="${escapeAttribute(form.basicPhone || profile.phone || "")}" /></div>
            `
            : ""
        }
        <div class="field pre-race-reason-field">
          <label>变更原因</label>
          <input data-prerace-field="reason" value="${escapeAttribute(form.reason || "")}" placeholder="例如：报名组别误选、现场弃赛、裁判确认补报" />
        </div>
      </div>
      <div class="field-actions">
        <button class="ghost-button" data-admin-action="save-prerace-draft">保存调整草稿</button>
        <button class="cta-button" data-admin-action="preview-prerace-change">生成影响预览</button>
        <button class="ghost-button" data-admin-action="reset-prerace-form">清空当前调整</button>
      </div>
      <p class="hint">号码原则：改组、改项目、弃赛、恢复和补报项目都会保留原号码，不会自动重新编号。</p>
    </div>
  `;
}

function renderPreRaceGroupCombobox(profile, form, groupOptions) {
  const groupedOptions = getPreRaceGroupedTargetGroups(profile, groupOptions);
  const visibleGroups = [
    ...groupedOptions.current,
    ...groupedOptions.recommended,
    ...groupedOptions.other,
  ];
  const selectedGroup = visibleGroups.find((group) => group.groupKey === form.targetGroupKey) || null;
  const selectedIsCurrent = selectedGroup && isPreRaceCurrentGroup(profile, selectedGroup);
  const triggerText = selectedGroup && !selectedIsCurrent ? selectedGroup.label : "请选择新组别";
  const isOpen = Boolean(form.changeGroupComboboxOpen);
  return `
    <div class="field pre-race-target-group-field">
      <label>新组别</label>
      <div class="change-combobox ${isOpen ? "is-open" : ""}" data-change-combobox>
        <button
          class="change-combobox-trigger ${selectedGroup && !selectedIsCurrent ? "has-value" : ""}"
          type="button"
          data-admin-action="toggle-prerace-target-group-combobox"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          <span>${escapeHtml(triggerText)}</span>
          <em>⌄</em>
        </button>
        ${
          isOpen
            ? `<div class="change-combobox-panel">
                ${
                  visibleGroups.length
                    ? `
                      ${renderPreRaceGroupSection("当前组别", groupedOptions.current, profile, form)}
                      ${renderPreRaceGroupSection("推荐组别", groupedOptions.recommended, profile, form)}
                      ${renderPreRaceGroupSection("其他可选组别", groupedOptions.other, profile, form)}
                    `
                    : `<div class="change-combobox-empty">当前没有找到与运动员性别匹配的可选组别。</div>`
                }
              </div>`
            : ""
        }
      </div>
      <p class="hint">系统会优先推荐低风险目标组别；如需跨休闲/专业或反向调整，可在“其他可选组别”中选择，确认前必须生成影响预览。</p>
    </div>
  `;
}

function renderPreRaceGroupSection(title, groups, profile, form) {
  if (!groups.length) {
    return "";
  }
  return `
    <div class="change-combobox-section">
      <div class="change-combobox-section-title">${escapeHtml(title)}</div>
      ${groups.map((group) => renderPreRaceGroupOption(group, profile, form)).join("")}
    </div>
  `;
}

function renderPreRaceGroupOption(group, profile, form) {
  const isCurrent = isPreRaceCurrentGroup(profile, group);
  const isActive = form.targetGroupKey === group.groupKey;
  const currentCount = Number(group.athleteCount || 0);
  const adjustedCount = isCurrent ? currentCount : currentCount + 1;
  const classes = [
    "change-combobox-option",
    isActive && !isCurrent ? "change-combobox-option-active" : "",
    isCurrent ? "change-combobox-option-disabled" : "",
    group.recommended ? "change-combobox-option-recommended" : "",
    group.riskLevel === "high" ? "change-combobox-option-high" : "",
    group.riskLevel === "medium" ? "change-combobox-option-medium" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button
      class="${classes}"
      type="button"
      data-admin-action="select-prerace-target-group"
      data-group-key="${escapeAttribute(group.groupKey)}"
      ${isCurrent ? "disabled" : ""}
    >
      <span class="change-combobox-option-head">
        <strong>${escapeHtml(group.label || `${formatGroupNameForDisplay(group.groupName || "-")} · ${group.gender || "未填性别"}`)}</strong>
        ${
          isCurrent
            ? `<em>当前组别</em>`
            : isActive
              ? `<em>已选择</em>`
              : group.recommended
                ? `<em>推荐</em>`
                : group.riskLevel === "high"
                  ? `<em class="risk">高风险</em>`
                  : group.riskLevel === "medium"
                    ? `<em class="medium">需确认</em>`
                    : ""
        }
      </span>
      <span class="change-combobox-option-meta">
        ${isCurrent ? `当前 ${escapeHtml(currentCount)} 人` : `当前 ${escapeHtml(currentCount)} 人 → 调整后 ${escapeHtml(adjustedCount)} 人`}
      </span>
      <span class="change-combobox-option-meta subtle">
        ${escapeHtml(group.riskReason || (isCurrent ? "当前所在组别，不能选择" : "具体影响请点击“生成影响预览”"))}
      </span>
    </button>
  `;
}

function renderPreRaceImpactPreview(preview, highRiskUnlocked) {
  const hasHighRisk = preview.risk.level === "high";
  return `
    <div class="pre-race-card pre-race-preview ${hasHighRisk ? "has-risk" : ""}">
      <div class="admin-section-header compact">
        <div class="admin-section-title-wrap">
          <h4>4. 影响预览</h4>
          <p class="admin-section-summary-text">以下是根据当前调整重新推导后的变化清单。确认应用后才会重建赛程、分组和秩序册。</p>
        </div>
        <span class="pre-race-risk-badge ${escapeAttribute(preview.risk.level)}">${escapeHtml(preview.risk.label)}</span>
      </div>
      <div class="pre-race-preview-grid">
        <div>
          <h5>人数变化</h5>
          ${renderPreRacePreviewList(preview.countChanges, "本次调整未造成人数变化。")}
        </div>
        <div>
          <h5>赛制变化</h5>
          ${renderPreRacePreviewList(preview.roundChanges, "本次调整未改变赛制轮次。")}
        </div>
        <div>
          <h5>赛程重建</h5>
          ${renderPreRacePreviewList(preview.scheduleChanges, "赛程条目结构保持一致，仅名单可能更新。")}
        </div>
        <div>
          <h5>秩序册影响</h5>
          ${renderPreRacePreviewList(preview.bookChanges, "秩序册名单将按调整后的正式数据同步。")}
        </div>
      </div>
      ${
        preview.risk.items.length
          ? `<div class="pre-race-risk-list">
              <h5>风险提示</h5>
              ${preview.risk.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
            </div>`
          : ""
      }
      <div class="field-actions pre-race-apply-actions">
        ${
          hasHighRisk && !highRiskUnlocked
            ? `<button class="danger-button" data-admin-action="unlock-prerace-high-risk">解锁高风险变更</button>`
            : ""
        }
        <button class="cta-button" data-admin-action="apply-prerace-change" ${hasHighRisk && !highRiskUnlocked ? "disabled" : ""}>确认应用重算结果</button>
      </div>
      <p class="hint">确认应用前会自动保存当前赛事备份；本次重算不会自动重新编号。</p>
    </div>
  `;
}

function renderPreRacePreviewList(items, emptyText) {
  if (!items?.length) {
    return `<p class="hint">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul class="pre-race-preview-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderPreRaceChangeRecordList(event) {
  const records = getPreRaceChangeRecords(event);
  return `
    <div class="pre-race-card">
      <h4>变更记录</h4>
      ${
        records.length
          ? `<div class="table-scroll-x">
              <table class="registration-table compact">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>运动员</th>
                    <th>变更类型</th>
                    <th>原信息</th>
                    <th>新信息</th>
                    <th>原因</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  ${records.slice().reverse().map(renderPreRaceChangeRecordRow).join("")}
                </tbody>
              </table>
            </div>`
          : `<p class="hint">暂无赛前变更记录。</p>`
      }
    </div>
  `;
}

function renderPreRaceChangeRecordRow(record) {
  return `
    <tr>
      <td>${escapeHtml(formatDateTime(record.appliedAt || record.createdAt) || "-")}</td>
      <td>${escapeHtml(`${record.bibNo || "-"} ${record.name || "-"}`)}</td>
      <td>${escapeHtml(getPreRaceChangeTypeLabel(record.type))}</td>
      <td>${escapeHtml(formatPreRaceRecordSide(record.from))}</td>
      <td>${escapeHtml(formatPreRaceRecordSide(record.to))}</td>
      <td>${escapeHtml(record.reason || "-")}</td>
      <td>${escapeHtml(getPreRaceRecordStatusLabel(record.status))}</td>
    </tr>
  `;
}

function ensurePreRaceChangeState() {
  if (!state.preRaceChange) {
    state.preRaceChange = {};
  }
  state.preRaceChange = {
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
    ...state.preRaceChange,
  };
  return state.preRaceChange;
}

function resetPreRaceChangeForm(options = {}) {
  const previous = ensurePreRaceChangeState();
  state.preRaceChange = {
    keyword: options.keepKeyword ? previous.keyword : "",
    selectedAthleteKey: options.keepAthlete ? previous.selectedAthleteKey : "",
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
  };
}

function getPreRaceChangeRecords(event) {
  if (!event) return [];
  event.changeRecords = Array.isArray(event.changeRecords) ? event.changeRecords : [];
  return event.changeRecords;
}

function ensurePreRaceChangeSourceImport(event) {
  if (!event?.registrationImport && !event?.changeSourceImport) {
    return null;
  }
  if (!event.changeSourceImport) {
    event.changeSourceImport = clone(event.registrationImport);
  }
  return event.changeSourceImport;
}

function getPreRaceCurrentImport(event) {
  return event?.registrationImport || event?.changeSourceImport || null;
}

function makePreRaceAthleteKey(record = {}) {
  return (
    getAthleteIdentityKey(record) ||
    (normalizeText(record.bibNo || record.bib) && normalizeText(record.name)
      ? `bib-name:${normalizeText(record.bibNo || record.bib)}:${normalizeText(record.name)}`
      : "")
  );
}

function collectPreRaceAthleteProfiles(event) {
  const importData = getPreRaceCurrentImport(event);
  const profileMap = new Map();
  const touchProfile = (record = {}) => {
    const athleteKey = makePreRaceAthleteKey(record);
    if (!athleteKey) return null;
    if (!profileMap.has(athleteKey)) {
      profileMap.set(athleteKey, {
        athleteKey,
        bibNo: record.bibNo || record.bib || "",
        name: record.name || "",
        organization: record.organization || record.team || EMPTY_ORGANIZATION_LABEL,
        certificateNumber: record.certificateNumber || "",
        phone: record.phone || "",
        gender: record.genderLabel || record.gender || "",
        birthDate: record.birthDate || "",
        groupId: record.groupId || "",
        groupKey: record.groupKey || createRegistrationGroupKey(record),
        groupName: record.groupName || "",
        events: [],
        entries: [],
        entryRefs: [],
        hasResult: false,
        hasPrinted: false,
        hasQualification: false,
        hasPromoted: false,
      });
    }
    const profile = profileMap.get(athleteKey);
    profile.bibNo = profile.bibNo || record.bibNo || record.bib || "";
    profile.name = profile.name || record.name || "";
    profile.organization = profile.organization || record.organization || record.team || EMPTY_ORGANIZATION_LABEL;
    profile.certificateNumber = profile.certificateNumber || record.certificateNumber || "";
    profile.phone = profile.phone || record.phone || "";
    profile.gender = profile.gender || record.genderLabel || record.gender || "";
    profile.birthDate = profile.birthDate || record.birthDate || "";
    profile.groupId = profile.groupId || record.groupId || "";
    profile.groupKey = profile.groupKey || record.groupKey || createRegistrationGroupKey(record);
    profile.groupName = profile.groupName || record.groupName || "";
    return profile;
  };

  (importData?.athletes || []).forEach(touchProfile);
  (importData?.entries || []).forEach((entry) => {
    const profile = touchProfile(entry);
    if (!profile) return;
    const eventItem = {
      eventId: entry.eventId || "",
      eventKey: entry.eventKey || "",
      eventName: entry.eventName || "",
      groupKey: entry.groupKey || "",
    };
    if (!profile.events.some((item) => item.eventId === eventItem.eventId && item.eventName === eventItem.eventName)) {
      profile.events.push(eventItem);
    }
    profile.entries.push(entry);
  });

  (event?.days || []).forEach((day) => {
    (day.entries || []).forEach((entry) => {
      (entry.groups || []).forEach((group) => {
        const status = ensureGroupResultStatus(group);
        (group.athletes || []).forEach((athlete) => {
          const profile = touchProfile(athlete);
          if (!profile) return;
          profile.entryRefs.push({ day, entry, group, athlete });
          if (normalizeText(athlete.result)) profile.hasResult = true;
          if (status.printedAt || group.resultPrintedAt) profile.hasPrinted = true;
          if (status.qualificationCalculatedAt || group.qualificationCalculatedAt) profile.hasQualification = true;
          if (status.promotedAt || group.promotedAt) profile.hasPromoted = true;
        });
      });
    });
  });

  return Array.from(profileMap.values()).sort(comparePreRaceProfiles);
}

function comparePreRaceProfiles(left, right) {
  return compareBibNo(left.bibNo, right.bibNo) || compareRegistrationText(left.name, right.name);
}

function getPreRaceAthleteSearchResults(profiles, keyword) {
  return searchChangeAthletes(keyword, profiles).slice(0, 20);
}

function searchChangeAthletes(query, profiles = []) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) {
    return profiles.slice(0, 8);
  }

  return profiles
    .map((profile) => ({
      profile,
      score: scoreChangeAthleteMatch(profile, normalizedQuery),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        compareBibNo(left.profile.bibNo, right.profile.bibNo) ||
        compareRegistrationText(left.profile.name, right.profile.name)
    )
    .map((item) => item.profile);
}

function scoreChangeAthleteMatch(profile, query) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) return 0;

  const bib = normalizeText(profile.bibNo || "").toLowerCase();
  const bibWithoutLeadingZero = normalizeBibSearchValue(bib);
  const queryWithoutLeadingZero = normalizeBibSearchValue(normalizedQuery);
  const name = normalizeText(profile.name).toLowerCase();
  const certificateNumber = normalizeText(profile.certificateNumber).toLowerCase();
  const organization = normalizeText(profile.organization).toLowerCase();
  const eventNames = profile.events.map((item) => item.eventName).join(" ").toLowerCase();
  const groupName = normalizeText(profile.groupName).toLowerCase();

  if (bib && bib === normalizedQuery) return 1000;
  if (bibWithoutLeadingZero && bibWithoutLeadingZero === queryWithoutLeadingZero) return 950;
  if (bib && bib.startsWith(normalizedQuery)) return 900;
  if (bibWithoutLeadingZero && bibWithoutLeadingZero.startsWith(queryWithoutLeadingZero)) return 860;
  if (name && name === normalizedQuery) return 820;
  if (name && name.includes(normalizedQuery)) return 760;
  if (certificateNumber && certificateNumber.includes(normalizedQuery)) return 620;
  if (organization && organization.includes(normalizedQuery)) return 520;
  if (eventNames && eventNames.includes(normalizedQuery)) return 420;
  if (groupName && groupName.includes(normalizedQuery)) return 260;
  return 0;
}

function normalizeBibSearchValue(value) {
  const normalized = normalizeText(value).toLowerCase();
  const trimmed = normalized.replace(/^0+/, "");
  return trimmed || (normalized ? "0" : "");
}

function getPreRaceExactBibMatches(profiles, keyword) {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  const keywordWithoutLeadingZero = normalizeBibSearchValue(normalizedKeyword);
  if (!normalizedKeyword) return [];

  return profiles.filter((profile) => {
    const bib = normalizeText(profile.bibNo || "").toLowerCase();
    if (!bib) return false;
    return bib === normalizedKeyword || normalizeBibSearchValue(bib) === keywordWithoutLeadingZero;
  });
}

function autoSelectPreRaceExactBibMatch() {
  const event = getAdminEvent();
  const form = ensurePreRaceChangeState();
  const matches = getPreRaceExactBibMatches(collectPreRaceAthleteProfiles(event), form.keyword);
  if (matches.length !== 1 || form.selectedAthleteKey === matches[0].athleteKey) {
    return false;
  }

  applyPreRaceSelectedProfile(matches[0], { syncKeyword: false });
  return true;
}

function schedulePreRaceSearchRender() {
  clearTimeout(preRaceSearchRenderTimer);
  preRaceSearchRenderTimer = setTimeout(() => {
    preRaceSearchRenderTimer = null;
    renderView();
  }, 120);
}

function getPreRaceGroupOptions(event) {
  const importData = getPreRaceCurrentImport(event);
  const map = new Map();
  const countMap = createPreRaceGroupAthleteCountMap(importData);
  const groupDefinitions = getPreRaceGroupDefinitions(event);
  const addGroup = (group = {}) => {
    const groupName = group.name || group.groupName || group.displayName || group.division || "";
    const gender = normalizePreRaceGender(group.gender || group.genderLabel || groupName);
    const groupId = group.id || group.groupId || group.registrationGroupId || "";
    const definition = findPreRaceGroupDefinition({ groupId, groupName }, groupDefinitions);
    const groupKey = group.compoundId || group.groupKey || group.registrationGroupKey || createRegistrationGroupKey({
      groupId,
      groupName,
      gender,
      genderLabel: gender,
    });
    if (!groupKey || map.has(groupKey)) return;
    map.set(groupKey, {
      groupKey,
      groupId,
      groupName,
      gender,
      series: group.series || group.seriesId || definition?.series || "",
      seriesName: group.seriesName || definition?.seriesName || "",
      order: Number.isFinite(Number(group.order)) ? Number(group.order) : definition?.order || 0,
      athleteCount: countMap.get(groupKey) || 0,
      label: `${formatGroupNameForDisplay(groupName)}${gender ? ` · ${gender}` : ""}`,
    });
  };

  (importData?.importedGroupDefinitions || importData?.formationCheckResult?.groupDefinitions || []).forEach(addGroup);
  (importData?.groups || []).forEach(addGroup);
  (importData?.entries || []).forEach(addGroup);
  (event?.days || []).forEach((day) => {
    (day.entries || []).forEach((entry) => {
      addGroup({
        groupId: entry.registrationGroupId || entry.groupId,
        groupKey: entry.registrationGroupKey || entry.groupKey,
        groupName: entry.division || entry.groupName,
        gender: entry.gender,
      });
    });
  });

  return Array.from(map.values()).sort((left, right) => compareRegistrationText(left.label, right.label));
}

function getPreRaceGroupDefinitions(event) {
  const importData = getPreRaceCurrentImport(event);
  const importSettings = ensureImportSettingsDefaults(state.data).importSettings.eventFormationSettings || {};
  return normalizeFormationGroupDefinitions([
    ...(importData?.importedGroupDefinitions || []),
    ...(importData?.formationCheckResult?.groupDefinitions || []),
    ...(importSettings.importedGroupDefinitions || []),
    ...(importSettings.groupDefinitions || []),
  ]);
}

function findPreRaceGroupDefinition(group = {}, definitions = []) {
  const groupId = normalizeText(group.groupId || group.id || "");
  const groupName = normalizeGroupNameForChain(group.groupName || group.name || group.label || "");
  return definitions.find((definition) => {
    const definitionGroupId = normalizeText(definition.groupId || "");
    if (groupId && definitionGroupId && groupId === definitionGroupId) {
      return true;
    }
    return groupName && normalizeGroupNameForChain(definition.name) === groupName;
  }) || null;
}

function createPreRaceGroupAthleteCountMap(importData) {
  const map = new Map();
  const seen = new Set();
  const countRecord = (record = {}) => {
    const groupKey = record.groupKey || createRegistrationGroupKey(record);
    const athleteKey = makePreRaceAthleteKey(record) || record.athleteId || record.id || "";
    if (!groupKey || !athleteKey) return;
    const key = `${groupKey}|${athleteKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    map.set(groupKey, (map.get(groupKey) || 0) + 1);
  };
  (importData?.athletes || []).forEach(countRecord);
  (importData?.entries || []).forEach(countRecord);
  return map;
}

function getPreRaceVisibleTargetGroups(profile, groupOptions = []) {
  return groupOptions.filter((group) => isPreRaceSameGender(profile, group));
}

function getPreRaceGroupedTargetGroups(profile, groupOptions = []) {
  const visibleGroups = getPreRaceVisibleTargetGroups(profile, groupOptions).map((group) =>
    enrichPreRaceTargetGroup(profile, group)
  );
  return {
    current: visibleGroups.filter((group) => group.disabled),
    recommended: visibleGroups.filter((group) => !group.disabled && group.recommended),
    other: visibleGroups.filter((group) => !group.disabled && !group.recommended),
  };
}

function enrichPreRaceTargetGroup(profile, group) {
  const isCurrent = isPreRaceCurrentGroup(profile, group);
  const currentMeta = getPreRaceGroupMeta({
    groupId: profile.groupId,
    groupName: profile.groupName,
  });
  const targetMeta = getPreRaceGroupMeta(group);
  const sameSeries = Boolean(currentMeta.series && targetMeta.series && currentMeta.series === targetMeta.series);
  const hasComparableOrder = Number(currentMeta.order) > 0 && Number(targetMeta.order) > 0;

  if (isCurrent) {
    return {
      ...group,
      disabled: true,
      recommended: false,
      riskLevel: "low",
      riskReason: "当前所在组别，不能选择",
    };
  }

  if (sameSeries && hasComparableOrder && targetMeta.order > currentMeta.order) {
    return {
      ...group,
      ...targetMeta,
      disabled: false,
      recommended: true,
      riskLevel: "low",
      riskReason: "推荐：同系列向上调整",
    };
  }

  if (!sameSeries && currentMeta.series && targetMeta.series) {
    return {
      ...group,
      ...targetMeta,
      disabled: false,
      recommended: false,
      riskLevel: "high",
      riskReason: "高风险：跨系列调整，确认后需生成影响预览",
    };
  }

  if (sameSeries && hasComparableOrder && targetMeta.order < currentMeta.order) {
    return {
      ...group,
      ...targetMeta,
      disabled: false,
      recommended: false,
      riskLevel: "high",
      riskReason: "高风险：向低级别调整，确认后需生成影响预览",
    };
  }

  return {
    ...group,
    ...targetMeta,
    disabled: false,
    recommended: false,
    riskLevel: "medium",
    riskReason: "非系统推荐路径，具体影响请点击“生成影响预览”",
  };
}

function getPreRaceGroupMeta(group = {}) {
  const definition = findPreRaceGroupDefinition(group, getPreRaceGroupDefinitions(getAdminEvent()));
  return {
    series: group.series || definition?.series || "",
    seriesName: group.seriesName || definition?.seriesName || "",
    order: Number.isFinite(Number(group.order)) && Number(group.order) > 0 ? Number(group.order) : definition?.order || 0,
  };
}

function getPreRaceTargetGroupOption(event, profile, groupKey) {
  if (!profile || !groupKey) return null;
  const groupOptions = getPreRaceGroupOptions(event);
  return getPreRaceVisibleTargetGroups(profile, groupOptions)
    .map((group) => enrichPreRaceTargetGroup(profile, group))
    .find((group) => group.groupKey === groupKey) || null;
}

function serializePreRaceTargetGroup(group) {
  if (!group) return null;
  return {
    groupName: group.groupName || "",
    groupId: group.groupId || "",
    groupKey: group.groupKey || "",
    gender: group.gender || "",
    series: group.series || "",
    seriesName: group.seriesName || "",
    order: group.order || 0,
    recommended: Boolean(group.recommended),
    disabled: Boolean(group.disabled),
    riskLevel: group.riskLevel || "",
    riskReason: group.riskReason || "",
  };
}

function normalizePreRaceGender(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (/female|woman|girl|女子|女/.test(text.toLowerCase())) return "女";
  if (/male|man|boy|男子|男/.test(text.toLowerCase())) return "男";
  return text;
}

function isPreRaceSameGender(profile, group) {
  const athleteGender = normalizePreRaceGender(profile.gender || profile.groupName);
  const groupGender = normalizePreRaceGender(group.gender || group.groupName || group.label);
  if (!athleteGender || !groupGender) return true;
  return athleteGender === groupGender;
}

function isPreRaceCurrentGroup(profile, group) {
  const athleteGender = normalizePreRaceGender(profile.gender || profile.groupName);
  return (
    (profile.groupKey && profile.groupKey === group.groupKey) ||
    (profile.groupId && profile.groupId === group.groupId && athleteGender === normalizePreRaceGender(group.gender)) ||
    (normalizeText(profile.groupName) === normalizeText(group.groupName) && athleteGender === normalizePreRaceGender(group.gender))
  );
}

function getPreRaceGroupImpactText(profile, group) {
  const importData = getPreRaceCurrentImport(getAdminEvent());
  const entries = importData?.entries || [];
  const eventIds = new Set(profile.entries.map((entry) => entry.eventId).filter(Boolean));
  const roundChanges = [];
  eventIds.forEach((eventId) => {
    const beforeCount = entries.filter((entry) => entry.groupKey === group.groupKey && entry.eventId === eventId).length;
    const afterCount = beforeCount + 1;
    const beforeRounds = describePreRaceRoundPlan(beforeCount);
    const afterRounds = describePreRaceRoundPlan(afterCount);
    if (beforeRounds !== afterRounds) {
      roundChanges.push(`${beforeRounds} → ${afterRounds}`);
    }
  });
  if (roundChanges.length) {
    return `可能触发：${Array.from(new Set(roundChanges)).join("、")}`;
  }
  return "具体影响请点击“生成影响预览”";
}

function describePreRaceRoundPlan(athleteCount) {
  try {
    const rule = selectRoundPlanRule(Math.max(athleteCount, 1), state.data.importSettings?.roundPlanRules);
    return (rule.rounds || []).map((round) => round.roundName).join(" / ") || rule.name || "待定";
  } catch (error) {
    return "规则未匹配";
  }
}

function getPreRaceEventOptions(event) {
  const importData = getPreRaceCurrentImport(event);
  const map = new Map();
  (importData?.events || importData?.registrationEvents || []).forEach((item) => {
    const eventId = item.id || item.eventId || "";
    const eventName = item.name || item.eventName || "";
    if (!eventId && !eventName) return;
    const key = eventId || eventName;
    if (!map.has(key)) {
      map.set(key, {
        eventId: key,
        eventName,
        label: eventName || key,
      });
    }
  });
  return Array.from(map.values()).sort((left, right) => compareRegistrationText(left.label, right.label));
}

function getPreRaceSelectedProfile(event) {
  const form = ensurePreRaceChangeState();
  return collectPreRaceAthleteProfiles(event).find((profile) => profile.athleteKey === form.selectedAthleteKey) || null;
}

function updatePreRaceChangeField(field, value) {
  let form = ensurePreRaceChangeState();
  form[field] = value;
  if (field === "keyword") {
    autoSelectPreRaceExactBibMatch();
    return;
  }
  if (field !== "keyword") {
    form.preview = null;
    form.highRiskUnlocked = false;
  }
  if (field === "actionType") {
    form.targetGroupKey = "";
    form.targetGroup = null;
    form.riskLevel = "";
    form.riskReason = "";
    form.targetEventKey = "";
    form.targetCancelEventKey = "";
    form.withdrawScope = "all";
    form.basicName = "";
    form.basicOrganization = "";
    form.basicCertificateNumber = "";
    form.basicPhone = "";
    form.changeGroupComboboxOpen = false;
  }
  if (field === "targetGroupKey") {
    const event = getAdminEvent();
    const profile = getPreRaceSelectedProfile(event);
    const targetGroup = getPreRaceTargetGroupOption(event, profile, value);
    form = ensurePreRaceChangeState();
    form.targetGroup = serializePreRaceTargetGroup(targetGroup);
    form.riskLevel = targetGroup?.riskLevel || "";
    form.riskReason = targetGroup?.riskReason || "";
    form.changeGroupComboboxOpen = false;
  }
}

function togglePreRaceTargetGroupCombobox() {
  const form = ensurePreRaceChangeState();
  form.changeGroupComboboxOpen = !form.changeGroupComboboxOpen;
  renderView();
}

function closePreRaceTargetGroupCombobox(options = {}) {
  const form = ensurePreRaceChangeState();
  if (!form.changeGroupComboboxOpen) {
    return false;
  }
  form.changeGroupComboboxOpen = false;
  if (options.render !== false) {
    renderView();
  } else {
    const combo = document.querySelector("[data-change-combobox]");
    combo?.classList.remove("is-open");
    combo?.querySelector(".change-combobox-trigger")?.setAttribute("aria-expanded", "false");
    combo?.querySelector(".change-combobox-panel")?.remove();
  }
  return true;
}

function selectPreRaceAthlete(athleteKey) {
  const profile = collectPreRaceAthleteProfiles(getAdminEvent()).find((item) => item.athleteKey === athleteKey) || null;
  applyPreRaceSelectedProfile(profile, { syncKeyword: true });
  renderView();
}

function applyPreRaceSelectedProfile(profile, options = {}) {
  const form = ensurePreRaceChangeState();
  form.selectedAthleteKey = profile?.athleteKey || "";
  form.preview = null;
  form.highRiskUnlocked = false;
  form.targetGroupKey = "";
  form.targetGroup = null;
  form.riskLevel = "";
  form.riskReason = "";
  form.targetEventKey = "";
  form.targetCancelEventKey = "";
  if (profile && options.syncKeyword !== false) {
    form.keyword = `${profile.bibNo || ""} ${profile.name || ""}`.trim();
  }
  if (profile) {
    form.basicName = profile.name || "";
    form.basicOrganization = profile.organization || "";
    form.basicCertificateNumber = profile.certificateNumber || "";
    form.basicPhone = profile.phone || "";
  }
  form.changeGroupComboboxOpen = false;
}

function openPreRaceChangeForAthlete(athleteIndex) {
  const group = getAdminGroup();
  const athlete = group?.athletes?.[athleteIndex] || null;
  const athleteKey = makePreRaceAthleteKey(athlete);
  if (!athleteKey) {
    showAppNotice({ type: "error", title: "未找到可调整的运动员身份信息", duration: 2200 });
    return;
  }
  closeAthleteActionMenu();
  ensurePreRaceChangeState();
  state.preRaceChange.keyword = `${athlete.bib || athlete.bibNo || ""} ${athlete.name || ""}`.trim();
  state.preRaceChange.selectedAthleteKey = athleteKey;
  state.preRaceChange.targetGroupKey = "";
  state.preRaceChange.preview = null;
  state.preRaceChange.highRiskUnlocked = false;
  state.preRaceChange.targetGroup = null;
  state.preRaceChange.riskLevel = "";
  state.preRaceChange.riskReason = "";
  setActiveAdminTab("pre-race");
}

function createPreRaceChangeRecordFromForm(event, status = "previewed") {
  const form = ensurePreRaceChangeState();
  const profile = getPreRaceSelectedProfile(event);
  if (!profile) {
    throw new Error("请先选择要调整的运动员。");
  }
  const type = form.actionType || "change_group";
  const groupOptions = getPreRaceGroupOptions(event);
  const eventOptions = getPreRaceEventOptions(event);
  const targetGroup = groupOptions.find((item) => item.groupKey === form.targetGroupKey) || null;
  const targetGroupOption = getPreRaceTargetGroupOption(event, profile, form.targetGroupKey);
  const targetEvent = eventOptions.find((item) => item.eventId === form.targetEventKey) || null;
  const targetCancelEvent = profile.entries.find((item) => (item.eventId || item.eventName) === form.targetCancelEventKey) || null;
  const reason = normalizeText(form.reason);

  if (type === "change_group" && !targetGroup) throw new Error("请选择新组别。");
  if (type === "change_group" && targetGroupOption?.disabled) throw new Error("当前组别不可作为调整目标。");
  if (type === "add_event" && !targetEvent) throw new Error("请选择补报项目。");
  if ((type === "cancel_event" || (type === "withdraw" && form.withdrawScope === "event")) && !targetCancelEvent) {
    throw new Error("请选择要处理的项目。");
  }
  if (!reason) throw new Error("请填写变更原因，方便赛后追溯。");

  return {
    id: uid("change"),
    type,
    athleteKey: profile.athleteKey,
    bibNo: profile.bibNo || "",
    name: profile.name || "",
    certificateNumber: profile.certificateNumber || "",
    organization: profile.organization || "",
    from: {
      groupId: profile.groupId || "",
      groupKey: profile.groupKey || "",
      groupName: profile.groupName || "",
      eventIds: profile.entries.map((entry) => entry.eventId).filter(Boolean),
      eventNames: profile.entries.map((entry) => entry.eventName).filter(Boolean),
      entryIds: profile.entryRefs.map((ref) => ref.entry.id).filter(Boolean),
      targetEventId: targetCancelEvent?.eventId || "",
      targetEventName: targetCancelEvent?.eventName || "",
      withdrawScope: form.withdrawScope || "all",
    },
    to: {
      groupId: targetGroup?.groupId || "",
      groupKey: targetGroup?.groupKey || "",
      groupName: targetGroup?.groupName || "",
      targetGroup: serializePreRaceTargetGroup(targetGroupOption || targetGroup),
      riskLevel: targetGroupOption?.riskLevel || form.riskLevel || "",
      riskReason: targetGroupOption?.riskReason || form.riskReason || "",
      eventId: targetEvent?.eventId || "",
      eventName: targetEvent?.eventName || "",
      name: normalizeText(form.basicName || profile.name),
      organization: normalizeText(form.basicOrganization || profile.organization),
      certificateNumber: normalizeText(form.basicCertificateNumber || profile.certificateNumber),
      phone: normalizeText(form.basicPhone || profile.phone),
    },
    reason,
    targetGroup: serializePreRaceTargetGroup(targetGroupOption || targetGroup),
    riskLevel: targetGroupOption?.riskLevel || form.riskLevel || "",
    riskReason: targetGroupOption?.riskReason || form.riskReason || "",
    status,
    createdAt: createTimestamp(),
    appliedAt: "",
    hasResultRisk: Boolean(profile.hasResult || profile.hasPrinted || profile.hasQualification || profile.hasPromoted),
  };
}

function savePreRaceChangeDraft() {
  if (!ensureAdminAuthenticated()) return;
  const event = getAdminEvent();
  try {
    ensurePreRaceChangeSourceImport(event);
    const record = createPreRaceChangeRecordFromForm(event, "draft");
    getPreRaceChangeRecords(event).push(record);
    saveLocalData(state.data);
    showAppNotice({ type: "success", title: "赛前调整草稿已保存", duration: 1500 });
  } catch (error) {
    showAppNotice({ type: "error", title: error.message || "保存草稿失败", duration: 2400 });
  }
}

function previewPreRaceChange() {
  if (!ensureAdminAuthenticated()) return;
  const event = getAdminEvent();
  try {
    ensurePreRaceChangeSourceImport(event);
    const record = createPreRaceChangeRecordFromForm(event, "previewed");
    const preview = buildPreRaceChangePreview(event, record);
    const form = ensurePreRaceChangeState();
    form.preview = preview;
    form.highRiskUnlocked = false;
    renderView();
  } catch (error) {
    if (error?.isRoundPlanValidationStopped) {
      return;
    }
    showAppNotice({ type: "error", title: error.message || "生成影响预览失败", duration: 2600 });
  }
}

function unlockPreRaceHighRisk() {
  ensurePreRaceChangeState().highRiskUnlocked = true;
  showAppNotice({ type: "warning", title: "已解锁高风险变更，请再次核对预览清单", duration: 2200 });
  renderView();
}

function confirmApplyPreRaceChange() {
  if (!ensureAdminAuthenticated()) return;
  const form = ensurePreRaceChangeState();
  const preview = form.preview;
  if (!preview?.record) {
    showAppNotice({ type: "error", title: "请先生成影响预览", duration: 1800 });
    return;
  }
  if (preview.risk.level === "high" && !form.highRiskUnlocked) {
    showAppNotice({ type: "error", title: "该变更存在成绩或晋级风险，请先解锁高风险变更", duration: 2600 });
    return;
  }
  showAppDialog({
    eyebrow: "赛前名单调整",
    title: "确认应用重算结果",
    message: "系统将基于原始报名数据、手动补录和赛前调整记录重新生成当前赛事赛程、分组与秩序册。",
    tone: preview.risk.level === "high" ? "warning" : "normal",
    contentHtml: `
      <div class="qualification-apply-summary">
        <div><span>变更类型</span><strong>${escapeHtml(getPreRaceChangeTypeLabel(preview.record.type))}</strong></div>
        <div><span>运动员</span><strong>${escapeHtml(`${preview.record.bibNo || "-"} ${preview.record.name || "-"}`)}</strong></div>
        <div><span>风险等级</span><strong>${escapeHtml(preview.risk.label)}</strong></div>
      </div>
      ${
        preview.risk.items.length
          ? `<div class="app-dialog-warning-list">${preview.risk.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
          : ""
      }
    `,
    actions: [
      { label: "取消", variant: "ghost", closeOnClick: true },
      {
        label: "确认应用",
        variant: "primary",
        closeOnClick: true,
        onClick: () => applyPreRaceChangePreview(),
      },
    ],
  });
}

function applyPreRaceChangePreview() {
  const event = getAdminEvent();
  const form = ensurePreRaceChangeState();
  const preview = form.preview;
  if (!event || !preview?.record) return;

  const record = {
    ...preview.record,
    status: "applied",
    appliedAt: createTimestamp(),
  };
  const records = getPreRaceChangeRecords(event);
  if (record.type === "restore") {
    records.forEach((item) => {
      if (
        item.athleteKey === record.athleteKey &&
        ["withdraw", "cancel_event"].includes(item.type) &&
        item.status === "applied"
      ) {
        item.status = "reverted";
      }
    });
  }
  records.push(record);
  createPreRaceChangeBackup(event, record.id);

  let rebuiltImportData;
  try {
    rebuiltImportData = buildPreRaceAdjustedImportData(event, getEffectivePreRaceRecords(event));
  } catch (error) {
    if (!error?.isRoundPlanValidationStopped) {
      showAppNotice({ type: "error", title: error.message || "赛前重算失败", duration: 2600 });
    }
    return;
  }
  applyRegistrationImportToEvent(event, rebuiltImportData);
  event.changeRecords = records;
  record.status = "applied";
  event.changeRecords[event.changeRecords.length - 1] = record;
  saveLocalData(state.data);
  syncSelectionsToImportedSchedule(event);
  resetPreRaceChangeForm({ keepKeyword: true });
  renderShell();
  renderView();
  showAppNotice({ type: "success", title: "赛前变更已应用，赛程和秩序册已重算", duration: 2200 });
}

function createPreRaceChangeBackup(event, changeRecordId) {
  event.changeBackups = Array.isArray(event.changeBackups) ? event.changeBackups : [];
  const snapshot = clone({
    ...event,
    changeBackups: [],
  });
  event.changeBackups.unshift({
    id: uid("change-backup"),
    changeRecordId,
    createdAt: createTimestamp(),
    eventSnapshot: snapshot,
  });
  event.changeBackups = event.changeBackups.slice(0, 5);
}

function buildPreRaceChangePreview(event, record) {
  const beforeImport = buildPreRaceAdjustedImportData(event, getEffectivePreRaceRecords(event));
  const afterImport = buildPreRaceAdjustedImportData(event, getEffectivePreRaceRecords(event, record));
  const comparison = comparePreRaceImportData(beforeImport, afterImport);
  const risk = scanPreRaceChangeRisk(event, comparison.affectedCompetitionKeys, record.athleteKey, record);
  return {
    record,
    ...comparison,
    risk,
  };
}

function getEffectivePreRaceRecords(event, candidateRecord = null) {
  let records = getPreRaceChangeRecords(event).filter((record) => record.status === "applied");
  if (candidateRecord?.type === "restore") {
    records = records.filter(
      (record) =>
        !(
          record.athleteKey === candidateRecord.athleteKey &&
          ["withdraw", "cancel_event"].includes(record.type)
        )
    );
  }
  if (candidateRecord && candidateRecord.type !== "restore") {
    records = [...records, candidateRecord];
  }
  return records;
}

function buildPreRaceAdjustedImportData(event, records) {
  const sourceImport = mergeManualRegistrationsIntoPreRaceSource(
    event,
    clone(ensurePreRaceChangeSourceImport(event) || event.registrationImport)
  );
  const adjusted = applyPreRaceRecordsToImportData(sourceImport, records);
  return rebuildPreRaceImportData(event, sourceImport, adjusted);
}

function mergeManualRegistrationsIntoPreRaceSource(event, sourceImport) {
  const manualRegistrations = Array.isArray(event?.manualRegistrations) ? event.manualRegistrations : [];
  if (!manualRegistrations.length) {
    return sourceImport;
  }

  sourceImport.athletes = Array.isArray(sourceImport.athletes) ? sourceImport.athletes : [];
  sourceImport.entries = Array.isArray(sourceImport.entries) ? sourceImport.entries : [];
  sourceImport.manualRegistrations = Array.isArray(sourceImport.manualRegistrations)
    ? sourceImport.manualRegistrations
    : [];

  manualRegistrations.forEach((manualRegistration) => {
    sourceImport.manualRegistrations = upsertById(sourceImport.manualRegistrations, manualRegistration);
    const identityKey = getAthleteIdentityKey(manualRegistration) || manualRegistration.id;
    const groupKey = createManualRegistrationGroupKey(manualRegistration);
    const eventId = normalizeText(manualRegistration.eventId) || createStableId("manual-event", manualRegistration.eventName);
    const athleteId = createStableId("manual-athlete", identityKey || manualRegistration.id);
    const bibNo = manualRegistration.bibNo || manualRegistration.bib || "";

    sourceImport.athletes = upsertByIdentity(sourceImport.athletes, {
      id: athleteId,
      source: "manual-registration",
      bibNo,
      registrationNo: manualRegistration.registrationNo || "",
      name: manualRegistration.name || "",
      certificateNumber: manualRegistration.certificateNumber || "",
      gender: manualRegistration.gender || "",
      genderLabel: manualRegistration.genderLabel || manualRegistration.gender || "",
      birthDate: manualRegistration.birthDate || "",
      birthYear: manualRegistration.birthYear || "",
      phone: manualRegistration.phone || "",
      organization: manualRegistration.organization || manualRegistration.team || EMPTY_ORGANIZATION_LABEL,
      organizationLeader: manualRegistration.organizationLeader || manualRegistration.leader || "",
      organizationCoach: manualRegistration.organizationCoach || manualRegistration.coach || "",
      leaderNames: clone(manualRegistration.leaderNames || []),
      coachNames: clone(manualRegistration.coachNames || []),
      groupId: manualRegistration.groupId || "",
      groupKey,
      groupName: manualRegistration.groupName || "",
      identityKey,
    });

    const manualEntry = {
      ...manualRegistration,
      id: createStableId("manual-entry", `${manualRegistration.id || identityKey}|${eventId}`),
      athleteId,
      source: "manual-registration",
      bibNo,
      bib: bibNo,
      registrationNo: manualRegistration.registrationNo || "",
      name: manualRegistration.name || "",
      organization: manualRegistration.organization || manualRegistration.team || EMPTY_ORGANIZATION_LABEL,
      team: manualRegistration.organization || manualRegistration.team || EMPTY_ORGANIZATION_LABEL,
      groupId: manualRegistration.groupId || "",
      groupKey,
      groupName: manualRegistration.groupName || "",
      eventId,
      eventKey: createRegistrationEventKey(groupKey, eventId),
      eventName: manualRegistration.eventName || "",
      gender: manualRegistration.gender || "",
      genderLabel: manualRegistration.genderLabel || manualRegistration.gender || "",
      birthDate: manualRegistration.birthDate || "",
      birthYear: manualRegistration.birthYear || "",
      certificateNumber: manualRegistration.certificateNumber || "",
      phone: manualRegistration.phone || "",
    };
    const existingIndex = sourceImport.entries.findIndex((entry) => {
      const sameAthlete = getAthleteIdentityKey(entry) === getAthleteIdentityKey(manualEntry);
      return sameAthlete && normalizeText(entry.eventId) === normalizeText(manualEntry.eventId);
    });
    if (existingIndex >= 0) {
      sourceImport.entries[existingIndex] = { ...sourceImport.entries[existingIndex], ...manualEntry };
    } else {
      sourceImport.entries = upsertById(sourceImport.entries, manualEntry);
    }
  });

  return sourceImport;
}

function applyPreRaceRecordsToImportData(sourceImport, records) {
  let athletes = clone(sourceImport.athletes || []);
  let entries = clone(sourceImport.entries || []);
  const athleteByKey = () => new Map(athletes.map((athlete) => [makePreRaceAthleteKey(athlete), athlete]).filter(([key]) => key));

  records.forEach((record) => {
    if (!record || record.status === "reverted" || record.type === "restore") return;
    const matchesAthlete = (item) => makePreRaceAthleteKey(item) === record.athleteKey;

    if (record.type === "edit_basic_info") {
      const patch = {
        name: record.to.name || record.name,
        organization: record.to.organization || record.organization,
        certificateNumber: record.to.certificateNumber || record.certificateNumber,
        phone: record.to.phone || "",
      };
      athletes = athletes.map((athlete) => (matchesAthlete(athlete) ? { ...athlete, ...patch } : athlete));
      entries = entries.map((entry) => (matchesAthlete(entry) ? { ...entry, ...patch } : entry));
      return;
    }

    if (record.type === "change_group") {
      const groupKey = record.to.groupKey;
      const groupPatch = {
        groupId: record.to.groupId || "",
        groupKey,
        groupName: record.to.groupName || "",
      };
      athletes = athletes.map((athlete) => (matchesAthlete(athlete) ? { ...athlete, ...groupPatch } : athlete));
      entries = entries.map((entry) => {
        if (!matchesAthlete(entry)) return entry;
        return {
          ...entry,
          ...groupPatch,
          eventKey: createRegistrationEventKey(groupKey, entry.eventId),
        };
      });
      return;
    }

    if (record.type === "withdraw") {
      const eventId = record.from.targetEventId || "";
      entries = entries.filter((entry) => {
        if (!matchesAthlete(entry)) return true;
        return record.from.withdrawScope === "event" ? entry.eventId !== eventId : false;
      });
      athletes = athletes.map((athlete) =>
        matchesAthlete(athlete) ? { ...athlete, withdrawalStatus: "withdrawn" } : athlete
      );
      return;
    }

    if (record.type === "cancel_event") {
      const eventId = record.from.targetEventId || "";
      const eventName = record.from.targetEventName || "";
      entries = entries.filter((entry) => {
        if (!matchesAthlete(entry)) return true;
        return !(entry.eventId === eventId || (!eventId && entry.eventName === eventName));
      });
      return;
    }

    if (record.type === "add_event") {
      const map = athleteByKey();
      const athlete = map.get(record.athleteKey);
      if (!athlete) return;
      const groupKey = athlete.groupKey || record.from.groupKey || createRegistrationGroupKey(athlete);
      const eventId = record.to.eventId;
      const alreadyExists = entries.some((entry) => matchesAthlete(entry) && entry.eventId === eventId);
      if (alreadyExists) return;
      entries.push({
        id: createStableId("entry", `${record.athleteKey}|${groupKey}|${eventId}|${record.id}`),
        athleteId: athlete.id || createStableId("athlete", record.athleteKey),
        bibNo: athlete.bibNo || record.bibNo || "",
        registrationNo: athlete.registrationNo || "",
        name: athlete.name || record.name || "",
        organization: athlete.organization || record.organization || EMPTY_ORGANIZATION_LABEL,
        organizationLeader: athlete.organizationLeader || athlete.leader || "",
        organizationCoach: athlete.organizationCoach || athlete.coach || "",
        leader: athlete.leader || athlete.organizationLeader || "",
        coach: athlete.coach || athlete.organizationCoach || "",
        leaderNames: clone(athlete.leaderNames || []),
        coachNames: clone(athlete.coachNames || []),
        groupId: athlete.groupId || record.from.groupId || "",
        groupKey,
        groupName: athlete.groupName || record.from.groupName || "",
        eventId,
        eventKey: createRegistrationEventKey(groupKey, eventId),
        eventName: record.to.eventName || eventId,
        gender: athlete.gender || athlete.genderLabel || "",
        genderLabel: athlete.genderLabel || athlete.gender || "",
        birthDate: athlete.birthDate || "",
        certificateNumber: athlete.certificateNumber || "",
        maskedCertificateNumber: athlete.maskedCertificateNumber || "",
        phone: athlete.phone || "",
        source: "pre-race-change",
      });
    }
  });

  return { athletes, entries };
}

function rebuildPreRaceImportData(event, sourceImport, adjusted) {
  const importSettings = ensureImportSettingsDefaults(state.data).importSettings;
  const importedGroupDefinitions =
    sourceImport.importedGroupDefinitions ||
    sourceImport.formationCheckResult?.groupDefinitions ||
    [];
  const groupedData = createRegistrationGroupsAndEvents(adjusted.entries);
  const actualMaxAthletes = getActualMaxAthletesForRoundPlan(null, {
    events: groupedData.events,
    entries: adjusted.entries,
  });
  if (
    !ensureRoundPlanSettingsReadyForGeneration("赛前名单调整", {
      actualMaxAthletes,
      basisLabel: actualMaxAthletes
        ? `赛前调整后最大单项人数：${actualMaxAthletes} 人`
        : "赛前调整后暂未生成有效项目人数",
    })
  ) {
    const error = new Error("赛制规则存在错误，已停止赛前重算。");
    error.isRoundPlanValidationStopped = true;
    throw error;
  }
  const formationSettings = normalizeEventFormationSettings({
    ...importSettings.eventFormationSettings,
    importedGroupDefinitions,
  });
  const formationCheckResult = formationSettings.enabled
    ? createFormationCheckResult({ events: groupedData.events, entries: adjusted.entries }, formationSettings)
    : {
        enabled: false,
        minParticipants: formationSettings.minParticipants,
        underfilledItems: [],
        competitions: [],
        groupDefinitions: importedGroupDefinitions,
        groupDefinitionSource: importedGroupDefinitions.length ? "registration_json" : "none",
        hasImportedGroupDefinitions: Boolean(importedGroupDefinitions.length),
        groupOrder: [],
        isFallbackGroupOrder: false,
        summary: { underfilledCount: 0, mergeSuggestedCount: 0, cancelSuggestedCount: 0 },
      };
  const organizationRanges = createOrganizationRanges(adjusted.athletes);
  const baseImportData = {
    ...sourceImport,
    importedAt: createTimestamp(),
    targetEventId: event.id,
    targetEventName: event.name,
    warnings: [...(sourceImport.warnings || []), "已根据赛前名单调整重新生成赛程和秩序册。"],
    athletes: adjusted.athletes,
    groups: groupedData.groups,
    events: groupedData.events,
    registrationEvents: groupedData.events,
    entries: adjusted.entries,
    organizationRanges,
    formationCheckResult,
    importedGroupDefinitions,
    groupDefinitionSource: importedGroupDefinitions.length ? "registration_json" : "none",
    formationDecisions: {},
    mergedCompetitions: [],
    canceledCompetitions: [],
    keptUnderfilledCompetitions: [],
    summary: {
      ...(sourceImport.summary || {}),
      athletesCount: adjusted.athletes.length,
      entriesCount: adjusted.entries.length,
      groupsCount: groupedData.groups.length,
      eventsCount: groupedData.events.length,
      organizationRangesCount: organizationRanges.length,
      underfilledCompetitionsCount: formationCheckResult.underfilledItems.length,
      mergedCompetitionsCount: 0,
      canceledCompetitionsCount: 0,
      keptUnderfilledCompetitionsCount: 0,
      manualCount: event.manualRegistrations?.length || sourceImport.summary?.manualCount || 0,
    },
  };

  if (formationSettings.enabled && formationCheckResult.underfilledItems.length) {
    const decisions = createPreRaceFormationDecisions(event, formationCheckResult, formationSettings);
    return applyFormationDecisionsToImportData(baseImportData, decisions, {
      eventFormationSettings: formationSettings,
      maxAthletesPerGroup: importSettings.maxAthletesPerGroup,
      roundPlanRules: importSettings.roundPlanRules,
      roundSettings: state.data.roundSettings,
      roundPlanValidationContextLabel: "赛前名单调整",
    });
  }

  const scheduleItems = createScheduleItemsFromRegistration(groupedData.events, adjusted.entries, {
    maxAthletesPerGroup: importSettings.maxAthletesPerGroup,
    roundPlanRules: importSettings.roundPlanRules,
    roundSettings: state.data.roundSettings,
  });
  const bookData = createBookDataFromRegistration({
    eventId: event.id,
    eventName: event.name,
    athletes: adjusted.athletes,
    groups: groupedData.groups,
    events: groupedData.events,
    entries: adjusted.entries,
    organizationRanges,
    generatedAt: sourceImport.generatedAt || createTimestamp(),
  });

  return {
    ...baseImportData,
    scheduleItems,
    bookData,
  };
}

function createPreRaceFormationDecisions(event, formationCheckResult, formationSettings) {
  const defaults = createDefaultFormationDecisions(formationCheckResult);
  if (formationSettings.underfilledAction === "mark_only") {
    Object.keys(defaults).forEach((key) => {
      defaults[key] = { action: "keep", targetCompetitionKey: "" };
    });
  }
  return {
    ...defaults,
    ...(event.registrationImport?.formationDecisions || {}),
  };
}

function comparePreRaceImportData(beforeImport, afterImport) {
  const beforeMap = createPreRaceCompetitionSummaryMap(beforeImport);
  const afterMap = createPreRaceCompetitionSummaryMap(afterImport);
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const countChanges = [];
  const roundChanges = [];
  const scheduleChanges = [];
  const affectedCompetitionKeys = [];

  keys.forEach((key) => {
    const before = beforeMap.get(key) || { label: key, count: 0, rounds: [] };
    const after = afterMap.get(key) || { label: before.label || key, count: 0, rounds: [] };
    const label = after.label || before.label || key;
    if (before.count !== after.count) {
      countChanges.push(`${label}：${before.count} 人 → ${after.count} 人`);
      affectedCompetitionKeys.push(key);
    }
    const beforeRounds = before.rounds.join(" + ") || "无赛程";
    const afterRounds = after.rounds.join(" + ") || "无赛程";
    if (beforeRounds !== afterRounds) {
      roundChanges.push(`${label}：${beforeRounds} → ${afterRounds}`);
      affectedCompetitionKeys.push(key);
    }
  });

  const beforeScheduleKeys = new Set((beforeImport.scheduleItems || []).map(getRegistrationScheduleKey).filter(Boolean));
  const afterScheduleKeys = new Set((afterImport.scheduleItems || []).map(getRegistrationScheduleKey).filter(Boolean));
  const removed = Array.from(beforeScheduleKeys).filter((key) => !afterScheduleKeys.has(key)).length;
  const added = Array.from(afterScheduleKeys).filter((key) => !beforeScheduleKeys.has(key)).length;
  if (removed) scheduleChanges.push(`将删除 ${removed} 条报名生成赛程`);
  if (added) scheduleChanges.push(`将新增 ${added} 条报名生成赛程`);
  if (countChanges.length && !removed && !added) scheduleChanges.push("将重建受影响项目的分组名单");

  return {
    countChanges,
    roundChanges,
    scheduleChanges,
    bookChanges: [
      "运动员号码保持不变，不自动重新编号",
      "各代表队参赛名单会按新正式数据更新",
      "按组别和项目查看名单会重新生成",
    ],
    affectedCompetitionKeys: Array.from(new Set(affectedCompetitionKeys)),
  };
}

function createPreRaceCompetitionSummaryMap(importData) {
  const map = new Map();
  (importData.events || importData.registrationEvents || []).forEach((event) => {
    const key = event.compoundId || createRegistrationEventKey(event.groupKey, event.id);
    if (!key) return;
    map.set(key, {
      label: `${formatGroupNameForDisplay(event.groupName || "")} ${event.gender || ""} ${event.name || ""}`.trim() || key,
      count: 0,
      rounds: [],
    });
  });
  (importData.entries || []).forEach((entry) => {
    const key = entry.eventKey || createRegistrationEventKey(entry.groupKey, entry.eventId);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        label: `${formatGroupNameForDisplay(entry.groupName || "")} ${entry.gender || ""} ${entry.eventName || ""}`.trim() || key,
        count: 0,
        rounds: [],
      });
    }
    map.get(key).count += 1;
  });
  (importData.scheduleItems || []).forEach((entry) => {
    const key = entry.registrationEventKey || entry.competitionKey;
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { label: entry.projectName || key, count: 0, rounds: [] });
    }
    const round = getEntryRoundName(entry);
    if (round && !map.get(key).rounds.includes(round)) {
      map.get(key).rounds.push(round);
    }
  });
  return map;
}

function scanPreRaceChangeRisk(event, affectedCompetitionKeys = [], athleteKey = "", record = null) {
  const affected = new Set(affectedCompetitionKeys);
  const riskItems = [];
  let targetRiskLevel = record?.riskLevel || "";
  if (record?.type === "change_group" && record?.riskReason && targetRiskLevel && targetRiskLevel !== "low") {
    riskItems.push(`该调整不是系统推荐路径：${record.riskReason}。请确认现场规则允许。`);
    if (targetRiskLevel === "high") {
      riskItems.push("可能影响项目成立、赛制和秩序册，确认前请核对影响预览。");
    }
  }
  (event?.days || []).forEach((day) => {
    (day.entries || []).forEach((entry) => {
      const entryKey = entry.registrationEventKey || entry.competitionKey;
      const entryAffected = affected.has(entryKey);
      (entry.groups || []).forEach((group) => {
        const status = ensureGroupResultStatus(group);
        const hasTargetAthlete = (group.athletes || []).some((athlete) => makePreRaceAthleteKey(athlete) === athleteKey);
        if (!entryAffected && !hasTargetAthlete) return;
        const label = formatEntryOptionLabel(entry);
        if ((group.athletes || []).some((athlete) => normalizeText(athlete.result))) {
          riskItems.push(`${label} 已有成绩，自动重建可能覆盖现场记录。`);
        }
        if (status.printedAt || group.resultPrintedAt) {
          riskItems.push(`${label} 已打印成绩单。`);
        }
        if (status.qualificationCalculatedAt || group.qualificationCalculatedAt) {
          riskItems.push(`${label} 已计算晋级名单。`);
        }
        if (status.promotedAt || group.promotedAt) {
          riskItems.push(`${label} 已应用到下一轮。`);
        }
      });
    });
  });
  const uniqueItems = Array.from(new Set(riskItems));
  const level = uniqueItems.length
    ? targetRiskLevel === "medium" && !uniqueItems.some((item) => item.includes("高风险") || item.includes("已有成绩") || item.includes("已打印") || item.includes("已计算") || item.includes("已应用"))
      ? "medium"
      : "high"
    : "safe";
  return {
    level,
    label: level === "high" ? "高风险" : level === "medium" ? "中风险" : "赛前安全",
    items: uniqueItems,
  };
}

function getPreRaceChangeTypeLabel(type) {
  return {
    change_group: "改组别",
    change_event: "改项目",
    add_event: "补报项目",
    cancel_event: "取消某项目",
    withdraw: "弃赛",
    restore: "恢复参赛",
    edit_basic_info: "修改基础信息",
  }[type] || "赛前调整";
}

function getPreRaceRecordStatusLabel(status) {
  return {
    draft: "草稿",
    previewed: "已预览",
    applied: "已应用",
    reverted: "已撤销",
  }[status] || status || "-";
}

function formatPreRaceRecordSide(side = {}) {
  return [
    side.groupName,
    side.eventName || side.targetEventName,
    side.name,
    side.organization,
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" / ") || "-";
}

function renderAdminRulesTab() {
  return `
    ${renderImportSettingsPanel()}
    ${renderRoundSettingsPanel()}
  `;
}

function renderAdminScheduleTab(context) {
  return renderAdminEntrySection(context);
}

function renderAdminGroupsTab(context) {
  return renderAdminGroupAthleteSection(context, {
    title: "分组与运动员",
    desc: "分组摘要和名单可直接维护，前台“分组详情”页会实时展示。",
    mode: "groups",
  });
}

function renderAdminResultsTab(context) {
  return `
    ${renderAdminCurrentEntryRuleBlock(context)}
    ${renderAdminResultControls(context)}
    ${renderAdminGroupAthleteSection(context, {
      title: "成绩录入",
      desc: "录入成绩、查看合并来源，并为晋级计算提供数据。",
      mode: "results",
    })}
  `;
}

function renderAdminCurrentEntryRuleBlock({ adminEvent, adminDay, adminEntry }) {
  if (!adminEvent || !adminDay || !adminEntry) {
    return "";
  }

  const entryPath = `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}]`;
  return renderEntryRaceRulePanel(adminEntry, entryPath, { hideRecalculateButton: true });
}

function renderAdminExportTab() {
  return `
    <section class="admin-section admin-section-card admin-compact-section">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">导出与云端发布</h3>
          <p class="admin-section-summary-text">本地修改会自动保存；只有点击发布按钮，才会覆盖云端正式数据。</p>
        </div>
      </div>
      <div class="admin-action-groups">
        <div class="admin-action-group">
          <span class="admin-action-group-label">常用导出</span>
          <div class="selector-actions">
            <button class="ghost-button" data-admin-action="export-json">导出系统备份 JSON</button>
            <button class="ghost-button" data-admin-action="export-book-html">导出秩序册 HTML</button>
            <button class="cta-button" data-admin-action="export-book-pdf">导出秩序册 PDF</button>
          </div>
          <p class="hint">PDF 会打开打印窗口，可在浏览器里选择“另存为 PDF”。</p>
        </div>
        <div class="admin-action-group">
          <span class="admin-action-group-label">云端发布</span>
          <div class="selector-actions">
            <span class="badge">已自动保存到本地</span>
            <button class="ghost-button" data-admin-action="download-cloud">从云端拉取</button>
            <button class="cta-button" data-admin-action="upload-cloud">发布当前数据到云端</button>
          </div>
        </div>
        <details class="admin-advanced-actions">
          <summary>低频导出</summary>
          <div class="selector-actions">
            <button class="ghost-button" data-admin-action="export-book-json">导出秩序册数据 JSON</button>
          </div>
        </details>
      </div>
      <p class="hint">
        GitHub Pages 正式站点打开时会自动优先读取云端正式数据，并同步刷新站点本地缓存。
        ${cloudClient ? "" : " 当前 Supabase Publishable Key 仍是占位值，云端拉取/发布按钮在替换真实 key 前无法成功执行。"}
      </p>
    </section>
  `;
}

function renderAdminAdvancedTab(context) {
  return `
    <section class="admin-section admin-section-card admin-danger-zone">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">高级数据操作</h3>
          <p class="admin-section-summary-text">这里放低频备份和危险恢复操作，执行前请确认当前本地数据已经备份。</p>
        </div>
      </div>
      <div class="admin-action-groups">
        <div class="admin-action-group">
          <span class="admin-action-group-label">系统备份</span>
          <div class="selector-actions">
            <button class="ghost-button" data-admin-action="import-json">导入系统备份 JSON</button>
          </div>
        </div>
        <div class="admin-action-group">
          <span class="admin-action-group-label">危险操作</span>
          <div class="selector-actions">
            <button class="danger-button" data-admin-action="reset-default-data">恢复默认演示数据</button>
          </div>
        </div>
      </div>
    </section>
    ${renderAdminSiteTextSection()}
    ${renderAdminAccountSecuritySection()}
  `;
}

function getAdminEventStats(adminEvent) {
  if (!adminEvent) {
    return [
      { label: "运动员", value: 0, unit: "人" },
      { label: "赛程条目", value: 0, unit: "项" },
      { label: "分组", value: 0, unit: "个" },
      { label: "参赛项次", value: 0, unit: "条" },
    ];
  }
  const importSummary = getEventRegistrationImport(adminEvent)?.summary || {};
  const entries = (adminEvent.days || []).flatMap((day) => day.entries || []);
  const raceEntries = entries.filter((entry) => entry.type !== "break");
  const groups = raceEntries.flatMap((entry) => entry.groups || []);
  const athletes = groups.flatMap((group) => group.athletes || []);
  const uniqueAthletes = new Set(
    athletes.map((athlete) => [athlete.bib || athlete.bibNo, athlete.name, athlete.team].filter(Boolean).join("|"))
  );
  return [
    { label: "运动员", value: importSummary.athletesCount || uniqueAthletes.size || 0, unit: "人" },
    { label: "赛程条目", value: raceEntries.length, unit: "项" },
    { label: "分组", value: importSummary.groupsCount || groups.length || 0, unit: "个" },
    { label: "参赛项次", value: importSummary.entriesCount || athletes.length || 0, unit: "条" },
    { label: "参赛不足项目", value: importSummary.underfilledCompetitionsCount || 0, unit: "个" },
    { label: "已合并项目", value: importSummary.mergedCompetitionsCount || 0, unit: "个" },
  ];
}

function renderAdminStatCard(label, value, unit = "") {
  return `
    <div class="admin-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(unit)}</small>
    </div>
  `;
}

function renderAdminEntrySection({
  adminEvent,
  adminDay,
  adminEntry,
  isFirstAdminEntry,
  isLastAdminEntry,
  canRunQualification,
}) {
  return `
    <section class="admin-section admin-section-card">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">赛程条目</h3>
          <p class="admin-section-summary-text">管理具体项目、时间、人数、分组数量、录取规则和晋级操作。</p>
        </div>
      </div>
      <div class="admin-workspace-controls admin-entry-workspace-controls">
        <div class="selector-grid admin-workspace-selector-grid admin-entry-selector-grid">
          ${renderAdminEntrySelector(adminDay, adminEntry, "admin-entry-select")}
        </div>
        ${
          adminEntry
            ? `
              <div class="field-actions entry-action-row">
                <button class="tiny-button" data-admin-action="add-entry">新增赛程</button>
                <button class="ghost-button" data-admin-action="move-entry-up" ${isFirstAdminEntry ? "disabled" : ""}>上移赛程</button>
                <button class="ghost-button" data-admin-action="move-entry-down" ${isLastAdminEntry ? "disabled" : ""}>下移赛程</button>
                <button class="tiny-button" data-admin-action="add-entry-after-current">新增到后面</button>
                <button class="ghost-button" data-admin-action="recalculate-current-entry-ranks">重新计算名次</button>
                <button class="cta-button" data-admin-action="execute-auto-qualification" ${canRunQualification ? "" : "disabled"}>应用到下一轮</button>
                <button class="danger-button" data-admin-action="remove-entry">删除当前赛程</button>
              </div>
            `
            : `<div class="field-actions entry-action-row"><button class="tiny-button" data-admin-action="add-entry" ${adminDay ? "" : "disabled"}>新增赛程</button></div>`
        }
      </div>
      ${
        adminEntry && adminEvent && adminDay
          ? `
            <div class="field-grid-3">
              ${renderField("时间", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].time`, adminEntry.time)}
              ${renderField("项目名称", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].projectName`, adminEntry.projectName)}
              ${renderField("条目类型", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].type`, adminEntry.type, "entryType")}
              ${renderField("组别", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].division`, formatGroupNameForDisplay(adminEntry.division))}
              ${renderField("性别", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].gender`, adminEntry.gender)}
              ${renderField("赛别", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].roundName`, getEntryRoundName(adminEntry), "roundName")}
              ${renderField("排组状态", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].scheduleStatus`, getEntryDisplayScheduleStatus(adminEntry), "scheduleStatus")}
              ${renderField("人数", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].participantCount`, adminEntry.participantCount)}
              ${renderField("组数", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].groupCount`, adminEntry.groupCount)}
            </div>
            <div class="entry-note-row">
              ${renderTextarea("备注", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].note`, sanitizeRegistrationScheduleNote(adminEntry.note), "entry-note-field")}
            </div>
            ${renderEntryRaceRulePanel(adminEntry, `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}]`)}
            ${renderQualificationRulePanel(adminDay, adminEntry, `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}]`)}
          `
          : renderHintCard("当前比赛日还没有赛程，请点击“新增赛程”。")
      }
    </section>
  `;
}

function renderAdminGroupAthleteSection(context, options = {}) {
  const { adminEvent, adminDay, adminEntry, adminGroup, canRunQualification } = context;
  const isResultsMode = options.mode === "results";
  const rankColumns = getEntryRankColumns(adminEntry);
  const emptyColspan = rankColumns.length + 8;
  const resultWorkflow = isResultsMode
    ? getGroupResultWorkflowInfo(adminEntry, adminGroup, canRunQualification, { sync: true })
    : null;
  return `
    <section class="admin-section admin-section-card">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">${escapeHtml(options.title || "分组与运动员")}</h3>
          <p class="admin-section-summary-text">${escapeHtml(options.desc || "分组摘要和名单可直接维护。")}</p>
        </div>
      </div>
      <div class="admin-workspace-controls admin-group-workspace-controls">
        <div class="selector-grid admin-workspace-selector-grid admin-group-selector-grid">
          ${renderAdminEntrySelector(adminDay, adminEntry, isResultsMode ? "admin-results-entry-select" : "admin-group-entry-select")}
          ${renderAdminGroupSelector(adminEntry, adminGroup, isResultsMode ? "admin-results-group-select" : "admin-athlete-group-select")}
          ${
            adminGroup && adminEntry && adminEvent && adminDay && !isResultsMode
              ? renderField("分组摘要", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].entries[${findEntryIndex(adminDay, adminEntry.id)}].groups[${findGroupIndex(adminEntry, adminGroup.id)}].summary`, adminGroup.summary)
              : ""
          }
        </div>
        ${
          adminGroup && !isResultsMode
            ? `<div class="field-actions"><button class="danger-button" data-admin-action="remove-group">删除当前分组</button></div>`
            : ""
        }
      </div>
      ${
        adminGroup && adminEntry && adminEvent && adminDay
          ? `
            ${
              isResultsMode
                ? ""
                : `<details class="athlete-import-collapse" data-admin-panel="athlete-bulk-import" ${getAdminPanelExpanded("athlete-bulk-import") ? "open" : ""}>
                    <summary class="athlete-import-toggle" aria-label="展开或收起批量粘贴导入">
                      <span class="athlete-import-toggle-icon" aria-hidden="true">▽</span>
                    </summary>
                    <div class="field athlete-import-field">
                      <label for="athlete-bulk-import">批量粘贴导入</label>
                      <textarea id="athlete-bulk-import" class="athlete-import-textarea" data-athlete-import-text placeholder="按行粘贴 Excel / WPS 数据，默认列顺序：道次\t号码\t姓名\t单位"></textarea>
                      <p class="hint athlete-import-hint">支持按 Tab 分列、按行导入。空行会自动跳过，额外列会忽略。</p>
                      <div class="field-actions athlete-import-actions">
                        <button class="ghost-button" data-admin-action="import-athletes-bulk" data-import-mode="append">追加导入</button>
                        <button class="cta-button" data-admin-action="import-athletes-bulk" data-import-mode="replace">清空后导入</button>
                      </div>
                    </div>
                  </details>`
            }
            <div class="toolbar" id="admin-athlete-list">
              <div>
                <h3>运动员名单</h3>
                <p>当前分组共 ${adminGroup.athletes.length} 名运动员。</p>
              </div>
              ${
                isResultsMode
                  ? ""
                  : `
                    <div class="field-actions">
                      <button class="tiny-button" data-admin-action="add-group">新增分组</button>
                      <button class="ghost-button" data-admin-action="sort-athletes-by-rank">按名次排序</button>
                      <button class="tiny-button" data-admin-action="add-athlete">新增运动员</button>
                    </div>
                  `
              }
            </div>
            ${isResultsMode ? renderGroupResultWorkflowStatus(resultWorkflow) : ""}
            ${isResultsMode ? renderPostRaceActionBar(resultWorkflow) : ""}
            ${renderEntryRankNotice(adminEntry)}
            <table class="admin-table">
              <thead>
                <tr>
                  ${rankColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
                  <th>道次</th>
                  <th>号码</th>
                  <th>姓名</th>
                  <th>单位</th>
                  <th>成绩</th>
                  <th>来源</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${
                  adminGroup.athletes.length
                    ? adminGroup.athletes.map((athlete, athleteIndex) =>
                        renderAthleteRow(
                          athlete,
                          athleteIndex,
                          findEventIndex(adminEvent.id),
                          findDayIndex(adminEvent, adminDay.id),
                          findEntryIndex(adminDay, adminEntry.id),
                          findGroupIndex(adminEntry, adminGroup.id),
                          adminEntry
                        )
                      ).join("")
                    : `<tr><td colspan="${emptyColspan}">当前分组还没有运动员名单，点击右上角新增即可。</td></tr>`
                }
              </tbody>
            </table>
          `
          : `<div class="empty-card">
              <p class="hint">当前赛程还没有分组，请先选择赛程，或点击“新增分组”。</p>
              ${isResultsMode ? "" : `<div class="field-actions"><button class="tiny-button" data-admin-action="add-group" ${adminEntry ? "" : "disabled"}>新增分组</button></div>`}
            </div>`
      }
    </section>
  `;
}

function getGroupResultWorkflowInfo(entry, group, canRunQualification, options = {}) {
  if (!entry || !group) {
    return {
      isComplete: false,
      hasAthletes: false,
      canRunQualification: false,
      hasExecutableQualification: false,
      status: createEmptyGroupResultStatus(),
    };
  }

  const hasAthletes = Boolean(group.athletes?.length);
  const isComplete =
    hasAthletes &&
    group.athletes.every((athlete) => parseCompetitionTime(athlete.result) != null);
  const hasExecutableQualification = Boolean(canRunQualification && hasExecutableQualificationRule(entry));
  const status = ensureGroupResultStatus(group);
  let changed = false;

  if (options.sync) {
    if (isComplete && !status.completedAt) {
      status.completedAt = createTimestamp();
      changed = true;
    }
    if (!isComplete && hasAnyGroupResultStatus(status)) {
      resetGroupResultStatus(group);
      changed = true;
    }
    if (changed) {
      saveLocalData(state.data);
    }
  }

  return {
    entry,
    group,
    isComplete,
    hasAthletes,
    canRunQualification: hasExecutableQualification,
    hasExecutableQualification,
    status: ensureGroupResultStatus(group),
  };
}

function createEmptyGroupResultStatus() {
  return {
    completedAt: "",
    recalculatedAt: "",
    printedAt: "",
    qualificationCalculatedAt: "",
    promotedAt: "",
  };
}

function ensureGroupResultStatus(group) {
  if (!group) {
    return createEmptyGroupResultStatus();
  }
  const existing = group.resultStatus || {};
  group.resultStatus = {
    completedAt: existing.completedAt || "",
    recalculatedAt: existing.recalculatedAt || "",
    printedAt: existing.printedAt || "",
    qualificationCalculatedAt: existing.qualificationCalculatedAt || "",
    promotedAt: existing.promotedAt || "",
  };
  return group.resultStatus;
}

function hasAnyGroupResultStatus(status = {}) {
  return Boolean(
    status.completedAt ||
      status.recalculatedAt ||
      status.printedAt ||
      status.qualificationCalculatedAt ||
      status.promotedAt
  );
}

function resetGroupResultStatus(group) {
  if (!group) return;
  group.resultStatus = createEmptyGroupResultStatus();
}

function resetGroupResultWorkflowAfterResultChange(group) {
  resetGroupResultStatus(group);
}

function resetEntryResultWorkflowStatuses(entry) {
  (entry?.groups || []).forEach(resetGroupResultStatus);
}

function markGroupResultStatus(group, fieldName) {
  const status = ensureGroupResultStatus(group);
  if (!status.completedAt && isGroupResultsComplete(group)) {
    status.completedAt = createTimestamp();
  }
  status[fieldName] = createTimestamp();
  return status;
}

function isGroupResultsComplete(group) {
  return Boolean(
    group?.athletes?.length &&
      group.athletes.every((athlete) => parseCompetitionTime(athlete.result) != null)
  );
}

function createTimestamp() {
  return new Date().toISOString();
}

function renderGroupResultWorkflowStatus(workflow) {
  if (!workflow?.group) {
    return "";
  }

  const { isComplete, hasExecutableQualification, status } = workflow;
  const tags = [];

  if (!isComplete) {
    tags.push({ text: "成绩录入中", tone: "muted" });
  } else {
    tags.push({ text: "成绩已录完", tone: "ready" });
    tags.push({ text: status.recalculatedAt ? "已重算名次" : "待重算", tone: status.recalculatedAt ? "done" : "todo" });
    tags.push({ text: status.printedAt ? "已打印" : "待打印", tone: status.printedAt ? "done" : "todo" });
    if (hasExecutableQualification) {
      tags.push({
        text: status.qualificationCalculatedAt ? "已计算晋级" : "待计算晋级",
        tone: status.qualificationCalculatedAt ? "done" : "todo",
      });
      tags.push({
        text: status.promotedAt ? "已应用到下一轮" : "待应用",
        tone: status.promotedAt ? "done" : "todo",
      });
    } else {
      tags.push({ text: "无晋级规则", tone: "muted" });
    }
  }

  return `
    <div class="post-race-status-strip" aria-label="当前分组赛后处理状态">
      ${tags
        .map((tag) => `<span class="post-race-status-badge ${tag.tone}">${escapeHtml(tag.text)}</span>`)
        .join("")}
    </div>
  `;
}

function renderPostRaceActionBar(workflow) {
  if (!workflow?.group || !workflow.isComplete) {
    return "";
  }

  const showQualificationActions = workflow.hasExecutableQualification;
  return `
    <div class="post-race-action-bar">
      <div>
        <h3>当前分组成绩已录完，请完成赛后处理</h3>
        <p>建议先重新计算名次并打印成绩单，再根据规则计算晋级名单并应用到下一轮。</p>
        ${workflow.entry?.isMergedRace ? `<p class="post-race-merge-note">${escapeHtml(getEntryMergeRankingNotice(workflow.entry))}</p>` : ""}
      </div>
      <div class="post-race-action-buttons">
        <button class="cta-button" data-admin-action="recalculate-sort-current-group-results">重新计算并排序</button>
        <button class="ghost-button" data-admin-action="print-current-group-result-sheet">打印本组成绩</button>
        ${
          showQualificationActions
            ? `
              <button class="ghost-button" data-admin-action="preview-auto-qualification">计算晋级名单</button>
              <button class="cta-button" data-admin-action="execute-auto-qualification">应用到下一轮</button>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function renderAdminResultControls({ adminDay, adminEntry, adminGroup, canRunQualification }) {
  const workflow = getGroupResultWorkflowInfo(adminEntry, adminGroup, canRunQualification, { sync: false });
  return `
    <section class="admin-section admin-section-card admin-compact-section">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">晋级执行</h3>
          <p class="admin-section-summary-text">${escapeHtml(getEntryQualificationSummary(adminEntry, adminDay))}</p>
        </div>
      </div>
      ${adminGroup ? renderGroupResultWorkflowStatus(workflow) : `<p class="hint">当前状态：请先选择赛程和分组。</p>`}
      <p class="hint">${escapeHtml(getEntryMergeRankingNotice(adminEntry) || "普通比赛会按当前赛程运动员成绩重新计算名次。")}</p>
    </section>
  `;
}

function ensureAppFeedbackState() {
  if (!state.appNotice) {
    state.appNotice = {
      open: false,
      id: "",
      type: "success",
      title: "",
      message: "",
    };
  }
  if (!state.appDialog) {
    state.appDialog = {
      open: false,
      eyebrow: "",
      title: "",
      message: "",
      contentHtml: "",
      tone: "normal",
      actions: [],
    };
  }
  return {
    notice: state.appNotice,
    dialog: state.appDialog,
  };
}

function showAppNotice(options = {}) {
  ensureAppFeedbackState();
  const noticeId = uid("notice");
  state.appNotice = {
    open: true,
    id: noticeId,
    type: options.type || "success",
    title: options.title || "",
    message: options.message || "",
  };
  renderView();

  if (appNoticeTimer) {
    window.clearTimeout(appNoticeTimer);
  }
  appNoticeTimer = window.setTimeout(() => {
    if (state.appNotice?.id === noticeId) {
      closeAppNotice();
    }
  }, options.duration || 1600);
}

function closeAppNotice() {
  ensureAppFeedbackState();
  state.appNotice.open = false;
  if (appNoticeTimer) {
    window.clearTimeout(appNoticeTimer);
    appNoticeTimer = null;
  }
  renderView();
}

function showAppDialog(options = {}) {
  ensureAppFeedbackState();
  appDialogActions.clear();
  const actions = normalizeAppDialogActions(options);
  state.appDialog = {
    open: true,
    eyebrow: options.eyebrow || "",
    title: options.title || "",
    message: options.message || "",
    contentHtml: options.contentHtml || "",
    tone: options.tone || "normal",
    actions,
  };
  renderView();
}

function normalizeAppDialogActions(options = {}) {
  const sourceActions = Array.isArray(options.actions)
    ? options.actions
    : [
        {
          label: options.cancelText || "取消",
          variant: "ghost",
          closeOnClick: true,
          onClick: options.onCancel,
        },
        {
          label: options.confirmText || "确定",
          variant: options.tone === "danger" ? "danger" : "primary",
          closeOnClick: true,
          onClick: options.onConfirm,
        },
      ];

  return sourceActions
    .filter((action) => action && action.label)
    .map((action, index) => {
      const actionId = uid(`dialog-action-${index}`);
      if (typeof action.onClick === "function") {
        appDialogActions.set(actionId, action.onClick);
      }
      return {
        id: actionId,
        label: action.label,
        variant: action.variant || "ghost",
        closeOnClick: action.closeOnClick !== false,
      };
    });
}

function closeAppDialog() {
  ensureAppFeedbackState();
  state.appDialog.open = false;
  state.appDialog.actions = [];
  appDialogActions.clear();
  renderView();
}

function runAppDialogAction(actionId) {
  const dialog = ensureAppFeedbackState().dialog;
  const action = (dialog.actions || []).find((item) => item.id === actionId);
  const callback = appDialogActions.get(actionId);
  const shouldClose = action?.closeOnClick !== false;

  if (shouldClose) {
    state.appDialog.open = false;
    state.appDialog.actions = [];
    appDialogActions.clear();
    renderView();
  }

  if (typeof callback === "function") {
    callback();
  }
}

function renderAppNotice() {
  const notice = ensureAppFeedbackState().notice;
  if (!notice.open || (!notice.title && !notice.message)) {
    return "";
  }
  return `
    <div class="app-notice app-notice-${escapeAttribute(notice.type || "success")}" role="status" aria-live="polite">
      <span class="app-notice-dot" aria-hidden="true"></span>
      <div>
        ${notice.title ? `<strong>${escapeHtml(notice.title)}</strong>` : ""}
        ${notice.message ? `<p>${escapeHtml(notice.message)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderAppDialog() {
  const dialog = ensureAppFeedbackState().dialog;
  if (!dialog.open) {
    return "";
  }

  return `
    <div class="app-dialog-backdrop" data-app-dialog-backdrop>
      <section class="app-dialog app-dialog-${escapeAttribute(dialog.tone || "normal")}" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">
        <div class="app-dialog-head">
          <div>
            ${dialog.eyebrow ? `<p class="app-dialog-eyebrow">${escapeHtml(dialog.eyebrow)}</p>` : ""}
            <h3 id="app-dialog-title">${escapeHtml(dialog.title || "提示")}</h3>
          </div>
          <button class="app-dialog-close" type="button" data-app-dialog-close aria-label="关闭弹窗">×</button>
        </div>
        ${dialog.message ? `<p class="app-dialog-message">${escapeHtml(dialog.message)}</p>` : ""}
        ${dialog.contentHtml ? `<div class="app-dialog-content">${dialog.contentHtml}</div>` : ""}
        ${
          dialog.actions?.length
            ? `<div class="app-dialog-actions">
                ${dialog.actions
                  .map(
                    (action) => `
                      <button class="${getAppDialogActionClass(action.variant)}" type="button" data-app-dialog-action="${escapeAttribute(action.id)}">
                        ${escapeHtml(action.label)}
                      </button>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </section>
    </div>
  `;
}

function getAppDialogActionClass(variant) {
  if (variant === "primary") return "cta-button";
  if (variant === "danger") return "danger-button";
  return "ghost-button";
}

function renderAdminEventInfoSection({ adminEvent }) {
  return `
    <section class="admin-section admin-section-card">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">赛事基础信息</h3>
          <p class="admin-section-summary-text">赛事名称、状态、场馆和说明会同步展示在首页和赛事详情页。</p>
        </div>
        ${adminEvent ? `<div class="field-actions"><button class="danger-button" data-admin-action="remove-event">删除当前赛事</button></div>` : ""}
      </div>
      ${
        adminEvent
          ? `
            <div class="form-grid">
              ${renderField("赛事名称", `events[${findEventIndex(adminEvent.id)}].name`, adminEvent.name)}
              ${renderField("阶段标签", `events[${findEventIndex(adminEvent.id)}].stageLabel`, adminEvent.stageLabel)}
              ${renderField("赛事状态", `events[${findEventIndex(adminEvent.id)}].status`, adminEvent.status, "status")}
              ${renderField("结束后首页展示", `events[${findEventIndex(adminEvent.id)}].showAfterFinished`, adminEvent.showAfterFinished !== false ? "true" : "false", "boolean")}
              ${renderField("比赛时间", `events[${findEventIndex(adminEvent.id)}].dateRange`, adminEvent.dateRange)}
              ${renderField("比赛场馆", `events[${findEventIndex(adminEvent.id)}].location`, adminEvent.location)}
              ${renderField("首页摘要", `events[${findEventIndex(adminEvent.id)}].summary`, adminEvent.summary)}
            </div>
            ${renderTextarea("赛事详情说明", `events[${findEventIndex(adminEvent.id)}].description`, adminEvent.description)}
          `
          : renderHintCard("请先新增一个赛事。")
      }
    </section>
  `;
}

function renderAdminDayInfoSection({ adminEvent, adminDay }) {
  return `
    <section class="admin-section admin-section-card admin-day-calendar-section">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">比赛日历管理</h3>
          <p class="admin-section-summary-text">按比赛天数维护日期、当日说明和赛程归属；前台会按这里的顺序切换展示。</p>
        </div>
        <div class="field-actions">
          <button class="tiny-button" data-admin-action="add-day" ${adminEvent ? "" : "disabled"}>新增比赛日</button>
          ${adminDay ? `<button class="danger-button" data-admin-action="remove-day">删除当前比赛日</button>` : ""}
        </div>
      </div>
      ${
        adminEvent
          ? `
            ${renderAdminDayCalendarList(adminEvent, adminDay)}
            ${
              adminDay
                ? `
                  <div class="admin-day-editor">
                    <div class="admin-subsection-header">
                      <div>
                        <h4>当前编辑：${escapeHtml(adminDay.label || "比赛日")}</h4>
                        <p class="hint">修改后会自动保存到本地，前台赛程日历会同步更新。</p>
                      </div>
                      <div class="field-actions">
                        <button class="ghost-button" data-admin-action="move-day-up" ${findDayIndex(adminEvent, adminDay.id) <= 0 ? "disabled" : ""}>上移</button>
                        <button class="ghost-button" data-admin-action="move-day-down" ${findDayIndex(adminEvent, adminDay.id) >= (adminEvent.days || []).length - 1 ? "disabled" : ""}>下移</button>
                      </div>
                    </div>
                    <div class="form-grid">
                      ${renderField("比赛日名称", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].label`, adminDay.label)}
                      ${renderField("日期", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].date`, adminDay.date, "date")}
                    </div>
                    ${renderTextarea("比赛日备注", `events[${findEventIndex(adminEvent.id)}].days[${findDayIndex(adminEvent, adminDay.id)}].note`, adminDay.note)}
                  </div>
                `
                : renderHintCard("当前赛事还没有比赛日，请点击“新增比赛日”。")
            }
          `
          : renderHintCard("请先新增一个赛事。")
      }
    </section>
  `;
}

function renderAdminDayCalendarList(adminEvent, adminDay) {
  const days = adminEvent.days || [];
  if (!days.length) {
    return renderHintCard("当前赛事还没有比赛日，请点击“新增比赛日”。");
  }

  return `
    <div class="admin-day-calendar-grid">
      ${days.map((day, index) => renderAdminDayCalendarCard(day, index, day.id === adminDay?.id)).join("")}
    </div>
  `;
}

function renderAdminDayCalendarCard(day, index, isActive) {
  const entries = day.entries || [];
  const raceCount = entries.filter((entry) => entry.type !== "break").length;
  const breakCount = entries.length - raceCount;
  const groupedCount = entries.filter((entry) => entry.groups?.length).length;

  return `
    <article class="admin-day-card ${isActive ? "active" : ""}">
      <div class="admin-day-card-main">
        <span class="admin-day-order">第 ${index + 1} 天</span>
        <h4>${escapeHtml(day.label || `第 ${index + 1} 天`)}</h4>
        <p>${escapeHtml(day.date || "待定日期")}</p>
        <small>${escapeHtml(day.note || "暂无当日说明")}</small>
      </div>
      <div class="admin-day-card-stats">
        <span>${entries.length} 个条目</span>
        <span>${raceCount} 场比赛</span>
        <span>${groupedCount} 个已分组</span>
        ${breakCount ? `<span>${breakCount} 个休整</span>` : ""}
      </div>
      <div class="admin-day-card-actions">
        ${
          isActive
            ? `<span class="badge">当前编辑</span>`
            : `<button class="ghost-button" data-admin-action="select-admin-day" data-day-id="${escapeAttribute(day.id)}">编辑这一天</button>`
        }
      </div>
    </article>
  `;
}

function renderAdminSiteTextSection() {
  return `
    <section class="admin-section admin-section-card">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">站点文案</h3>
          <p class="admin-section-summary-text">首页标题、说明文案、后台标题和页脚文案都可以在这里直接修改。</p>
        </div>
      </div>
      <div class="form-grid">
        ${renderField("品牌名称", "site.brandName", state.data.site.brandName)}
        ${renderField("系统名称", "site.systemName", state.data.site.systemName)}
        ${renderField("首页标签", "site.heroEyebrow", state.data.site.heroEyebrow)}
        ${renderField("首页区块标题", "site.homeSectionTitle", state.data.site.homeSectionTitle)}
      </div>
      <div class="admin-subsection">
        ${renderTextarea("首页主标题", "site.heroTitle", state.data.site.heroTitle)}
        ${renderTextarea("首页介绍", "site.heroDescription", state.data.site.heroDescription)}
        ${renderTextarea("赛事列表说明", "site.homeSectionDescription", state.data.site.homeSectionDescription)}
        ${renderTextarea("后台标题", "site.adminTitle", state.data.site.adminTitle)}
        ${renderTextarea("后台说明", "site.adminDescription", state.data.site.adminDescription)}
        ${renderTextarea("页脚文案", "site.footerText", state.data.site.footerText)}
      </div>
    </section>
  `;
}

function renderAdminAccountSecuritySection() {
  return `
    <section class="admin-section admin-section-card">
      <div class="admin-section-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">账户安全</h3>
          <p class="admin-section-summary-text">后台使用 Supabase Auth 统一登录，登录成功后才能编辑和发布。</p>
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
  `;
}

function renderImportSettingsPanel() {
  const settings = ensureImportSettingsDefaults(state.data).importSettings;
  return `
    <details class="admin-section admin-section-card settings-panel" data-admin-panel="import-settings" ${getAdminPanelExpanded("import-settings") ? "open" : ""}>
      <summary class="admin-section-header">
        <span class="admin-section-title-wrap">
          <span class="admin-section-title">号码与自动分组规则</span>
          <span class="admin-section-summary-text">控制号码生成方式、起始号码、位数和导入后自动分组人数。</span>
        </span>
        <span class="admin-section-summary" data-admin-panel-summary="import-settings">${escapeHtml(getImportSettingsSummaryText())}</span>
        <span class="admin-section-toggle" aria-hidden="true"></span>
      </summary>
      <div class="bib-settings-grid">
        <div class="field bib-mode-field">
          <label>号码规则</label>
          <select data-model="importSettings.bibMode">
            <option value="global_auto" ${settings.bibMode === "global_auto" ? "selected" : ""}>全赛事统一编号</option>
            <option value="keep_source" ${settings.bibMode === "keep_source" ? "selected" : ""}>保留报名号码</option>
            <option value="group_auto" ${settings.bibMode === "group_auto" ? "selected" : ""}>按组别编号</option>
          </select>
        </div>
        <div class="field bib-number-field">
          <label>起始号码</label>
          <input type="number" min="1" step="1" data-model="importSettings.startBibNo" data-model-number="true" value="${escapeAttribute(settings.startBibNo)}" />
        </div>
        <div class="field bib-number-field">
          <label>号码位数</label>
          <input type="number" min="1" step="1" data-model="importSettings.bibDigits" data-model-number="true" value="${escapeAttribute(settings.bibDigits)}" />
        </div>
        <div class="field bib-number-field">
          <label>每组最多人数</label>
          <input type="number" min="1" step="1" data-model="importSettings.maxAthletesPerGroup" data-model-number="true" value="${escapeAttribute(settings.maxAthletesPerGroup)}" />
        </div>
      </div>
      <p class="hint bib-settings-help">${escapeHtml(getBibModeDescription(settings.bibMode))}；导入报名 JSON 时按每组最多人数自动均衡拆组，并从 1 开始排道次。</p>
    </details>
  `;
}

function formatBibModeLabel(mode) {
  if (mode === "keep_source") return "保留报名号码";
  if (mode === "group_auto") return "按组别编号";
  return "全赛事统一编号";
}

function getBibModeDescription(mode) {
  if (mode === "keep_source") {
    return "适合报名系统已经生成正式号码的比赛。";
  }
  if (mode === "group_auto") {
    return "适合小型俱乐部赛，各组别可从相同起始号码开始。";
  }
  return "适合正式秩序册，整个赛事号码唯一且按单位连续。";
}

function formatFormationPriorityLabel(value) {
  if (value === "upper_division_same_event") return "上一组别同项目";
  if (value === "same_division_larger_event") return "同组别可合并项目";
  if (value === "cancel") return "无法合并则取消";
  return value || "未设置";
}

function renderFormationPriorityOptions(selectedValue) {
  return [
    "upper_division_same_event",
    "same_division_larger_event",
    "cancel",
  ]
    .map(
      (value) => `
        <option value="${escapeAttribute(value)}" ${selectedValue === value ? "selected" : ""}>
          ${escapeHtml(formatFormationPriorityLabel(value))}
        </option>
      `
    )
    .join("");
}

function getEventFormationSettings() {
  return ensureImportSettingsDefaults(state.data).importSettings.eventFormationSettings;
}

function getRaceMergeModeLabel(mode) {
  if (mode === "race_together_rank_together") return "合并后统一排名";
  if (mode === "cancel_only") return "不合并，只取消";
  return "合并后按原组别/原项目分别排名";
}

function getFormationRuleSummaryText() {
  const settings = getEventFormationSettings();
  if (!settings.enabled) {
    return "项目成立检查已关闭";
  }
  return [
    `少于 ${settings.minParticipants} 人进入合并/取消判断`,
    "以报名导出的组别作为原始组别",
    "上一组别推荐依赖报名 JSON 组别顺序",
    getRaceMergeModeLabel(settings.raceMergeMode),
  ].join("｜");
}

function getFormationSettingsForImportData(importData = null) {
  const baseSettings = getEventFormationSettings();
  if (importData?.groupDefinitionSource === "registration_json" && importData.importedGroupDefinitions?.length) {
    return normalizeEventFormationSettings({
      ...baseSettings,
      importedGroupDefinitions: importData.importedGroupDefinitions,
    });
  }
  return normalizeEventFormationSettings(baseSettings);
}

function getRegistrationGroupOrderContext(importData = null) {
  const currentImport = importData || getEventRegistrationImport(getAdminEvent());
  const importedDefinitions = normalizeFormationGroupDefinitions(currentImport?.importedGroupDefinitions || []);
  if (importedDefinitions.length && currentImport?.groupDefinitionSource === "registration_json") {
    return {
      source: "registration_json",
      definitions: importedDefinitions,
      message: "已从报名系统读取组别顺序。",
    };
  }

  const settings = getEventFormationSettings();
  const fallbackDefinitions = normalizeFormationGroupDefinitions(settings.groupDefinitions || []);
  if (fallbackDefinitions.length) {
    return {
      source: settings.groupDefinitionSource || "settings_groupDefinitions",
      definitions: fallbackDefinitions,
      message: "当前不是来自报名系统的结构化组别顺序，请人工确认。",
    };
  }

  return {
    source: "none",
    definitions: [],
    message: "当前报名 JSON 未包含组别顺序。系统不会自动猜测上一组别，人数不足项目需要人工确认合并目标或取消。",
  };
}

function renderRegistrationGroupOrderPanel(context) {
  const sourceClass = context.source === "registration_json" ? "is-imported" : "is-warning";
  const chains = createDisplayFormationGroupChainsFromDefinitions(context.definitions || []);
  return `
    <div class="formation-group-order-panel ${sourceClass}">
      <div class="formation-group-order-head">
        <h4>报名系统组别顺序</h4>
        <span>${escapeHtml(getGroupOrderSourceLabel(context.source))}</span>
      </div>
      <p>${escapeHtml(context.message)}</p>
      ${
        chains.length
          ? `<div class="formation-group-chain-list">
              ${chains
                .map(
                  (chain) => `
                    <div class="formation-group-chain-row">
                      <strong>${escapeHtml(chain.name || chain.id || "组别系列")}</strong>
                      <span>${escapeHtml((chain.groups || []).join(" → "))}</span>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : ""
      }
      <p class="hint">这里展示的是合并方向参考顺序，已按组别名称去重。男/女项目仍按报名数据分别处理，运动员所属组别以报名系统导出的 groupName/groupId 为准。</p>
    </div>
  `;
}

function createDisplayFormationGroupChainsFromDefinitions(definitions) {
  const seriesMap = new Map();
  normalizeFormationGroupDefinitions(definitions).forEach((definition, index) => {
    const seriesKey = definition.series || definition.seriesName || "registration-default";
    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, {
        id: seriesKey,
        name: definition.seriesName || definition.series || "组别系列",
        groups: [],
        seenGroupNames: new Set(),
      });
    }

    const chain = seriesMap.get(seriesKey);
    const displayName = normalizeGroupNameForDisplayOrder(definition.name);
    if (!displayName || chain.seenGroupNames.has(displayName)) {
      return;
    }
    chain.seenGroupNames.add(displayName);
    chain.groups.push({
      name: displayName,
      order: Number.isFinite(Number(definition.order)) ? Number(definition.order) : index + 1,
      index,
    });
  });

  return Array.from(seriesMap.values()).map((chain) => ({
    id: chain.id,
    name: chain.name,
    groups: chain.groups
      .sort((left, right) => left.order - right.order || left.index - right.index)
      .map((group) => group.name),
  }));
}

function normalizeGroupNameForDisplayOrder(groupName) {
  return normalizeText(groupName)
    .normalize("NFKC")
    .replace(/[（(]\s*(男|女|男子|女子)\s*[）)]/g, "")
    .replace(/\s*(男|女|男子|女子)组?$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getGroupOrderSourceLabel(source) {
  if (source === "registration_json") return "已从报名 JSON 读取";
  if (source === "none") return "未提供，需人工确认";
  return "非报名 JSON 来源";
}

function renderRoundSettingsPanel() {
  ensureRoundSettingsDefaults(state.data);
  ensureRoundPlanRuleDefaults(state.data);
  const importSettings = ensureImportSettingsDefaults(state.data).importSettings;
  const roundSettings = state.data.roundSettings;
  const rules = state.data.importSettings.roundPlanRules || [];
  const validation = validateRoundPlanSettings(state.data, getCurrentRoundPlanValidationOptions());
  return `
    <details class="admin-section admin-section-card settings-panel round-settings-panel" data-admin-panel="round-settings" ${getAdminPanelExpanded("round-settings") ? "open" : ""}>
      <summary class="admin-section-header">
        <span class="admin-section-title-wrap">
          <span class="admin-section-title">赛制与晋级规则</span>
          <span class="admin-section-summary-text">根据报名人数自动生成预赛、半决赛、决赛，并控制晋级规则。</span>
        </span>
        <span class="admin-section-summary" data-admin-panel-summary="round-settings">${escapeHtml(getRoundSettingsSummaryText())}</span>
        <span class="admin-section-toggle" aria-hidden="true"></span>
      </summary>
      ${renderEventFormationSettingsEditor()}

      <div class="round-settings-block admin-subsection">
        <div class="admin-subsection-header">
          <div>
            <h3 class="admin-subsection-title">赛别管理</h3>
            <p class="hint">赛程表里的“赛别”只从这里取值。</p>
          </div>
          <button class="tiny-button" data-admin-action="add-round-option">新增赛别</button>
        </div>
        <div class="round-option-list">
          ${roundSettings.roundOptions
            .map((option, index) => renderRoundOptionEditor(option, index))
            .join("")}
        </div>
      </div>

      <div class="round-settings-block admin-subsection">
        <div class="admin-subsection-header">
          <div>
            <h3 class="admin-subsection-title">人数触发规则</h3>
            <p class="hint">人数规则可以先保存为草稿，但导入报名 JSON 和赛前重算前，系统会进行赛制规则体检。若存在断档、重叠、轮次错误或晋级目标错误，将阻止生成赛程。</p>
          </div>
          <div class="field-actions">
            <button class="ghost-button" data-admin-action="validate-round-plan-settings">赛制规则自检</button>
            <button class="tiny-button" data-admin-action="add-round-plan-rule">新增规则</button>
          </div>
        </div>
        <div class="form-grid round-plan-check-settings">
          <div class="field">
            <label>预计最大单项人数</label>
            <input type="number" min="1" step="1" data-model="importSettings.roundPlanMaxExpectedAthletes" data-model-number="true" value="${escapeAttribute(importSettings.roundPlanMaxExpectedAthletes)}" />
            <p class="hint">未导入报名数据时按这个人数检查规则覆盖；导入后会优先按真实最大单项人数校验。</p>
          </div>
        </div>
        ${renderRoundPlanValidationSummary(validation)}
        ${renderRoundPlanSimulationTable()}
        <div class="round-rule-list">
          ${rules.map((rule, index) => renderRoundPlanRuleEditor(rule, index)).join("")}
        </div>
      </div>
    </details>
  `;
}

function renderRoundPlanValidationSummary(validation) {
  const errorCount = validation?.errors?.length || 0;
  const warningCount = validation?.warnings?.length || 0;
  const tone = errorCount ? "error" : warningCount ? "warning" : "success";
  const title = errorCount
    ? `赛制规则存在 ${errorCount} 个错误`
    : warningCount
      ? `赛制规则存在 ${warningCount} 个提醒`
      : "赛制规则体检通过";
  const issues = [...(validation?.errors || []), ...(validation?.warnings || [])].slice(0, 6);
  const basisLabel = validation?.context?.basisLabel || "";
  return `
    <div class="round-validation-summary round-validation-${tone}">
      <div>
        <strong>${escapeHtml(title)}</strong>
        ${basisLabel ? `<p>校验依据：${escapeHtml(basisLabel)}</p>` : ""}
        <p>${errorCount ? "导入报名 JSON 或赛前重算前必须先修复错误。" : "规则可以继续编辑；生成正式赛程前仍会再次体检。"}</p>
      </div>
      ${
        issues.length
          ? `<ul>${issues.map((issue) => `<li>${escapeHtml(issue.message)}</li>`).join("")}</ul>`
          : ""
      }
    </div>
  `;
}

function getCurrentRoundPlanValidationOptions() {
  const event = typeof getAdminEvent === "function" ? getAdminEvent() : null;
  return event ? { importData: event } : {};
}

function renderRoundPlanSimulationTable() {
  const testCounts = [1, 2, 3, 4, 5, 6, 7, 8, 12, 18, 19, 24, 45, 63, 1000];
  const validationContext = getRoundPlanValidationContext(state.data, getCurrentRoundPlanValidationOptions());
  const hardCheckMaxAthletes = validationContext.hardCheckMaxAthletes || DEFAULT_ROUND_PLAN_MAX_EXPECTED_ATHLETES;
  const rows = testCounts.map((count) => {
    try {
      const rule = findRoundPlanRuleForAthleteCount(count, state.data.importSettings?.roundPlanRules);
      return {
        count,
        ruleName: rule.name || "-",
        rounds: (rule.rounds || []).map((round) => getRoundNameById(round.roundId) || round.roundName).join(" → "),
        result: "正常",
        status: "ok",
      };
    } catch (error) {
      const isPressureOnly = count > hardCheckMaxAthletes;
      return {
        count,
        ruleName: "无匹配规则",
        rounds: "—",
        result: isPressureOnly
          ? "超出当前校验范围，仅作压力测试"
          : error.message || "错误",
        status: isPressureOnly ? "info" : "error",
      };
    }
  });
  return `
    <div class="round-simulation-panel">
      <div class="round-simulation-head">
        <strong>模拟人数测试</strong>
        <span>仅用于预览规则匹配，不生成真实赛程。</span>
      </div>
      <div class="table-scroll-x">
        <table class="round-simulation-table">
          <thead>
            <tr>
              <th>人数</th>
              <th>匹配规则</th>
              <th>生成轮次</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr class="is-${row.status}">
                <td>${escapeHtml(row.count)}</td>
                <td>${escapeHtml(row.ruleName)}</td>
                <td>${escapeHtml(row.rounds)}</td>
                <td>${escapeHtml(row.result)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEventFormationSettingsEditor() {
  const settings = ensureImportSettingsDefaults(state.data).importSettings.eventFormationSettings;
  const groupOrderContext = getRegistrationGroupOrderContext();
  return `
    <div class="round-settings-block admin-subsection formation-settings-block" id="event-formation-settings">
      <div class="admin-subsection-header">
        <div>
          <h3 class="admin-subsection-title">项目成立与合并规则</h3>
          <p class="hint">报名人数不足的小项，可按规程合并比赛、取消项目或人工保留。</p>
        </div>
      </div>
      <div class="formation-settings-form">
        <div class="formation-settings-grid">
          <div class="formation-field">
          <label>是否启用项目成立检查</label>
          <select class="formation-select" data-model="importSettings.eventFormationSettings.enabled">
            <option value="true" ${settings.enabled ? "selected" : ""}>开启</option>
            <option value="false" ${settings.enabled ? "" : "selected"}>关闭</option>
          </select>
        </div>
          <div class="formation-field formation-min-field">
          <label>最低参赛人数</label>
          <input class="formation-input" type="number" min="1" step="1" data-model="importSettings.eventFormationSettings.minParticipants" data-model-number="true" value="${escapeAttribute(settings.minParticipants)}" />
          <p class="formation-help">少于 ${escapeHtml(settings.minParticipants)} 人进入处理。</p>
        </div>
          <div class="formation-field">
          <label>默认处理方式</label>
          <select class="formation-select" data-model="importSettings.eventFormationSettings.underfilledAction">
            <option value="suggest_merge" ${settings.underfilledAction === "suggest_merge" ? "selected" : ""}>系统建议，人工确认</option>
            <option value="mark_only" ${settings.underfilledAction === "mark_only" ? "selected" : ""}>只标记，不处理</option>
            <option value="auto_merge" ${settings.underfilledAction === "auto_merge" ? "selected" : ""}>自动合并（不建议默认）</option>
          </select>
        </div>
          <div class="formation-field">
          <label>导入默认合并排名方式</label>
          <select class="formation-select" data-model="importSettings.eventFormationSettings.raceMergeMode">
            <option value="race_together_rank_separately" ${settings.raceMergeMode === "race_together_rank_separately" ? "selected" : ""}>合并比赛，按原组别/原项目分别排名</option>
            <option value="race_together_rank_together" ${settings.raceMergeMode === "race_together_rank_together" ? "selected" : ""}>合并比赛，统一排名</option>
            <option value="cancel_only" ${settings.raceMergeMode === "cancel_only" ? "selected" : ""}>不合并，只取消</option>
          </select>
          <p class="formation-help">这里只影响以后导入生成的新赛程；已生成赛程请在“成绩晋级”的本赛程规则设置里修改。</p>
        </div>
          <div class="formation-field formation-priority-field">
          <label>合并优先级</label>
          <div class="formation-priority-editor">
            ${(settings.mergePriority || [])
              .map(
                (item, index) => `
                  <div class="formation-priority-row">
                    <span>${index + 1}</span>
                    <select class="formation-select formation-priority-select" data-model="importSettings.eventFormationSettings.mergePriority[${index}]">
                      ${renderFormationPriorityOptions(item)}
                    </select>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
        </div>
        <div class="formation-help-box">
          运动员所属组别以报名系统导出的 groupName / groupId 为准。比赛系统不会重新根据年龄分组，只使用报名系统导出的组别顺序判断人数不足时的合并方向。
        </div>
        ${renderRegistrationGroupOrderPanel(groupOrderContext)}
      </div>
    </div>
  `;
}

function renderRoundOptionEditor(option, index) {
  return `
    <div class="round-option-row">
      <div class="field">
        <label>赛别名称</label>
        <input data-model="roundSettings.roundOptions[${index}].name" value="${escapeAttribute(option.name)}" />
      </div>
      <div class="field-actions">
        <button class="ghost-button" data-admin-action="move-round-option" data-index="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""}>上移</button>
        <button class="ghost-button" data-admin-action="move-round-option" data-index="${index}" data-direction="1" ${index === state.data.roundSettings.roundOptions.length - 1 ? "disabled" : ""}>下移</button>
        <button class="danger-button soft-danger-button" data-admin-action="remove-round-option" data-index="${index}" ${state.data.roundSettings.roundOptions.length <= 1 ? "disabled" : ""}>删除</button>
      </div>
    </div>
  `;
}

function renderRoundPlanRuleEditor(rule, ruleIndex) {
  return `
    <div class="round-rule-card">
      <div class="round-rule-card-head">
        <div>
          <h4>${escapeHtml(rule.name)}</h4>
          <p class="round-rule-summary">${escapeHtml(formatRoundPlanRuleDetailSummary(rule))}</p>
        </div>
        <div class="field-actions">
          <button class="ghost-button" data-admin-action="move-round-plan-rule" data-index="${ruleIndex}" data-direction="-1" ${ruleIndex === 0 ? "disabled" : ""}>上移</button>
          <button class="ghost-button" data-admin-action="move-round-plan-rule" data-index="${ruleIndex}" data-direction="1" ${ruleIndex === state.data.importSettings.roundPlanRules.length - 1 ? "disabled" : ""}>下移</button>
          <button class="danger-button soft-danger-button" data-admin-action="remove-round-plan-rule" data-index="${ruleIndex}" ${state.data.importSettings.roundPlanRules.length <= 1 ? "disabled" : ""}>删除</button>
        </div>
      </div>
      <div class="field-grid-3">
        <div class="field">
          <label>规则名称</label>
          <input data-model="importSettings.roundPlanRules[${ruleIndex}].name" value="${escapeAttribute(rule.name)}" />
        </div>
        <div class="field">
          <label>最少人数</label>
          <input type="number" min="1" step="1" data-model="importSettings.roundPlanRules[${ruleIndex}].minAthletes" data-model-number="true" value="${escapeAttribute(rule.minAthletes)}" />
        </div>
        <div class="field">
          <label>最多人数</label>
          <input type="number" min="1" step="1" data-model="importSettings.roundPlanRules[${ruleIndex}].maxAthletes" data-model-optional-number="true" value="${escapeAttribute(rule.maxAthletes)}" placeholder="留空表示不限上限" />
        </div>
      </div>
      <div class="round-step-list">
        ${rule.rounds.map((round, roundIndex) => renderRoundPlanStepEditor(round, ruleIndex, roundIndex)).join("")}
      </div>
      <div class="field-actions">
        <button class="tiny-button" data-admin-action="add-round-plan-step" data-rule-index="${ruleIndex}">新增轮次</button>
      </div>
    </div>
  `;
}

function renderRoundPlanStepEditor(round, ruleIndex, roundIndex) {
  const roundOptions = state.data.roundSettings?.roundOptions || DEFAULT_ROUND_OPTIONS;
  const rule = state.data.importSettings.roundPlanRules[ruleIndex];
  const rounds = rule?.rounds || [];
  const nextRound = rounds[roundIndex + 1] || null;
  const nextRoundName = nextRound ? getRoundNameById(nextRound.roundId) || nextRound.roundName : "";
  const isFirstRound = roundIndex === 0;
  const isLastRound = roundIndex >= rounds.length - 1;
  const basePath = `importSettings.roundPlanRules[${ruleIndex}].rounds[${roundIndex}]`;
  const roundName = getRoundNameById(round.roundId) || round.roundName;
  return `
    <div class="round-step-card">
      <div class="round-step-title">
        <div>
          <strong>第 ${roundIndex + 1} 轮：${escapeHtml(roundName)}</strong>
          <span>${escapeHtml(round.source === "qualified" ? "上一轮晋级" : "报名名单")}｜${escapeHtml(formatQualificationRuleText(round.qualificationRule, getRoundNameById(round.qualificationRule.targetRoundId) || ""))}</span>
        </div>
        <button class="danger-button soft-danger-button" data-admin-action="remove-round-plan-step" data-rule-index="${ruleIndex}" data-round-index="${roundIndex}" ${state.data.importSettings.roundPlanRules[ruleIndex].rounds.length <= 1 ? "disabled" : ""}>删除轮次</button>
      </div>
      <div class="field-grid-3">
        <div class="field">
          <label>赛别</label>
          <select data-model="${basePath}.roundId">
            ${roundOptions.map((option) => `<option value="${escapeAttribute(option.id)}" ${round.roundId === option.id ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>显示名称</label>
          <input value="${escapeAttribute(roundName)}" readonly />
          <p class="formation-help">自动跟随赛别管理，避免同一赛别出现多个名字。</p>
        </div>
        <div class="field">
          <label>名单来源</label>
          <input value="${isFirstRound ? "报名名单" : "上一轮晋级"}" readonly />
        </div>
        <div class="field">
          <label>每组最多人数</label>
          <input type="number" min="1" step="1" data-model="${basePath}.maxAthletesPerGroup" data-model-number="true" value="${escapeAttribute(round.maxAthletesPerGroup)}" />
        </div>
        <div class="field">
          <label>晋级方式</label>
          <select data-model="${basePath}.qualificationRule.mode">
            <option value="none" ${round.qualificationRule.mode === "none" ? "selected" : ""}>无晋级</option>
            <option value="top_n" ${round.qualificationRule.mode === "top_n" ? "selected" : ""}>每组前 N 名</option>
            <option value="top_n_plus_fastest" ${round.qualificationRule.mode === "top_n_plus_fastest" ? "selected" : ""}>每组前 N 名 + 剩余最快 M 名</option>
          </select>
        </div>
        <div class="field">
          <label>每组直接晋级</label>
          <input type="number" min="1" step="1" data-model="${basePath}.qualificationRule.topNPerGroup" data-model-number="true" value="${escapeAttribute(round.qualificationRule.topNPerGroup)}" />
        </div>
        <div class="field">
          <label>剩余最快晋级</label>
          <input type="number" min="0" step="1" data-model="${basePath}.qualificationRule.fastestRemainderCount" data-model-number="true" value="${escapeAttribute(round.qualificationRule.fastestRemainderCount)}" />
        </div>
        <div class="field">
          <label>晋级到</label>
          ${
            isLastRound || round.qualificationRule.mode === "none"
              ? `<input value="${isLastRound ? "最后一轮不设置晋级目标" : "未启用晋级"}" readonly />`
              : `<select data-model="${basePath}.qualificationRule.targetRoundId">
                  ${nextRound ? `<option value="${escapeAttribute(nextRound.roundId)}" ${round.qualificationRule.targetRoundId === nextRound.roundId ? "selected" : ""}>${escapeHtml(nextRoundName)}</option>` : ""}
                </select>`
          }
        </div>
        <div class="field">
          <label>目标分组方式</label>
          <select data-model="${basePath}.qualificationRule.targetGroupMode">
            <option value="balanced" ${round.qualificationRule.targetGroupMode === "balanced" ? "selected" : ""}>自动均衡分组</option>
            <option value="same_group_index" ${round.qualificationRule.targetGroupMode === "same_group_index" ? "selected" : ""}>同组序号</option>
            <option value="manual" ${round.qualificationRule.targetGroupMode === "manual" ? "selected" : ""}>追加到目标分组</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderRegistrationImportPanel(adminEvent) {
  const importData = getEventRegistrationImport(adminEvent);
  const formationRuleSummary = getFormationRuleSummaryText();
  const formationRuleSummaryHtml = `
    <div class="formation-rule-summary-row">
      <span>当前项目成立规则：<strong data-formation-rule-summary>${escapeHtml(formationRuleSummary)}</strong></span>
      <button class="ghost-button" data-admin-action="focus-formation-settings">修改规则</button>
    </div>
  `;

  if (!importData) {
    return `
      <section class="admin-section admin-section-card registration-import-panel">
        <div class="admin-section-header">
          <div class="admin-section-title-wrap">
            <h3 class="admin-section-title">报名数据导入</h3>
            <p class="admin-section-summary-text">当前赛事还没有导入报名数据。导入目标为当前赛事：${escapeHtml(adminEvent?.name || "未选择赛事")}。</p>
          </div>
        </div>
        ${formationRuleSummaryHtml}
      </section>
    `;
  }

  const summary = importData.summary || {};
  const ranges = importData.organizationRanges || [];
  const warnings = importData.warnings || [];
  const bookData = importData.bookData || null;
  const isExpanded = getAdminPanelExpanded("registration-import");
  const groupOrderContext = getRegistrationGroupOrderContext(importData);

  return `
    <section class="admin-section admin-section-card registration-import-panel ${isExpanded ? "is-expanded" : "is-collapsed"}">
      <div class="admin-section-header registration-import-header">
        <div class="admin-section-title-wrap">
          <h3 class="admin-section-title">报名数据导入</h3>
            <p class="admin-section-summary-text">已导入到赛事：${escapeHtml(adminEvent?.name || importData.targetEventName || "未命名赛事")}</p>
          <p>导入时间：${escapeHtml(formatDateTime(importData.importedAt) || "未知")}</p>
          <p>组别顺序来源：${escapeHtml(getGroupOrderSourceLabel(groupOrderContext.source))}</p>
          <p class="registration-import-summary-line">${escapeHtml(formatRegistrationSummaryLine(summary))}</p>
          ${formationRuleSummaryHtml}
        </div>
        <div class="field-actions registration-import-toggle-wrap">
          <button
            class="ghost-button registration-import-toggle"
            data-admin-action="toggle-registration-import-panel"
            aria-expanded="${isExpanded ? "true" : "false"}"
          >
            ${isExpanded ? "收起 △" : "展开 ▽"}
          </button>
        </div>
      </div>

      ${
        isExpanded
          ? `
            <div class="registration-import-details">
              <div class="field-actions registration-export-actions">
                <button class="ghost-button" data-admin-action="export-book-html">导出秩序册 HTML</button>
              </div>

              <div class="registration-summary-grid">
                ${renderRegistrationStat("导入运动员", summary.athletesCount || 0, "人")}
                ${renderRegistrationStat("参赛项次", summary.entriesCount || 0, "条")}
                ${renderRegistrationStat("组别", summary.groupsCount || 0, "个")}
                ${renderRegistrationStat("项目", summary.eventsCount || 0, "个")}
                ${renderRegistrationStat("俱乐部号段", summary.organizationRangesCount || 0, "个")}
                ${renderRegistrationStat("参赛不足项目", summary.underfilledCompetitionsCount || 0, "个")}
                ${renderRegistrationStat("已合并项目", summary.mergedCompetitionsCount || 0, "个")}
                ${renderRegistrationStat("已取消项目", summary.canceledCompetitionsCount || 0, "个")}
                ${renderRegistrationStat("人工保留项目", summary.keptUnderfilledCompetitionsCount || 0, "个")}
              </div>

              ${renderRegistrationGroupOrderPanel(groupOrderContext)}
              ${renderFormationImportDetails(importData)}
              ${renderOrganizationRanges(ranges)}
              ${renderBookDataPreview(bookData)}
              ${renderRegistrationWarnings(warnings)}
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderFormationConfirmationPanel() {
  const pending = state.pendingRegistrationImport;
  if (!pending?.importData?.formationCheckResult?.underfilledItems?.length) {
    return "";
  }

  const importData = pending.importData;
  const formationResult = importData.formationCheckResult;
  const decisions = pending.decisions || {};
  const competitionOptions = formationResult.competitions || [];
  const formationSettings = getFormationSettingsForImportData(importData);
  const groupOrderContext = getRegistrationGroupOrderContext(importData);
  const minParticipants =
    formationResult.minParticipants ||
    getEventFormationSettings().minParticipants ||
    DEFAULT_IMPORT_SETTINGS.eventFormationSettings.minParticipants;

  return `
    <div class="formation-modal-backdrop">
      <section class="formation-modal admin-section-card">
        <div class="admin-section-header">
          <div class="admin-section-title-wrap">
            <h3 class="admin-section-title">发现参赛人数不足项目</h3>
            <p class="admin-section-summary-text">当前最低参赛人数：${escapeHtml(minParticipants)} 人。请确认合并、取消或人工保留后，再生成赛程和分组。</p>
          </div>
          <div class="field-actions">
            <button class="ghost-button" data-admin-action="cancel-formation-import">取消导入</button>
            <button class="cta-button" data-admin-action="confirm-formation-import">确认处理并继续导入</button>
          </div>
        </div>
        ${
          formationResult.isFallbackGroupOrder
            ? `<p class="formation-warning">${escapeHtml(groupOrderContext.message)}</p>`
            : ""
        }
        <div class="formation-card-list">
          ${formationResult.underfilledItems
            .map((item) =>
              renderFormationDecisionCard(
                item,
                decisions[item.competitionKey] || {},
                competitionOptions,
                formationSettings
              )
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderFormationDecisionCard(item, decision, competitionOptions, formationSettings = getEventFormationSettings()) {
  const selectedAction =
    decision.action ||
    (item.suggestedAction === "merge" ? "merge_suggested" : item.suggestedAction || "cancel");
  const selectedTarget = decision.targetCompetitionKey || item.suggestedTargetCompetitionKey || "";
  const targetCompetition = competitionOptions.find((competition) => competition.competitionKey === selectedTarget) || null;
  const targetOptionGroups = createFormationTargetOptionGroups(item, competitionOptions, formationSettings);
  const selectedTargetWarning = targetCompetition
    ? getFormationTargetWarningForDisplay(item, targetCompetition, formationSettings)
    : item.mergeWarning || item.suggestedReason || "";
  const canShowTarget = selectedAction === "merge_suggested" || selectedAction === "merge_manual";

  return `
    <article class="formation-decision-card">
      <div class="formation-decision-head">
        <div>
          <h4>${escapeHtml(formatFormationCompetitionLabel(item))}</h4>
          <p>当前人数：${escapeHtml(item.participantsCount)} 人 / 最低成立人数：${escapeHtml(item.minParticipants)} 人</p>
        </div>
        <span class="formation-risk ${escapeAttribute(item.mergeRiskLevel || "low")}">${escapeHtml(getFormationRiskLabel(item.mergeRiskLevel || "low"))}</span>
      </div>
      <div class="formation-decision-grid">
        <span>系统建议：${escapeHtml(item.suggestedReason || "建议人工确认。")}</span>
        <span>推荐目标：${escapeHtml(targetCompetition ? formatFormationCompetitionLabel(targetCompetition) : "无")}</span>
        <span>是否同项目：${escapeHtml(item.isSameProject === false ? "否" : item.suggestedAction === "merge" ? "是" : "-")}</span>
        <span>是否同组别：${escapeHtml(item.isSameGroup ? "是" : item.suggestedAction === "merge" ? "否" : "-")}</span>
        <span>重复运动员：${escapeHtml(item.hasOverlap ? `有，${item.overlapCount} 人` : "无")}</span>
        <span>合并后唯一人数：${escapeHtml(item.uniqueMergedAthleteCount || item.participantsCount)}</span>
      </div>
      ${item.mergeWarning ? `<p class="formation-warning">${escapeHtml(item.mergeWarning)}</p>` : ""}
      <div class="field-grid-3 formation-decision-controls">
        <div class="field">
          <label>处理方式</label>
          <select data-formation-decision-action data-competition-key="${escapeAttribute(item.competitionKey)}">
            <option value="merge_suggested" ${selectedAction === "merge_suggested" ? "selected" : ""} ${item.suggestedAction === "merge" ? "" : "disabled"}>按系统建议合并</option>
            <option value="merge_manual" ${selectedAction === "merge_manual" ? "selected" : ""}>手动选择合并目标</option>
            <option value="cancel" ${selectedAction === "cancel" ? "selected" : ""}>取消该项目</option>
            <option value="keep" ${selectedAction === "keep" ? "selected" : ""}>保留单独比赛</option>
          </select>
        </div>
        <div class="field">
          <label>合并目标</label>
          <select data-formation-decision-target data-competition-key="${escapeAttribute(item.competitionKey)}" ${canShowTarget ? "" : "disabled"}>
            <option value="">请选择目标</option>
            ${renderFormationTargetOptionGroups(targetOptionGroups, selectedTarget)}
          </select>
        </div>
        <div class="field">
          <label>风险提示</label>
          <input value="${escapeAttribute(selectedTargetWarning)}" readonly />
        </div>
      </div>
    </article>
  `;
}

function renderFormationTargetOptionGroups(groups, selectedTarget) {
  const blocks = [
    ["推荐目标", groups.recommended || [], false],
    ["风险目标（需人工确认）", groups.highRisk || [], false],
    ["不可选目标", groups.unavailable || [], true],
  ];

  return blocks
    .filter(([, options]) => options.length)
    .map(
      ([label, options, disabled]) => `
        <optgroup label="${escapeAttribute(label)}">
          ${options
            .map(({ competition, warning, riskLevel }) => {
              const riskPrefix = label === "风险目标（需人工确认）" ? `${getFormationRiskLabel(riskLevel || "medium")}：` : "";
              const prefix = label === "不可选目标" ? "不可选：" : riskPrefix;
              return `
                <option
                  value="${escapeAttribute(competition.competitionKey)}"
                  ${competition.competitionKey === selectedTarget ? "selected" : ""}
                  ${disabled ? "disabled" : ""}
                  title="${escapeAttribute(warning || "")}"
                >
                  ${escapeHtml(`${prefix}${formatFormationCompetitionLabel(competition)}（${competition.participantsCount}人）`)}
                </option>
              `;
            })
            .join("")}
        </optgroup>
      `
    )
    .join("");
}

function formatRegistrationSummaryLine(summary = {}) {
  const base = [
    `运动员 ${summary.athletesCount || 0} 人`,
    `参赛项次 ${summary.entriesCount || 0} 条`,
    `组别 ${summary.groupsCount || 0} 个`,
    `项目 ${summary.eventsCount || 0} 个`,
    `俱乐部号段 ${summary.organizationRangesCount || 0} 个`,
  ];
  const formation = [
    summary.underfilledCompetitionsCount ? `参赛不足 ${summary.underfilledCompetitionsCount} 个` : "",
    summary.mergedCompetitionsCount ? `已合并 ${summary.mergedCompetitionsCount} 个` : "",
    summary.canceledCompetitionsCount ? `已取消 ${summary.canceledCompetitionsCount} 个` : "",
    summary.keptUnderfilledCompetitionsCount ? `人工保留 ${summary.keptUnderfilledCompetitionsCount} 个` : "",
  ].filter(Boolean);
  return [...base, ...formation].join("｜");
}

function renderRegistrationStat(label, value, unit) {
  return `
    <div class="registration-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(unit)}</em>
    </div>
  `;
}

function renderFormationImportDetails(importData) {
  const underfilled = importData.formationCheckResult?.underfilledItems || [];
  const merged = importData.mergedCompetitions || [];
  const canceled = importData.canceledCompetitions || [];
  const kept = importData.keptUnderfilledCompetitions || [];
  const records = [
    ...merged.map((item) => ({ ...item, displayAction: "已合并" })),
    ...canceled.map((item) => ({ ...item, displayAction: "已取消" })),
    ...kept.map((item) => ({ ...item, displayAction: "人工保留" })),
  ];

  if (!underfilled.length && !records.length) {
    return "";
  }

  return `
    <div class="registration-block">
      <h4>项目成立与合并处理</h4>
      <div class="table-scroll-x">
        <table class="registration-table compact">
          <thead>
            <tr>
              <th>原项目</th>
              <th>原人数</th>
              <th>处理方式</th>
              <th>合并目标 / 原因</th>
              <th>合并后唯一人数</th>
              <th>是否有重复</th>
              <th>重复人数</th>
              <th>风险等级</th>
              <th>处理结果</th>
            </tr>
          </thead>
          <tbody>
            ${
              records.length
                ? records.map(renderFormationImportRecordRow).join("")
                : underfilled
                    .map((item) => renderFormationImportRecordRow({ ...item, displayAction: "待确认" }))
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFormationImportRecordRow(record) {
  const targetText = record.targetCompetitionKey
    ? `${record.targetGroupName || ""} ${record.targetGender || ""} ${record.targetProjectName || ""}`.trim()
    : record.cancelReason || record.keepReason || record.mergeReason || record.suggestedReason || "-";
  return `
    <tr>
      <td>${escapeHtml(`${record.groupName || ""} ${record.gender || ""} ${record.projectName || ""}`.trim())}</td>
      <td>${escapeHtml(record.participantsCount || 0)}</td>
      <td>${escapeHtml(record.displayAction || getFormationActionLabel(record.action))}</td>
      <td>${escapeHtml(targetText)}</td>
      <td>${escapeHtml(record.uniqueMergedAthleteCount || record.finalMergedAthleteCount || record.participantsCount || 0)}</td>
      <td>${escapeHtml(record.overlapCount ? "有" : "无")}</td>
      <td>${escapeHtml(record.overlapCount ? `${record.overlapCount} 人` : "0 人")}</td>
      <td>${escapeHtml(getFormationRiskLabel(record.mergeRiskLevel || "low"))}</td>
      <td class="${record.processResult && (!record.scheduleCreated || !record.rosterCreated) ? "formation-process-warning" : ""}">${escapeHtml(record.processResult || "-")}</td>
    </tr>
  `;
}

function renderOrganizationRanges(ranges) {
  if (!ranges?.length) {
    return `<p class="hint">暂未生成俱乐部号码段。</p>`;
  }

  return `
    <div class="registration-block">
      <h4>俱乐部号码段</h4>
      <div class="table-scroll-x">
        <table class="registration-table">
          <thead>
            <tr>
              <th>代表单位</th>
              <th>领队</th>
              <th>教练员</th>
              <th>起始号码</th>
              <th>结束号码</th>
              <th>人数</th>
            </tr>
          </thead>
          <tbody>
            ${ranges
              .map(
                (range) => `
                  <tr>
                    <td>${escapeHtml(range.organization || EMPTY_ORGANIZATION_LABEL)}</td>
                    <td>${escapeHtml(range.leader || range.organizationLeader || "")}</td>
                    <td>${escapeHtml(range.coach || range.organizationCoach || "")}</td>
                    <td>${escapeHtml(range.startBibNo || "")}</td>
                    <td>${escapeHtml(range.endBibNo || "")}</td>
                    <td>${escapeHtml(range.count || 0)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBookDataPreview(bookData) {
  if (!bookData?.groups?.length) {
    return `<p class="hint">暂未生成秩序册基础数据。</p>`;
  }

  return `
    <div class="registration-block">
      <h4>按组别和项目查看名单</h4>
      <div class="book-preview">
        ${bookData.groups
          .map(
            (group) => `
              <div class="book-preview-group">
                <h5>${escapeHtml(group.groupName || "未命名组别")}</h5>
                ${(group.events || [])
                  .map(
                    (event) => `
                      <div class="book-preview-event">
                        <div class="book-preview-event-title">
                          <span>
                            ${escapeHtml(event.eventName || "未命名项目")}
                            ${event.formationNote ? `<em>${escapeHtml(event.formationNote)}</em>` : ""}
                          </span>
                          <strong>${escapeHtml((event.entries || []).length)} 人</strong>
                        </div>
                        <div class="table-scroll-x">
                          <table class="registration-table compact">
                            <thead>
                              <tr>
                                <th>号码</th>
                                <th>姓名</th>
                                <th>代表单位</th>
                                <th>原组别 / 原项目</th>
                                <th>性别</th>
                                <th>出生日期</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${(event.entries || [])
                                .map(
                                  (entry) => `
                                    <tr>
                                      <td>${escapeHtml(entry.bibNo || "")}</td>
                                      <td>${escapeHtml(entry.name || "")}</td>
                                      <td>${escapeHtml(entry.organization || EMPTY_ORGANIZATION_LABEL)}</td>
                                      <td>${escapeHtml(formatBookOriginalCompetition(entry))}</td>
                                      <td>${escapeHtml(entry.genderLabel || entry.gender || "")}</td>
                                      <td>${escapeHtml(entry.birthDate || "")}</td>
                                    </tr>
                                  `
                                )
                                .join("")}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderRegistrationWarnings(warnings) {
  if (!warnings?.length) {
    return `<p class="hint">导入校验未发现需要处理的警告。</p>`;
  }

  return `
    <div class="registration-block">
      <h4>导入提示</h4>
      <ul class="registration-warning-list">
        ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function getEntryRankColumns(entry) {
  if (entry?.isMergedRace && getEntryRaceMergeMode(entry) === "race_together_rank_separately") {
    return [{ label: "名次", field: "originalRank" }];
  }
  return [{ label: "名次", field: "rank" }];
}

function getAthleteRankColumnValue(athlete, column) {
  return getAthleteRankForEntry(null, athlete, column?.field || "rank");
}

function getAthleteDisplayRank(athlete, entry = null) {
  const columns = getEntryRankColumns(entry);
  return getAthleteRankColumnValue(athlete, columns[0]);
}

function renderEntryRankNotice(entry) {
  const notice = getEntryMergeRankingNotice(entry);
  return notice ? `<p class="entry-rank-notice">${escapeHtml(notice)}</p>` : "";
}

function renderMergeInfoCell(entry = {}) {
  if (entry.source === "manual-registration" || entry.isManualRegistration) {
    return `<span class="manual-badge">手动补录</span>`;
  }

  const type = normalizeMergeType(entry.mergeType);
  if (!type || type === "standalone" || type === "target_original") {
    return "";
  }

  const label = getMergeTypeLabel(type);
  const note = createMergeNote(entry);
  if (!label && !note) {
    return "";
  }
  const badgeClass =
    type === "merged_from_underfilled"
      ? "merge-badge merge-badge-source"
      : type === "overlap_source_and_target"
        ? "merge-badge merge-badge-overlap"
        : "merge-badge";

  return `
    <details class="merge-info-cell">
      <summary class="merge-info-summary">
        <span class="${badgeClass}">${escapeHtml(label)}</span>
      </summary>
      ${note ? `<span class="merge-note">${escapeHtml(note)}</span>` : ""}
    </details>
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

function renderAthleteRow(athlete, athleteIndex, eventIndex, dayIndex, entryIndex, groupIndex, entry) {
  const basePath = `events[${eventIndex}].days[${dayIndex}].entries[${entryIndex}].groups[${groupIndex}].athletes[${athleteIndex}]`;
  const actionMenuHtml = renderAthleteActionMenu(athleteIndex);
  const rankColumns = getEntryRankColumns(entry || getAdminEntry());
  return `
    <tr>
      ${rankColumns
        .map(
          (column) =>
            `<td data-label="${escapeAttribute(column.label)}"><input value="${escapeAttribute(getAthleteRankColumnValue(athlete, column))}" readonly placeholder="自动计算" /></td>`
        )
        .join("")}
      <td data-label="道次"><input data-model="${basePath}.lane" value="${escapeAttribute(athlete.lane || "")}" /></td>
      <td data-label="号码"><input data-model="${basePath}.bib" value="${escapeAttribute(athlete.bib || "")}" /></td>
      <td data-label="姓名"><input data-model="${basePath}.name" value="${escapeAttribute(athlete.name || "")}" /></td>
      <td data-label="单位"><input data-model="${basePath}.team" value="${escapeAttribute(athlete.team || "")}" /></td>
      <td data-label="成绩"><input data-model="${basePath}.result" value="${escapeAttribute(athlete.result || "")}" /></td>
      <td data-label="来源">${renderMergeInfoCell(athlete)}</td>
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
      <button class="athlete-action-item" type="button" data-admin-action="open-prerace-change-athlete" data-athlete-index="${athleteIndex}">
        调整报名组 / 弃赛
      </button>
      <button class="athlete-action-item danger" type="button" data-admin-action="remove-athlete" data-athlete-index="${athleteIndex}">
        删除
      </button>
    </div>
  `;
}

function renderPromoteModal() {
  const adminDay = getAdminDay();
  const adminEntry = getAdminEntry();
  const adminGroup = getAdminGroup();
  const panel = state.promotePanel;

  if (!panel.isOpen) {
    return "";
  }

  const sourceGroup =
    adminEntry?.groups?.find((group) => group.id === panel.sourceGroupId) || adminGroup || null;
  const sourceAthlete = sourceGroup?.athletes?.[panel.athleteIndex] || null;

  if (!adminDay || !adminEntry || !sourceGroup || !sourceAthlete) {
    return `
      <div class="promote-modal-backdrop" data-promote-modal-backdrop>
        <div class="promote-modal" role="dialog" aria-modal="true" aria-labelledby="promote-modal-title">
          <div class="promote-modal-head">
            <div>
              <p class="promote-modal-kicker">手动晋级</p>
              <h3 id="promote-modal-title">确认晋级</h3>
            </div>
            <button class="promote-modal-close" type="button" data-admin-action="cancel-promote-athlete" aria-label="关闭晋级弹窗">×</button>
          </div>
          <p class="hint">当前晋级上下文不完整，请关闭弹窗后重新选择运动员。</p>
          <div class="promote-modal-actions">
            <button class="ghost-button" data-admin-action="cancel-promote-athlete">取消</button>
          </div>
        </div>
      </div>
    `;
  }

  const entryOptions = adminDay.entries || [];
  const targetEntry = entryOptions.find((entry) => entry.id === panel.targetEntryId) || null;
  const groupOptions = getAvailablePromoteGroups(targetEntry, adminEntry, sourceGroup);
  const hasGroups = groupOptions.length > 0;
  const selectedTargetGroupId = hasGroups ? panel.targetGroupId : "";
  const isSameGroup = panel.targetEntryId === adminEntry?.id && selectedTargetGroupId === sourceGroup?.id;
  const canConfirm = Boolean(panel.targetEntryId && selectedTargetGroupId && hasGroups && !isSameGroup);

  return `
    <div class="promote-modal-backdrop" data-promote-modal-backdrop>
      <div class="promote-modal" role="dialog" aria-modal="true" aria-labelledby="promote-modal-title">
        <div class="promote-modal-head">
          <div>
            <p class="promote-modal-kicker">手动晋级</p>
            <h3 id="promote-modal-title">确认晋级</h3>
          </div>
          <button class="promote-modal-close" type="button" data-admin-action="cancel-promote-athlete" aria-label="关闭晋级弹窗">×</button>
        </div>

        <div class="promote-athlete-summary">
          <span>号码 <strong>${escapeHtml(sourceAthlete.bib || "-")}</strong></span>
          <span>姓名 <strong>${escapeHtml(sourceAthlete.name || "-")}</strong></span>
          <span>单位 <strong>${escapeHtml(sourceAthlete.team || "-")}</strong></span>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>目标赛程</label>
            <select data-promote-select="entry">
              <option value="">请选择目标赛程</option>
              ${entryOptions
                .map(
                  (entry) => `
                    <option value="${escapeAttribute(entry.id)}" ${panel.targetEntryId === entry.id ? "selected" : ""}>
                      ${escapeHtml(formatEntryOptionLabel(entry))}
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

        <div class="promote-modal-actions">
          <button class="ghost-button" data-admin-action="cancel-promote-athlete">取消</button>
          <button class="cta-button" data-admin-action="confirm-promote-athlete" ${canConfirm ? "" : "disabled"}>确认晋级</button>
        </div>
      </div>
    </div>
  `;
}

function renderManualRegistrationModal() {
  const panel = ensureManualRegistrationPanelState();
  if (!panel.isOpen) {
    return "";
  }

  const adminEvent = getAdminEvent();
  const adminDay = getAdminDay();
  const entryOptions = (adminDay?.entries || []).filter((entry) => entry.type !== "break");
  const values = getManualRegistrationPanelValues();
  const selectedEntry = entryOptions.find((entry) => entry.id === values.entryId) || entryOptions[0] || null;
  const groupOptions = selectedEntry?.groups || [];
  const selectedGroup = groupOptions.find((group) => group.id === values.targetGroupId) || groupOptions[0] || null;

  if (!adminEvent || !adminDay || !selectedEntry || !selectedGroup) {
    return `
      <div class="promote-modal-backdrop" data-manual-registration-backdrop>
        <div class="promote-modal manual-registration-modal" role="dialog" aria-modal="true" aria-labelledby="manual-registration-title">
          <div class="promote-modal-head">
            <div>
              <p class="promote-modal-kicker">手动补录</p>
              <h3 id="manual-registration-title">手动补录参赛人员</h3>
            </div>
            <button class="promote-modal-close" type="button" data-admin-action="cancel-manual-registration" aria-label="关闭补录弹窗">×</button>
          </div>
          <p class="hint">请先选择赛事、比赛日、赛程条目和分组，再补录参赛人员。</p>
          <div class="promote-modal-actions">
            <button class="ghost-button" data-admin-action="cancel-manual-registration">关闭</button>
          </div>
        </div>
      </div>
    `;
  }

  const normalizedValues = {
    ...values,
    entryId: selectedEntry.id,
    targetGroupId: selectedGroup.id,
    groupName: values.groupName || selectedEntry.division || selectedEntry.groupName || "",
    groupId: values.groupId || selectedEntry.groupId || selectedEntry.registrationGroupId || "",
    eventName: values.eventName || selectedEntry.projectName || selectedEntry.name || "",
    eventId: values.eventId || selectedEntry.eventId || selectedEntry.registrationEventId || "",
    gender: values.gender || selectedEntry.gender || "",
    lane: values.lane || getNextLaneForGroup(selectedGroup),
  };
  normalizedValues.age = calculateManualAge(normalizedValues.birthDate, getManualRegistrationReferenceDate());
  panel.values = normalizedValues;

  return `
    <div class="promote-modal-backdrop" data-manual-registration-backdrop>
      <div class="promote-modal manual-registration-modal" role="dialog" aria-modal="true" aria-labelledby="manual-registration-title">
        <div class="promote-modal-head">
          <div>
            <p class="promote-modal-kicker">手动补录</p>
            <h3 id="manual-registration-title">手动补录参赛人员</h3>
          </div>
          <button class="promote-modal-close" type="button" data-admin-action="cancel-manual-registration" aria-label="关闭补录弹窗">×</button>
        </div>

        <div class="manual-context-card">
          <span>赛事：<strong>${escapeHtml(adminEvent.name || "未命名赛事")}</strong></span>
          <span>赛程：<strong>${escapeHtml(formatEntryOptionLabel(selectedEntry))}</strong></span>
          <span>分组：<strong>${escapeHtml(selectedGroup.name || "未命名分组")}</strong></span>
        </div>

        <div class="manual-registration-grid">
          ${renderManualRegistrationInput("姓名", "name", normalizedValues.name, { required: true })}
          ${renderManualRegistrationInput("证件号", "certificateNumber", normalizedValues.certificateNumber, {
            hint: "输入身份证号后，将自动识别性别、出生日期和年龄。",
            message: normalizedValues.idCardMessage || "",
          })}
          <div class="field manual-registration-field">
            <label>性别 *</label>
            <select data-manual-registration-field="gender">
              <option value="" ${normalizedValues.gender ? "" : "selected"}>请选择</option>
              ${["男", "女", "男子", "女子"].map((gender) => `<option value="${gender}" ${normalizedValues.gender === gender ? "selected" : ""}>${gender}</option>`).join("")}
            </select>
          </div>
          ${renderManualRegistrationInput("出生日期", "birthDate", normalizedValues.birthDate, { type: "date" })}
          ${renderManualRegistrationInput("年龄", "age", normalizedValues.age || "自动识别", { readonly: true, outputOnly: true })}
          ${renderManualRegistrationInput("代表单位", "organization", normalizedValues.organization, { required: true })}
          ${renderManualRegistrationInput("电话", "phone", normalizedValues.phone)}
          <div class="field manual-registration-field">
            <label>目标赛程</label>
            <select data-manual-registration-field="entryId">
              ${entryOptions.map((entry) => `<option value="${escapeAttribute(entry.id)}" ${normalizedValues.entryId === entry.id ? "selected" : ""}>${escapeHtml(formatEntryOptionLabel(entry))}</option>`).join("")}
            </select>
          </div>
          <div class="field manual-registration-field">
            <label>目标分组</label>
            <select data-manual-registration-field="targetGroupId">
              ${groupOptions.map((group) => `<option value="${escapeAttribute(group.id)}" ${normalizedValues.targetGroupId === group.id ? "selected" : ""}>${escapeHtml(group.name || "未命名分组")}</option>`).join("")}
            </select>
          </div>
          ${renderManualRegistrationInput("组别", "groupName", normalizedValues.groupName, { required: true })}
          ${renderManualRegistrationInput("项目", "eventName", normalizedValues.eventName, { required: true })}
          ${renderManualRegistrationInput("道次", "lane", normalizedValues.lane)}
          <div class="field manual-registration-field">
            <label>号码模式</label>
            <select data-manual-registration-field="bibMode">
              <option value="auto" ${normalizedValues.bibMode !== "manual" ? "selected" : ""}>自动分配下一个可用号码</option>
              <option value="manual" ${normalizedValues.bibMode === "manual" ? "selected" : ""}>手动填写号码</option>
            </select>
          </div>
          ${renderManualRegistrationInput("号码", "bibNo", normalizedValues.bibNo, {
            placeholder: normalizedValues.bibMode === "manual" ? "请输入号码" : "自动分配",
          })}
          ${renderManualRegistrationInput("补录原因", "manualReason", normalizedValues.manualReason)}
          ${renderManualRegistrationInput("本单位领队", "organizationLeader", normalizedValues.organizationLeader, {
            hint: "可填写多个姓名，用顿号或逗号分隔。",
          })}
          ${renderManualRegistrationInput("本单位教练员", "organizationCoach", normalizedValues.organizationCoach, {
            hint: "可填写多个姓名，用顿号或逗号分隔。",
          })}
          ${renderManualRegistrationTextarea("备注", "note", normalizedValues.note, {
            className: "manual-field-wide manual-note-field",
          })}
        </div>

        <p class="hint">保存后会进入当前赛事正式数据链路：当前分组、手动补录记录、秩序册号码名单、俱乐部号段和成绩查询会同步更新。</p>

        <div class="promote-modal-actions">
          <button class="ghost-button" data-admin-action="cancel-manual-registration">取消</button>
          <button class="cta-button" data-admin-action="save-manual-registration">保存补录</button>
        </div>
      </div>
    </div>
  `;
}

function renderManualRegistrationInput(label, fieldName, value, options = {}) {
  const type = options.type || "text";
  const readonly = options.readonly || options.outputOnly;
  const dataAttribute = options.outputOnly
    ? `data-manual-registration-output="${escapeAttribute(fieldName)}"`
    : `data-manual-registration-field="${escapeAttribute(fieldName)}"`;
  return `
    <div class="field manual-registration-field ${escapeAttribute(options.className || "")}">
      <label>${escapeHtml(label)}${options.required ? " *" : ""}</label>
      <input
        type="${escapeAttribute(type)}"
        ${dataAttribute}
        value="${escapeAttribute(value || "")}"
        placeholder="${escapeAttribute(options.placeholder || "")}"
        ${readonly ? "readonly" : ""}
      />
      ${options.hint ? `<p class="hint manual-field-hint">${escapeHtml(options.hint)}</p>` : ""}
      ${options.message ? `<p class="manual-id-message" data-manual-id-message>${escapeHtml(options.message)}</p>` : fieldName === "certificateNumber" ? `<p class="manual-id-message" data-manual-id-message></p>` : ""}
    </div>
  `;
}

function renderManualRegistrationTextarea(label, fieldName, value, options = {}) {
  return `
    <div class="field manual-registration-field manual-registration-textarea-field ${escapeAttribute(options.className || "")}">
      <label>${escapeHtml(label)}</label>
      <textarea
        class="manual-registration-textarea"
        data-manual-registration-field="${escapeAttribute(fieldName)}"
        placeholder="${escapeAttribute(options.placeholder || "")}"
      >${escapeHtml(value || "")}</textarea>
      ${options.hint ? `<p class="hint manual-field-hint">${escapeHtml(options.hint)}</p>` : ""}
    </div>
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

  if (type === "scheduleStatus") {
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <select data-model="${path}">
          ${["待排组", "已排组", "待晋级", "手动录入", "已出成绩"]
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

  if (type === "roundName") {
    const roundOptions = state.data.roundSettings?.roundOptions || DEFAULT_ROUND_OPTIONS;
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <select data-model="${path}">
          ${roundOptions
            .map(
              (item) => `
                <option value="${escapeAttribute(item.name)}" ${value === item.name ? "selected" : ""}>${escapeHtml(item.name)}</option>
              `
            )
            .join("")}
        </select>
      </div>
    `;
  }

  if (type === "boolean") {
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <select data-model="${path}">
          <option value="true" ${value === true || value === "true" ? "selected" : ""}>显示</option>
          <option value="false" ${value === false || value === "false" ? "selected" : ""}>不显示</option>
        </select>
      </div>
    `;
  }

  const inputType = type === "date" ? "date" : "text";
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input type="${escapeAttribute(inputType)}" data-model="${path}" value="${escapeAttribute(value || "")}" />
    </div>
  `;
}

function renderEntryRaceRulePanel(adminEntry, entryPath, options = {}) {
  if (adminEntry?.type === "break") {
    return `
      <div class="entry-race-rule-panel">
        <div class="entry-race-rule-head">
          <h3>本赛程规则设置</h3>
          <p class="hint">break / 浇冰间隔不参与排名、合并和晋级执行。</p>
        </div>
      </div>
    `;
  }

  const isMergedRace = Boolean(adminEntry?.isMergedRace);
  const raceMergeMode = getEntryRaceMergeMode(adminEntry);
  const noticeText = getEntryMergeRankingNotice(adminEntry);

  return `
    <div class="entry-race-rule-panel">
      <div class="entry-race-rule-head">
        <div>
          <h3>本赛程规则设置</h3>
          <p class="hint">本设置只影响当前赛程条目的排名、合并和晋级执行；导入时由全局规则生成，赛后也可以按现场规则调整。</p>
        </div>
        <div class="field-actions">
          <button class="ghost-button" data-admin-action="apply-global-race-rule-to-current-entry">套用全局默认</button>
          ${options.hideRecalculateButton ? "" : `<button class="ghost-button" data-admin-action="recalculate-current-entry-ranks">重新计算名次</button>`}
        </div>
      </div>
      ${noticeText ? `<p class="entry-rank-notice">${escapeHtml(noticeText)}</p>` : ""}
      <div class="field-grid-3">
        <div class="field">
          <label>是否合并比赛</label>
          <select data-model="${entryPath}.isMergedRace">
            <option value="false" ${isMergedRace ? "" : "selected"}>否</option>
            <option value="true" ${isMergedRace ? "selected" : ""}>是</option>
          </select>
        </div>
        <div class="field">
          <label>合并排名方式</label>
          <select data-model="${entryPath}.raceMergeMode" ${isMergedRace ? "" : "disabled"}>
            <option value="race_together_rank_separately" ${raceMergeMode === "race_together_rank_separately" ? "selected" : ""}>合并比赛，按原组别/原项目分别排名</option>
            <option value="race_together_rank_together" ${raceMergeMode === "race_together_rank_together" ? "selected" : ""}>合并比赛，统一排名</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderQualificationRulePanel(adminDay, adminEntry, entryPath) {
  const panelId = getEntryQualificationPanelId(adminEntry);
  const isExpanded = panelId ? getAdminPanelExpanded(panelId) : false;

  if (adminEntry?.type === "break") {
    return `
      <div class="qualification-rule-panel qualification-rule-panel-compact">
        <div>
          <h3>本轮晋级设置</h3>
          <p class="qualification-rule-summary-line">本轮无晋级规则</p>
          <p class="hint">break / 浇冰间隔不参与自动晋级。</p>
        </div>
      </div>
    `;
  }

  const rule = adminEntry?.qualificationRule || {
    mode: "none",
    topNPerGroup: 1,
    fastestRemainderCount: 0,
    targetEntryId: "",
    targetGroupMode: "same_group_index",
  };
  const mode = rule.mode || "none";
  const targetEntryId = rule.targetEntryId || "";
  const targetGroupMode = rule.targetGroupMode || "same_group_index";
  const topN = Number(rule.topNPerGroup || 1);
  const fastestCount = Number(rule.fastestRemainderCount || 0);
  const isAutoMode = mode !== "none";
  const targetEntries = (adminDay?.entries || []).filter(
    (entry) => entry.id !== adminEntry?.id && entry.type !== "break"
  );
  const summaryText = getEntryQualificationSummary(adminEntry, adminDay);

  return `
    <div class="qualification-rule-panel qualification-rule-panel-compact ${isExpanded ? "is-expanded" : ""}">
      <div class="qualification-rule-compact-head">
        <div>
          <h3>本轮晋级设置</h3>
          <p class="qualification-rule-summary-line">${escapeHtml(summaryText)}</p>
          <p class="hint">本设置只影响当前赛程条目的晋级执行；默认由上方赛制规则自动生成。</p>
        </div>
        <button
          class="ghost-button"
          data-admin-action="toggle-entry-qualification-settings"
          data-entry-id="${escapeAttribute(adminEntry?.id || "")}"
        >
          ${isExpanded ? "收起本轮设置 △" : "编辑本轮晋级 ▽"}
        </button>
      </div>

      ${
        isExpanded
          ? `
      <div class="field-grid-3">
        <div class="field">
          <label>晋级模式</label>
          <select data-model="${entryPath}.qualificationRule.mode">
            <option value="none" ${mode === "none" ? "selected" : ""}>不自动晋级</option>
            <option value="top_n" ${mode === "top_n" ? "selected" : ""}>每组前 N 名</option>
            <option value="top_n_plus_fastest" ${mode === "top_n_plus_fastest" ? "selected" : ""}>每组前 N 名 + 剩余最快 M 名</option>
          </select>
        </div>
        <div class="field">
          <label>每组直接晋级</label>
          <input
            type="number"
            min="1"
            step="1"
            data-model="${entryPath}.qualificationRule.topNPerGroup"
            data-model-number="true"
            value="${escapeAttribute(Number.isFinite(topN) && topN > 0 ? topN : 1)}"
            ${isAutoMode ? "" : "disabled"}
          />
        </div>
        <div class="field">
          <label>剩余最快晋级</label>
          <input
            type="number"
            min="0"
            step="1"
            data-model="${entryPath}.qualificationRule.fastestRemainderCount"
            data-model-number="true"
            value="${escapeAttribute(Number.isFinite(fastestCount) && fastestCount >= 0 ? fastestCount : 0)}"
            ${mode === "top_n_plus_fastest" ? "" : "disabled"}
          />
        </div>
        <div class="field">
          <label>目标赛程条目</label>
          <select data-model="${entryPath}.qualificationRule.targetEntryId" ${isAutoMode ? "" : "disabled"}>
            <option value="">请选择目标赛程</option>
            ${targetEntries
              .map(
                (entry) => `
                  <option value="${escapeAttribute(entry.id)}" ${targetEntryId === entry.id ? "selected" : ""}>
                    ${escapeHtml(formatEntryOptionLabel(entry))}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="form-grid qualification-rule-row">
        <div class="field">
          <label>分组分配方式</label>
          <select data-model="${entryPath}.qualificationRule.targetGroupMode" ${isAutoMode ? "" : "disabled"}>
            <option value="same_group_index" ${targetGroupMode === "same_group_index" ? "selected" : ""}>同组序号晋级</option>
            <option value="balanced" ${targetGroupMode === "balanced" ? "selected" : ""}>自动均衡分组</option>
            <option value="manual" ${targetGroupMode === "manual" ? "selected" : ""}>追加到目标分组</option>
          </select>
        </div>
        <p class="hint">
          手动晋级仍然保留在运动员操作菜单里，可用于自动晋级后的个别修正。
        </p>
      </div>
          `
          : ""
      }
    </div>
  `;
}

function renderTextarea(label, path, value, className = "") {
  return `
    <div class="field ${escapeAttribute(className)}">
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

function scrollToAdminAthleteList() {
  requestAnimationFrame(() => {
    document.querySelector("#admin-athlete-list")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function syncPromoteModalLock() {
  const manualPanel = ensureManualRegistrationPanelState();
  const dialog = ensureAppFeedbackState().dialog;
  document.body.classList.toggle(
    "promote-modal-open",
    state.route === "admin" && (state.promotePanel.isOpen || manualPanel.isOpen || dialog.open)
  );
}

function ensureAdminUiState() {
  if (!state.adminUi) {
    state.adminUi = {};
  }
  if (!state.adminUi.activeAdminTab) {
    state.adminUi.activeAdminTab = "overview";
  }
  if (!state.adminUi.expandedPanels) {
    state.adminUi.expandedPanels = {};
  }
  return state.adminUi;
}

function getAdminPanelExpanded(panelId) {
  const adminUi = ensureAdminUiState();
  if (panelId === "registration-import") {
    return Boolean(state.registrationImportExpanded || adminUi.expandedPanels[panelId]);
  }
  return Boolean(adminUi.expandedPanels[panelId]);
}

function setAdminPanelExpanded(panelId, expanded) {
  const adminUi = ensureAdminUiState();
  adminUi.expandedPanels[panelId] = Boolean(expanded);
  if (panelId === "registration-import") {
    state.registrationImportExpanded = Boolean(expanded);
  }
}

function toggleAdminPanel(panelId) {
  setAdminPanelExpanded(panelId, !getAdminPanelExpanded(panelId));
}

function focusEventFormationSettings() {
  setActiveAdminTab("rules", { render: false });
  setAdminPanelExpanded("round-settings", true);
  renderView();
  requestAnimationFrame(() => {
    const target = document.querySelector("#event-formation-settings");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.remove("is-focus-pulse");
      void target.offsetWidth;
      target.classList.add("is-focus-pulse");
      window.setTimeout(() => target.classList.remove("is-focus-pulse"), 1500);
    }
  });
}

function getAdminScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function captureAdminFocusState() {
  const activeElement = document.activeElement;
  if (!activeElement?.dataset?.model) {
    return null;
  }
  return {
    model: activeElement.dataset.model,
    start: typeof activeElement.selectionStart === "number" ? activeElement.selectionStart : null,
    end: typeof activeElement.selectionEnd === "number" ? activeElement.selectionEnd : null,
  };
}

function restoreAdminFocusState(focusState) {
  if (!focusState?.model) {
    return;
  }
  const field = Array.from(document.querySelectorAll("[data-model]")).find(
    (item) => item.dataset.model === focusState.model
  );
  if (!field) {
    return;
  }
  field.focus({ preventScroll: true });
  if (
    typeof focusState.start === "number" &&
    typeof field.setSelectionRange === "function" &&
    ["text", "search", "tel", "url", "password", ""].includes(field.type || "")
  ) {
    field.setSelectionRange(focusState.start, focusState.end ?? focusState.start);
  }
}

function preserveAdminScrollAndRender(options = {}) {
  const adminUi = ensureAdminUiState();
  const scrollTop = getAdminScrollTop();
  const focusState = options.restoreFocus === false ? null : captureAdminFocusState();
  adminUi.scrollTop = scrollTop;
  if (focusState?.model) {
    adminUi.focusedFieldKey = focusState.model;
  }
  if (options.renderShell) {
    renderShell();
  }
  renderView();
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollTop, left: 0, behavior: "auto" });
    restoreAdminFocusState(focusState);
  });
}

function getImportSettingsSummaryText() {
  const settings = ensureImportSettingsDefaults(state.data).importSettings;
  return `当前：${formatBibModeLabel(settings.bibMode)}｜${settings.startBibNo} 起｜${settings.bibDigits} 位｜每组最多 ${settings.maxAthletesPerGroup} 人`;
}

function getRoundSettingsSummaryText() {
  ensureRoundPlanRuleDefaults(state.data);
  const formationSettings = getEventFormationSettings();
  const formationSummary = formationSettings.enabled
    ? `少于${formationSettings.minParticipants}人需处理`
    : "项目成立检查关闭";
  const roundSummary = (state.data.importSettings.roundPlanRules || [])
    .map(formatRoundPlanRuleSummary)
    .join("｜");
  return [formationSummary, roundSummary].filter(Boolean).join("｜");
}

function formatRoundPlanRuleSummary(rule) {
  const rangeText = isRoundPlanUnlimitedMax(rule.maxAthletes)
    ? `${rule.minAthletes}人以上`
    : Number(rule.minAthletes) <= 1
      ? `${rule.maxAthletes}人以内`
      : `${rule.minAthletes}-${rule.maxAthletes}人`;
  return `${rangeText}：${(rule.rounds || []).map((round) => round.roundName).join(" → ")}`;
}

function formatRoundPlanRuleDetailSummary(rule) {
  const firstRound = rule.rounds?.[0] || {};
  const qualificationText = formatQualificationRuleText(
    firstRound.qualificationRule || { mode: "none" },
    getRoundNameById(firstRound.qualificationRule?.targetRoundId) || ""
  );
  return [
    getRoundPlanRangeText(rule),
    (rule.rounds || []).map((round) => round.roundName).join(" → "),
    `每组最多${firstRound.maxAthletesPerGroup || state.data.importSettings?.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE}人`,
    qualificationText,
  ]
    .filter(Boolean)
    .join("｜");
}

function updateAdminPanelSummaries() {
  const importSummary = document.querySelector('[data-admin-panel-summary="import-settings"]');
  if (importSummary) {
    importSummary.textContent = getImportSettingsSummaryText();
  }
  const roundSummary = document.querySelector('[data-admin-panel-summary="round-settings"]');
  if (roundSummary) {
    roundSummary.textContent = getRoundSettingsSummaryText();
  }
  document.querySelectorAll("[data-formation-rule-summary]").forEach((summary) => {
    summary.textContent = getFormationRuleSummaryText();
  });
}

function getEntryQualificationPanelId(entry) {
  return entry?.id ? `entry-qualification-${entry.id}` : "";
}

function hasExecutableQualificationRule(entry) {
  const rule = entry?.qualificationRule || {};
  return Boolean(
    entry &&
      entry.type !== "break" &&
      rule.mode &&
      rule.mode !== "none" &&
      rule.targetEntryId
  );
}

function getEntryQualificationSummary(entry, adminDay) {
  const rule = entry?.qualificationRule || {};
  if (!entry || entry.type === "break" || !rule.mode || rule.mode === "none") {
    return "本轮无晋级规则";
  }

  const targetEntry =
    (adminDay?.entries || []).find((item) => item.id === rule.targetEntryId) || null;
  const targetRoundName =
    entry.targetRoundName ||
    targetEntry?.roundName ||
    (targetEntry ? getEntryRoundName(targetEntry) : "") ||
    "";
  const ruleText = formatQualificationRuleText(rule, targetRoundName);
  return targetEntry || targetRoundName
    ? `本轮晋级：${ruleText}`
    : `本轮晋级：${ruleText}（未选择目标赛程）`;
}

function updateLocalSettingPreview(modelField, modelPath) {
  const ruleMatch = modelPath.match(/^importSettings\.roundPlanRules\[(\d+)\]/);
  if (!ruleMatch) {
    return;
  }
  const rule = state.data.importSettings?.roundPlanRules?.[Number(ruleMatch[1])] || null;
  const card = modelField.closest(".round-rule-card");
  if (!rule || !card) {
    return;
  }
  const title = card.querySelector("h4");
  if (title) {
    title.textContent = rule.name || "";
  }
  const summary = card.querySelector(".round-rule-summary");
  if (summary) {
    summary.textContent = formatRoundPlanRuleDetailSummary(rule);
  }
}

function updateRoundPlanLivePreview(modelPath) {
  if (
    !modelPath?.startsWith?.("importSettings.roundPlanRules") &&
    modelPath !== "importSettings.roundPlanMaxExpectedAthletes" &&
    !modelPath?.startsWith?.("roundSettings.roundOptions")
  ) {
    return;
  }

  const validationSummary = document.querySelector(".round-validation-summary");
  if (validationSummary) {
    validationSummary.outerHTML = renderRoundPlanValidationSummary(
      validateRoundPlanSettings(state.data, getCurrentRoundPlanValidationOptions())
    );
  }

  const simulationPanel = document.querySelector(".round-simulation-panel");
  if (simulationPanel) {
    simulationPanel.outerHTML = renderRoundPlanSimulationTable();
  }
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("focusout", handleFocusOut);
  document.addEventListener("toggle", handleToggle, true);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("popstate", (event) => {
    restoreHistoryState(event.state);
  });
}

function handleKeydown(event) {
  const manualPanel = ensureManualRegistrationPanelState();
  if (event.key === "Escape" && manualPanel.isOpen) {
    event.preventDefault();
    closeManualRegistrationPanel();
    renderView();
    return;
  }

  if (event.key === "Escape" && state.promotePanel.isOpen) {
    event.preventDefault();
    closePromotePanel();
    renderView();
    return;
  }

  if (event.key === "Escape" && ensureAppFeedbackState().dialog.open) {
    event.preventDefault();
    closeAppDialog();
    return;
  }

  if (event.key === "Escape" && state.preRaceChange?.changeGroupComboboxOpen) {
    event.preventDefault();
    closePreRaceTargetGroupCombobox();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  const resultSearchField = event.target.closest("[data-result-search-keyword], [data-result-search-project]");
  if (resultSearchField) {
    event.preventDefault();
    submitResultSearch();
    return;
  }

  const loginField = event.target.closest("#login-email, #login-password");
  if (!loginField) {
    return;
  }

  event.preventDefault();
  loginAdmin();
}

function handleClick(event) {
  const dialogAction = event.target.closest("[data-app-dialog-action]");
  if (dialogAction) {
    runAppDialogAction(dialogAction.dataset.appDialogAction);
    return;
  }

  if (event.target.closest("[data-app-dialog-close]") || event.target.matches("[data-app-dialog-backdrop]")) {
    closeAppDialog();
    return;
  }

  if (event.target.matches("[data-manual-registration-backdrop]")) {
    closeManualRegistrationPanel();
    renderView();
    return;
  }

  if (event.target.matches("[data-promote-modal-backdrop]")) {
    closePromotePanel();
    renderView();
    return;
  }

  const eventListJump = event.target.closest("[data-event-list-jump]");
  if (eventListJump) {
    document.querySelector("#event-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const actionMenuToggle = event.target.closest("[data-athlete-menu-toggle]");
  if (actionMenuToggle) {
    toggleAthleteActionMenu(Number(actionMenuToggle.dataset.athleteIndex));
    return;
  }

  const openEntryRow = event.target.closest("[data-open-entry-row]");
  if (openEntryRow) {
    state.selectedEntryId = openEntryRow.dataset.openEntryRow;
    ensureEntryWithGroups();
    setRoute("groups");
    return;
  }

  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    if (routeTarget.dataset.route === "admin") {
      enterAdminFromRoute();
      return;
    }
    setRoute(routeTarget.dataset.route);
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

  const openEventButton = event.target.closest("[data-open-event]");
  if (openEventButton) {
    state.selectedEventId = openEventButton.dataset.openEvent;
    syncSelections();
    const nextRoute = openEventButton.dataset.routeTarget || "schedule";
    setRoute(nextRoute);
    return;
  }

  const selectDayButton = event.target.closest("[data-select-day]");
  if (selectDayButton) {
    state.selectedDayId = selectDayButton.dataset.selectDay;
    syncSelections();
    renderView();
    replaceHistoryState();
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
    replaceHistoryState();
    return;
  }

  const resultSearchSubmit = event.target.closest("[data-result-search-submit]");
  if (resultSearchSubmit) {
    submitResultSearch();
    return;
  }

  const adminTabButton = event.target.closest("[data-admin-tab]");
  if (adminTabButton) {
    closePreRaceTargetGroupCombobox({ render: false });
    setActiveAdminTab(adminTabButton.dataset.adminTab);
    return;
  }

  const adminAction = event.target.closest("[data-admin-action]");
  if (adminAction) {
    if (!adminAction.closest("[data-change-combobox]")) {
      closePreRaceTargetGroupCombobox({ render: false });
    }
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
    return;
  }

  if (
    state.preRaceChange?.changeGroupComboboxOpen &&
    !event.target.closest("[data-change-combobox]")
  ) {
    closePreRaceTargetGroupCombobox({ render: false });
  }
}

function handleInput(event) {
  const preRaceField = event.target.closest("[data-prerace-field]");
  if (preRaceField) {
    const field = preRaceField.dataset.preraceField;
    updatePreRaceChangeField(field, preRaceField.value || "");
    if (field === "keyword") {
      schedulePreRaceSearchRender();
    }
    return;
  }

  const manualField = event.target.closest("[data-manual-registration-field]");
  if (manualField) {
    updateManualRegistrationPanelValue(manualField);
    return;
  }

  const resultKeyword = event.target.closest("[data-result-search-keyword]");
  if (resultKeyword) {
    state.resultSearchKeyword = resultKeyword.value || "";
    return;
  }

  const resultProject = event.target.closest("[data-result-search-project]");
  if (resultProject) {
    state.resultSearchProjectName = resultProject.value || "";
    return;
  }

  const modelField = event.target.closest("[data-model]");
  if (modelField && shouldUpdateModelWithoutFullRender(modelField)) {
    updateModelWithoutFullRender(modelField, { save: false });
  }
}

function submitResultSearch() {
  state.resultSearchKeyword = document.querySelector("[data-result-search-keyword]")?.value || "";
  state.resultSearchProjectName = document.querySelector("[data-result-search-project]")?.value || "";
  renderView();
}

function handleChange(event) {
  const preRaceField = event.target.closest("[data-prerace-field]");
  if (preRaceField) {
    updatePreRaceChangeField(preRaceField.dataset.preraceField, preRaceField.value || "");
    renderView();
    return;
  }

  const manualField = event.target.closest("[data-manual-registration-field]");
  if (manualField) {
    updateManualRegistrationPanelValue(manualField);
    return;
  }

  const resultEventSelect = event.target.closest("[data-result-search-event]");
  if (resultEventSelect) {
    state.resultSearchEventId = resultEventSelect.value || "";
    renderView();
    replaceHistoryState();
    return;
  }

  const formationActionSelect = event.target.closest("[data-formation-decision-action]");
  if (formationActionSelect) {
    updatePendingFormationDecision(formationActionSelect.dataset.competitionKey, {
      action: formationActionSelect.value,
    });
    return;
  }

  const formationTargetSelect = event.target.closest("[data-formation-decision-target]");
  if (formationTargetSelect) {
    updatePendingFormationDecision(formationTargetSelect.dataset.competitionKey, {
      action: "merge_manual",
      targetCompetitionKey: formationTargetSelect.value || "",
    });
    return;
  }

  const modelField = event.target.closest("[data-model]");
  if (modelField) {
    if (isSettingsModelField(modelField)) {
      updateModelWithoutFullRender(modelField, { save: true });
      if (modelField.tagName === "SELECT") {
        preserveAdminScrollAndRender({ restoreFocus: false });
      }
      return;
    }

    const { modelPath } = updateModelWithoutFullRender(modelField, { save: false });
    const targetGroup = getGroupFromAthleteModelPath(modelPath);
    if (targetGroup) {
      resetGroupResultWorkflowAfterResultChange(targetGroup);
      recalculateGroupRanks(targetGroup);
      recalculateAllGroupRanks(state.data);
    }
    if (isEntryRankingRuleModelPath(modelPath)) {
      resetEntryResultWorkflowStatuses(getAdminEntry());
    }
    // 字段修改后仅自动写入本地，不自动上传云端。
    saveLocalData(state.data);
    if (modelPath.includes(".qualificationRule.")) {
      preserveAdminScrollAndRender();
      return;
    }
    renderShell();
    renderView();
    return;
  }

  const adminSelect = event.target.closest("[data-admin-select]");
  if (adminSelect) {
    const adminSelectType = adminSelect.dataset.adminSelect;
    if (adminSelectType === "event") {
      state.adminEventId = adminSelect.value || null;
      state.adminDayId = null;
      state.adminEntryId = null;
      state.adminGroupId = null;
    }
    if (adminSelectType === "day") {
      state.adminDayId = adminSelect.value || null;
      state.adminEntryId = null;
      state.adminGroupId = null;
    }
    if (adminSelectType === "entry") {
      state.adminEntryId = adminSelect.value || null;
      state.adminGroupId = null;
    }
    if (adminSelectType === "group") {
      state.adminGroupId = adminSelect.value || null;
    }
    syncSelections();
    if (adminSelectType === "entry" || adminSelectType === "group") {
      preserveAdminScrollAndRender({ restoreFocus: false });
    } else {
      renderView();
    }
    replaceHistoryState();
    if (adminSelectType === "group") {
      scrollToAdminAthleteList();
    }
    return;
  }

  const mobileGroupSelect = event.target.closest("[data-group-select-mobile]");
  if (mobileGroupSelect) {
    state.selectedGroupId = mobileGroupSelect.value;
    syncSelections();
    renderView();
    replaceHistoryState();
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

function handleFocusOut(event) {
  const modelField = event.target.closest("[data-model]");
  if (!modelField || !isSettingsModelField(modelField)) {
    return;
  }
  updateModelWithoutFullRender(modelField, { save: true });
}

function handleToggle(event) {
  const details = event.target;
  if (!details?.matches?.("details[data-admin-panel]")) {
    return;
  }
  setAdminPanelExpanded(details.dataset.adminPanel, details.open);
}

function shouldUpdateModelWithoutFullRender(modelField) {
  if (!isSettingsModelField(modelField)) {
    return false;
  }
  return modelField.tagName === "INPUT" || modelField.tagName === "TEXTAREA";
}

function isSettingsModelField(modelField) {
  const path = modelField?.dataset?.model || "";
  return (
    path.startsWith("importSettings.") ||
    path.startsWith("roundSettings.")
  );
}

function updateModelWithoutFullRender(modelField, options = {}) {
  const nextValue = getModelFieldValue(modelField);
  const modelPath = modelField.dataset.model;
  setByPath(state.data, modelPath, nextValue);
  syncEventNameRelatedData(modelPath);
  syncRoundModelAfterChange(modelPath, nextValue);
  syncRoundPlanRuleAfterChange(modelPath);
  syncEntryRaceRuleAfterChange(modelPath);
  ensureEntryQualificationDefaults(state.data);
  updateAdminPanelSummaries();
  updateLocalSettingPreview(modelField, modelPath);
  updateRoundPlanLivePreview(modelPath);
  if (options.save) {
    saveLocalData(state.data);
  }
  return { modelPath, nextValue };
}

function syncRoundPlanRuleAfterChange(path) {
  const ruleMatch = path?.match?.(/^importSettings\.roundPlanRules\[(\d+)\]/);
  if (!ruleMatch) {
    return;
  }
  const rule = state.data.importSettings?.roundPlanRules?.[Number(ruleMatch[1])] || null;
  syncRoundPlanRuleChain(rule);
}

function syncEventNameRelatedData(path) {
  const eventNameMatch = path?.match?.(/^events\[(\d+)\]\.name$/);
  if (!eventNameMatch) {
    return;
  }

  const eventIndex = Number(eventNameMatch[1]);
  const event = state.data.events[eventIndex];
  if (event && typeof syncEventBookDataName === "function") {
    syncEventBookDataName(event);
  }
}

function syncRoundModelAfterChange(path, value) {
  if (!path) {
    return;
  }

  if (path.startsWith("events[") && path.endsWith(".roundName")) {
    const roundName = normalizeText(value);
    const roundId = getRoundIdByName(roundName) || createStableId("round", roundName || "round");
    setByPath(state.data, path.replace(/\.roundName$/, ".round"), roundName);
    setByPath(state.data, path.replace(/\.roundName$/, ".roundId"), roundId);
    return;
  }

  const ruleStepRoundMatch = path.match(/^importSettings\.roundPlanRules\[(\d+)\]\.rounds\[(\d+)\]\.roundId$/);
  if (ruleStepRoundMatch) {
    const [, ruleIndex, roundIndex] = ruleStepRoundMatch;
    const roundName = getRoundNameById(value) || normalizeText(value);
    setByPath(
      state.data,
      `importSettings.roundPlanRules[${ruleIndex}].rounds[${roundIndex}].roundName`,
      roundName
    );
    return;
  }

  const roundOptionNameMatch = path.match(/^roundSettings\.roundOptions\[(\d+)\]\.name$/);
  if (roundOptionNameMatch) {
    const option = state.data.roundSettings?.roundOptions?.[Number(roundOptionNameMatch[1])] || null;
    if (!option?.id) {
      return;
    }
    const roundName = normalizeText(value);
    (state.data.importSettings?.roundPlanRules || []).forEach((rule) => {
      (rule.rounds || []).forEach((round) => {
        if (round.roundId === option.id) {
          round.roundName = roundName;
        }
      });
    });
    (state.data.events || []).forEach((eventItem) => {
      (eventItem.days || []).forEach((day) => {
        (day.entries || []).forEach((entry) => {
          if (entry.roundId === option.id) {
            entry.roundName = roundName;
            entry.round = roundName;
          }
        });
      });
    });
  }
}

function syncEntryRaceRuleAfterChange(path) {
  if (!path || !/\.((isMergedRace)|(raceMergeMode)|(rankDisplayMode))$/.test(path)) {
    return;
  }

  const entry = getEntryFromModelPath(path);
  if (!entry || entry.type === "break") {
    return;
  }

  if (!entry.isMergedRace) {
    entry.raceMergeMode = entry.raceMergeMode || "race_together_rank_separately";
    entry.rankDisplayMode = entry.rankDisplayMode || "auto";
    return;
  }

  entry.raceMergeMode = getEntryRaceMergeMode(entry);
  entry.rankDisplayMode = "auto";
  const mergeNote = getEntryRaceMergeNote(entry);
  entry.formationNote = mergeNote;
  entry.note = mergeNote;
}

function getEntryFromModelPath(path) {
  const match = path.match(/^events\[(\d+)\]\.days\[(\d+)\]\.entries\[(\d+)\]/);
  if (!match) {
    return null;
  }
  const [, eventIndexText, dayIndexText, entryIndexText] = match;
  return state.data.events?.[Number(eventIndexText)]?.days?.[Number(dayIndexText)]?.entries?.[Number(entryIndexText)] || null;
}

function getEntryRaceMergeNote(entry) {
  if (!entry?.isMergedRace) {
    return "";
  }
  return getEntryRaceMergeMode(entry) === "race_together_rank_together"
    ? "合并比赛，统一排名"
    : "合并比赛，按原组别/原项目分别排名";
}

function getModelFieldValue(modelField) {
  if (modelField.dataset.modelGroupChains === "true") {
    return parseFormationGroupChainsText(modelField.value);
  }

  if (modelField.dataset.modelList === "true") {
    return parseTextList(modelField.value);
  }

  if (modelField.dataset.modelNumber === "true") {
    return Number(modelField.value || 0);
  }

  if (modelField.dataset.modelOptionalNumber === "true") {
    return modelField.value === "" ? "" : Number(modelField.value);
  }

  if (modelField.value === "true") {
    return true;
  }

  if (modelField.value === "false") {
    return false;
  }

  return modelField.value;
}

function isEntryRankingRuleModelPath(modelPath = "") {
  return (
    modelPath.endsWith(".isMergedRace") ||
    modelPath.endsWith(".raceMergeMode") ||
    modelPath.endsWith(".rankDisplayMode")
  );
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
    case "select-admin-day":
      selectAdminDay(dataset.dayId);
      break;
    case "move-day-up":
      moveCurrentDay(-1);
      break;
    case "move-day-down":
      moveCurrentDay(1);
      break;
    case "remove-day":
      removeDay();
      break;
    case "add-entry":
      addEntry();
      break;
    case "add-entry-after-current":
      addEntryAfterCurrent();
      break;
    case "remove-entry":
      removeEntry();
      break;
    case "move-entry-up":
      moveCurrentEntry(-1);
      break;
    case "move-entry-down":
      moveCurrentEntry(1);
      break;
    case "add-group":
      addGroup();
      break;
    case "remove-group":
      removeGroup();
      break;
    case "add-athlete":
      openManualRegistrationPanel("group");
      break;
    case "open-manual-registration":
      openManualRegistrationPanel("import");
      break;
    case "refresh-prerace-search":
      renderView();
      break;
    case "select-prerace-athlete":
      selectPreRaceAthlete(dataset.athleteKey);
      break;
    case "toggle-prerace-target-group-combobox":
      togglePreRaceTargetGroupCombobox();
      break;
    case "select-prerace-target-group":
      updatePreRaceChangeField("targetGroupKey", dataset.groupKey || "");
      renderView();
      break;
    case "save-prerace-draft":
      savePreRaceChangeDraft();
      break;
    case "preview-prerace-change":
      previewPreRaceChange();
      break;
    case "unlock-prerace-high-risk":
      unlockPreRaceHighRisk();
      break;
    case "apply-prerace-change":
      confirmApplyPreRaceChange();
      break;
    case "reset-prerace-form":
      resetPreRaceChangeForm({ keepKeyword: true });
      renderView();
      break;
    case "save-manual-registration":
      saveManualRegistrationFromPanel();
      break;
    case "cancel-manual-registration":
      closeManualRegistrationPanel();
      renderView();
      break;
    case "sort-athletes-by-rank":
      sortCurrentGroupAthletesByRank();
      break;
    case "recalculate-sort-current-group-results":
      recalculateAndSortCurrentGroupResults();
      break;
    case "print-current-group-result-sheet":
      printCurrentGroupResultSheet();
      break;
    case "recalculate-current-entry-ranks":
      recalculateCurrentEntryRanks();
      break;
    case "apply-global-race-rule-to-current-entry":
      applyGlobalRaceRuleToCurrentEntry();
      break;
    case "preview-auto-qualification":
      previewAutoQualification();
      break;
    case "execute-auto-qualification":
      executeAutoQualification();
      break;
    case "toggle-entry-qualification-settings":
      toggleEntryQualificationSettings(dataset.entryId);
      break;
    case "open-current-group-in-admin":
      openCurrentGroupInAdmin();
      break;
    case "import-athletes-bulk":
      importAthletesBulk(dataset.importMode);
      break;
    case "promote-athlete":
      promoteAthlete(Number(dataset.athleteIndex));
      break;
    case "open-prerace-change-athlete":
      openPreRaceChangeForAthlete(Number(dataset.athleteIndex));
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
    case "import-registration-json":
      importRegistrationJson();
      break;
    case "toggle-registration-import-panel":
      toggleRegistrationImportPanel();
      break;
    case "focus-formation-settings":
      focusEventFormationSettings();
      break;
    case "confirm-formation-import":
      applyPendingRegistrationImport();
      break;
    case "cancel-formation-import":
      cancelPendingRegistrationImport();
      break;
    case "export-book-json":
      exportBookJson();
      break;
    case "export-book-html":
      exportBookHtml();
      break;
    case "export-book-pdf":
      exportBookPdf();
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
    case "add-round-option":
      addRoundOption();
      break;
    case "validate-round-plan-settings":
      runRoundPlanSettingsSelfCheck();
      break;
    case "remove-round-option":
      removeRoundOption(Number(dataset.index));
      break;
    case "move-round-option":
      moveRoundOption(Number(dataset.index), Number(dataset.direction));
      break;
    case "add-round-plan-rule":
      addRoundPlanRule();
      break;
    case "remove-round-plan-rule":
      removeRoundPlanRule(Number(dataset.index));
      break;
    case "move-round-plan-rule":
      moveRoundPlanRule(Number(dataset.index), Number(dataset.direction));
      break;
    case "add-round-plan-step":
      addRoundPlanStep(Number(dataset.ruleIndex));
      break;
    case "remove-round-plan-step":
      removeRoundPlanStep(Number(dataset.ruleIndex), Number(dataset.roundIndex));
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

function addRoundOption() {
  ensureRoundSettingsDefaults(state.data);
  const nextIndex = state.data.roundSettings.roundOptions.length + 1;
  state.data.roundSettings.roundOptions.push({
    id: createStableId("round", `custom-${Date.now()}-${nextIndex}`),
    name: `自定义赛别${nextIndex}`,
  });
  persistSettingsChange();
}

function runRoundPlanSettingsSelfCheck() {
  const validation = validateRoundPlanSettings(state.data, getCurrentRoundPlanValidationOptions());
  if (!validation.errors.length && !validation.warnings.length) {
    showAppNotice({ type: "success", title: "赛制规则体检通过", duration: 1600 });
    return;
  }

  showRoundPlanValidationDialog(validation, {
    title: validation.errors.length ? "赛制规则存在错误" : "赛制规则存在提醒",
    eyebrow: "赛制规则自检",
    allowGoToSettings: false,
  });
}

function ensureRoundPlanSettingsReadyForGeneration(contextLabel = "生成赛程", validationOptions = {}) {
  const validation = validateRoundPlanSettings(state.data, validationOptions);
  if (!validation.errors.length) {
    return true;
  }

  showRoundPlanValidationDialog(validation, {
    title: "赛制规则存在错误，已阻止生成赛程",
    eyebrow: contextLabel,
    allowGoToSettings: true,
  });
  return false;
}

function showRoundPlanValidationDialog(validation, options = {}) {
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  const infos = validation?.infos || [];
  const basisHtml = validation?.context?.basisLabel
    ? `<div class="app-dialog-info-block"><strong>校验依据</strong><p>${escapeHtml(validation.context.basisLabel)}</p></div>`
    : "";
  const issueGroups = [
    basisHtml,
    errors.length
      ? `<div class="app-dialog-warning-list round-validation-dialog-errors">
          <strong>错误（必须修复）</strong>
          ${errors.map((issue) => `<p>${escapeHtml(issue.message)}</p>`).join("")}
        </div>`
      : "",
    warnings.length
      ? `<div class="app-dialog-warning-list round-validation-dialog-warnings">
          <strong>提醒</strong>
          ${warnings.map((issue) => `<p>${escapeHtml(issue.message)}</p>`).join("")}
        </div>`
      : "",
    infos.length
      ? `<div class="app-dialog-warning-list round-validation-dialog-infos">
          <strong>参考信息</strong>
          ${infos.map((issue) => `<p>${escapeHtml(issue.message)}</p>`).join("")}
        </div>`
      : "",
  ].filter(Boolean).join("");

  showAppDialog({
    eyebrow: options.eyebrow || "赛制规则",
    title: options.title || "赛制规则体检结果",
    message: errors.length
      ? "请先修复以下错误，再导入报名 JSON 或进行赛前重算。"
      : "以下提醒不会阻止继续操作，但建议赛前核对。",
    tone: errors.length ? "danger" : "warning",
    contentHtml: issueGroups,
    actions: [
      ...(options.allowGoToSettings
        ? [{
            label: "去规则设置",
            variant: "primary",
            closeOnClick: true,
            onClick: () => {
              setActiveAdminTab("settings");
              setAdminPanelExpanded("round-settings", true);
            },
          }]
        : []),
      { label: "关闭", variant: "ghost", closeOnClick: true },
    ],
  });
}

function getRoundOptionUsage(roundId) {
  const normalizedRoundId = normalizeText(roundId);
  const usage = [];
  (state.data.importSettings?.roundPlanRules || []).forEach((rule, ruleIndex) => {
    (rule.rounds || []).forEach((round, roundIndex) => {
      if (round.roundId === normalizedRoundId) {
        usage.push(`人数规则“${rule.name || `规则${ruleIndex + 1}`}”第 ${roundIndex + 1} 轮`);
      }
      if (round.qualificationRule?.targetRoundId === normalizedRoundId) {
        usage.push(`人数规则“${rule.name || `规则${ruleIndex + 1}`}”第 ${roundIndex + 1} 轮晋级目标`);
      }
    });
  });
  (state.data.events || []).forEach((eventItem) => {
    (eventItem.days || []).forEach((day) => {
      (day.entries || []).forEach((entry) => {
        if (entry.roundId === normalizedRoundId) {
          usage.push(`赛事“${eventItem.name || "未命名赛事"}”赛程“${entry.projectName || entry.name || entry.roundName || "未命名赛程"}”`);
        }
        if (entry.qualificationRule?.targetRoundId === normalizedRoundId) {
          usage.push(`赛事“${eventItem.name || "未命名赛事"}”赛程“${entry.projectName || entry.name || "未命名赛程"}”晋级目标`);
        }
      });
    });
  });
  return usage;
}

function removeRoundOption(index) {
  ensureRoundSettingsDefaults(state.data);
  const options = state.data.roundSettings.roundOptions;
  if (!Number.isInteger(index) || index < 0 || index >= options.length || options.length <= 1) {
    return;
  }
  const option = options[index];
  const usage = getRoundOptionUsage(option.id);
  if (usage.length) {
    showAppDialog({
      eyebrow: "赛别管理",
      title: "该赛别正在使用，不能删除",
      message: "该赛别正在被人数规则或赛程使用。请先移除相关规则，再删除赛别。",
      tone: "warning",
      contentHtml: `
        <div class="app-dialog-warning-list">
          ${usage.slice(0, 8).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
          ${usage.length > 8 ? `<p>还有 ${usage.length - 8} 处引用未显示。</p>` : ""}
        </div>
      `,
      confirmText: "知道了",
      cancelText: "",
      actions: [{ label: "知道了", variant: "primary", closeOnClick: true }],
    });
    return;
  }
  options.splice(index, 1);
  persistSettingsChange();
}

function moveRoundOption(index, direction) {
  ensureRoundSettingsDefaults(state.data);
  moveArrayItem(state.data.roundSettings.roundOptions, index, direction);
  persistSettingsChange();
}

function addRoundPlanRule() {
  ensureRoundPlanRuleDefaults(state.data);
  state.data.importSettings.roundPlanRules.push(normalizeRoundPlanRule({
    id: createStableId("round-rule", `custom-${Date.now()}`),
    name: "新赛制规则",
    minAthletes: 1,
    maxAthletes: 999,
    rounds: clone(DEFAULT_ROUND_PLAN_RULES[0].rounds),
  }));
  persistSettingsChange();
}

function removeRoundPlanRule(index) {
  ensureRoundPlanRuleDefaults(state.data);
  const rules = state.data.importSettings.roundPlanRules;
  if (!Number.isInteger(index) || index < 0 || index >= rules.length || rules.length <= 1) {
    return;
  }
  rules.splice(index, 1);
  persistSettingsChange();
}

function moveRoundPlanRule(index, direction) {
  ensureRoundPlanRuleDefaults(state.data);
  moveArrayItem(state.data.importSettings.roundPlanRules, index, direction);
  persistSettingsChange();
}

function addRoundPlanStep(ruleIndex) {
  ensureRoundPlanRuleDefaults(state.data);
  const rule = state.data.importSettings.roundPlanRules[ruleIndex];
  if (!rule) return;
  const finalRound = state.data.roundSettings?.roundOptions?.find((option) => option.id === "final") ||
    state.data.roundSettings?.roundOptions?.[0] ||
    { id: "final", name: "决赛" };
  rule.rounds.push(normalizeRoundPlanStep({
    roundId: finalRound.id,
    roundName: finalRound.name,
    source: "qualified",
    maxAthletesPerGroup: state.data.importSettings.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE,
    qualificationRule: { mode: "none" },
  }, rule.rounds.length));
  syncRoundPlanRuleChain(rule);
  persistSettingsChange();
}

function removeRoundPlanStep(ruleIndex, roundIndex) {
  ensureRoundPlanRuleDefaults(state.data);
  const rule = state.data.importSettings.roundPlanRules[ruleIndex];
  if (!rule || !Number.isInteger(roundIndex) || rule.rounds.length <= 1) return;
  rule.rounds.splice(roundIndex, 1);
  syncRoundPlanRuleChain(rule);
  persistSettingsChange();
}

function syncRoundPlanRuleChain(rule) {
  if (!rule || !Array.isArray(rule.rounds)) {
    return;
  }
  rule.rounds.forEach((round, roundIndex) => {
    const roundName = getRoundNameById(round.roundId) || round.roundName || `第${roundIndex + 1}轮`;
    round.roundName = roundName;
    round.source = roundIndex === 0 ? "registrations" : "qualified";
    round.qualificationRule = normalizeQualificationRule(round.qualificationRule || {});
    const nextRound = rule.rounds[roundIndex + 1] || null;
    if (!nextRound) {
      round.qualificationRule.mode = "none";
      round.qualificationRule.targetRoundId = "";
      round.qualificationRule.targetEntryId = "";
      return;
    }
    if (round.qualificationRule.mode !== "none") {
      round.qualificationRule.targetRoundId = nextRound.roundId || "";
    } else {
      round.qualificationRule.targetRoundId = "";
      round.qualificationRule.targetEntryId = "";
    }
  });
}

function moveArrayItem(items, index, direction) {
  if (!Array.isArray(items) || !Number.isInteger(index) || !Number.isInteger(direction)) {
    return;
  }
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || index >= items.length || targetIndex >= items.length) {
    return;
  }
  [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
}

function persistSettingsChange() {
  ensureEntryQualificationDefaults(state.data);
  saveLocalData(state.data);
  preserveAdminScrollAndRender({ restoreFocus: false });
}

function toggleEntryQualificationSettings(entryId) {
  const entry = getAdminEntry();
  if (!entry || (entryId && entry.id !== entryId)) {
    return;
  }
  const panelId = getEntryQualificationPanelId(entry);
  if (!panelId) {
    return;
  }
  toggleAdminPanel(panelId);
  preserveAdminScrollAndRender({ restoreFocus: false });
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
    showAfterFinished: true,
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
  event.days = event.days || [];
  const nextDay = {
    id: uid("day"),
    label: `第 ${event.days.length + 1} 天`,
    date: "待定",
    note: "请补充比赛日说明。",
    entries: [],
  };
  event.days.push(nextDay);
  normalizeDefaultDayLabels(event);
  state.adminDayId = nextDay.id;
  if (event.id === state.selectedEventId) {
    state.selectedDayId = nextDay.id;
  }
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function selectAdminDay(dayId) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  const day = event?.days?.find((item) => item.id === dayId);
  if (!event || !day) return;
  state.adminDayId = day.id;
  state.adminEntryId = null;
  state.adminGroupId = null;
  if (event.id === state.selectedEventId) {
    state.selectedDayId = day.id;
    state.selectedEntryId = null;
    state.selectedGroupId = null;
  }
  syncSelections();
  renderView();
  replaceHistoryState();
}

function moveCurrentDay(direction) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  if (!event || !state.adminDayId) return;
  const days = event.days || [];
  const currentIndex = days.findIndex((day) => day.id === state.adminDayId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= days.length) {
    return;
  }

  const [currentDay] = days.splice(currentIndex, 1);
  days.splice(nextIndex, 0, currentDay);
  normalizeDefaultDayLabels(event);
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function normalizeDefaultDayLabels(event) {
  (event?.days || []).forEach((day, index) => {
    if (!day.label || /^第\s*\d+\s*天$/.test(day.label)) {
      day.label = `第 ${index + 1} 天`;
    }
  });
}

function removeDay() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  if (!event || !state.adminDayId) return;
  event.days = event.days.filter((day) => day.id !== state.adminDayId);
  normalizeDefaultDayLabels(event);
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
  const nextEntry = createDefaultEntry();
  day.entries.push(nextEntry);
  state.adminEntryId = nextEntry.id;
  if (day.id === state.selectedDayId) {
    state.selectedEntryId = nextEntry.id;
  }
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function addEntryAfterCurrent() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const day = getAdminDay();
  const entry = getAdminEntry();
  if (!day || !entry) return;

  const currentIndex = findEntryIndex(day, entry.id);
  if (currentIndex < 0) return;

  const nextEntry = createDefaultEntry();
  day.entries.splice(currentIndex + 1, 0, nextEntry);
  state.adminEntryId = nextEntry.id;
  if (day.id === state.selectedDayId) {
    state.selectedEntryId = nextEntry.id;
  }
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function moveCurrentEntry(delta) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const day = getAdminDay();
  const entry = getAdminEntry();
  if (!day || !entry || !day.entries?.length) return;

  const currentIndex = findEntryIndex(day, entry.id);
  if (currentIndex < 0) return;

  const targetIndex = currentIndex + delta;
  if (targetIndex < 0 || targetIndex >= day.entries.length) {
    return;
  }

  [day.entries[currentIndex], day.entries[targetIndex]] = [day.entries[targetIndex], day.entries[currentIndex]];

  state.adminEntryId = entry.id;
  if (day.id === state.selectedDayId && state.selectedEntryId === entry.id) {
    state.selectedEntryId = entry.id;
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

function createDefaultEntry() {
  return {
    id: uid("entry"),
    time: "09:00",
    projectName: "新项目",
    division: "待定组别",
    gender: "待定",
    round: "决赛",
    roundId: "final",
    roundName: "决赛",
    roundOrder: 1,
    roundSource: "manual",
    sourceEntryId: "",
    targetEntryId: "",
    competitionKey: "",
    isMergedRace: false,
    raceMergeMode: "race_together_rank_separately",
    rankDisplayMode: "auto",
    formationNote: "",
    mergedFrom: [],
    scheduleStatus: "手动录入",
    participantCount: "0",
    groupCount: "0",
    qualification: "待定",
    qualificationRule: {
      mode: "none",
      topNPerGroup: 1,
      fastestRemainderCount: 0,
      targetEntryId: "",
      targetGroupMode: "same_group_index",
    },
    qualificationMode: "manual",
    qualificationTopN: 1,
    qualificationTargetEntryId: "",
    qualificationTargetGroupMode: "same_group_index",
    note: "",
    type: "race",
    groups: [],
  };
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
  openManualRegistrationPanel("group");
}

function ensureManualRegistrationPanelState() {
  if (!state.manualRegistrationPanel) {
    state.manualRegistrationPanel = {
      isOpen: false,
      source: "",
      entryId: "",
      groupId: "",
      values: {},
    };
  }
  if (!state.manualRegistrationPanel.values) {
    state.manualRegistrationPanel.values = {};
  }
  return state.manualRegistrationPanel;
}

function openManualRegistrationPanel(source = "group") {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  let day = getAdminDay();
  let entry = getAdminEntry();
  let group = getAdminGroup();

  if (!event) {
    window.alert("请先选择或新建赛事，再手动补录参赛人员。");
    return;
  }

  day = day || event.days?.[0] || null;
  if (source !== "group" && (!entry || entry.type === "break" || !group)) {
    entry = (day?.entries || []).find((item) => item.type !== "break" && item.groups?.length) || null;
    group = entry?.groups?.[0] || null;
  }

  if (!day || !entry || !group) {
    window.alert("请先创建或选择比赛日、赛程条目和分组，再手动补录参赛人员。");
    return;
  }

  state.adminDayId = day.id;
  state.adminEntryId = entry.id;
  state.adminGroupId = group.id;

  const panel = ensureManualRegistrationPanelState();
  panel.isOpen = true;
  panel.source = source;
  panel.entryId = entry.id;
  panel.groupId = group.id;
  panel.values = createDefaultManualRegistrationValues(entry, group);
  closeAthleteActionMenu();
  closePromotePanel();
  renderView();
}

function closeManualRegistrationPanel() {
  const panel = ensureManualRegistrationPanelState();
  panel.isOpen = false;
  panel.source = "";
  panel.entryId = "";
  panel.groupId = "";
  panel.values = {};
}

function createDefaultManualRegistrationValues(entry, group) {
  return {
    bibMode: "auto",
    bibNo: "",
    name: "",
    organization: "",
    gender: entry?.gender || "",
    genderLabel: entry?.gender || "",
    birthDate: "",
    birthYear: "",
    age: "",
    certificateNumber: "",
    phone: "",
    organizationLeader: "",
    organizationCoach: "",
    idCardMessage: "",
    groupName: entry?.division || entry?.groupName || "",
    groupId: entry?.groupId || entry?.registrationGroupId || "",
    eventName: entry?.projectName || entry?.name || "",
    eventId: entry?.eventId || entry?.registrationEventId || "",
    entryId: entry?.id || "",
    targetGroupId: group?.id || "",
    lane: getNextLaneForGroup(group),
    note: "",
    manualReason: "",
  };
}

function getManualRegistrationPanelValues() {
  const panel = ensureManualRegistrationPanelState();
  return {
    ...createDefaultManualRegistrationValues(getAdminEntry(), getAdminGroup()),
    ...(panel.values || {}),
  };
}

function updateManualRegistrationPanelValue(field) {
  const panel = ensureManualRegistrationPanelState();
  if (!panel.isOpen) {
    return;
  }

  const key = field.dataset.manualRegistrationField;
  panel.values = {
    ...(panel.values || {}),
    [key]: field.value,
  };

  if (key === "certificateNumber") {
    updateManualRegistrationFromCertificate(field.value);
    return;
  }

  if (key === "birthDate") {
    const birthYear = getBirthYearFromDate(field.value);
    const age = calculateManualAge(field.value, getManualRegistrationReferenceDate());
    panel.values = {
      ...panel.values,
      birthYear,
      age,
      idCardMessage: panel.values.idCardMessage || "",
    };
    setManualRegistrationOutputValue("age", age || "自动识别");
    return;
  }

  if (key === "entryId") {
    const day = getAdminDay();
    const nextEntry = day?.entries?.find((entry) => entry.id === field.value) || null;
    const nextGroup = nextEntry?.groups?.[0] || null;
    panel.entryId = nextEntry?.id || "";
    panel.groupId = nextGroup?.id || "";
    panel.values = {
      ...panel.values,
      targetGroupId: nextGroup?.id || "",
      groupName: nextEntry?.division || nextEntry?.groupName || panel.values.groupName || "",
      groupId: nextEntry?.groupId || nextEntry?.registrationGroupId || panel.values.groupId || "",
      eventName: nextEntry?.projectName || nextEntry?.name || panel.values.eventName || "",
      eventId: nextEntry?.eventId || nextEntry?.registrationEventId || panel.values.eventId || "",
      gender: nextEntry?.gender || panel.values.gender || "",
      lane: getNextLaneForGroup(nextGroup),
    };
    if (panel.values.birthDate) {
      panel.values.age = calculateManualAge(panel.values.birthDate, getManualRegistrationReferenceDate());
    }
    preserveAdminScrollAndRender({ restoreFocus: false });
    return;
  }

  if (key === "targetGroupId") {
    panel.groupId = field.value || "";
  }
}

function updateManualRegistrationFromCertificate(value) {
  const panel = ensureManualRegistrationPanelState();
  const parsed = parseChineseIdCard(value);
  const trimmedValue = normalizeText(value);

  if (parsed.valid) {
    panel.values = {
      ...(panel.values || {}),
      certificateNumber: trimmedValue,
      birthDate: parsed.birthDate,
      birthYear: String(parsed.birthYear || ""),
      gender: parsed.genderLabel,
      genderLabel: parsed.genderLabel,
      age: parsed.age ? String(parsed.age) : "",
      idCardMessage: "",
    };
    setManualRegistrationFieldValue("birthDate", parsed.birthDate);
    setManualRegistrationFieldValue("gender", parsed.genderLabel);
    setManualRegistrationOutputValue("age", parsed.age ? String(parsed.age) : "自动识别");
    setManualIdMessage("");
    return;
  }

  const shouldShowMessage = Boolean(trimmedValue && trimmedValue.length >= 15);
  panel.values = {
    ...(panel.values || {}),
    certificateNumber: trimmedValue,
    idCardMessage: shouldShowMessage ? parsed.message || "证件号未能识别，请手动选择性别和出生日期。" : "",
  };
  setManualIdMessage(panel.values.idCardMessage);
}

function setManualRegistrationFieldValue(fieldName, value) {
  const field = document.querySelector(`[data-manual-registration-field="${fieldName}"]`);
  if (field) {
    field.value = value || "";
  }
}

function setManualRegistrationOutputValue(fieldName, value) {
  const field = document.querySelector(`[data-manual-registration-output="${fieldName}"]`);
  if (field) {
    field.value = value || "";
  }
}

function setManualIdMessage(message) {
  const messageNode = document.querySelector("[data-manual-id-message]");
  if (messageNode) {
    messageNode.textContent = message || "";
  }
}

function getNextLaneForGroup(group) {
  const lanes = (group?.athletes || [])
    .map((athlete) => Number.parseInt(athlete.lane, 10))
    .filter((lane) => Number.isFinite(lane));
  return String((lanes.length ? Math.max(...lanes) : 0) + 1);
}

function parseChineseIdCard(value) {
  const text = normalizeText(value).toUpperCase();
  if (!text) {
    return { valid: false, message: "" };
  }

  let birthText = "";
  let genderDigit = "";
  if (/^\d{17}[\dX]$/.test(text)) {
    birthText = text.slice(6, 14);
    genderDigit = text.charAt(16);
  } else if (/^\d{15}$/.test(text)) {
    birthText = `19${text.slice(6, 12)}`;
    genderDigit = text.charAt(14);
  } else {
    return { valid: false, message: "证件号格式不正确，请手动选择性别和出生日期。" };
  }

  const year = Number(birthText.slice(0, 4));
  const month = Number(birthText.slice(4, 6));
  const day = Number(birthText.slice(6, 8));
  if (!isValidBirthDateParts(year, month, day)) {
    return { valid: false, message: "证件号出生日期无法识别，请手动填写出生日期。" };
  }

  const birthDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isMale = Number.parseInt(genderDigit, 10) % 2 === 1;
  const genderLabel = isMale ? "男" : "女";
  const age = calculateManualAge(birthDate, getManualRegistrationReferenceDate());
  return {
    valid: true,
    birthDate,
    birthYear: year,
    gender: isMale ? "male" : "female",
    genderLabel,
    age,
  };
}

function isValidBirthDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getManualRegistrationReferenceDate() {
  const dayDate = normalizeText(getAdminDay()?.date);
  if (dayDate) {
    return dayDate;
  }
  const eventDateRange = normalizeText(getAdminEvent()?.dateRange);
  if (eventDateRange) {
    return eventDateRange.split(/\s*[-~至—]\s*/)[0] || "";
  }
  return new Date().toISOString().slice(0, 10);
}

function calculateManualAge(birthDate, referenceDate) {
  const birth = parseManualDate(birthDate);
  const reference = parseManualDate(referenceDate) || new Date();
  if (!birth || !reference) {
    return "";
  }
  let age = reference.getFullYear() - birth.getFullYear();
  const hasHadBirthday =
    reference.getMonth() > birth.getMonth() ||
    (reference.getMonth() === birth.getMonth() && reference.getDate() >= birth.getDate());
  if (!hasHadBirthday) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function parseManualDate(value) {
  const text = normalizeText(value).replace(/\//g, "-");
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidBirthDateParts(year, month, day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function getBirthYearFromDate(birthDate) {
  const birth = parseManualDate(birthDate);
  return birth ? String(birth.getFullYear()) : "";
}

function saveManualRegistrationFromPanel() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  const day = getAdminDay();
  const panel = ensureManualRegistrationPanelState();
  const formValues = collectManualRegistrationFormValues();
  const entry = day?.entries?.find((item) => item.id === formValues.entryId) || null;
  const group = entry?.groups?.find((item) => item.id === formValues.targetGroupId) || null;

  if (!event || !entry || !group) {
    window.alert("补录失败：请先选择有效的赛事、赛程和分组。");
    return;
  }

  try {
    const result = addManualRegistrationToEvent(event, {
      ...formValues,
      dayId: day.id,
      entryId: entry.id,
      groupIdInEntry: group.id,
      targetGroupId: group.id,
    });
    saveLocalData(state.data);
    closeManualRegistrationPanel();
    state.adminEntryId = entry.id;
    state.adminGroupId = group.id;
    syncSelections();
    renderShell();
    renderView();
    window.alert(result.reusedExistingAthlete
      ? `补录成功：检测到该运动员已存在，已沿用号码 ${result.bibNo} 并追加到当前项目。`
      : `补录成功：已分配号码 ${result.bibNo}。`);
  } catch (error) {
    window.alert(error.message || "补录失败，请检查表单。");
    panel.values = {
      ...(panel.values || {}),
      ...formValues,
    };
  }
}

function collectManualRegistrationFormValues() {
  const panelValues = getManualRegistrationPanelValues();
  const values = { ...panelValues };
  document.querySelectorAll("[data-manual-registration-field]").forEach((field) => {
    values[field.dataset.manualRegistrationField] = field.value;
  });
  return values;
}

function addManualRegistrationToEvent(event, payload) {
  const day = (event.days || []).find((item) => item.id === payload.dayId) || getAdminDay();
  const entry = day?.entries?.find((item) => item.id === payload.entryId) || null;
  const group = entry?.groups?.find((item) => item.id === payload.groupIdInEntry || item.id === payload.targetGroupId) || null;
  if (!event || !entry || !group) {
    throw new Error("补录失败：目标赛程或分组不存在。");
  }

  const normalized = normalizeManualRegistrationPayload(event, entry, group, payload);
  validateManualRegistrationPayload(normalized);

  const identityKey = getAthleteIdentityKey(normalized);
  if (isManualAthleteAlreadyInEntry(entry, normalized, identityKey)) {
    throw new Error("该运动员已在当前项目中，无需重复添加。");
  }

  const existingAthlete = findExistingEventAthlete(event, normalized, identityKey);
  const reusedBibNo = existingAthlete?.bibNo || existingAthlete?.bib || "";
  let bibNo = reusedBibNo;
  let reusedExistingAthlete = Boolean(existingAthlete && reusedBibNo);

  if (!bibNo) {
    if (normalized.bibMode === "manual") {
      bibNo = normalizeBibNo(normalized.bibNo, normalized.bibDigits);
      ensureBibNoAvailable(event, bibNo, identityKey);
    } else {
      bibNo = getNextAvailableBibNo(event, {
        startBibNo: normalized.startBibNo,
        bibDigits: normalized.bibDigits,
      });
    }
  }

  const manualRegistration = {
    id: uid("manual-registration"),
    source: "manual-registration",
    createdAt: new Date().toISOString(),
    name: normalized.name,
    gender: normalized.gender,
    genderLabel: normalized.genderLabel || normalized.gender,
    birthDate: normalized.birthDate,
    birthYear: normalized.birthYear,
    certificateNumber: normalized.certificateNumber,
    phone: normalized.phone,
    organization: normalized.organization,
    team: normalized.organization,
    organizationLeader: normalized.organizationLeader,
    organizationCoach: normalized.organizationCoach,
    leaderNames: normalized.leaderNames,
    coachNames: normalized.coachNames,
    groupName: normalized.groupName,
    groupId: normalized.groupId,
    eventName: normalized.eventName,
    eventId: normalized.eventId,
    projectName: normalized.eventName,
    entryId: entry.id,
    groupIdInEntry: group.id,
    bibNo,
    bib: bibNo,
    lane: normalized.lane,
    manualReason: normalized.manualReason,
    note: normalized.note,
    identityKey,
  };

  event.manualRegistrations = Array.isArray(event.manualRegistrations)
    ? event.manualRegistrations
    : [];
  event.manualRegistrations.push(manualRegistration);

  appendManualAthleteToEntryGroup(entry, group, manualRegistration);
  syncManualRegistrationToImportState(event, manualRegistration, { reusedExistingAthlete });
  syncManualRegistrationToBookData(event, manualRegistration);
  recalculateGroupRanks(group);
  recalculateAllGroupRanks(state.data);

  return {
    bibNo,
    reusedExistingAthlete,
    manualRegistration,
  };
}

function normalizeManualRegistrationPayload(event, entry, group, payload) {
  const settings = ensureImportSettingsDefaults(state.data).importSettings;
  const gender = normalizeText(payload.gender || entry.gender || "");
  const birthDate = normalizeText(payload.birthDate);
  const birthYear = getBirthYearFromDate(birthDate) || normalizeText(payload.birthYear);
  const leaderNames = parseManualStaffNames(payload.organizationLeader || payload.leaderNames);
  const coachNames = parseManualStaffNames(payload.organizationCoach || payload.coachNames);
  return {
    ...payload,
    name: normalizeText(payload.name),
    organization: normalizeText(payload.organization || payload.team) || EMPTY_ORGANIZATION_LABEL,
    gender,
    genderLabel: normalizeGenderLabel(gender),
    birthDate,
    birthYear,
    certificateNumber: normalizeText(payload.certificateNumber),
    phone: normalizeText(payload.phone),
    organizationLeader: leaderNames.join("、"),
    organizationCoach: coachNames.join("、"),
    leaderNames,
    coachNames,
    groupName: normalizeText(payload.groupName || entry.division || entry.groupName),
    groupId: normalizeText(payload.groupId || entry.groupId || entry.registrationGroupId),
    eventName: normalizeText(payload.eventName || entry.projectName || entry.name),
    eventId: normalizeText(payload.eventId || entry.eventId || entry.registrationEventId),
    bibMode: payload.bibMode === "manual" ? "manual" : "auto",
    bibNo: normalizeText(payload.bibNo),
    lane: normalizeText(payload.lane) || getNextLaneForGroup(group),
    note: normalizeText(payload.note),
    manualReason: normalizeText(payload.manualReason),
    startBibNo: settings.startBibNo,
    bibDigits: settings.bibDigits,
  };
}

function validateManualRegistrationPayload(payload) {
  const missingFields = [];
  if (!payload.name) missingFields.push("姓名");
  if (!payload.organization) missingFields.push("代表单位");
  if (!payload.gender) missingFields.push("性别");
  if (!payload.groupName) missingFields.push("组别");
  if (!payload.eventName) missingFields.push("项目");
  if (payload.bibMode === "manual" && !payload.bibNo) missingFields.push("号码");
  if (missingFields.length) {
    throw new Error(`请填写：${missingFields.join("、")}。`);
  }
}

function normalizeGenderLabel(gender) {
  const value = normalizeText(gender);
  if (value === "男子") return "男";
  if (value === "女子") return "女";
  return value;
}

function parseManualStaffNames(value) {
  if (Array.isArray(value)) {
    return value.flatMap(parseManualStaffNames);
  }
  return String(value || "")
    .split(/[、,，;；/\s\n\r]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function appendManualAthleteToEntryGroup(entry, group, manualRegistration) {
  const athlete = {
    rank: "",
    originalRank: "",
    mergedOverallRank: "",
    lane: manualRegistration.lane || getNextLaneForGroup(group),
    bib: manualRegistration.bibNo,
    bibNo: manualRegistration.bibNo,
    name: manualRegistration.name,
    team: manualRegistration.organization,
    organization: manualRegistration.organization,
    gender: manualRegistration.genderLabel || manualRegistration.gender,
    genderLabel: manualRegistration.genderLabel || manualRegistration.gender,
    birthDate: manualRegistration.birthDate,
    birthYear: manualRegistration.birthYear,
    certificateNumber: manualRegistration.certificateNumber,
    phone: manualRegistration.phone,
    organizationLeader: manualRegistration.organizationLeader,
    organizationCoach: manualRegistration.organizationCoach,
    leaderNames: manualRegistration.leaderNames,
    coachNames: manualRegistration.coachNames,
    groupId: manualRegistration.groupId,
    groupName: manualRegistration.groupName,
    eventId: manualRegistration.eventId,
    eventName: manualRegistration.eventName,
    result: "",
    note: manualRegistration.note || "",
    manualReason: manualRegistration.manualReason || "",
    manualRegistrationId: manualRegistration.id,
    source: "manual-registration",
    isManualRegistration: true,
  };
  group.athletes = [...(group.athletes || []), athlete];
  updateEntryParticipantStats(entry);
}

function updateEntryParticipantStats(entry) {
  const groups = entry?.groups || [];
  const total = groups.reduce((sum, group) => sum + (group.athletes?.length || 0), 0);
  entry.participantCount = String(total);
  entry.groupCount = String(groups.length);
}

function syncManualRegistrationToImportState(event, manualRegistration, options = {}) {
  event.registrationImport = event.registrationImport || {
    source: "manual-registration",
    schemaVersion: REGISTRATION_EXPORT_SCHEMA_VERSION,
    importedAt: manualRegistration.createdAt,
    targetEventId: event.id,
    targetEventName: event.name,
    summary: {},
    warnings: [],
    athletes: [],
    groups: [],
    events: [],
    entries: [],
    organizationRanges: [],
    bookData: null,
  };

  const importState = event.registrationImport;
  importState.manualRegistrations = Array.isArray(importState.manualRegistrations)
    ? importState.manualRegistrations
    : [];
  importState.manualRegistrations = upsertById(importState.manualRegistrations, manualRegistration);
  importState.summary = {
    ...(importState.summary || {}),
    manualCount: importState.manualRegistrations.length,
  };

  if (!options.reusedExistingAthlete) {
    importState.athletes = upsertByIdentity(importState.athletes || [], {
      id: createStableId("manual-athlete", manualRegistration.identityKey || manualRegistration.id),
      source: "manual-registration",
      bibNo: manualRegistration.bibNo,
      registrationNo: "",
      name: manualRegistration.name,
      certificateNumber: manualRegistration.certificateNumber,
      gender: manualRegistration.gender,
      genderLabel: manualRegistration.genderLabel,
      birthDate: manualRegistration.birthDate,
      birthYear: manualRegistration.birthYear,
      phone: manualRegistration.phone,
      organization: manualRegistration.organization,
      organizationLeader: manualRegistration.organizationLeader,
      organizationCoach: manualRegistration.organizationCoach,
      leaderNames: manualRegistration.leaderNames,
      coachNames: manualRegistration.coachNames,
      groupId: manualRegistration.groupId,
      groupName: manualRegistration.groupName,
    });
  }

  importState.entries = upsertById(importState.entries || [], {
    ...manualRegistration,
    id: createStableId("manual-entry", `${manualRegistration.id}|${manualRegistration.entryId}`),
    athleteId: createStableId("manual-athlete", manualRegistration.identityKey || manualRegistration.id),
    eventKey: createManualRegistrationEventKey(manualRegistration),
    groupKey: createManualRegistrationGroupKey(manualRegistration),
  });
}

function syncManualRegistrationToBookData(event, manualRegistration) {
  const bookData = ensureEventBookData(event, manualRegistration.createdAt);
  const athleteNumber = {
    bibNo: manualRegistration.bibNo,
    registrationNo: "",
    name: manualRegistration.name,
    organization: manualRegistration.organization,
    gender: manualRegistration.genderLabel || manualRegistration.gender,
    birthDate: manualRegistration.birthDate,
    groupId: manualRegistration.groupId,
    groupName: manualRegistration.groupName,
    source: "manual-registration",
  };
  addStaffFieldsIfPresent(athleteNumber, manualRegistration);
  bookData.athleteNumberList = upsertByIdentity(bookData.athleteNumberList || [], athleteNumber);

  const bookGroup = getOrCreateBookGroup(bookData, manualRegistration);
  const bookEvent = getOrCreateBookEvent(bookGroup, manualRegistration);
  bookEvent.entries = upsertByIdentity(bookEvent.entries || [], createBookEntryFromManualRegistration(manualRegistration));
  bookEvent.entries.sort(compareBookEntryBibAndName);
  updateOrganizationStaff(event, manualRegistration.organization, {
    leaderNames: manualRegistration.leaderNames,
    coachNames: manualRegistration.coachNames,
  });

  rebuildBookDataDerivedLists(event);
}

function ensureEventBookData(event, generatedAt = "") {
  event.bookData = event.bookData || event.registrationImport?.bookData || {
    eventId: event.id,
    eventName: event.name || "秩序册",
    source: "manual-registration",
    generatedAt,
    importedAt: generatedAt || new Date().toISOString(),
    organizationRanges: [],
    organizationRosters: [],
    athleteNumberList: [],
    groups: [],
  };
  event.bookData.eventId = event.id;
  event.bookData.eventName = event.name || event.bookData.eventName || "秩序册";
  event.bookData.athleteNumberList = Array.isArray(event.bookData.athleteNumberList) ? event.bookData.athleteNumberList : [];
  event.bookData.groups = Array.isArray(event.bookData.groups) ? event.bookData.groups : [];
  return event.bookData;
}

function getOrCreateBookGroup(bookData, manualRegistration) {
  const groupKey = createManualRegistrationGroupKey(manualRegistration);
  let bookGroup = bookData.groups.find((group) => group.groupKey === groupKey || group.groupName === manualRegistration.groupName);
  if (!bookGroup) {
    bookGroup = {
      groupId: manualRegistration.groupId,
      groupKey,
      groupName: manualRegistration.groupName,
      displayName: manualRegistration.groupName,
      gender: manualRegistration.genderLabel || manualRegistration.gender,
      events: [],
    };
    bookData.groups.push(bookGroup);
  }
  bookGroup.events = Array.isArray(bookGroup.events) ? bookGroup.events : [];
  return bookGroup;
}

function getOrCreateBookEvent(bookGroup, manualRegistration) {
  const eventKey = createManualRegistrationEventKey(manualRegistration);
  let bookEvent = bookGroup.events.find((event) => event.eventKey === eventKey || event.eventName === manualRegistration.eventName);
  if (!bookEvent) {
    bookEvent = {
      eventId: manualRegistration.eventId,
      eventKey,
      eventName: manualRegistration.eventName,
      formationNote: "",
      entries: [],
    };
    bookGroup.events.push(bookEvent);
  }
  bookEvent.entries = Array.isArray(bookEvent.entries) ? bookEvent.entries : [];
  return bookEvent;
}

function createBookEntryFromManualRegistration(manualRegistration) {
  const entry = {
    bibNo: manualRegistration.bibNo,
    registrationNo: "",
    name: manualRegistration.name,
    organization: manualRegistration.organization,
    gender: manualRegistration.gender,
    genderLabel: manualRegistration.genderLabel,
    birthDate: manualRegistration.birthDate,
    groupId: manualRegistration.groupId,
    groupName: manualRegistration.groupName,
    eventId: manualRegistration.eventId,
    eventName: manualRegistration.eventName,
    source: "manual-registration",
    manualReason: manualRegistration.manualReason,
    note: manualRegistration.note,
  };
  addStaffFieldsIfPresent(entry, manualRegistration);
  return entry;
}

function addStaffFieldsIfPresent(target, source) {
  const leaderNames = parseManualStaffNames(source.leaderNames || source.organizationLeader || source.leader);
  const coachNames = parseManualStaffNames(source.coachNames || source.organizationCoach || source.coach);
  if (leaderNames.length) {
    target.leaderNames = leaderNames;
    target.organizationLeader = leaderNames.join("、");
    target.leader = target.organizationLeader;
  }
  if (coachNames.length) {
    target.coachNames = coachNames;
    target.organizationCoach = coachNames.join("、");
    target.coach = target.organizationCoach;
  }
}

function updateOrganizationStaff(event, organization, staff = {}) {
  const leaderNames = parseManualStaffNames(staff.leaderNames || staff.organizationLeader || staff.leader);
  const coachNames = parseManualStaffNames(staff.coachNames || staff.organizationCoach || staff.coach);
  if (!leaderNames.length && !coachNames.length) {
    return;
  }

  const normalizedOrganization = normalizeText(organization) || EMPTY_ORGANIZATION_LABEL;
  const bookData = ensureEventBookData(event);
  bookData.organizationRosters = mergeStaffIntoOrganizationRosters(bookData.organizationRosters || [], normalizedOrganization, {
    leaderNames,
    coachNames,
  });

  if (event.registrationImport) {
    event.registrationImport.organizationRosters = mergeStaffIntoOrganizationRosters(
      event.registrationImport.organizationRosters || [],
      normalizedOrganization,
      { leaderNames, coachNames }
    );
  }
}

function mergeStaffIntoOrganizationRosters(rosters, organization, staff) {
  const normalizedOrganization = normalizeText(organization) || EMPTY_ORGANIZATION_LABEL;
  const next = Array.isArray(rosters) ? clone(rosters) : [];
  let roster = next.find((item) => normalizeText(item.organization) === normalizedOrganization);
  if (!roster) {
    roster = {
      organization: normalizedOrganization,
      leaderNames: [],
      coachNames: [],
      athletes: [],
      groupedAthletes: [],
    };
    next.push(roster);
  }

  roster.leaderNames = mergeStaffNameLists(roster.leaderNames, staff.leaderNames);
  roster.coachNames = mergeStaffNameLists(roster.coachNames, staff.coachNames);
  return next;
}

function mergeStaffNameLists(existing, incoming) {
  const names = [];
  [existing, incoming].forEach((value) => {
    parseManualStaffNames(value).forEach((name) => {
      if (!names.includes(name)) {
        names.push(name);
      }
    });
  });
  return names;
}

function createOrganizationRosterStaffMap(rosters) {
  const map = new Map();
  (rosters || []).forEach((roster) => {
    const organization = normalizeText(roster.organization) || EMPTY_ORGANIZATION_LABEL;
    map.set(organization, {
      leaderNames: parseManualStaffNames(roster.leaderNames || roster.organizationLeader || roster.leader),
      coachNames: parseManualStaffNames(roster.coachNames || roster.organizationCoach || roster.coach),
    });
  });
  return map;
}

function mergeExistingStaffIntoOrganizationRosters(rosters, staffMap) {
  if (!staffMap?.size) {
    return rosters;
  }
  return (rosters || []).map((roster) => {
    const organization = normalizeText(roster.organization) || EMPTY_ORGANIZATION_LABEL;
    const existingStaff = staffMap.get(organization);
    if (!existingStaff) {
      return roster;
    }
    return {
      ...roster,
      leaderNames: mergeStaffNameLists(existingStaff.leaderNames, roster.leaderNames),
      coachNames: mergeStaffNameLists(existingStaff.coachNames, roster.coachNames),
    };
  });
}

function rebuildBookDataDerivedLists(event) {
  const bookData = ensureEventBookData(event);
  const existingRosterStaff = createOrganizationRosterStaffMap(bookData.organizationRosters);
  bookData.athleteNumberList = (bookData.athleteNumberList || [])
    .slice()
    .sort(compareBookEntryBibAndName);
  const rangeAthletes = bookData.athleteNumberList.map((athlete) => ({
    ...athlete,
    bibNo: athlete.bibNo || athlete.bib || "",
    organization: athlete.organization || athlete.team || EMPTY_ORGANIZATION_LABEL,
  }));
  bookData.organizationRanges = createOrganizationRanges(rangeAthletes);
  const allBookEntries = collectBookDataEntries(bookData);
  bookData.organizationRosters = mergeExistingStaffIntoOrganizationRosters(createOrganizationRosterData({
    athletes: bookData.athleteNumberList,
    entries: allBookEntries,
    organizationRanges: bookData.organizationRanges,
  }), existingRosterStaff);
  event.organizationRanges = clone(bookData.organizationRanges);
  if (event.registrationImport) {
    event.registrationImport.summary = {
      ...(event.registrationImport.summary || {}),
      athletesCount: bookData.athleteNumberList.length,
      entriesCount: allBookEntries.length,
      organizationRangesCount: bookData.organizationRanges.length,
      manualCount: event.manualRegistrations?.length || 0,
    };
    event.registrationImport.bookData = clone(bookData);
    event.registrationImport.organizationRanges = clone(bookData.organizationRanges);
  }
}

function collectBookDataEntries(bookData) {
  return (bookData.groups || []).flatMap((group) =>
    (group.events || []).flatMap((event) => event.entries || [])
  );
}

function mergeManualRegistrationsIntoEvent(event) {
  const manualRegistrations = Array.isArray(event?.manualRegistrations) ? clone(event.manualRegistrations) : [];
  if (!event || !manualRegistrations.length) {
    return;
  }

  manualRegistrations.forEach((manualRegistration) => {
    const target = findManualRegistrationTarget(event, manualRegistration);
    if (target) {
      manualRegistration.entryId = target.entry.id;
      manualRegistration.groupIdInEntry = target.group.id;
      if (!isManualAthleteAlreadyInEntry(target.entry, manualRegistration, getAthleteIdentityKey(manualRegistration))) {
        appendManualAthleteToEntryGroup(target.entry, target.group, manualRegistration);
      }
    }
    syncManualRegistrationToImportState(event, manualRegistration, { reusedExistingAthlete: Boolean(findExistingEventAthlete(event, manualRegistration, getAthleteIdentityKey(manualRegistration))) });
    syncManualRegistrationToBookData(event, manualRegistration);
  });
}

function findManualRegistrationTarget(event, manualRegistration) {
  const days = event.days || [];
  for (const day of days) {
    const entries = day.entries || [];
    const directEntry = entries.find((entry) => entry.id === manualRegistration.entryId);
    const matchedEntry =
      directEntry ||
      entries.find((entry) =>
        normalizeText(entry.projectName || entry.name) === normalizeText(manualRegistration.eventName) &&
        normalizeText(entry.division || entry.groupName) === normalizeText(manualRegistration.groupName) &&
        (!manualRegistration.gender || normalizeText(entry.gender) === normalizeText(manualRegistration.gender))
      );
    if (!matchedEntry) continue;
    const group =
      matchedEntry.groups?.find((item) => item.id === manualRegistration.groupIdInEntry) ||
      matchedEntry.groups?.[0] ||
      null;
    if (group) {
      return { day, entry: matchedEntry, group };
    }
  }
  return null;
}

function createManualRegistrationGroupKey(manualRegistration) {
  const groupId = normalizeText(manualRegistration.groupId) || createStableId("manual-group", manualRegistration.groupName);
  const gender = normalizeText(manualRegistration.genderLabel || manualRegistration.gender);
  return `${groupId}::${gender || "未填性别"}`;
}

function createManualRegistrationEventKey(manualRegistration) {
  const eventId = normalizeText(manualRegistration.eventId) || createStableId("manual-event", manualRegistration.eventName);
  return `${createManualRegistrationGroupKey(manualRegistration)}::${eventId}`;
}

function upsertById(list, item) {
  const next = Array.isArray(list) ? list.slice() : [];
  const index = next.findIndex((candidate) => candidate.id && item.id && candidate.id === item.id);
  if (index >= 0) {
    next[index] = { ...next[index], ...item };
  } else {
    next.push(item);
  }
  return next;
}

function upsertByIdentity(list, item) {
  const next = Array.isArray(list) ? list.slice() : [];
  const key = getAthleteIdentityKey(item);
  const bib = normalizeText(item.bibNo || item.bib);
  const index = next.findIndex((candidate) => {
    const candidateKey = getAthleteIdentityKey(candidate);
    const candidateBib = normalizeText(candidate.bibNo || candidate.bib);
    return (key && candidateKey && key === candidateKey) || (bib && candidateBib && bib === candidateBib);
  });
  if (index >= 0) {
    next[index] = { ...next[index], ...item };
  } else {
    next.push(item);
  }
  return next;
}

function getUsedBibNumbers(event) {
  const used = new Map();
  const settings = ensureImportSettingsDefaults(state.data).importSettings;
  const digits = Number(settings.bibDigits || DEFAULT_BIB_DIGITS);
  collectEventAthleteRecords(event).forEach((athlete) => {
    const bib = normalizeBibNo(athlete.bibNo || athlete.bib, digits);
    if (!bib || used.has(bib)) {
      return;
    }
    used.set(bib, athlete);
  });
  return used;
}

function getNextAvailableBibNo(event, options = {}) {
  const settings = ensureImportSettingsDefaults(state.data).importSettings;
  const digits = Number(options.bibDigits || settings.bibDigits || DEFAULT_BIB_DIGITS);
  let current = Number(options.startBibNo || settings.startBibNo || DEFAULT_BIB_START);
  const used = getUsedBibNumbers(event);
  const numericUsed = Array.from(used.keys())
    .map((bib) => Number.parseInt(bib, 10))
    .filter((value) => Number.isFinite(value));
  if (numericUsed.length) {
    current = Math.max(current, Math.max(...numericUsed) + 1);
  }
  let bib = normalizeBibNo(current, digits);
  while (used.has(bib)) {
    current += 1;
    bib = normalizeBibNo(current, digits);
  }
  return bib;
}

function ensureBibNoAvailable(event, bibNo, identityKey = "") {
  const settings = ensureImportSettingsDefaults(state.data).importSettings;
  const normalizedBibNo = normalizeBibNo(bibNo, settings.bibDigits || DEFAULT_BIB_DIGITS);
  if (!normalizedBibNo) {
    throw new Error("请填写号码。");
  }
  const used = getUsedBibNumbers(event);
  const existing = used.get(normalizedBibNo);
  if (!existing) {
    return true;
  }
  const existingKey = getAthleteIdentityKey(existing);
  if (identityKey && existingKey && identityKey === existingKey) {
    return true;
  }
  throw new Error(`号码 ${normalizedBibNo} 已被 ${existing.name || "其他运动员"} 使用，请更换号码。`);
}

function normalizeBibNo(value, digits = DEFAULT_BIB_DIGITS) {
  const text = normalizeText(value);
  if (!text) return "";
  const number = Number.parseInt(text, 10);
  return Number.isFinite(number) && /^\d+$/.test(text)
    ? formatBibNo(number, Number(digits || DEFAULT_BIB_DIGITS))
    : text;
}

function findExistingEventAthlete(event, payload, identityKey = getAthleteIdentityKey(payload)) {
  if (!identityKey) {
    return null;
  }
  return collectEventAthleteRecords(event).find((athlete) => getAthleteIdentityKey(athlete) === identityKey) || null;
}

function isManualAthleteAlreadyInEntry(entry, payload, identityKey = getAthleteIdentityKey(payload)) {
  const payloadBib = normalizeText(payload.bibNo || payload.bib);
  return (entry?.groups || []).some((group) =>
    (group.athletes || []).some((athlete) => {
      const athleteKey = getAthleteIdentityKey(athlete);
      const sameIdentity = identityKey && athleteKey && identityKey === athleteKey;
      const sameBibAndName =
        payloadBib &&
        normalizeText(athlete.bibNo || athlete.bib) === payloadBib &&
        normalizeText(athlete.name) === normalizeText(payload.name);
      return sameIdentity || sameBibAndName;
    })
  );
}

function collectEventAthleteRecords(event) {
  const records = [];
  (event?.registrationImport?.athletes || []).forEach((athlete) => records.push(athlete));
  (event?.manualRegistrations || []).forEach((athlete) => records.push(athlete));
  (event?.bookData?.athleteNumberList || []).forEach((athlete) => records.push(athlete));
  (event?.days || []).forEach((day) => {
    (day.entries || []).forEach((entry) => {
      (entry.groups || []).forEach((group) => {
        (group.athletes || []).forEach((athlete) => records.push(athlete));
      });
    });
  });
  return records;
}

function compareBookEntryBibAndName(left, right) {
  return compareBibNo(left.bibNo || left.bib, right.bibNo || right.bib) || compareRegistrationText(left.name, right.name);
}

function openCurrentGroupInAdmin() {
  const currentEvent = getCurrentEvent();
  const currentDay = getCurrentDay();
  const currentEntry = getCurrentEntry();
  const currentGroup = getCurrentGroup();

  if (!currentEvent || !currentDay || !currentEntry || !currentGroup) {
    window.alert("当前分组上下文不完整，暂时无法直接定位到后台编辑。");
    return;
  }

  state.adminEventId = currentEvent.id;
  state.adminDayId = currentDay.id;
  state.adminEntryId = currentEntry.id;
  state.adminGroupId = currentGroup.id;

  setRoute("admin");
}

function importAthletesBulk(mode = "append") {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const group = getAdminGroup();
  if (!group) {
    window.alert("请先在后台选中一个分组，再执行批量导入。");
    return;
  }

  const textarea = document.querySelector("[data-athlete-import-text]");
  const rawText = textarea?.value || "";

  if (!rawText.trim()) {
    window.alert("请先粘贴要导入的运动员数据。");
    return;
  }

  let importedAthletes = [];
  try {
    importedAthletes = parseBulkAthleteImportText(rawText);
  } catch (error) {
    window.alert(`导入失败：${error.message}`);
    return;
  }

  if (!importedAthletes.length) {
    window.alert("没有识别到可导入的数据，请检查粘贴内容是否为空。");
    return;
  }

  if (mode === "replace" && group.athletes.length) {
    const confirmed = window.confirm(`确认清空当前分组已有的 ${group.athletes.length} 名运动员，并导入新的 ${importedAthletes.length} 条数据吗？`);
    if (!confirmed) {
      return;
    }
  }

  group.athletes = mode === "replace"
    ? importedAthletes
    : [...group.athletes, ...importedAthletes];

  recalculateGroupRanks(group);
  closeAthleteActionMenu();
  closePromotePanel();
  saveLocalData(state.data);
  syncSelections();
  renderView();
  window.alert(`导入成功，已${mode === "replace" ? "清空后导入" : "追加导入"} ${importedAthletes.length} 名运动员。`);
}

function parseBulkAthleteImportText(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  return lines.map((line, index) => {
    const columns = line.split("\t").map((value) => value.trim());

    if (columns.length < 4) {
      throw new Error(`第 ${index + 1} 行列数不足，请按“道次\t号码\t姓名\t单位”四列粘贴。`);
    }

    const [lane, bib, name, team] = columns;

    if (!name) {
      throw new Error(`第 ${index + 1} 行缺少姓名，请检查后重试。`);
    }

    return {
      rank: "",
      lane,
      bib,
      name,
      team,
      result: "",
      note: "",
    };
  });
}

function sortCurrentGroupAthletesByRank() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const group = getAdminGroup();
  const entry = getAdminEntry();
  if (!group?.athletes?.length) return;

  if (entry) {
    recalculateEntryRanks(entry);
  } else {
    recalculateGroupRanks(group);
  }
  sortGroupAthletesByEntryRank(group, entry);

  closeAthleteActionMenu();
  closePromotePanel();
  saveLocalData(state.data);
  syncSelections();
  renderView();
}

function sortGroupAthletesByEntryRank(group, entry) {
  const rankColumn = getEntryRankColumns(entry)[0];

  const parseRankValue = (value) => {
    if (value == null || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  group.athletes = (group.athletes || [])
    .map((athlete, originalIndex) => ({
      athlete,
      originalIndex,
      rankValue: parseRankValue(getAthleteRankColumnValue(athlete, rankColumn)),
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
}

function recalculateAndSortCurrentGroupResults() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const entry = getAdminEntry();
  const group = getAdminGroup();
  if (!entry || entry.type === "break" || !group?.athletes?.length) {
    window.alert("请先选择一个有运动员的比赛分组。");
    return;
  }

  recalculateEntryRanks(entry);
  sortGroupAthletesByEntryRank(group, entry);
  markGroupResultStatus(group, "recalculatedAt");
  saveLocalData(state.data);
  syncSelections();
  renderView();
  showAppNotice({
    type: "success",
    title: "名次已重新计算",
    duration: 1500,
  });
}

function printCurrentGroupResultSheet() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const event = getAdminEvent();
  const day = getAdminDay();
  const entry = getAdminEntry();
  const group = getAdminGroup();

  if (!event || !day || !entry || entry.type === "break" || !group) {
    window.alert("请先选择要打印的比赛分组。");
    return;
  }

  if (!group.athletes?.length) {
    window.alert("当前分组还没有运动员，无法打印成绩单。");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("浏览器阻止了预览窗口，请允许弹出窗口后重试。");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildCurrentGroupResultSheetHtml(event, day, entry, group));
  printWindow.document.close();
  printWindow.focus();

  markGroupResultStatus(group, "printedAt");
  saveLocalData(state.data);
  renderView();
}

function buildCurrentGroupResultSheetHtml(event, day, entry, group) {
  const printedAt = formatDateTime(createTimestamp());
  const rankColumns = getResultSheetRankColumns(entry);
  const includeSource = Boolean(entry.isMergedRace);
  const heading = "当前分组成绩单";
  const subtitle = [
    event.name,
    formatEntryDisplayTitle(entry),
    group.name || "未命名分组",
  ]
    .filter(Boolean)
    .join("｜");
  const metaItems = [
    ["赛事名称", event.name],
    ["比赛日", `${day.label || ""}${day.date ? ` · ${day.date}` : ""}`],
    ["赛程项目", entry.projectName || entry.name || ""],
    ["组别", formatGroupNameForDisplay(entry.division || entry.groupName || "")],
    ["性别", entry.gender || ""],
    ["赛别", getEntryRoundName(entry)],
    ["当前分组", group.name || ""],
    ["排名规则", getResultSheetRuleText(entry)],
    ["打印时间", printedAt],
  ];
  const headerCells = [
    ...rankColumns.map((column) => column.label),
    "道次",
    "号码",
    "姓名",
    "代表单位",
    "成绩",
    ...(includeSource ? ["来源"] : []),
    "备注",
  ];

  const rows = (group.athletes || []).map((athlete) => {
    const cells = [
      ...rankColumns.map((column) => getAthleteRankColumnValue(athlete, column)),
      athlete.lane || "",
      athlete.bib || athlete.bibNo || "",
      athlete.name || "",
      athlete.team || athlete.organization || "",
      athlete.result || "",
      ...(includeSource ? [getAthleteSourcePlainText(athlete)] : []),
      athlete.note || "",
    ];
    return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
  });

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)} - ${escapeHtml(event.name || "")}</title>
  <style>${buildResultSheetPrintStyles()}</style>
</head>
<body>
  <div class="no-print print-toolbar">
    <strong>${escapeHtml(heading)}</strong>
    <div>
      <button type="button" onclick="window.print()">打印 / 保存 PDF</button>
      <button type="button" onclick="window.close()">关闭预览</button>
    </div>
  </div>
  <main class="sheet">
    <header class="sheet-header">
      <p class="sheet-kicker">赛事通成绩单</p>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(subtitle)}</p>
    </header>
    <section class="sheet-meta">
      ${metaItems
        .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`)
        .join("")}
    </section>
    ${entry.isMergedRace ? `<p class="merge-note-print">${escapeHtml(getEntryMergeRankingNotice(entry))}</p>` : ""}
    <table>
      <thead>
        <tr>${headerCells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.join("") || `<tr><td colspan="${headerCells.length}">当前分组暂无成绩。</td></tr>`}
      </tbody>
    </table>
    <footer class="signature-row">
      <div>计时员签字：</div>
      <div>裁判长签字：</div>
      <div>记录员签字：</div>
    </footer>
  </main>
</body>
</html>`;
}

function getResultSheetRankColumns(entry) {
  if (entry?.isMergedRace && getEntryRaceMergeMode(entry) === "race_together_rank_separately") {
    return [
      { label: "总名次", field: "mergedOverallRank" },
      { label: "小项名次", field: "originalRank" },
    ];
  }
  return [{ label: "名次", field: "rank" }];
}

function getResultSheetRuleText(entry) {
  return getEntryMergeRankingNotice(entry) || "普通比赛：按当前成绩统一排名。";
}

function getAthleteSourcePlainText(athlete = {}) {
  const label = getMergeTypeLabel(athlete.mergeType);
  const note = createMergeNote(athlete);
  if (label && note) {
    return `${label}：${note}`;
  }
  return label || note || athlete.sourceGroupName || "";
}

function buildResultSheetPrintStyles() {
  return `
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #edf3fb;
      color: #10243f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      border-bottom: 1px solid #d8e2f0;
      background: #fff;
      box-shadow: 0 8px 24px rgba(16, 36, 64, 0.08);
    }
    .print-toolbar button {
      min-height: 36px;
      margin-left: 8px;
      padding: 0 14px;
      border: 0;
      border-radius: 999px;
      background: #244b86;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    .print-toolbar button + button {
      background: #e8eef7;
      color: #244b86;
    }
    .sheet {
      max-width: 1120px;
      margin: 22px auto;
      padding: 28px;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 18px 50px rgba(16, 36, 64, 0.12);
    }
    .sheet-header {
      text-align: center;
      border-bottom: 2px solid #10243f;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .sheet-kicker {
      margin: 0 0 4px;
      color: #64748b;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.18em;
    }
    h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: 0.08em;
    }
    .sheet-header p:last-child {
      margin: 8px 0 0;
      color: #4f617a;
      font-weight: 700;
    }
    .sheet-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px 14px;
      margin-bottom: 14px;
      font-size: 13px;
    }
    .sheet-meta div {
      display: flex;
      gap: 6px;
      min-width: 0;
    }
    .sheet-meta span {
      flex: 0 0 auto;
      color: #64748b;
      font-weight: 700;
    }
    .sheet-meta strong {
      color: #10243f;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .merge-note-print {
      margin: 12px 0;
      padding: 9px 11px;
      border: 1px solid #f4bf75;
      border-radius: 10px;
      background: #fff7eb;
      color: #8a4b0f;
      font-size: 13px;
      font-weight: 800;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
    }
    th,
    td {
      border: 1px solid #d7dfeb;
      padding: 7px 6px;
      text-align: center;
      vertical-align: middle;
      word-break: break-word;
    }
    th {
      background: #edf3fb;
      color: #173f78;
      font-weight: 900;
    }
    td:nth-child(4),
    td:nth-child(5) {
      text-align: left;
    }
    .signature-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-top: 42px;
      color: #10243f;
      font-weight: 800;
    }
    .signature-row div {
      min-height: 34px;
      border-bottom: 1px solid #10243f;
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .sheet {
        max-width: none;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  `;
}

function recalculateCurrentEntryRanks() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const entry = getAdminEntry();
  if (!entry || entry.type === "break") {
    window.alert("请先选择一个可计算名次的赛程条目。");
    return;
  }

  const confirmed = window.confirm("将根据当前赛程规则重新计算本赛程所有运动员名次，原手动名次可能被覆盖。确认继续吗？");
  if (!confirmed) {
    return;
  }

  if (entry.isMergedRace) {
    entry.raceMergeMode = getEntryRaceMergeMode(entry);
    entry.rankDisplayMode = "auto";
    const mergeNote = getEntryRaceMergeNote(entry);
    entry.formationNote = mergeNote;
    entry.note = mergeNote;
  }
  recalculateEntryRanks(entry);
  saveLocalData(state.data);
  syncSelections();
  renderView();
  window.alert("名次已重新计算");
}

function applyGlobalRaceRuleToCurrentEntry() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const entry = getAdminEntry();
  if (!entry || entry.type === "break") {
    window.alert("请先选择一个可套用规则的赛程条目。");
    return;
  }

  const settings = getEventFormationSettings();
  const confirmed = window.confirm("将使用当前全局规则覆盖本赛程的合并排名设置，并重新计算名次。确认继续吗？");
  if (!confirmed) {
    return;
  }

  if (settings.raceMergeMode === "cancel_only") {
    entry.isMergedRace = false;
    entry.raceMergeMode = "race_together_rank_separately";
    entry.rankDisplayMode = "auto";
    entry.formationNote = "";
  } else {
    entry.isMergedRace = true;
    entry.raceMergeMode = getEntryRaceMergeMode(settings);
    entry.rankDisplayMode = "auto";
    const mergeNote = getEntryRaceMergeNote(entry);
    entry.formationNote = mergeNote;
    entry.note = mergeNote;
  }

  recalculateEntryRanks(entry);
  saveLocalData(state.data);
  syncSelections();
  renderView();
  window.alert("已套用全局默认并重新计算名次");
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

function createPromotedAthlete(sourceAthlete) {
  return {
    rank: "",
    lane: "",
    bib: sourceAthlete.bib || "",
    name: sourceAthlete.name || "",
    team: sourceAthlete.team || "",
    result: "",
    note: "",
  };
}

function buildAutoQualificationPlan() {
  const day = getAdminDay();
  const sourceEntry = getAdminEntry();

  if (!day || !sourceEntry) {
    return { error: "请先选择一个赛程条目。" };
  }

  if (sourceEntry.type === "break") {
    return { error: "break / 浇冰条目不能执行自动晋级。" };
  }

  const rule = sourceEntry.qualificationRule || {};
  if (!rule.mode || rule.mode === "none") {
    return { error: "请先设置晋级模式。" };
  }

  const targetEntry = day.entries.find((entry) => entry.id === rule.targetEntryId) || null;
  if (!targetEntry || targetEntry.id === sourceEntry.id || targetEntry.type === "break") {
    return { error: "请选择有效的目标赛程条目，不能选择当前赛程本身或 break / 浇冰条目。" };
  }

  if (!sourceEntry.groups?.length) {
    return { error: "当前赛程还没有分组，无法生成晋级名单。" };
  }

  const calculated = calculateQualifiedAthletes(sourceEntry);

  return {
    sourceEntry,
    targetEntry,
    rule,
    calculated,
    additions: calculated.all,
  };
}

function formatAutoQualificationPlanMessage(plan) {
  const modeText = formatAutoQualificationModeText(plan.rule);
  const lines = [
    `规则：${modeText}`,
    `目标赛程：${formatEntryOptionLabel(plan.targetEntry)}`,
    `分组方式：${formatQualificationTargetGroupMode(plan.rule.targetGroupMode)}`,
    `直接晋级：${plan.calculated.direct.length} 人`,
    `剩余最快：${plan.calculated.fastest.length} 人`,
    `合计晋级：${plan.additions.length} 人`,
  ];

  const previewLines = plan.additions.slice(0, 20).map(
    (item) =>
      `${item.qualificationMark} ${item.sourceGroupName}：${item.athlete.bib || item.athlete.bibNo || "-"} ${item.athlete.name || "-"} ${item.athlete.result || ""}`
  );

  if (previewLines.length) {
    lines.push("", "晋级名单预览：", ...previewLines);
  }
  if (plan.additions.length > previewLines.length) {
    lines.push(`... 还有 ${plan.additions.length - previewLines.length} 人`);
  }

  return lines.join("\n");
}

function formatAutoQualificationModeText(rule = {}) {
  return rule.mode === "top_n_plus_fastest"
    ? `每组前 ${rule.topNPerGroup} 名 + 剩余最快 ${rule.fastestRemainderCount} 名晋级`
    : `每组前 ${rule.topNPerGroup} 名晋级`;
}

function buildAutoQualificationPreviewHtml(plan) {
  const rankColumns = getResultSheetRankColumns(plan.sourceEntry);
  const headerCells = [
    "标记",
    ...rankColumns.map((column) => column.label),
    "号码",
    "姓名",
    "单位",
    "成绩",
  ];

  return `
    <div class="qualification-preview-grid">
      <div class="qualification-preview-card">
        <span>晋级规则</span>
        <strong>${escapeHtml(formatAutoQualificationModeText(plan.rule))}</strong>
      </div>
      <div class="qualification-preview-card">
        <span>目标赛程</span>
        <strong>${escapeHtml(formatEntryOptionLabel(plan.targetEntry))}</strong>
      </div>
      <div class="qualification-preview-card">
        <span>分组方式</span>
        <strong>${escapeHtml(formatQualificationTargetGroupMode(plan.rule.targetGroupMode))}</strong>
      </div>
      <div class="qualification-preview-card">
        <span>晋级人数</span>
        <strong>${escapeHtml(plan.additions.length)} 人</strong>
      </div>
    </div>
    <div class="qualification-preview-summary">
      <span>直接晋级 ${escapeHtml(plan.calculated.direct.length)} 人</span>
      <span>剩余最快 ${escapeHtml(plan.calculated.fastest.length)} 人</span>
      <span>合计 ${escapeHtml(plan.additions.length)} 人</span>
    </div>
    <div class="qualification-preview-table-wrap">
      <table class="qualification-preview-table">
        <thead>
          <tr>${headerCells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${
            plan.additions.length
              ? plan.additions
                  .map((item) => {
                    const athlete = item.athlete || {};
                    const rowCells = [
                      item.qualificationMark || "",
                      ...rankColumns.map((column) => getAthleteRankColumnValue(athlete, column)),
                      athlete.bib || athlete.bibNo || "",
                      athlete.name || "",
                      athlete.team || athlete.organization || "",
                      athlete.result || "",
                    ];
                    return `<tr>${rowCells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
                  })
                  .join("")
              : `<tr><td colspan="${headerCells.length}">当前没有符合条件的晋级运动员。</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function buildApplyQualificationConfirmHtml(plan, existingTargetAthletesCount, currentStatus) {
  const warningCards = [];
  if (existingTargetAthletesCount > 0) {
    warningCards.push(`下一轮已有 ${existingTargetAthletesCount} 名运动员名单，本次应用会覆盖下一轮分组，请谨慎操作。`);
  }
  if (currentStatus?.promotedAt) {
    warningCards.push("当前分组已经应用过晋级，再次应用会覆盖下一轮名单。");
  }

  return `
    <div class="qualification-apply-summary">
      <div><span>晋级规则</span><strong>${escapeHtml(formatAutoQualificationModeText(plan.rule))}</strong></div>
      <div><span>目标赛程</span><strong>${escapeHtml(formatEntryOptionLabel(plan.targetEntry))}</strong></div>
      <div><span>晋级人数</span><strong>${escapeHtml(plan.additions.length)} 人</strong></div>
    </div>
    ${
      warningCards.length
        ? `<div class="app-dialog-warning-list">
            ${warningCards.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
          </div>`
        : ""
    }
  `;
}

function formatQualificationTargetGroupMode(mode) {
  if (mode === "balanced") return "自动均衡分组";
  if (mode === "manual") return "追加到目标分组";
  return "同组序号晋级";
}

function previewAutoQualification() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  const currentGroup = getAdminGroup();
  const plan = buildAutoQualificationPlan();
  if (plan.error) {
    showAppNotice({
      type: "error",
      title: plan.error,
      duration: 2200,
    });
    return;
  }

  clearQualificationNotes(plan.sourceEntry);
  plan.additions.forEach((item) => {
    item.athlete.note = item.qualificationMark;
  });
  if (currentGroup) {
    markGroupResultStatus(currentGroup, "qualificationCalculatedAt");
  }
  saveLocalData(state.data);
  renderView();
  showAppDialog({
    eyebrow: "晋级计算",
    title: "晋级名单预览",
    tone: "normal",
    contentHtml: buildAutoQualificationPreviewHtml(plan),
    actions: [
      {
        label: "关闭",
        variant: "ghost",
        closeOnClick: true,
      },
      {
        label: "应用到下一轮",
        variant: "primary",
        closeOnClick: true,
        onClick: () => executeAutoQualification(),
      },
    ],
  });
}

function executeAutoQualification(options = {}) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  if (!options.forceAppDialog && getActiveAdminTab() !== "results") {
    executeAutoQualificationWithNativeFeedback();
    return;
  }

  const currentGroup = getAdminGroup();
  const currentStatus = currentGroup ? ensureGroupResultStatus(currentGroup) : createEmptyGroupResultStatus();
  const plan = buildAutoQualificationPlan();
  if (plan.error) {
    showAppNotice({
      type: "error",
      title: plan.error,
      duration: 2200,
    });
    return;
  }

  if (!plan.additions.length) {
    showAppDialog({
      eyebrow: "晋级计算",
      title: "没有可晋级的运动员",
      message: "当前成绩和晋级规则下没有计算出晋级名单，请核对成绩、名次和晋级规则。",
      tone: "warning",
      actions: [
        {
          label: "知道了",
          variant: "primary",
          closeOnClick: true,
        },
      ],
    });
    return;
  }

  const existingTargetAthletesCount = (plan.targetEntry.groups || []).reduce(
    (sum, group) => sum + (group.athletes?.length || 0),
    0
  );
  if (!currentStatus.printedAt && !options.skipPrintWarning) {
    showAppDialog({
      eyebrow: "赛后处理",
      title: "当前分组成绩单尚未打印",
      message: "建议先打印本组成绩单，由计时员/裁判核对后再应用晋级。仍要继续应用到下一轮吗？",
      tone: "warning",
      actions: [
        {
          label: "取消",
          variant: "ghost",
          closeOnClick: true,
        },
        {
          label: "先去打印",
          variant: "ghost",
          closeOnClick: true,
          onClick: () => printCurrentGroupResultSheet(),
        },
        {
          label: "仍然应用",
          variant: "primary",
          closeOnClick: true,
          onClick: () => executeAutoQualification({ skipPrintWarning: true, forceAppDialog: true }),
        },
      ],
    });
    return;
  }

  showAppDialog({
    eyebrow: "赛后处理",
    title: "确认应用到下一轮",
    message: "将根据当前成绩和晋级规则，把晋级运动员写入下一轮分组。请确认成绩、名次和晋级名单已核对无误。",
    tone: existingTargetAthletesCount || currentStatus.promotedAt ? "warning" : "normal",
    contentHtml: buildApplyQualificationConfirmHtml(plan, existingTargetAthletesCount, currentStatus),
    actions: [
      {
        label: "取消",
        variant: "ghost",
        closeOnClick: true,
      },
      {
        label: "确认应用",
        variant: "primary",
        closeOnClick: true,
        onClick: () => applyAutoQualificationPlan(plan, currentGroup),
      },
    ],
  });
}

function executeAutoQualificationWithNativeFeedback() {
  const currentGroup = getAdminGroup();
  const currentStatus = currentGroup ? ensureGroupResultStatus(currentGroup) : createEmptyGroupResultStatus();
  const plan = buildAutoQualificationPlan();
  if (plan.error) {
    window.alert(plan.error);
    return;
  }

  if (!plan.additions.length) {
    window.alert(formatAutoQualificationPlanMessage(plan) || "没有可晋级的运动员。");
    return;
  }

  const existingTargetAthletesCount = (plan.targetEntry.groups || []).reduce(
    (sum, group) => sum + (group.athletes?.length || 0),
    0
  );
  if (!currentStatus.printedAt) {
    const continueWithoutPrint = window.confirm("当前分组成绩单尚未打印，建议先打印核对。仍要继续吗？");
    if (!continueWithoutPrint) {
      return;
    }
  }

  const overwriteLine = existingTargetAthletesCount
    ? `\n\n注意：下一轮已有 ${existingTargetAthletesCount} 名运动员，确认后会覆盖下一轮分组。`
    : "";
  const alreadyPromotedLine = currentStatus.promotedAt
    ? "\n\n注意：当前分组已经应用过晋级，再次应用会覆盖下一轮名单。"
    : "";
  const confirmed = window.confirm(
    `${formatAutoQualificationPlanMessage(plan)}${overwriteLine}${alreadyPromotedLine}\n\n将根据当前晋级名单写入下一轮分组。请确认成绩、名次和晋级名单已核对无误。\n\n确认继续吗？`
  );
  if (!confirmed) {
    return;
  }

  const result = applyQualificationToTargetEntry(plan.sourceEntry, plan.targetEntry);
  if (currentGroup) {
    markGroupResultStatus(currentGroup, "qualificationCalculatedAt");
    markGroupResultStatus(currentGroup, "promotedAt");
  }

  saveLocalData(state.data);
  syncSelections();
  renderView();
  window.alert(`自动晋级完成，生成 ${result.totalCount} 人。`);
}

function applyAutoQualificationPlan(plan, currentGroup) {
  const result = applyQualificationToTargetEntry(plan.sourceEntry, plan.targetEntry);
  if (currentGroup) {
    markGroupResultStatus(currentGroup, "qualificationCalculatedAt");
    markGroupResultStatus(currentGroup, "promotedAt");
  }

  saveLocalData(state.data);
  syncSelections();
  renderView();
  showAppNotice({
    type: "success",
    title: `已应用到下一轮，生成 ${result.totalCount} 人`,
    duration: 1800,
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

  state.data = ensureEntryQualificationDefaults(clone(defaultData));
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
