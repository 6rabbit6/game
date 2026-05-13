// 报名 entries 到赛程条目、参赛名单和分组结构的映射。
function applyRegistrationImportToEvent(targetEvent, importData) {
  const existingManualRegistrations = clone(targetEvent.manualRegistrations || []);
  const existingChangeRecords = clone(targetEvent.changeRecords || []);
  const existingChangeBackups = clone(targetEvent.changeBackups || []);
  const existingChangeSourceImport = targetEvent.changeSourceImport
    ? clone(targetEvent.changeSourceImport)
    : null;
  const targetDay = ensureRegistrationImportDay(targetEvent, importData);
  const incomingScheduleItems = importData.scheduleItems || [];
  const incomingKeys = new Set(incomingScheduleItems.map(getRegistrationScheduleKey).filter(Boolean));
  const existingEntries = targetDay.entries || [];
  const existingEntryByKey = new Map();
  const manualEntries = [];

  existingEntries.forEach((entry) => {
    const key = getRegistrationScheduleKey(entry);
    if (key && incomingKeys.has(key)) {
      existingEntryByKey.set(key, entry);
      return;
    }
    if (entry.source === REGISTRATION_SOURCE_LABEL) {
      return;
    }
    manualEntries.push(entry);
  });

  const mergedScheduleItems = incomingScheduleItems.map((incomingEntry) => {
    const key = getRegistrationScheduleKey(incomingEntry);
    const existingEntry = key ? existingEntryByKey.get(key) : null;
    return mergeRegistrationScheduleEntry(existingEntry, incomingEntry);
  });

  targetDay.note = `报名系统导入生成：${importData.summary.athletesCount} 名运动员，${importData.summary.entriesCount} 条参赛项次。`;
  targetDay.entries = [...mergedScheduleItems, ...manualEntries];

  const eventImportState = normalizeEventRegistrationImport(targetEvent, {
    ...importData,
    targetEventId: targetEvent.id,
    targetEventName: targetEvent.name,
    registrationEvents: importData.registrationEvents || importData.events || [],
  });

  targetEvent.registrationImport = eventImportState;
  targetEvent.bookData = clone(eventImportState.bookData);
  targetEvent.organizationRanges = clone(eventImportState.organizationRanges || []);
  targetEvent.manualRegistrations = existingManualRegistrations;
  targetEvent.changeRecords = existingChangeRecords;
  targetEvent.changeBackups = existingChangeBackups;
  if (existingChangeSourceImport) {
    targetEvent.changeSourceImport = existingChangeSourceImport;
  }
  if (existingManualRegistrations.length && typeof mergeManualRegistrationsIntoEvent === "function") {
    mergeManualRegistrationsIntoEvent(targetEvent);
  }
  state.data.lastRegistrationImport = clone(eventImportState);
  delete state.data.registrationImport;
  delete state.data.bookData;
  delete state.data.athletes;
  delete state.data.groups;
  delete state.data.registrationEvents;
  delete state.data.entries;
  delete state.data.organizationRanges;

  recalculateAllGroupRanks(state.data);
}

function ensureRegistrationImportDay(targetEvent, importData) {
  if (!Array.isArray(targetEvent.days)) {
    targetEvent.days = [];
  }

  if (!targetEvent.days.length) {
    targetEvent.days.push({
      id: uid("day"),
      label: "第 1 天",
      date: formatDateOnly(importData.generatedAt) || "",
      note: "",
      entries: [],
    });
  }

  const firstDay = targetEvent.days[0];
  if (!Array.isArray(firstDay.entries)) {
    firstDay.entries = [];
  }
  if (!firstDay.label) {
    firstDay.label = "第 1 天";
  }
  if (!firstDay.date) {
    firstDay.date = formatDateOnly(importData.generatedAt) || "";
  }

  return firstDay;
}

function syncSelectionsToImportedSchedule(targetEvent) {
  const firstDay = targetEvent.days?.[0] || null;
  const firstEntry = firstDay?.entries?.find((entry) => entry.source === REGISTRATION_SOURCE_LABEL) || firstDay?.entries?.[0] || null;
  const firstGroup = firstEntry?.groups?.[0] || null;

  state.selectedEventId = targetEvent.id;
  state.adminEventId = targetEvent.id;
  state.selectedDayId = firstDay?.id || null;
  state.adminDayId = firstDay?.id || null;
  state.selectedEntryId = firstEntry?.id || null;
  state.adminEntryId = firstEntry?.id || null;
  state.selectedGroupId = firstGroup?.id || null;
  state.adminGroupId = firstGroup?.id || null;
}

function createRegistrationGroupsAndEvents(entries) {
  const groupMap = new Map();
  const eventMap = new Map();
  let order = 0;

  entries.forEach((entry) => {
    if (!groupMap.has(entry.groupKey)) {
      groupMap.set(entry.groupKey, {
        id: entry.groupId,
        compoundId: entry.groupKey,
        name: entry.groupName,
        displayName: entry.groupName,
        gender: entry.genderLabel || entry.gender,
        athletesCount: 0,
        entriesCount: 0,
        order,
        _athleteIds: new Set(),
      });
      order += 1;
    }

    const group = groupMap.get(entry.groupKey);
    group.entriesCount += 1;
    group._athleteIds.add(entry.athleteId);

    if (!eventMap.has(entry.eventKey)) {
      eventMap.set(entry.eventKey, {
        id: entry.eventId,
        compoundId: entry.eventKey,
        name: entry.eventName,
        groupId: entry.groupId,
        groupKey: entry.groupKey,
        groupName: entry.groupName,
        gender: entry.genderLabel || entry.gender,
        entriesCount: 0,
        athletesCount: 0,
        order,
        _athleteIds: new Set(),
      });
      order += 1;
    }

    const event = eventMap.get(entry.eventKey);
    event.entriesCount += 1;
    event._athleteIds.add(entry.athleteId);
  });

  const groups = Array.from(groupMap.values())
    .map((group) => ({
      id: group.id,
      compoundId: group.compoundId,
      name: group.name,
      displayName: group.displayName,
      gender: group.gender,
      athletesCount: group._athleteIds.size,
      entriesCount: group.entriesCount,
      order: group.order,
    }))
    .sort(compareRegistrationGroups);

  const events = Array.from(eventMap.values())
    .map((event) => ({
      id: event.id,
      compoundId: event.compoundId,
      name: event.name,
      groupId: event.groupId,
      groupKey: event.groupKey,
      groupName: event.groupName,
      gender: event.gender,
      entriesCount: event.entriesCount,
      athletesCount: event._athleteIds.size,
      order: event.order,
    }))
    .sort(compareRegistrationEvents);

  return {
    groups,
    events,
  };
}

function compareRegistrationGroups(left, right) {
  return (
    compareRegistrationText(left.name, right.name) ||
    compareRegistrationText(left.gender, right.gender) ||
    left.order - right.order
  );
}

function compareRegistrationEvents(left, right) {
  return (
    compareRegistrationText(left.groupName, right.groupName) ||
    compareRegistrationText(left.gender, right.gender) ||
    left.order - right.order ||
    compareRegistrationText(left.name, right.name)
  );
}

function createScheduleItemsFromRegistration(events, entries, options = {}) {
  return events.flatMap((event) => {
    const eventEntries = entries
      .filter((entry) => entry.eventKey === event.compoundId)
      .slice()
      .sort(compareRegistrationEntriesForDisplay);
    const roundPlanRule = findRoundPlanRuleForAthleteCount(eventEntries.length, options.roundPlanRules);
    return createRoundPlanScheduleItems(event, eventEntries, roundPlanRule, options);
  });
}

function findRoundPlanRuleForAthleteCount(athleteCount, roundPlanRules = state?.data?.importSettings?.roundPlanRules) {
  const rules = Array.isArray(roundPlanRules) && roundPlanRules.length
    ? roundPlanRules.map(normalizeRoundPlanRule)
    : clone(DEFAULT_ROUND_PLAN_RULES).map(normalizeRoundPlanRule);
  const count = normalizePositiveInteger(athleteCount, 0);
  const matches = rules.filter((rule) => {
    const min = normalizePositiveInteger(rule.minAthletes, 1);
    const hasUnlimitedMax = isRoundPlanUnlimitedMax(rule.maxAthletes);
    const max = hasUnlimitedMax ? Number.POSITIVE_INFINITY : normalizePositiveInteger(rule.maxAthletes, min);
    return count >= min && count <= max;
  });

  if (matches.length === 0) {
    throw new Error(`人数 ${count} 未匹配到任何赛制规则，请检查人数触发规则是否存在断档。`);
  }

  if (matches.length > 1) {
    throw new Error(`人数 ${count} 同时匹配多条赛制规则，请检查人数触发规则是否存在重叠。`);
  }

  return matches[0];
}

function selectRoundPlanRule(athleteCount, roundPlanRules = state?.data?.importSettings?.roundPlanRules) {
  return findRoundPlanRuleForAthleteCount(athleteCount, roundPlanRules);
}

function createRoundPlanScheduleItems(event, eventEntries, roundPlanRule, options = {}) {
  const rounds = (roundPlanRule.rounds || []).map(normalizeRoundPlanStep);
  const entryIds = rounds.map((round, roundIndex) =>
    createStableId("schedule", `${event.compoundId}|${round.roundId}|${roundIndex + 1}`)
  );
  const roundIdToEntryId = new Map();
  rounds.forEach((round, roundIndex) => {
    if (!roundIdToEntryId.has(round.roundId)) {
      roundIdToEntryId.set(round.roundId, entryIds[roundIndex]);
    }
  });

  return rounds.map((round, roundIndex) => {
    const previousRound = rounds[roundIndex - 1] || null;
    const nextRound = rounds[roundIndex + 1] || null;
    const sourceEntryId = round.source === "qualified" ? entryIds[roundIndex - 1] || "" : "";
    const configuredTargetEntryId = round.qualificationRule.targetRoundId
      ? roundIdToEntryId.get(round.qualificationRule.targetRoundId) || ""
      : "";
    const targetEntryId = configuredTargetEntryId || (round.qualificationRule.mode !== "none" ? entryIds[roundIndex + 1] || "" : "");
    const targetRoundName =
      rounds.find((item) => item.roundId === round.qualificationRule.targetRoundId)?.roundName ||
      nextRound?.roundName ||
      "";
    const qualificationRule = normalizeQualificationRule({
      ...round.qualificationRule,
      targetEntryId,
    });
    const isRegistrationRound = round.source === "registrations";
    const scheduleGroups = isRegistrationRound
      ? buildRaceGroupsForScheduleEntry(event, eventEntries, {
          maxAthletesPerGroup: round.maxAthletesPerGroup || options.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE,
          roundId: round.roundId,
          roundName: round.roundName,
        })
      : [];
    const scheduleStatus = isRegistrationRound
      ? scheduleGroups.length ? "已排组" : "待排组"
      : "待晋级";
    const participantCount = isRegistrationRound ? String(eventEntries.length) : "0";
    const groupCount = isRegistrationRound ? String(scheduleGroups.length) : "0";
    const note = isRegistrationRound
      ? sanitizeRegistrationScheduleNote(event.formationNote || "")
      : `来源：${previousRound?.roundName || "上一轮"}晋级`;

    return {
      id: entryIds[roundIndex],
      status: scheduleStatus,
      scheduleStatus,
      time: "待定",
      name: event.name,
      eventId: event.id,
      groupId: event.groupId,
      groupName: event.groupName,
      projectName: event.name,
      division: event.groupName,
      gender: event.gender,
      round: round.roundName,
      roundId: round.roundId,
      roundName: round.roundName,
      roundOrder: roundIndex + 1,
      roundSource: round.source,
      maxAthletesPerGroup: round.maxAthletesPerGroup,
      sourceEntryId,
      targetEntryId,
      targetRoundName,
      competitionKey: event.compoundId,
      isMergedRace: Boolean(event.isMergedRace),
      mergedFrom: clone(event.mergedFrom || []),
      raceMergeMode: event.raceMergeMode || "",
      rankDisplayMode: "auto",
      formationStatus: event.formationStatus || "",
      formationNote: event.formationNote || "",
      participantCount,
      groupCount,
      qualification: formatQualificationRuleText(qualificationRule, targetRoundName),
      qualificationRule,
      qualificationMode: qualificationRule.mode === "none" ? "manual" : qualificationRule.mode,
      qualificationTopN: qualificationRule.topNPerGroup,
      qualificationTargetEntryId: qualificationRule.targetEntryId,
      qualificationTargetGroupMode: qualificationRule.targetGroupMode,
      note,
      type: "race",
      registrationGroupId: event.groupId,
      registrationGroupKey: event.groupKey,
      registrationEventId: event.id,
      registrationEventKey: event.compoundId,
      source: REGISTRATION_SOURCE_LABEL,
      groups: scheduleGroups,
    };
  });
}

function buildRaceGroupsForScheduleEntry(event, eventEntries, options = {}) {
  const maxAthletesPerGroup = normalizePositiveInteger(
    options.maxAthletesPerGroup,
    DEFAULT_AUTO_GROUP_SIZE
  );
  const athleteChunks = splitAthletesIntoBalancedGroups(eventEntries, maxAthletesPerGroup);

  return athleteChunks.map((chunk, groupIndex) => {
    const group = {
      id: createStableId("group-list", `${event.compoundId}|${options.roundId || "round"}|${groupIndex + 1}`),
      name: createRaceGroupName(groupIndex),
      summary: createRaceGroupSummary(event, groupIndex, options.roundName),
      registrationGroupId: event.groupId,
      registrationGroupKey: event.groupKey,
      registrationEventId: event.id,
      registrationEventKey: event.compoundId,
      source: REGISTRATION_SOURCE_LABEL,
      athletes: chunk.map(createScheduleAthleteFromEntry),
    };
    return assignLanesInGroup(group);
  });
}

function splitAthletesIntoBalancedGroups(athletes, maxAthletesPerGroup = DEFAULT_AUTO_GROUP_SIZE) {
  const list = Array.isArray(athletes) ? athletes.slice() : [];
  if (!list.length) {
    return [];
  }

  const maxSize = normalizePositiveInteger(maxAthletesPerGroup, DEFAULT_AUTO_GROUP_SIZE);
  const groupCount = Math.max(1, Math.ceil(list.length / maxSize));
  const baseSize = Math.floor(list.length / groupCount);
  const extraCount = list.length % groupCount;
  const chunks = [];
  let cursor = 0;

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const groupSize = baseSize + (groupIndex < extraCount ? 1 : 0);
    chunks.push(list.slice(cursor, cursor + groupSize));
    cursor += groupSize;
  }

  return chunks;
}

function createRaceGroupName(index) {
  return `第${index + 1}组`;
}

function createRaceGroupSummary(event, index, roundName = "预赛") {
  return [
    formatGroupNameForDisplay(event.groupName),
    event.gender,
    event.name,
    roundName,
    createRaceGroupName(index),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ");
}

function assignLanesInGroup(group) {
  group.athletes = (group.athletes || []).map((athlete, index) => ({
    ...athlete,
    lane: String(index + 1),
    order: index + 1,
  }));
  return group;
}

function getRegistrationScheduleKey(entry) {
  if (!entry) {
    return "";
  }

  const directKey = normalizeText(entry.registrationEventKey);
  if (directKey) {
    const roundKey = normalizeText(entry.roundId || entry.roundName || entry.round);
    return roundKey ? `${directKey}::${roundKey}` : directKey;
  }

  const groupKey = normalizeText(entry.registrationGroupKey || entry.groupKey);
  const eventId = normalizeText(entry.registrationEventId || entry.eventId);
  if (groupKey && eventId) {
    return createRegistrationEventKey(groupKey, eventId);
  }

  const groupId = normalizeText(entry.registrationGroupId || entry.groupId);
  const gender = normalizeText(entry.gender || entry.genderLabel);
  if (groupId && eventId) {
    return createRegistrationEventKey(`${groupId}::${gender || "未填性别"}`, eventId);
  }

  return "";
}

function mergeRegistrationScheduleEntry(existingEntry, incomingEntry) {
  if (!existingEntry) {
    return clone(incomingEntry);
  }

  const incomingGroups = incomingEntry.groups?.length
    ? incomingEntry.groups
    : [
        {
          id: createStableId("group-list", getRegistrationScheduleKey(incomingEntry)),
          name: "第1组",
          athletes: [],
        },
      ];

  return {
    ...incomingEntry,
    id: existingEntry.id || incomingEntry.id,
    status: incomingEntry.status || existingEntry.status || "已排组",
    scheduleStatus: incomingEntry.scheduleStatus || existingEntry.scheduleStatus || "已排组",
    time: incomingEntry.time || (existingEntry.time === "待排" ? "待定" : existingEntry.time) || "待定",
    qualification: existingEntry.qualification ?? incomingEntry.qualification,
    qualificationRule: existingEntry.qualificationRule || incomingEntry.qualificationRule,
    qualificationMode: existingEntry.qualificationMode || incomingEntry.qualificationMode || "manual",
    qualificationTopN: existingEntry.qualificationTopN ?? incomingEntry.qualificationTopN ?? 1,
    qualificationTargetEntryId: existingEntry.qualificationTargetEntryId || incomingEntry.qualificationTargetEntryId || "",
    qualificationTargetGroupMode:
      existingEntry.qualificationTargetGroupMode ||
      incomingEntry.qualificationTargetGroupMode ||
      "same_group_index",
    participantCount: incomingEntry.participantCount,
    groupCount: String(incomingGroups.length),
    groups: incomingGroups.map((incomingGroup, groupIndex) => {
      const existingGroup = findRegistrationScheduleGroup(existingEntry, incomingGroup, groupIndex);
      return {
        ...incomingGroup,
        id: incomingGroup.id || existingGroup?.id || createStableId("group-list", `${getRegistrationScheduleKey(incomingEntry)}|${groupIndex + 1}`),
        name: incomingGroup.name || existingGroup?.name || `第${groupIndex + 1}组`,
        athletes: mergeRegistrationScheduleAthletes(existingGroup?.athletes || [], incomingGroup.athletes || []),
      };
    }).map(assignLanesInGroup),
  };
}

function findRegistrationScheduleGroup(existingEntry, incomingGroup, groupIndex = 0) {
  const groups = existingEntry?.groups || [];
  if (!groups.length) {
    return null;
  }

  return (
    groups.find((group) => group.id && group.id === incomingGroup?.id) ||
    groups.find((group) => group.name && group.name === incomingGroup?.name) ||
    groups[groupIndex] ||
    (groupIndex === 0
      ? groups.find((group) => group.registrationEventKey && group.registrationEventKey === incomingGroup?.registrationEventKey) ||
        groups.find((group) => group.source === REGISTRATION_SOURCE_LABEL)
      : null) ||
    null
  );
}

function mergeRegistrationScheduleAthletes(existingAthletes, incomingAthletes) {
  const existingAthleteByKey = new Map();
  existingAthletes.forEach((athlete) => {
    const key = getScheduleAthleteKey(athlete);
    if (key && !existingAthleteByKey.has(key)) {
      existingAthleteByKey.set(key, athlete);
    }
  });

  const seenKeys = new Set();
  return incomingAthletes
    .map((incomingAthlete) => {
      const key = getScheduleAthleteKey(incomingAthlete);
      if (key && seenKeys.has(key)) {
        return null;
      }
      if (key) {
        seenKeys.add(key);
      }

      const existingAthlete = key ? existingAthleteByKey.get(key) : null;
      return mergeRegistrationScheduleAthlete(existingAthlete, incomingAthlete);
    })
    .filter(Boolean)
    .sort((left, right) => Number(left.bibNo || left.bib || 0) - Number(right.bibNo || right.bib || 0));
}

function mergeRegistrationScheduleAthlete(existingAthlete, incomingAthlete) {
  if (!existingAthlete) {
    return { ...incomingAthlete };
  }

  return {
    ...incomingAthlete,
    lane: existingAthlete.lane || incomingAthlete.lane || "",
    result: existingAthlete.result || incomingAthlete.result || "",
    rank: existingAthlete.rank || incomingAthlete.rank || "",
    originalRank: existingAthlete.originalRank || incomingAthlete.originalRank || "",
    mergedOverallRank: existingAthlete.mergedOverallRank || incomingAthlete.mergedOverallRank || "",
    note: existingAthlete.note || incomingAthlete.note || "",
  };
}

function getScheduleAthleteKey(athlete) {
  const athleteId = normalizeText(athlete?.athleteId);
  if (athleteId) {
    return `athlete:${athleteId}`;
  }

  const registrationNo = normalizeText(athlete?.registrationNo);
  if (registrationNo) {
    return `registration:${registrationNo}`;
  }

  const bib = normalizeText(athlete?.bibNo || athlete?.bib);
  const name = normalizeText(athlete?.name);
  return bib || name ? `bib-name:${bib}:${name}` : "";
}

function createScheduleAthleteFromEntry(entry, index) {
  return {
    rank: "",
    originalRank: "",
    mergedOverallRank: "",
    lane: String(index + 1),
    bib: entry.bibNo,
    bibNo: entry.bibNo,
    name: entry.name,
    team: entry.organization || EMPTY_ORGANIZATION_LABEL,
    organization: entry.organization || EMPTY_ORGANIZATION_LABEL,
    leader: entry.leader || entry.organizationLeader || "",
    coach: entry.coach || entry.organizationCoach || "",
    organizationLeader: entry.organizationLeader || entry.leader || "",
    organizationCoach: entry.organizationCoach || entry.coach || "",
    result: "",
    note: "",
    athleteId: entry.athleteId,
    registrationNo: entry.registrationNo,
    certificateNumber: entry.certificateNumber || "",
    maskedCertificateNumber: entry.maskedCertificateNumber || "",
    groupId: entry.groupId,
    groupName: entry.groupName,
    eventId: entry.eventId,
    eventName: entry.eventName,
    gender: entry.genderLabel || entry.gender,
    birthDate: entry.birthDate,
    originalCompetitionKey: entry.originalCompetitionKey || entry.eventKey,
    originalGroupName: entry.originalGroupName || entry.groupName,
    originalProjectName: entry.originalProjectName || entry.eventName,
    originalGender: entry.originalGender || entry.genderLabel || entry.gender,
    mergedIntoCompetitionKey: entry.mergedIntoCompetitionKey || "",
    mergedIntoGroupName: entry.mergedIntoGroupName || "",
    mergedIntoProjectName: entry.mergedIntoProjectName || "",
    mergeType: normalizeMergeType(entry.mergeType),
    originalCompetitions: clone(entry.originalCompetitions || []),
    sourceIndex: entry.sourceIndex,
    eventIndex: entry.eventIndex,
    source: REGISTRATION_SOURCE_LABEL,
    order: index + 1,
  };
}

function compareRegistrationEntriesForDisplay(left, right) {
  return (
    Number(left.bibNo || 0) - Number(right.bibNo || 0) ||
    compareRegistrationText(left.name, right.name) ||
    compareRegistrationText(left.registrationNo, right.registrationNo)
  );
}
