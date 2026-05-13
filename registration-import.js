// registration-export-v2 报名 JSON 校验、转换和导入入口。
function importRegistrationJson() {
  if (!ensureAdminAuthenticated()) {
    return;
  }

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
        if (!isRegistrationExportData(parsed)) {
          throw new Error(`请选择 ${REGISTRATION_EXPORT_SCHEMA_VERSION} 报名导出 JSON`);
        }
        applyRegistrationExportJson(parsed);
      } catch (error) {
        if (error?.isRoundPlanValidationStopped) {
          return;
        }
        const message = error.message || "未知错误";
        if (typeof showAppDialog === "function") {
          showAppDialog({
            eyebrow: "报名导入",
            title: message.includes("赛制规则") || message.includes("人数 ") ? "导入报名 JSON 已停止" : "导入报名 JSON 失败",
            message,
            tone: "danger",
            actions: [{ label: "关闭", variant: "primary", closeOnClick: true }],
          });
        } else {
          window.alert(`导入报名 JSON 失败：${message}`);
        }
      }
    };
    reader.readAsText(file, "utf-8");
  });
  input.click();
}

function toggleRegistrationImportPanel() {
  toggleAdminPanel("registration-import");
  preserveAdminScrollAndRender({ restoreFocus: false });
}

function isRegistrationExportData(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    value.schemaVersion === REGISTRATION_EXPORT_SCHEMA_VERSION &&
    Array.isArray(value.registrations)
  );
}

function validateRegistrationExportData(value) {
  if (!value || typeof value !== "object") {
    throw new Error("JSON 内容不是对象");
  }

  if (value.schemaVersion !== REGISTRATION_EXPORT_SCHEMA_VERSION) {
    throw new Error(`schemaVersion 必须是 ${REGISTRATION_EXPORT_SCHEMA_VERSION}`);
  }

  if (!Array.isArray(value.registrations)) {
    throw new Error("registrations 必须是数组");
  }
}

function applyRegistrationExportJson(exportData) {
  if (!ensureAdminAuthenticated()) {
    return;
  }

  validateRegistrationExportData(exportData);

  const existingTargetEvent = getAdminEvent();
  const targetEventName = existingTargetEvent?.name || "报名导入赛事";
  const targetEventId = existingTargetEvent?.id || "";
  const importSettings = ensureImportSettingsDefaults(state.data).importSettings;
  const importData = createRegistrationImportData(exportData, {
    targetEventId,
    targetEventName,
    bibMode: importSettings.bibMode,
    startBibNo: importSettings.startBibNo,
    bibDigits: importSettings.bibDigits,
    maxAthletesPerGroup: importSettings.maxAthletesPerGroup,
    roundPlanRules: importSettings.roundPlanRules,
    roundSettings: state.data.roundSettings,
    eventFormationSettings: importSettings.eventFormationSettings,
  });

  if (!importData.summary.athletesCount || !importData.summary.entriesCount) {
    throw new Error("没有可导入的已审核且已支付报名记录");
  }

  if (shouldRequireFormationConfirmation(importData.formationCheckResult, importSettings.eventFormationSettings)) {
    openFormationConfirmation(importData, existingTargetEvent);
    return;
  }

  confirmAndApplyRegistrationImport(importData, existingTargetEvent);
}

function confirmAndApplyRegistrationImport(importData, existingTargetEvent, options = {}) {
  const targetEventName = existingTargetEvent?.name || importData.targetEventName || "报名导入赛事";
  const hasExistingSchedule = Boolean(existingTargetEvent?.days?.some((day) => day.entries?.length));
  const warningLine = importData.warnings.length
    ? `\n\n导入校验提示 ${importData.warnings.length} 条，导入后可在后台查看。`
    : "";
  const formationLine = formatRegistrationFormationConfirmLine(importData);
  const replaceLine = hasExistingSchedule
    ? "\n\n注意：将替换当前赛事已有比赛日、赛程和分组名单，但保留站点配置、logo、赛事名称、场馆等基础信息。"
    : "\n\n将写入当前赛事的比赛日、赛程和分组名单，并保留站点配置。";
  const confirmed = options.skipConfirm || window.confirm(
    [
      `确认把报名 JSON 导入到赛事“${targetEventName}”吗？`,
      "",
      `导入运动员：${importData.summary.athletesCount} 人`,
      `生成参赛项次：${importData.summary.entriesCount} 条`,
      `生成组别：${importData.summary.groupsCount} 个`,
      `生成项目：${importData.summary.eventsCount} 个`,
      `生成俱乐部号段：${importData.summary.organizationRangesCount} 个`,
      formationLine,
      replaceLine,
      warningLine,
    ].join("\n")
  );

  if (!confirmed) {
    return;
  }

  const targetEvent = existingTargetEvent || createRegistrationTargetEvent();
  importData.targetEventId = targetEvent.id;
  importData.targetEventName = targetEvent.name;
  importData.bookData.eventId = targetEvent.id;
  importData.bookData.eventName = targetEvent.name;

  applyRegistrationImportToEvent(targetEvent, importData);
  setAdminPanelExpanded("registration-import", false);
  saveLocalData(state.data);
  syncSelectionsToImportedSchedule(targetEvent);
  renderShell();
  renderView();

  window.alert(formatRegistrationImportSummary(importData));
}

function openFormationConfirmation(importData, existingTargetEvent) {
  const formationResult = importData.formationCheckResult;
  state.pendingRegistrationImport = {
    targetEventId: existingTargetEvent?.id || "",
    targetEventName: existingTargetEvent?.name || importData.targetEventName || "报名导入赛事",
    importData,
    decisions: createDefaultFormationDecisions(formationResult),
  };
  setAdminPanelExpanded("round-settings", true);
  renderShell();
  renderView();
}

function cancelPendingRegistrationImport() {
  state.pendingRegistrationImport = null;
  renderView();
}

function applyPendingRegistrationImport() {
  if (!state.pendingRegistrationImport) {
    return;
  }
  const pending = state.pendingRegistrationImport;
  const importSettings = ensureImportSettingsDefaults(state.data).importSettings;
  const finalizedImportData = applyFormationDecisionsToImportData(
    pending.importData,
    pending.decisions,
    {
      eventFormationSettings: importSettings.eventFormationSettings,
      maxAthletesPerGroup: importSettings.maxAthletesPerGroup,
      roundPlanRules: importSettings.roundPlanRules,
      roundSettings: state.data.roundSettings,
    }
  );
  const existingTargetEvent =
    state.data.events.find((event) => event.id === pending.targetEventId) || getAdminEvent();
  state.pendingRegistrationImport = null;
  confirmAndApplyRegistrationImport(finalizedImportData, existingTargetEvent, { skipConfirm: true });
}

function updatePendingFormationDecision(competitionKey, patch) {
  if (!state.pendingRegistrationImport || !competitionKey) {
    return;
  }
  const decisions = state.pendingRegistrationImport.decisions || {};
  decisions[competitionKey] = {
    ...(decisions[competitionKey] || {}),
    ...patch,
  };
  state.pendingRegistrationImport.decisions = decisions;
  renderView();
}

function createRegistrationTargetEvent() {
  const targetEvent = {
    id: uid("event"),
    name: "报名导入赛事",
    stageLabel: "报名导入",
    status: "未开始",
    showAfterFinished: true,
    dateRange: "待定",
    location: "",
    summary: "由报名系统导入生成参赛名单。",
    description: "报名系统导出的 JSON 已转换为赛事分组、项目和参赛名单。",
    days: [],
  };
  state.data.events.push(targetEvent);
  return targetEvent;
}

function formatRegistrationImportSummary(importData) {
  const summary = importData.summary || {};
  const lines = [
    "报名 JSON 导入完成。",
    `导入运动员：${summary.athletesCount || 0} 人`,
    `生成参赛项次：${summary.entriesCount || 0} 条`,
    `生成组别：${summary.groupsCount || 0} 个`,
    `生成项目：${summary.eventsCount || 0} 个`,
    `生成俱乐部号段：${summary.organizationRangesCount || 0} 个`,
  ];

  if (importData.warnings?.length) {
    lines.push("", `导入提示：${importData.warnings.length} 条，请在后台“报名数据导入”面板查看。`);
  }
  const formationLine = formatRegistrationFormationConfirmLine(importData);
  if (formationLine) {
    lines.push("", formationLine);
  }

  return lines.join("\n");
}

function formatRegistrationFormationConfirmLine(importData) {
  const summary = importData.summary || {};
  const parts = [
    summary.underfilledCompetitionsCount ? `参赛不足项目：${summary.underfilledCompetitionsCount} 个` : "",
    summary.mergedCompetitionsCount ? `已合并项目：${summary.mergedCompetitionsCount} 个` : "",
    summary.canceledCompetitionsCount ? `已取消项目：${summary.canceledCompetitionsCount} 个` : "",
    summary.keptUnderfilledCompetitionsCount ? `人工保留项目：${summary.keptUnderfilledCompetitionsCount} 个` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("，") : "";
}

function createRegistrationImportData(exportData, options = {}) {
  validateRegistrationExportData(exportData);

  const warnings = [];
  const importedGroupDefinitions = extractImportedGroupDefinitionsFromExport(exportData, warnings);
  const groupDefinitionSource = importedGroupDefinitions.length ? "registration_json" : "none";
  const registrations = exportData.registrations || [];
  const organizationStaffMap = extractOrganizationStaffMapFromExport(exportData);
  const statusContext = getRegistrationStatusContext(registrations, warnings);
  const athleteMap = new Map();
  const rawEntries = [];
  const missingEventIdWarningKeys = new Set();
  let acceptedRegistrationCount = 0;
  let skippedRegistrationCount = 0;

  registrations.forEach((registration, registrationIndex) => {
    const label = getRegistrationRecordLabel(registration, registrationIndex);

    if (!isRegistrationApprovedAndPaid(registration, statusContext)) {
      skippedRegistrationCount += 1;
      return;
    }

    const validationErrors = validateRegistrationRecord(registration, registrationIndex);
    validationErrors.forEach((message) => warnings.push(message));

    const name = normalizeText(registration.name);
    const registrationNo = normalizeText(registration.registrationNo);
    const certificateNumber = normalizeText(registration.certificateNumber);
    const groupName = normalizeText(registration.groupName);
    const groupId = normalizeText(registration.groupId);

    if (!name || (!groupId && !groupName)) {
      skippedRegistrationCount += 1;
      return;
    }

    const uniqueKey = certificateNumber
      ? `certificate:${certificateNumber}`
      : `registration:${registrationNo}`;

    if (!certificateNumber && !registrationNo) {
      warnings.push(`${label} 缺少 certificateNumber 和 registrationNo，已跳过。`);
      skippedRegistrationCount += 1;
      return;
    }

    const gender = normalizeText(registration.gender);
    const genderLabel = normalizeRegistrationGenderLabel(registration);
    const groupKey = createRegistrationGroupKey(registration);
    const normalizedGroupId = groupId || `group-${hashString(`${groupName}|${genderLabel || gender}`)}`;
    const sourceBibNo = getRegistrationSourceBibNo(registration);
    const organization = normalizeText(registration.organization);
    const registrationStaff = normalizeOrganizationStaffFromRegistration(registration);
    const exportedStaff = organizationStaffMap.get(organization) || { leaderNames: [], coachNames: [] };
    const leaderNames = uniqueStaffNames([...exportedStaff.leaderNames, ...registrationStaff.leaderNames]);
    const coachNames = uniqueStaffNames([...exportedStaff.coachNames, ...registrationStaff.coachNames]);
    const organizationLeader = leaderNames.join("、");
    const organizationCoach = coachNames.join("、");
    let athlete = athleteMap.get(uniqueKey);

    if (!athlete) {
      athlete = {
        id: createStableId("athlete", uniqueKey),
        bibNo: "",
        sourceBibNo,
        registrationNo,
        registrationNos: registrationNo ? [registrationNo] : [],
        name,
        certificateType: normalizeText(registration.certificateType),
        certificateTypeLabel: normalizeText(registration.certificateTypeLabel),
        certificateNumber,
        maskedCertificateNumber: maskCertificateNumber(certificateNumber),
        gender,
        genderLabel,
        birthDate: normalizeText(registration.birthDate),
        birthYear: registration.birthYear ?? "",
        phone: normalizeText(registration.phone),
        organization,
        organizationLeader,
        organizationCoach,
        leader: organizationLeader,
        coach: organizationCoach,
        leaderNames,
        coachNames,
        groupId: normalizedGroupId,
        groupKey,
        groupName,
        source: REGISTRATION_SOURCE_LABEL,
      };
      athleteMap.set(uniqueKey, athlete);
    } else {
      mergeRegistrationNoIntoAthlete(athlete, registrationNo, warnings);
      if (!athlete.sourceBibNo && sourceBibNo) {
        athlete.sourceBibNo = sourceBibNo;
      }
      if (athlete.name !== name) {
        warnings.push(`${label} 与同证件运动员姓名不一致，已按同一运动员保留第一条姓名：${athlete.name}。`);
      }
      if (athlete.groupKey !== groupKey) {
        warnings.push(`${label} 与同一运动员已有组别不同，运动员基础信息保留第一条，参赛项次仍按报名记录生成。`);
      }
      if (!athlete.organizationLeader && organizationLeader) {
        athlete.organizationLeader = organizationLeader;
        athlete.leader = organizationLeader;
      }
      if (!athlete.organizationCoach && organizationCoach) {
        athlete.organizationCoach = organizationCoach;
        athlete.coach = organizationCoach;
      }
      athlete.leaderNames = uniqueStaffNames([...(athlete.leaderNames || []), ...leaderNames]);
      athlete.coachNames = uniqueStaffNames([...(athlete.coachNames || []), ...coachNames]);
      athlete.organizationLeader = athlete.leaderNames.join("、") || athlete.organizationLeader;
      athlete.organizationCoach = athlete.coachNames.join("、") || athlete.organizationCoach;
      athlete.leader = athlete.organizationLeader;
      athlete.coach = athlete.organizationCoach;
    }

    const eventNames = normalizeRegistrationList(registration.eventNames);
    const eventIds = normalizeRegistrationList(registration.eventIds);

    const eventCount = Math.max(eventNames.length, eventIds.length);
    if (!eventCount) {
      warnings.push(`${label} 没有报名项目，未生成参赛项次。`);
    }

    for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
      const eventName = sanitizeProjectName(eventNames[eventIndex] || eventIds[eventIndex] || "未命名项目");
      let eventId = normalizeText(eventIds[eventIndex]);
      if (!eventId) {
        eventId = `temp-${hashString(`${groupKey}|${eventName}|${eventIndex}`)}`;
        const warningKey = `${groupKey}|${eventName}|${eventId}`;
        if (!missingEventIdWarningKeys.has(warningKey)) {
          warnings.push(`${label} 的项目“${eventName}”缺少 eventId，已生成临时 ID：${eventId}。`);
          missingEventIdWarningKeys.add(warningKey);
        }
      }

      const eventKey = createRegistrationEventKey(groupKey, eventId);
      rawEntries.push({
        id: createStableId("entry", `${athlete.id}|${registrationNo}|${groupKey}|${eventId}|${eventIndex}`),
        athleteId: athlete.id,
        bibNo: "",
        registrationNo,
        name,
        organization,
        organizationLeader,
        organizationCoach,
        leader: organizationLeader,
        coach: organizationCoach,
        leaderNames,
        coachNames,
        groupId: normalizedGroupId,
        groupKey,
        groupName,
        eventId,
        eventKey,
        eventName,
        gender,
        genderLabel,
        birthDate: normalizeText(registration.birthDate),
        source: REGISTRATION_SOURCE_LABEL,
        sourceIndex: registrationIndex,
        eventIndex,
      });
    }

    acceptedRegistrationCount += 1;
  });

  const athletes = assignBibNumbers(Array.from(athleteMap.values()), {
    startBibNo: options.startBibNo || DEFAULT_BIB_START,
    bibDigits: options.bibDigits || DEFAULT_BIB_DIGITS,
    bibMode: options.bibMode || "global_auto",
  });
  const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]));
  const entries = rawEntries.map((entry) => {
    const athlete = athleteById.get(entry.athleteId);
    return {
      ...entry,
      bibNo: athlete?.bibNo || "",
      organization: entry.organization || athlete?.organization || "",
      organizationLeader: entry.organizationLeader || athlete?.organizationLeader || athlete?.leader || "",
      organizationCoach: entry.organizationCoach || athlete?.organizationCoach || athlete?.coach || "",
      leader: entry.leader || athlete?.leader || athlete?.organizationLeader || "",
      coach: entry.coach || athlete?.coach || athlete?.organizationCoach || "",
      leaderNames: uniqueStaffNames([...(entry.leaderNames || []), ...(athlete?.leaderNames || [])]),
      coachNames: uniqueStaffNames([...(entry.coachNames || []), ...(athlete?.coachNames || [])]),
      certificateNumber: athlete?.certificateNumber || "",
      maskedCertificateNumber: athlete?.maskedCertificateNumber || "",
      phone: athlete?.phone || "",
    };
  });

  const organizationRanges = createOrganizationRanges(athletes);
  const groupedData = createRegistrationGroupsAndEvents(entries);
  const actualMaxAthletes = getActualMaxAthletesForRoundPlan(null, { events: groupedData.events });
  if (
    typeof ensureRoundPlanSettingsReadyForGeneration === "function" &&
    !ensureRoundPlanSettingsReadyForGeneration("导入报名 JSON", {
      actualMaxAthletes,
      basisLabel: actualMaxAthletes
        ? `当前报名数据最大单项人数：${actualMaxAthletes} 人`
        : "当前报名数据暂未生成有效项目人数",
    })
  ) {
    const error = new Error("赛制规则存在错误，已停止导入报名 JSON。");
    error.isRoundPlanValidationStopped = true;
    throw error;
  }
  const formationSettings = normalizeEventFormationSettings({
    ...options.eventFormationSettings,
    importedGroupDefinitions,
  });
  const formationCheckResult = formationSettings.enabled
    ? createFormationCheckResult({ events: groupedData.events, entries }, formationSettings)
    : {
        enabled: false,
        minParticipants: formationSettings.minParticipants,
        underfilledItems: [],
        competitions: [],
        groupDefinitions: importedGroupDefinitions,
        groupDefinitionSource,
        hasImportedGroupDefinitions: Boolean(importedGroupDefinitions.length),
        groupOrder: [],
        isFallbackGroupOrder: false,
        summary: { underfilledCount: 0, mergeSuggestedCount: 0, cancelSuggestedCount: 0 },
      };
  const scheduleItems = createScheduleItemsFromRegistration(groupedData.events, entries, {
    maxAthletesPerGroup: options.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE,
    roundPlanRules: options.roundPlanRules,
    roundSettings: options.roundSettings,
  });
  const bookData = createBookDataFromRegistration({
    eventId: options.targetEventId || "",
    eventName: options.targetEventName || "报名导入赛事",
    athletes,
    groups: groupedData.groups,
    events: groupedData.events,
    entries,
    organizationRanges,
    generatedAt: exportData.generatedAt,
  });

  const baseImportData = {
    source: REGISTRATION_SOURCE_LABEL,
    schemaVersion: exportData.schemaVersion,
    generatedAt: exportData.generatedAt || "",
    importedAt: new Date().toISOString(),
    targetEventId: options.targetEventId || "",
    targetEventName: options.targetEventName || "报名导入赛事",
    bibMode: options.bibMode || "global_auto",
    startBibNo: options.startBibNo || DEFAULT_BIB_START,
    bibDigits: options.bibDigits || DEFAULT_BIB_DIGITS,
    maxAthletesPerGroup: options.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE,
    summary: {
      sourceRegistrationsCount: registrations.length,
      acceptedRegistrationsCount: acceptedRegistrationCount,
      skippedRegistrationsCount: skippedRegistrationCount,
      athletesCount: athletes.length,
      entriesCount: entries.length,
      groupsCount: groupedData.groups.length,
      eventsCount: groupedData.events.length,
      organizationRangesCount: organizationRanges.length,
      underfilledCompetitionsCount: formationCheckResult.underfilledItems.length,
      mergedCompetitionsCount: 0,
      canceledCompetitionsCount: 0,
      keptUnderfilledCompetitionsCount: 0,
    },
    warnings,
    athletes,
    groups: groupedData.groups,
    events: groupedData.events,
    entries,
    organizationRanges,
    scheduleItems,
    bookData,
    formationCheckResult,
    importedGroupDefinitions,
    groupDefinitionSource,
    formationDecisions: {},
    mergedCompetitions: [],
    canceledCompetitions: [],
    keptUnderfilledCompetitions: [],
  };

  if (
    formationSettings.enabled &&
    formationCheckResult.underfilledItems.length &&
    formationSettings.underfilledAction !== "suggest_merge"
  ) {
    const decisions = createDefaultFormationDecisions(formationCheckResult);
    if (formationSettings.underfilledAction === "mark_only") {
      Object.keys(decisions).forEach((key) => {
        decisions[key] = { action: "keep", targetCompetitionKey: "" };
      });
    }
    return applyFormationDecisionsToImportData(baseImportData, decisions, {
      eventFormationSettings: formationSettings,
      maxAthletesPerGroup: options.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE,
      roundPlanRules: options.roundPlanRules,
      roundSettings: options.roundSettings,
    });
  }

  return baseImportData;
}

function extractImportedGroupDefinitionsFromExport(exportData, warnings = []) {
  const sourceFields = ["groupDefinitions", "groups", "groupRules", "ageGroups"];
  const collected = [];
  sourceFields.forEach((fieldName) => {
    collectImportedGroupDefinitionItems(exportData?.[fieldName], collected, {
      sourceField: fieldName,
      seriesId: "",
      seriesName: "",
    });
  });

  const missingSeriesKeys = new Set();
  const normalized = collected
    .map((item, index) => {
      const groupId = normalizeText(item.groupId || item.groupID || item.id || item.value);
      const groupName = normalizeText(
        item.groupName ||
          item.name ||
          item.displayName ||
          item.label ||
          item.title
      );
      const seriesId = normalizeText(
        item.seriesId ||
          item.series ||
          item.chainId ||
          item.categoryId ||
          item.typeId ||
          item._seriesId
      );
      const seriesName = normalizeText(
        item.seriesName ||
          item.seriesLabel ||
          item.chainName ||
          item.categoryName ||
          item.typeName ||
          item._seriesName
      );
      const orderValue =
        item.order ??
        item.sortOrder ??
        item.sort ??
        item.sequence ??
        item.index ??
        item._order;
      const order = normalizePositiveInteger(orderValue, index + 1);
      const finalSeriesId = seriesId || seriesName || "registration-default";
      const finalSeriesName = seriesName || seriesId || "报名系统组别";
      if (!seriesId && !seriesName) {
        missingSeriesKeys.add(finalSeriesId);
      }
      return {
        id: normalizeText(item.definitionId || item.definitionKey || item.id) || `${finalSeriesId}-${order}-${index + 1}`,
        groupId,
        name: groupName,
        series: finalSeriesId,
        seriesName: finalSeriesName,
        order,
        minAge: normalizeOptionalInteger(item.minAge),
        maxAge: normalizeOptionalInteger(item.maxAge),
        minBirthYear: normalizeOptionalInteger(item.minBirthYear),
        maxBirthYear: normalizeOptionalInteger(item.maxBirthYear),
      };
    })
    .filter((item) => item.name)
    .sort((left, right) =>
      compareRegistrationText(left.seriesName, right.seriesName) ||
      left.order - right.order ||
      compareRegistrationText(left.name, right.name)
    );

  if (normalized.length && missingSeriesKeys.size) {
    warnings.push("报名 JSON 的部分组别定义未提供 seriesId/seriesName，系统会按报名系统单一系列处理，请人工确认不会混合不同组别系列。");
  }

  return normalizeFormationGroupDefinitions(normalized);
}

function collectImportedGroupDefinitionItems(value, target, context = {}) {
  if (!value) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectImportedGroupDefinitionItems(item, target, {
        ...context,
        order: index + 1,
      })
    );
    return;
  }
  if (typeof value !== "object") {
    return;
  }

  const nestedGroups = value.groups || value.groupDefinitions || value.children || value.items;
  const seriesId = normalizeText(
    value.seriesId ||
      value.series ||
      value.chainId ||
      value.categoryId ||
      value.typeId ||
      context.seriesId
  );
  const seriesName = normalizeText(
    value.seriesName ||
      value.seriesLabel ||
      value.chainName ||
      value.categoryName ||
      value.typeName ||
      context.seriesName
  );
  if (Array.isArray(nestedGroups)) {
    nestedGroups.forEach((item, index) =>
      collectImportedGroupDefinitionItems(item, target, {
        ...context,
        seriesId,
        seriesName,
        order: index + 1,
      })
    );
    return;
  }

  const groupName = normalizeText(value.groupName || value.name || value.displayName || value.label || value.title);
  if (!groupName) {
    return;
  }

  target.push({
    ...value,
    _seriesId: seriesId,
    _seriesName: seriesName,
    _order: context.order,
  });
}

function getRegistrationSourceBibNo(registration) {
  return normalizeText(
    registration.bibNo ||
      registration.bib ||
      registration.athleteNo ||
      registration.number ||
      registration.playerNo
  );
}

function normalizeOrganizationStaffFromRegistration(registration) {
  return {
    leaderNames: extractStaffNamesFromObject(registration, [
      "organizationLeader",
      "leader",
      "leaderName",
      "leaderNames",
      "teamLeader",
      "teamLeaderName",
      "captain",
      "managerName",
    ]),
    coachNames: extractStaffNamesFromObject(registration, [
      "organizationCoach",
      "coach",
      "coachName",
      "coachNames",
      "coaches",
      "trainer",
      "trainerName",
      "instructor",
      "instructorName",
    ]),
  };
}

function extractOrganizationStaffMapFromExport(exportData) {
  const map = new Map();
  ["organizations", "teams", "clubs", "organizationDefinitions", "teamDefinitions", "clubDefinitions"].forEach((fieldName) => {
    const items = exportData?.[fieldName];
    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((item) => {
      const organization = normalizeText(
        item.organization ||
          item.organizationName ||
          item.team ||
          item.teamName ||
          item.club ||
          item.clubName ||
          item.name
      );
      if (!organization) {
        return;
      }

      const current = map.get(organization) || { leaderNames: [], coachNames: [] };
      const staff = normalizeOrganizationStaffFromRegistration(item);
      map.set(organization, {
        leaderNames: uniqueStaffNames([...current.leaderNames, ...staff.leaderNames]),
        coachNames: uniqueStaffNames([...current.coachNames, ...staff.coachNames]),
      });
    });
  });
  return map;
}

function extractStaffNamesFromObject(source, fields) {
  return uniqueStaffNames(
    fields.flatMap((fieldName) => normalizeStaffNames(source?.[fieldName]))
  );
}

function normalizeStaffNames(value) {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeStaffNames);
  }

  if (value && typeof value === "object") {
    return normalizeStaffNames(value.name || value.realName || value.label || value.value);
  }

  if (value == null || value === "") {
    return [];
  }

  return String(value)
    .split(/[,，、;；/]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function uniqueStaffNames(names) {
  return Array.from(new Set((names || []).map((name) => normalizeText(name)).filter(Boolean)));
}

function getRegistrationStatusContext(registrations, warnings) {
  const hasReviewStatus = registrations.some(
    (registration) =>
      Object.prototype.hasOwnProperty.call(registration, "reviewStatus") ||
      Object.prototype.hasOwnProperty.call(registration, "reviewStatusLabel")
  );
  const hasPaymentStatus = registrations.some(
    (registration) =>
      Object.prototype.hasOwnProperty.call(registration, "paymentStatus") ||
      Object.prototype.hasOwnProperty.call(registration, "paymentStatusLabel")
  );

  if (!hasReviewStatus) {
    warnings.push("报名 JSON 未包含审核状态字段，已按当前导出均为已通过处理。");
  }
  if (!hasPaymentStatus) {
    warnings.push("报名 JSON 未包含支付状态字段，已按当前导出均为已支付处理。");
  }

  return {
    hasReviewStatus,
    hasPaymentStatus,
  };
}

function isRegistrationApprovedAndPaid(registration, statusContext) {
  const reviewStatus = normalizeText(registration.reviewStatus);
  const reviewStatusLabel = normalizeText(registration.reviewStatusLabel);
  const paymentStatus = normalizeText(registration.paymentStatus);
  const paymentStatusLabel = normalizeText(registration.paymentStatusLabel);
  const isApproved =
    !statusContext.hasReviewStatus ||
    reviewStatus === "approved" ||
    reviewStatusLabel === "已通过";
  const isPaid =
    !statusContext.hasPaymentStatus ||
    paymentStatus === "paid" ||
    paymentStatusLabel === "已支付";

  return isApproved && isPaid;
}

function validateRegistrationRecord(registration, registrationIndex) {
  const label = getRegistrationRecordLabel(registration, registrationIndex);
  const messages = [];

  if (!normalizeText(registration.name)) {
    messages.push(`${label} 缺少 name，已跳过该报名记录。`);
  }
  if (!normalizeText(registration.registrationNo)) {
    messages.push(`${label} 缺少 registrationNo。`);
  }
  if (!normalizeText(registration.groupId) && !normalizeText(registration.groupName)) {
    messages.push(`${label} 缺少 groupId 或 groupName，已跳过该报名记录。`);
  }

  const eventNames = normalizeRegistrationList(registration.eventNames);
  const eventIds = normalizeRegistrationList(registration.eventIds);
  if (eventNames.length !== eventIds.length) {
    messages.push(`${label} 的 eventNames 数量 ${eventNames.length} 与 eventIds 数量 ${eventIds.length} 不一致。`);
  }

  return messages;
}

function mergeRegistrationNoIntoAthlete(athlete, registrationNo, warnings) {
  if (!registrationNo || athlete.registrationNos.includes(registrationNo)) {
    return;
  }

  athlete.registrationNos.push(registrationNo);
  warnings.push(
    `运动员 ${athlete.name} 使用同一证件号出现多个 registrationNo：${athlete.registrationNos.join("、")}。`
  );
}
