// 秩序册基础数据生成与导出。
function createBookDataFromRegistration({
  eventId,
  eventName,
  athletes,
  groups,
  events,
  entries,
  organizationRanges,
  generatedAt,
}) {
  const entriesByEvent = new Map();
  entries.forEach((entry) => {
    if (!entriesByEvent.has(entry.eventKey)) {
      entriesByEvent.set(entry.eventKey, []);
    }
    entriesByEvent.get(entry.eventKey).push(entry);
  });

  const bookGroups = groups.map((group) => {
    const groupEvents = events
      .filter((event) => event.groupKey === group.compoundId)
      .map((event) => ({
        eventId: event.id,
        eventKey: event.compoundId,
        eventName: event.name,
        isMergedRace: Boolean(event.isMergedRace),
        mergedFrom: clone(event.mergedFrom || []),
        raceMergeMode: event.raceMergeMode || "",
        formationNote: event.formationNote || "",
        entries: (entriesByEvent.get(event.compoundId) || [])
          .slice()
          .sort(compareRegistrationEntriesForDisplay)
          .map(createBookEntryFromRegistrationEntry),
      }));

    return {
      groupId: group.id,
      groupKey: group.compoundId,
      groupName: group.name,
      displayName: group.displayName,
      gender: group.gender,
      events: groupEvents,
    };
  });

  return {
    eventId,
    eventName,
    source: REGISTRATION_SOURCE_LABEL,
    generatedAt: generatedAt || "",
    importedAt: new Date().toISOString(),
    organizationRanges,
    organizationRosters: createOrganizationRosterData({
      athletes,
      entries,
      organizationRanges,
    }),
    athleteNumberList: athletes.map((athlete) => ({
      bibNo: athlete.bibNo,
      registrationNo: athlete.registrationNo,
      name: athlete.name,
      organization: athlete.organization || EMPTY_ORGANIZATION_LABEL,
      leader: athlete.leader || athlete.organizationLeader || "",
      coach: athlete.coach || athlete.organizationCoach || "",
      organizationLeader: athlete.organizationLeader || athlete.leader || "",
      organizationCoach: athlete.organizationCoach || athlete.coach || "",
      leaderNames: clone(athlete.leaderNames || []),
      coachNames: clone(athlete.coachNames || []),
      gender: athlete.genderLabel || athlete.gender,
      birthDate: athlete.birthDate,
      groupId: athlete.groupId,
      groupName: athlete.groupName,
    })),
    groups: bookGroups,
  };
}

function createBookEntryFromRegistrationEntry(entry) {
  return {
    bibNo: entry.bibNo,
    registrationNo: entry.registrationNo,
    name: entry.name,
    organization: entry.organization || EMPTY_ORGANIZATION_LABEL,
    leader: entry.leader || entry.organizationLeader || "",
    coach: entry.coach || entry.organizationCoach || "",
    organizationLeader: entry.organizationLeader || entry.leader || "",
    organizationCoach: entry.organizationCoach || entry.coach || "",
    leaderNames: clone(entry.leaderNames || []),
    coachNames: clone(entry.coachNames || []),
    gender: entry.gender,
    genderLabel: entry.genderLabel,
    birthDate: entry.birthDate,
    groupId: entry.groupId,
    groupName: entry.groupName,
    eventId: entry.eventId,
    eventName: entry.eventName,
    originalCompetitionKey: entry.originalCompetitionKey || "",
    originalGroupName: entry.originalGroupName || "",
    originalProjectName: entry.originalProjectName || "",
    originalGender: entry.originalGender || "",
    mergedIntoCompetitionKey: entry.mergedIntoCompetitionKey || "",
    mergedIntoGroupName: entry.mergedIntoGroupName || "",
    mergedIntoProjectName: entry.mergedIntoProjectName || "",
    mergeType: entry.mergeType || "",
    originalCompetitions: clone(entry.originalCompetitions || []),
  };
}

function createOrganizationRosterData({ athletes = [], entries = [], organizationRanges = [] } = {}) {
  const rosterMap = new Map();
  const athleteInfoByKey = new Map();

  athletes.forEach((athlete, index) => {
    const organization = normalizeBookOrganization(athlete.organization);
    const roster = getOrCreateOrganizationRoster(rosterMap, organization);
    addBookStaffNames(roster.leaderNames, athlete.leaderNames || athlete.organizationLeader || athlete.leader);
    addBookStaffNames(roster.coachNames, athlete.coachNames || athlete.organizationCoach || athlete.coach);

    const key = createBookAthleteIdentityKey(athlete) || `${organization}|${athlete.name}|${index}`;
    athleteInfoByKey.set(key, {
      bibNo: athlete.bibNo || "",
      registrationNo: athlete.registrationNo || "",
      name: athlete.name || "",
      gender: athlete.genderLabel || athlete.gender || "",
      groupName: athlete.groupName || "",
      birthDate: athlete.birthDate || "",
      organization,
      order: index,
    });
  });

  entries.forEach((entry, index) => {
    const organization = normalizeBookOrganization(entry.organization);
    const roster = getOrCreateOrganizationRoster(rosterMap, organization);
    addBookStaffNames(roster.leaderNames, entry.leaderNames || entry.organizationLeader || entry.leader);
    addBookStaffNames(roster.coachNames, entry.coachNames || entry.organizationCoach || entry.coach);

    const key = createBookAthleteIdentityKey(entry) || `${organization}|${entry.name}|${index}`;
    const baseAthlete = athleteInfoByKey.get(key) || {};
    const athlete = roster._athleteMap.get(key) || {
      bibNo: entry.bibNo || baseAthlete.bibNo || "",
      registrationNo: entry.registrationNo || baseAthlete.registrationNo || "",
      name: entry.name || baseAthlete.name || "",
      gender: entry.genderLabel || entry.gender || baseAthlete.gender || "",
      groupName: entry.originalGroupName || entry.groupName || baseAthlete.groupName || "",
      birthDate: entry.birthDate || baseAthlete.birthDate || "",
      eventNames: [],
      order: baseAthlete.order ?? index,
    };

    getBookEntryOriginalEventNames(entry).forEach((eventName) => {
      if (eventName && !athlete.eventNames.includes(eventName)) {
        athlete.eventNames.push(eventName);
      }
    });
    roster._athleteMap.set(key, athlete);
  });

  athletes.forEach((athlete, index) => {
    const organization = normalizeBookOrganization(athlete.organization);
    const roster = getOrCreateOrganizationRoster(rosterMap, organization);
    const key = createBookAthleteIdentityKey(athlete) || `${organization}|${athlete.name}|${index}`;
    if (!roster._athleteMap.has(key)) {
      roster._athleteMap.set(key, {
        bibNo: athlete.bibNo || "",
        registrationNo: athlete.registrationNo || "",
        name: athlete.name || "",
        gender: athlete.genderLabel || athlete.gender || "",
        groupName: athlete.groupName || "",
        birthDate: athlete.birthDate || "",
        eventNames: [],
        order: index,
      });
    }
  });

  const organizationOrder = new Map();
  (organizationRanges || []).forEach((range, index) => {
    organizationOrder.set(normalizeBookOrganization(range.organization), index);
  });

  return Array.from(rosterMap.values())
    .map((roster, index) => {
      const athletesList = Array.from(roster._athleteMap.values()).sort(compareBookRosterAthletes);
      const groupedAthletes = createBookRosterGroupedAthletes(athletesList);
      return {
        organization: roster.organization,
        leaderNames: roster.leaderNames,
        coachNames: roster.coachNames,
        athletes: athletesList,
        groupedAthletes,
        _order: organizationOrder.has(roster.organization) ? organizationOrder.get(roster.organization) : 100000 + index,
      };
    })
    .sort((left, right) => left._order - right._order || left.organization.localeCompare(right.organization, "zh-Hans-CN"))
    .map(({ _order, ...roster }) => roster);
}

function getOrCreateOrganizationRoster(rosterMap, organization) {
  const normalizedOrganization = normalizeBookOrganization(organization);
  if (!rosterMap.has(normalizedOrganization)) {
    rosterMap.set(normalizedOrganization, {
      organization: normalizedOrganization,
      leaderNames: [],
      coachNames: [],
      _athleteMap: new Map(),
    });
  }
  return rosterMap.get(normalizedOrganization);
}

function normalizeBookOrganization(organization) {
  return normalizeText(organization) || EMPTY_ORGANIZATION_LABEL;
}

function addBookStaffNames(target, value) {
  normalizeBookNameList(value).forEach((name) => {
    if (!target.includes(name)) {
      target.push(name);
    }
  });
}

function normalizeBookNameList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeBookNameList);
  }
  if (value == null || value === "") {
    return [];
  }
  return String(value)
    .split(/[,，、;；/]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function createBookAthleteIdentityKey(athlete) {
  if (typeof getAthleteIdentityKey === "function") {
    const key = getAthleteIdentityKey(athlete);
    if (key) {
      return key;
    }
  }

  const registrationNo = normalizeText(athlete?.registrationNo);
  if (registrationNo) {
    return `registration:${registrationNo}`;
  }

  const certificateNumber = normalizeText(athlete?.certificateNumber || athlete?.certificateNo || athlete?.idNumber || athlete?.identityNo);
  if (certificateNumber) {
    return `certificate:${certificateNumber}`;
  }

  const name = normalizeText(athlete?.name);
  const birthDate = normalizeText(athlete?.birthDate);
  const gender = normalizeText(athlete?.genderLabel || athlete?.gender);
  if (name && birthDate && gender) {
    return `name-birth-gender:${name}|${birthDate}|${gender}`;
  }

  const organization = normalizeText(athlete?.organization || athlete?.team);
  return name && organization && gender ? `name-org-gender:${name}|${organization}|${gender}` : name;
}

function getBookEntryOriginalEventNames(entry) {
  if (Array.isArray(entry.originalCompetitions) && entry.originalCompetitions.length) {
    return entry.originalCompetitions
      .map((competition) => normalizeText(competition.projectName))
      .filter(Boolean);
  }
  return [normalizeText(entry.originalProjectName || entry.eventName)].filter(Boolean);
}

function compareBookRosterAthletes(left, right) {
  return compareBibNo(left.bibNo, right.bibNo) || compareRegistrationText(left.groupName, right.groupName) || compareRegistrationText(left.name, right.name);
}

function compareBibNo(left, right) {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return compareRegistrationText(left || "", right || "");
}

function createBookRosterGroupedAthletes(athletes) {
  const groupMap = new Map();
  athletes.forEach((athlete) => {
    const groupName = athlete.groupName || "未填写组别";
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, []);
    }
    groupMap.get(groupName).push(athlete);
  });
  return Array.from(groupMap.entries()).map(([groupName, groupAthletes]) => ({
    groupName,
    athletes: groupAthletes,
  }));
}

function formatBookOriginalCompetition(entry) {
  if (Array.isArray(entry.originalCompetitions) && entry.originalCompetitions.length > 1) {
    return entry.originalCompetitions
      .map((competition) => {
        const groupName = normalizeText(competition.groupName);
        const projectName = normalizeText(competition.projectName);
        return `${groupName}${projectName ? ` / ${projectName}` : ""}`;
      })
      .filter(Boolean)
      .join("；");
  }

  const groupName = entry.originalGroupName || "";
  const projectName = entry.originalProjectName || "";
  if (!groupName && !projectName) {
    return "";
  }
  return `${groupName}${projectName ? ` / ${projectName}` : ""}`;
}

function shouldShowBookMergeNote(entry, event) {
  if (!entry) {
    return false;
  }

  if (entry.mergeType === "merged_from_underfilled") {
    return true;
  }

  if (entry.mergeType === "target_original" || entry.mergeType === "overlap_source_and_target") {
    return false;
  }

  const originalKey = entry.originalCompetitionKey || "";
  const currentKey = event?.competitionKey || event?.eventKey || "";
  return Boolean(originalKey && currentKey && originalKey !== currentKey);
}

function exportBookJson() {
  const bookData = getBookData();
  if (!bookData) {
    window.alert("还没有可导出的秩序册基础数据，请先导入报名 JSON。");
    return;
  }

  downloadJsonFile(bookData, `order-book-data-${formatDateForFilename(new Date())}.json`);
}

function exportBookHtml() {
  const bookData = getBookDataForCurrentEvent();
  if (!bookData) {
    window.alert("还没有可导出的秩序册基础数据，请先导入报名 JSON。");
    return;
  }

  downloadTextFile(
    renderBookHtmlDocument(bookData),
    `${sanitizeBookFilename(bookData.eventName || "秩序册")}-秩序册.html`,
    "text/html;charset=utf-8"
  );
}

function exportBookPdf() {
  const bookData = getBookDataForCurrentEvent();
  if (!bookData) {
    window.alert("还没有可导出的秩序册数据，请先导入报名 JSON。");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("浏览器阻止了打印窗口，请允许弹窗后重试，或先导出秩序册 HTML。");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(
    renderBookHtmlDocument(bookData, {
      printMode: true,
    })
  );
  printWindow.document.close();
}

function getBookData(event = getAdminEvent()) {
  return event?.bookData || event?.registrationImport?.bookData || null;
}

function getBookDataForCurrentEvent() {
  const event = getAdminEvent() || getCurrentEvent();
  const rawBookData = event?.bookData || event?.registrationImport?.bookData || getBookData(event);
  if (!rawBookData) {
    return null;
  }

  const bookData = clone(rawBookData);
  if (event?.name) {
    bookData.eventName = event.name;
  } else if (!bookData.eventName) {
    bookData.eventName = "秩序册";
  }
  if (event?.id) {
    bookData.eventId = event.id;
  }
  return bookData;
}

function syncEventBookDataName(event) {
  if (!event?.name) {
    return;
  }

  if (event.bookData) {
    event.bookData.eventName = event.name;
    event.bookData.eventId = event.id || event.bookData.eventId;
  }

  if (event.registrationImport) {
    event.registrationImport.targetEventName = event.name;
    if (event.registrationImport.bookData) {
      event.registrationImport.bookData.eventName = event.name;
      event.registrationImport.bookData.eventId = event.id || event.registrationImport.bookData.eventId;
    }
  }
}

function sanitizeBookFilename(name) {
  return (
    String(name || "")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "")
      .slice(0, 60) || `order-book-${formatDateForFilename(new Date())}`
  );
}

function getBookStats(bookData) {
  const groups = bookData.groups || [];
  const events = groups.flatMap((group) => group.events || []);
  const entriesCount = events.reduce((sum, event) => sum + (event.entries?.length || 0), 0);
  return {
    athletesCount: (bookData.athleteNumberList || []).length,
    entriesCount,
    groupsCount: groups.length,
    eventsCount: events.length,
    rangesCount: (bookData.organizationRanges || []).length,
  };
}

function getBookOrganizationRosters(bookData) {
  if (Array.isArray(bookData.organizationRosters) && bookData.organizationRosters.length) {
    return bookData.organizationRosters;
  }

  const entries = (bookData.groups || []).flatMap((group) =>
    (group.events || []).flatMap((event) => event.entries || [])
  );
  return createOrganizationRosterData({
    athletes: bookData.athleteNumberList || [],
    entries,
    organizationRanges: bookData.organizationRanges || [],
  });
}

function formatBookRosterStaff(names) {
  return names?.length ? names.join("、") : "—";
}

function formatBookRosterAthleteItem(athlete) {
  const events = athlete.eventNames?.length ? `（${athlete.eventNames.join("、")}）` : "";
  return `${athlete.bibNo || ""} ${athlete.name || ""}${events}`;
}

function renderBookHtmlDocument(bookData, options = {}) {
  const stats = getBookStats(bookData);
  const organizationRosters = getBookOrganizationRosters(bookData);
  const documentTitle = `${bookData.eventName || "秩序册"} - 秩序册`;
  const printToolbar = options.printMode
    ? `<div class="print-toolbar no-print">
      <div>
        <strong>秩序册 PDF 预览</strong>
        <p>保存 PDF：点击后在打印窗口把“目标打印机”改为“另存为 PDF”。纸质打印：选择实际打印机。保存 PDF 时请取消勾选“页眉和页脚”，否则会出现日期、页面标题、about:blank 和页码。</p>
      </div>
      <div class="print-toolbar-actions">
        <button type="button" class="print-primary-button" onclick="window.confirm('请在弹出的打印窗口中，将目标打印机改为“另存为 PDF”，并取消勾选“页眉和页脚”。然后点击保存。') && window.print()">保存为 PDF</button>
        <button type="button" class="print-secondary-button" onclick="window.print()">打印纸质版</button>
        <button type="button" class="print-close-button" onclick="window.close()">关闭预览</button>
      </div>
    </div>`
    : "";
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>
      @page {
        size: A4;
        margin: 12mm;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f3f6fb;
        color: #1f2937;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .print-toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin: 0;
        padding: 14px 24px;
        background: #ffffff;
        border-bottom: 1px solid #dbe3ee;
        box-shadow: 0 8px 24px rgba(31, 41, 55, 0.08);
      }
      .print-toolbar strong {
        display: block;
        color: #12233d;
        font-size: 16px;
        line-height: 1.4;
      }
      .print-toolbar p {
        margin: 4px 0 0;
        color: #667085;
        font-size: 12px;
        line-height: 1.5;
      }
      .print-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      .print-toolbar button {
        min-height: 38px;
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        color: #18314f;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }
      .print-primary-button {
        background: #f8bc5b;
      }
      .print-secondary-button {
        background: #eef2f7;
      }
      .print-close-button {
        background: #eef2f7;
        color: #475569;
      }
      .book-page {
        max-width: 960px;
        margin: 32px auto;
        padding: 32px 40px;
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 18px 50px rgba(31, 41, 55, 0.08);
      }
      .book-header { margin-bottom: 24px; }
      h1 { margin: 0; color: #12233d; font-size: 28px; line-height: 1.25; }
      .book-meta { margin: 10px 0 0; color: #667085; font-size: 13px; }
      .book-stats {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }
      .book-stat {
        padding: 10px 12px;
        border: 1px solid #dbe3ee;
        border-radius: 12px;
        background: #f8fbff;
        color: #18314f;
        font-size: 12px;
        font-weight: 700;
      }
      .book-stat strong { display: block; margin-top: 4px; font-size: 20px; line-height: 1; }
      .book-section {
        margin-top: 26px;
      }
      .book-section-title {
        display: flex;
        align-items: center;
        gap: 9px;
        margin: 0 0 12px;
        color: #18314f;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.35;
      }
      .book-section-title::before {
        content: "";
        width: 4px;
        height: 18px;
        border-radius: 999px;
        background: #274c86;
      }
      .book-group-title {
        margin: 22px 0 10px;
        color: #12233d;
        font-size: 16px;
        font-weight: 800;
      }
      .book-event {
        margin: 12px 0 18px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .book-event-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
      }
      .book-event-head h3 {
        margin: 0;
        color: #18314f;
        font-size: 15px;
        font-weight: 800;
      }
      .book-event-count {
        color: #667085;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .book-event-meta {
        margin: 0 0 8px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }
      .book-badge {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #eef4ff;
        color: #274c86;
        font-size: 12px;
        font-weight: 800;
      }
      .book-badge-merge { background: #fff5e8; color: #945f1b; }
      .book-table-wrap {
        width: 100%;
        overflow-x: auto;
      }
      .book-table {
        border-collapse: collapse;
        table-layout: fixed;
        margin: 10px 0 22px;
        font-size: 13px;
        border: 1px solid #dbe3ee;
      }
      .book-table-full {
        width: 100%;
      }
      .book-table-compact {
        width: auto;
        max-width: 100%;
      }
      .book-table-ranges { width: 720px; }
      .book-table-athletes { width: 800px; }
      .book-table-event { width: 760px; }
      .book-table th,
      .book-table td {
        border: 1px solid #dbe3ee;
        padding: 6px 8px;
        text-align: left;
        vertical-align: middle;
        line-height: 1.4;
        white-space: normal;
        word-break: normal;
        overflow-wrap: break-word;
      }
      .book-table th {
        background: #edf3f8;
        color: #18314f;
        font-weight: 700;
      }
      .book-table tr:nth-child(even) td { background: #fafcff; }
      .book-name-cell strong {
        display: block;
        font-weight: 700;
      }
      .merge-note {
        display: inline-block;
        margin-top: 4px;
        padding: 2px 6px;
        border-radius: 8px;
        background: #eef4ff;
        color: #475569;
        font-size: 11px;
        line-height: 1.45;
      }
      .book-org-cell {
        white-space: normal;
      }
      .team-roster-card {
        padding: 16px 18px;
        margin: 14px 0 20px;
        border: 1px solid #dbe3ee;
        border-radius: 14px;
        background: #fff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .team-roster-card h3 {
        margin: 0 0 12px;
        text-align: center;
        color: #12233d;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.4;
      }
      .team-staff {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
        color: #334155;
        font-size: 14px;
        line-height: 1.6;
      }
      .team-staff p,
      .team-athletes p {
        margin: 0;
      }
      .team-athletes {
        color: #334155;
        font-size: 14px;
        line-height: 1.75;
      }
      .team-group-line {
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        margin: 8px 0;
      }
      .team-group-name {
        color: #18314f;
        font-weight: 800;
        line-height: 1.7;
      }
      .team-athlete-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 4px 18px;
        min-width: 0;
      }
      .team-athlete-item {
        display: block;
        min-width: 0;
        line-height: 1.7;
        white-space: normal;
      }
      @media (max-width: 720px) {
        .book-page {
          margin: 12px;
          padding: 20px 14px;
          border-radius: 14px;
        }
        .book-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .book-table {
          min-width: 680px;
        }
        .team-roster-card {
          padding: 14px;
        }
        .team-group-line {
          grid-template-columns: 1fr;
          gap: 4px;
        }
        .team-athlete-list {
          grid-template-columns: 1fr;
          gap: 3px;
        }
        .print-toolbar {
          position: static;
          flex-direction: column;
          align-items: stretch;
          padding: 14px;
        }
        .print-toolbar-actions {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
      @media print {
        body { background: #fff; }
        .book-page {
          max-width: none;
          width: auto;
          margin: 0;
          padding: 0;
          box-shadow: none;
          border-radius: 0;
        }
        .book-section,
        .book-event,
        .book-event-block,
        .team-roster-card {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .book-table {
          font-size: 11px;
          border: 1px solid #cfd8e3;
        }
        .book-table-athletes {
          width: 720px;
        }
        .book-table-athletes col:nth-child(1) { width: 52px !important; }
        .book-table-athletes col:nth-child(2) { width: 82px !important; }
        .book-table-athletes col:nth-child(3) { width: 230px !important; }
        .book-table-athletes col:nth-child(4) { width: 40px !important; }
        .book-table-athletes col:nth-child(5) { width: 92px !important; }
        .book-table-athletes col:nth-child(6) { width: 180px !important; }
        .book-table-ranges,
        .book-table-athletes,
        .book-table-event {
          max-width: 100%;
        }
        .book-table th,
        .book-table td {
          padding: 5px 6px;
        }
        .book-table thead {
          display: table-header-group;
        }
        .no-print {
          display: none !important;
        }
        h2, h3 {
          page-break-after: avoid;
        }
        .team-roster-card {
          box-shadow: none;
        }
        .team-group-line {
          grid-template-columns: 132px minmax(0, 1fr);
          gap: 8px;
          margin: 6px 0;
        }
        .team-athlete-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3px 12px;
        }
      }
    </style>
  </head>
  <body>
    ${printToolbar}
    <main class="book-page">
      <header class="book-header">
        <h1>${escapeHtml(bookData.eventName || "秩序册")}</h1>
        <p class="book-meta">生成时间：${escapeHtml(formatDateTime(bookData.importedAt) || "")}</p>
        <div class="book-stats">
          <div class="book-stat">运动员<strong>${escapeHtml(stats.athletesCount)}</strong></div>
          <div class="book-stat">参赛项次<strong>${escapeHtml(stats.entriesCount)}</strong></div>
          <div class="book-stat">组别<strong>${escapeHtml(stats.groupsCount)}</strong></div>
          <div class="book-stat">项目<strong>${escapeHtml(stats.eventsCount)}</strong></div>
          <div class="book-stat">俱乐部号段<strong>${escapeHtml(stats.rangesCount)}</strong></div>
        </div>
      </header>

      <section class="book-section">
        <h2 class="book-section-title">俱乐部号码段</h2>
        <div class="book-table-wrap">
          <table class="book-table book-table-compact book-table-ranges">
            <colgroup>
              <col style="width: 420px" />
              <col style="width: 90px" />
              <col style="width: 90px" />
              <col style="width: 70px" />
            </colgroup>
            <thead><tr><th>代表单位</th><th>起始号码</th><th>结束号码</th><th>人数</th></tr></thead>
            <tbody>
              ${(bookData.organizationRanges || [])
                .map(
                  (range) =>
                    `<tr><td>${escapeHtml(range.organization)}</td><td>${escapeHtml(range.startBibNo)}</td><td>${escapeHtml(range.endBibNo)}</td><td>${escapeHtml(range.count)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      ${
        organizationRosters.length
          ? `<section class="book-section">
        <h2 class="book-section-title">各代表队参赛名单</h2>
        ${organizationRosters
          .map(
            (roster) => `
              <article class="team-roster-card">
                <h3>${escapeHtml(roster.organization || EMPTY_ORGANIZATION_LABEL)}</h3>
                <div class="team-staff">
                  <p><strong>领队：</strong>${escapeHtml(formatBookRosterStaff(roster.leaderNames))}</p>
                  <p><strong>教练员：</strong>${escapeHtml(formatBookRosterStaff(roster.coachNames))}</p>
                </div>
                <div class="team-athletes">
                  <p><strong>运动员：</strong></p>
                  ${(roster.groupedAthletes || [])
                    .map(
                      (group) => `
                        <div class="team-group-line">
                          <span class="team-group-name">${escapeHtml(group.groupName)}：</span>
                          <div class="team-athlete-list">
                            ${(group.athletes || [])
                              .map((athlete) => `<span class="team-athlete-item">${escapeHtml(formatBookRosterAthleteItem(athlete))}</span>`)
                              .join("")}
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `
          )
          .join("")}
      </section>`
          : ""
      }

      <section class="book-section">
        <h2 class="book-section-title">运动员号码名单</h2>
        <div class="book-table-wrap">
          <table class="book-table book-table-compact book-table-athletes">
            <colgroup>
              <col style="width: 60px" />
              <col style="width: 90px" />
              <col style="width: 260px" />
              <col style="width: 46px" />
              <col style="width: 100px" />
              <col style="width: 200px" />
            </colgroup>
            <thead><tr><th>号码</th><th>姓名</th><th>代表单位</th><th>性别</th><th>出生日期</th><th>组别</th></tr></thead>
            <tbody>
              ${(bookData.athleteNumberList || [])
                .map(
                  (athlete) =>
                    `<tr><td>${escapeHtml(athlete.bibNo)}</td><td>${escapeHtml(athlete.name)}</td><td class="book-org-cell">${escapeHtml(athlete.organization)}</td><td>${escapeHtml(athlete.gender)}</td><td>${escapeHtml(athlete.birthDate)}</td><td>${escapeHtml(athlete.groupName)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="book-section">
        <h2 class="book-section-title">按组别和项目参赛名单</h2>
        ${(bookData.groups || [])
          .map(
            (group) => `
              <div class="book-group">
                <h2 class="book-group-title">${escapeHtml(group.groupName)}</h2>
                ${(group.events || [])
                  .map(
                    (event) => {
                      const entries = event.entries || [];
                      const isMergedEvent = Boolean(event.isMergedRace || event.mergedFrom?.length);
                      const formationNote = normalizeText(event.formationNote);
                      return `
                        <section class="book-event book-event-block">
                          <div class="book-event-head">
                            <h3>${escapeHtml(event.eventName || "未命名项目")}</h3>
                            <span class="book-event-count">${escapeHtml(entries.length)} 人</span>
                          </div>
                          ${formationNote ? `<p class="book-event-meta"><span class="book-badge ${isMergedEvent ? "book-badge-merge" : ""}">${escapeHtml(formationNote.replace("，", "｜"))}</span>${isMergedEvent ? " 本项目为合并比赛，运动员成绩按原组别/原项目分别排名。" : ""}</p>` : ""}
                          <div class="book-table-wrap">
                            <table class="book-table book-table-compact book-table-event">
                              <colgroup>
                                <col style="width: 64px" />
                                <col style="width: 110px" />
                                <col style="width: 330px" />
                                <col style="width: 52px" />
                                <col style="width: 105px" />
                              </colgroup>
                              <thead><tr><th>号码</th><th>姓名</th><th>代表单位</th><th>性别</th><th>出生日期</th></tr></thead>
                              <tbody>
                                ${entries
                                  .map((entry) => {
                                    const originalText = shouldShowBookMergeNote(entry, event) ? formatBookOriginalCompetition(entry) : "";
                                    return `
                                      <tr>
                                        <td>${escapeHtml(entry.bibNo || "")}</td>
                                        <td class="book-name-cell">
                                          <strong>${escapeHtml(entry.name || "")}</strong>
                                          ${originalText ? `<span class="merge-note">合并进入：${escapeHtml(originalText)}</span>` : ""}
                                        </td>
                                        <td class="book-org-cell">${escapeHtml(entry.organization || EMPTY_ORGANIZATION_LABEL)}</td>
                                        <td>${escapeHtml(entry.genderLabel || entry.gender || "")}</td>
                                        <td>${escapeHtml(entry.birthDate || "")}</td>
                                      </tr>
                                    `;
                                  })
                                  .join("")}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      `;
                    }
                  )
                  .join("")}
              </div>
            `
          )
          .join("")}
      </section>
    </main>
  </body>
</html>`;
}
