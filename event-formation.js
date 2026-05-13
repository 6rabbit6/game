// 项目成立检查、小项合并建议与导入前确认。
function createFormationCheckResult(importData, settings = {}) {
  const formationSettings = normalizeEventFormationSettings(settings);
  const competitions = createFormationCompetitionList(importData.events || [], importData.entries || []);
  const groupDefinitions = getFormationGroupDefinitions(formationSettings, competitions);
  const groupChains = getFormationGroupChains({ ...formationSettings, groupDefinitions }, competitions);
  const groupOrder = getFormationGroupOrder(formationSettings, competitions);
  const competitionByKey = new Map(competitions.map((competition) => [competition.competitionKey, competition]));
  const underfilledItems = [];

  competitions.forEach((competition) => {
    if (competition.participantsCount >= formationSettings.minParticipants) {
      return;
    }

    const suggestion = createFormationSuggestion(
      competition,
      competitions,
      competitionByKey,
      formationSettings,
      groupDefinitions
    );

    underfilledItems.push({
      competitionKey: competition.competitionKey,
      groupName: competition.groupName,
      gender: competition.gender,
      projectName: competition.projectName,
      participantsCount: competition.participantsCount,
      minParticipants: formationSettings.minParticipants,
      status: "underfilled",
      originalEntries: competition.entries,
      ...suggestion,
    });
  });

  return {
    enabled: formationSettings.enabled,
    minParticipants: formationSettings.minParticipants,
    underfilledItems,
    competitions,
    groupDefinitions,
    groupChains,
    groupOrder,
    groupDefinitionSource: formationSettings.groupDefinitionSource,
    hasImportedGroupDefinitions: formationSettings.groupDefinitionSource === "registration_json",
    isFallbackGroupOrder: formationSettings.groupDefinitionSource !== "registration_json",
    summary: {
      underfilledCount: underfilledItems.length,
      mergeSuggestedCount: underfilledItems.filter((item) => item.suggestedAction === "merge").length,
      cancelSuggestedCount: underfilledItems.filter((item) => item.suggestedAction === "cancel").length,
    },
  };
}

function createFormationCompetitionList(events, entries) {
  return (events || []).map((event, index) => {
    const eventEntries = (entries || [])
      .filter((entry) => entry.eventKey === event.compoundId)
      .slice()
      .sort(compareRegistrationEntriesForDisplay);

    return {
      order: Number.isFinite(Number(event.order)) ? Number(event.order) : index,
      competitionKey: event.compoundId,
      groupId: event.groupId,
      groupKey: event.groupKey,
      groupName: normalizeText(event.groupName),
      groupOrderName: normalizeGroupNameForChain(event.groupName),
      chainGroupName: normalizeGroupNameForChain(event.groupName),
      gender: normalizeText(event.gender),
      eventId: event.id,
      projectName: normalizeText(event.name),
      mergeProjectName: normalizeProjectNameForMerge(event.name),
      participantsCount: eventEntries.length,
      entries: eventEntries,
    };
  });
}

function getFormationGroupOrder(settings, competitions) {
  const definitions = getFormationGroupDefinitions(settings, competitions);
  if (definitions.length) {
    return createFormationGroupChainsFromDefinitions(definitions).flatMap((chain) => chain.groups || []);
  }

  const configured = Array.isArray(settings.groupOrder)
    ? settings.groupOrder.map(normalizeGroupNameForChain).filter(Boolean)
    : [];
  if (configured.length) {
    return configured;
  }

  return [];
}

function getFormationGroupDefinitions(settings, competitions) {
  const formationSettings = normalizeEventFormationSettings(settings);
  return normalizeFormationGroupDefinitions(formationSettings.groupDefinitions);
}

function getFormationGroupChains(settings, competitions) {
  const definitions = getFormationGroupDefinitions(settings, competitions);
  if (definitions.length) {
    return createFormationGroupChainsFromDefinitions(definitions);
  }

  const legacyOrder = Array.isArray(settings.groupOrder)
    ? settings.groupOrder.map(normalizeGroupNameForChain).filter(Boolean)
    : parseTextList(settings.groupOrder).map(normalizeGroupNameForChain).filter(Boolean);
  if (legacyOrder.length) {
    return [{ id: "legacy", name: "组别顺序", groups: legacyOrder }];
  }

  return [];
}

function createFormationSuggestion(source, competitions, competitionByKey, settings, groupDefinitions) {
  for (const priority of settings.mergePriority || []) {
    if (priority === "upper_division_same_event") {
      const target = findUpperDivisionSameEventTarget(source, competitions, groupDefinitions, settings);
      if (target) {
        return createMergeSuggestion(source, target, "upper_division_same_event", settings);
      }
    }

    if (priority === "same_division_larger_event") {
      const target = findSameDivisionLargerEventTarget(source, competitions, settings);
      if (target) {
        return createMergeSuggestion(source, target, "same_division_larger_event", settings);
      }
    }

    if (priority === "cancel") {
      break;
    }
  }

  return {
    suggestedAction: settings.underfilledAction === "mark_only" ? "keep" : "cancel",
    suggestedTargetCompetitionKey: "",
    suggestedReason: `该项目报名不足 ${settings.minParticipants} 人，且没有找到合适的合并目标，建议取消或人工保留。`,
    overlapCount: 0,
    overlapAthletes: [],
    sourceOnlyCount: source.participantsCount,
    targetOnlyCount: 0,
    uniqueMergedAthleteCount: source.participantsCount,
    hasOverlap: false,
    overlapLevel: "none",
    mergeRiskLevel: "low",
    mergeWarning: "",
    mergeType: "cancel",
  };
}

function findUpperDivisionSameEventTarget(source, competitions, groupDefinitions, settings) {
  if (settings.groupDefinitionSource !== "registration_json") {
    return null;
  }
  const sourceChain = getFormationDefinitionMembership(source, groupDefinitions);
  if (!sourceChain) {
    return null;
  }

  const candidates = competitions
    .filter((competition) => competition.competitionKey !== source.competitionKey)
    .map((competition) => ({
      competition,
      evaluation: evaluateFormationMergeTarget(source, competition, {
        ...settings,
        groupDefinitions,
      }),
    }))
    .filter(({ evaluation }) => evaluation.canRecommend)
    .sort((left, right) =>
      left.evaluation.targetChain.index - right.evaluation.targetChain.index ||
      Number(right.competition.participantsCount || 0) - Number(left.competition.participantsCount || 0) ||
      left.competition.order - right.competition.order
    );

  return candidates[0]?.competition || null;
}

function findSameDivisionLargerEventTarget(source, competitions, settings) {
  const candidates = competitions
    .filter(
      (competition) =>
        competition.competitionKey !== source.competitionKey &&
        competition.chainGroupName === source.chainGroupName &&
        competition.gender === source.gender &&
        competition.mergeProjectName !== source.mergeProjectName &&
        competition.participantsCount > source.participantsCount
    )
    .sort((left, right) => right.participantsCount - left.participantsCount || left.order - right.order);

  return candidates.find((target) => {
    const overlap = calculateFormationOverlap(source, target);
    return (
      overlap.overlapLevel !== "full" &&
      (target.participantsCount >= settings.minParticipants || overlap.uniqueMergedAthleteCount >= settings.minParticipants)
    );
  }) || null;
}

function createMergeSuggestion(source, target, mergeType, settings) {
  const overlap = calculateFormationOverlap(source, target);
  const evaluation = evaluateFormationMergeTarget(source, target, settings);
  const risk = getFormationMergeRiskLevel(source, target, overlap, evaluation);
  const warning = createFormationMergeWarning(source, target, overlap, risk, evaluation);
  const targetLabel = formatFormationCompetitionLabel(target);

  return {
    suggestedAction: "merge",
    suggestedTargetCompetitionKey: target.competitionKey,
    suggestedReason:
      mergeType === "upper_division_same_event"
        ? `${source.groupName}${source.gender}${source.projectName}人数不足，建议合并到${targetLabel}，合并比赛，按原组别/原项目分别排名。`
        : `${source.groupName}${source.gender}${source.projectName}人数不足，可考虑合并到同组别${target.gender}${target.projectName}，合并比赛，按原组别/原项目分别排名。`,
    overlapCount: overlap.overlapCount,
    overlapAthletes: overlap.overlapAthletes,
    sourceOnlyCount: overlap.sourceOnlyCount,
    targetOnlyCount: overlap.targetOnlyCount,
    uniqueMergedAthleteCount: overlap.uniqueMergedAthleteCount,
    hasOverlap: overlap.hasOverlap,
    overlapLevel: overlap.overlapLevel,
    mergeRiskLevel: risk,
    mergeWarning: warning,
    mergeType,
    isSameProject: evaluation.sameProject,
    isSameGroup: evaluation.sameGroup,
    sourceChainId: evaluation.sourceChain?.chain.id || "",
    targetChainId: evaluation.targetChain?.chain.id || "",
    sourceChainName: evaluation.sourceChain?.chain.name || "",
    targetChainName: evaluation.targetChain?.chain.name || "",
    sourceChainIndex: evaluation.sourceChain?.index ?? -1,
    targetChainIndex: evaluation.targetChain?.index ?? -1,
    raceMergeMode: settings.raceMergeMode,
  };
}

function calculateFormationOverlap(source, target) {
  const sourceAthleteMap = createFormationAthleteMap(source.entries);
  const targetAthleteMap = createFormationAthleteMap(target.entries);
  const sourceKeys = Array.from(sourceAthleteMap.keys());
  const targetKeys = new Set(targetAthleteMap.keys());
  const overlappingKeys = sourceKeys.filter((key) => targetKeys.has(key));
  const sourceOnlyKeys = sourceKeys.filter((key) => !targetKeys.has(key));
  const targetOnlyKeys = Array.from(targetKeys).filter((key) => !sourceAthleteMap.has(key));
  const uniqueMergedAthleteCount = new Set([...sourceKeys, ...Array.from(targetKeys)]).size;
  const overlapLevel = !overlappingKeys.length
    ? "none"
    : overlappingKeys.length === sourceKeys.length
      ? "full"
      : "partial";

  return {
    sourceAthleteKeys: sourceKeys,
    targetAthleteKeys: Array.from(targetKeys),
    overlappingAthleteKeys: overlappingKeys,
    sourceOnlyAthleteKeys: sourceOnlyKeys,
    targetOnlyAthleteKeys: targetOnlyKeys,
    overlapCount: overlappingKeys.length,
    overlapAthletes: overlappingKeys.map((key) => {
      const athlete = sourceAthleteMap.get(key) || targetAthleteMap.get(key) || {};
      return {
        key,
        bibNo: athlete.bibNo || athlete.bib || "",
        name: athlete.name || "",
        organization: athlete.organization || athlete.team || "",
      };
    }),
    sourceOnlyCount: sourceOnlyKeys.length,
    targetOnlyCount: targetOnlyKeys.length,
    uniqueMergedAthleteCount,
    hasOverlap: overlappingKeys.length > 0,
    overlapLevel,
  };
}

function createFormationAthleteMap(entries) {
  const map = new Map();
  (entries || []).forEach((entry) => {
    const key = getAthleteIdentityKey(entry);
    if (key && !map.has(key)) {
      map.set(key, entry);
    }
  });
  return map;
}

function getAthleteIdentityKey(athlete) {
  const registrationNo = normalizeText(athlete?.registrationNo);
  if (registrationNo) {
    return `registration:${registrationNo}`;
  }

  const certificateNumber = normalizeText(
    athlete?.certificateNumber ||
      athlete?.certificateNo ||
      athlete?.idNumber ||
      athlete?.identityNo
  );
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
  if (name && organization && gender) {
    return `name-org-gender:${name}|${organization}|${gender}`;
  }

  return name ? `name:${name}` : "";
}

function getFormationChainMembership(competition, groupChains) {
  const normalizedGroupName = competition.chainGroupName || normalizeGroupNameForChain(competition.groupName);
  for (const chain of groupChains || []) {
    const groups = (chain.groups || []).map(normalizeGroupNameForChain);
    const index = groups.findIndex((groupName) => groupName === normalizedGroupName);
    if (index >= 0) {
      return {
        chain: {
          ...chain,
          groups,
        },
        index,
      };
    }
  }
  return null;
}

function getFormationDefinitionMembership(competition, groupDefinitions) {
  const normalizedGroupId = normalizeText(competition.groupId || "");
  const normalizedGroupName = competition.chainGroupName || normalizeGroupNameForChain(competition.groupName);
  const definitions = normalizeFormationGroupDefinitions(groupDefinitions);
  const definition = definitions.find(
    (item) =>
      (normalizedGroupId && item.groupId && item.groupId === normalizedGroupId) ||
      normalizeGroupNameForChain(item.name) === normalizedGroupName
  );
  if (!definition) {
    return null;
  }

  const seriesDefinitions = definitions
    .filter((item) => item.series === definition.series)
    .slice()
    .sort((left, right) => left.order - right.order || compareRegistrationText(left.name, right.name));
  const index = seriesDefinitions.findIndex((item) => item.id === definition.id);

  return {
    definition,
    chain: {
      id: definition.series,
      name: definition.seriesName || definition.series,
      groups: seriesDefinitions.map((item) => normalizeGroupNameForChain(item.name)),
    },
    index,
  };
}

function normalizeFormationCompetitionCandidate(item = {}) {
  return {
    ...item,
    entries: item.entries || item.originalEntries || [],
    groupName: normalizeText(item.groupName),
    chainGroupName: item.chainGroupName || normalizeGroupNameForChain(item.groupName),
    projectName: normalizeText(item.projectName || item.eventName || item.name),
    mergeProjectName: item.mergeProjectName || normalizeProjectNameForMerge(item.projectName || item.eventName || item.name),
    gender: normalizeText(item.gender),
  };
}

function evaluateFormationMergeTarget(sourceItem, targetItem, settings = {}) {
  const formationSettings = normalizeEventFormationSettings(settings);
  const source = normalizeFormationCompetitionCandidate(sourceItem);
  const target = normalizeFormationCompetitionCandidate(targetItem);
  const groupDefinitions = normalizeFormationGroupDefinitions(settings.groupDefinitions).length
    ? normalizeFormationGroupDefinitions(settings.groupDefinitions)
    : getFormationGroupDefinitions(formationSettings, [source, target]);
  const sourceChain = getFormationDefinitionMembership(source, groupDefinitions);
  const targetChain = getFormationDefinitionMembership(target, groupDefinitions);
  const sameChain = Boolean(sourceChain && targetChain && sourceChain.chain.id === targetChain.chain.id);
  const isForward = Boolean(sameChain && targetChain.index > sourceChain.index);
  const sameGender = normalizeText(source.gender) === normalizeText(target.gender);
  const sameProject = source.mergeProjectName === target.mergeProjectName;
  const sameGroup = source.chainGroupName === target.chainGroupName;
  const overlap = calculateFormationOverlap(source, target);
  const hasTrustedGroupDefinitions = formationSettings.groupDefinitionSource === "registration_json";
  const reachesMinimum =
    target.participantsCount >= formationSettings.minParticipants ||
    overlap.uniqueMergedAthleteCount >= formationSettings.minParticipants;

  return {
    source,
    target,
    groupDefinitions,
    sourceChain,
    targetChain,
    sameChain,
    isForward,
    sameGender,
    sameProject,
    sameGroup,
    overlap,
    reachesMinimum,
    canRecommend:
      hasTrustedGroupDefinitions &&
      sameChain &&
      isForward &&
      sameGender &&
      sameProject &&
      overlap.overlapLevel !== "full" &&
      reachesMinimum,
    isSelectable:
      target.competitionKey !== source.competitionKey &&
      sameGender,
  };
}

function getFormationMergeRiskLevel(source, target, overlap, evaluation = null) {
  const context = evaluation || evaluateFormationMergeTarget(source, target, {});
  const isDifferentProject = !context.sameProject;
  if (!context.sameGender || !context.sameChain || (context.sameChain && !context.isForward && !context.sameGroup)) {
    return "high";
  }
  if (overlap.overlapLevel === "full") {
    return "high";
  }
  if (isDifferentProject && overlap.hasOverlap) {
    return "high";
  }
  if (isDifferentProject || overlap.hasOverlap) {
    return "medium";
  }
  return "low";
}

function createFormationMergeWarning(source, target, overlap, risk, evaluation = null) {
  const context = evaluation || evaluateFormationMergeTarget(source, target, {});
  const warnings = [];
  if (!context.sameGender) {
    warnings.push("跨性别：不允许合并。");
  }
  if (!context.sourceChain || !context.targetChain) {
    warnings.push("目标不在同一合并系列内，无法按向上合并规则推荐。");
  } else if (!context.sameChain) {
    warnings.push("跨组别系列：休闲/专业不可合并，强烈不建议。");
  } else if (!context.isForward && !context.sameGroup) {
    warnings.push("反向级别合并：只能从低级别向高级别合并，不建议。");
  }
  if (!context.sameProject) {
    warnings.push("跨项目：仅人工确认后可用。若项目距离或比赛方式不同，不建议合并。");
  }
  if (overlap.overlapLevel === "partial") {
    warnings.push(`该合并目标存在 ${overlap.overlapCount} 名重复运动员，合并后实际唯一参赛人数为 ${overlap.uniqueMergedAthleteCount} 人，请人工确认。`);
  }
  if (overlap.overlapLevel === "full") {
    warnings.push("该项目运动员已全部报名目标项目，合并后不会增加实际参赛人数，不建议合并到该项目。");
  }
  if (risk === "high" && !context.sameProject && overlap.hasOverlap) {
    warnings.push("该建议同时存在不同项目合并和重复报名运动员，建议谨慎处理，优先考虑上一组别同项目合并或取消。");
  }
  return warnings.join(" ");
}

function getFormationTargetWarningForDisplay(source, target, settings = {}) {
  if (!target) {
    return "";
  }
  const evaluation = evaluateFormationMergeTarget(source, target, settings);
  const risk = getFormationMergeRiskLevel(evaluation.source, evaluation.target, evaluation.overlap, evaluation);
  return createFormationMergeWarning(evaluation.source, evaluation.target, evaluation.overlap, risk, evaluation) ||
    (evaluation.canRecommend ? "合法推荐目标。" : "该目标不是系统推荐目标，请人工确认。");
}

function createFormationTargetOptionGroups(source, competitionOptions, settings = {}) {
  const groups = {
    recommended: [],
    highRisk: [],
    unavailable: [],
  };

  (competitionOptions || []).forEach((target) => {
    if (!target || target.competitionKey === source.competitionKey) {
      return;
    }
    const evaluation = evaluateFormationMergeTarget(source, target, settings);
    const riskLevel = getFormationMergeRiskLevel(evaluation.source, evaluation.target, evaluation.overlap, evaluation);
    const option = {
      competition: target,
      warning: getFormationTargetWarningForDisplay(source, target, settings),
      evaluation,
      riskLevel,
    };
    if (evaluation.canRecommend) {
      groups.recommended.push(option);
    } else if (evaluation.isSelectable) {
      groups.highRisk.push(option);
    } else {
      groups.unavailable.push(option);
    }
  });

  const sortByPriority = (left, right) =>
    Number(Boolean(right.evaluation.canRecommend)) - Number(Boolean(left.evaluation.canRecommend)) ||
    Number(right.competition.participantsCount || 0) - Number(left.competition.participantsCount || 0) ||
    compareRegistrationText(left.competition.groupName, right.competition.groupName) ||
    compareRegistrationText(left.competition.projectName, right.competition.projectName);

  groups.recommended.sort(sortByPriority);
  groups.highRisk.sort(sortByPriority);
  groups.unavailable.sort(sortByPriority);
  return groups;
}

function createDefaultFormationDecisions(formationResult) {
  const decisions = {};
  (formationResult?.underfilledItems || []).forEach((item) => {
    decisions[item.competitionKey] = {
      action: item.suggestedAction === "merge" ? "merge_suggested" : item.suggestedAction,
      targetCompetitionKey: item.suggestedTargetCompetitionKey || "",
    };
  });
  return decisions;
}

function shouldRequireFormationConfirmation(formationResult, settings = {}) {
  const formationSettings = normalizeEventFormationSettings(settings);
  return Boolean(
    formationSettings.enabled &&
      formationSettings.underfilledAction === "suggest_merge" &&
      formationResult?.underfilledItems?.length
  );
}

function applyFormationDecisionsToImportData(importData, decisions = {}, options = {}) {
  const trustedImportedGroupDefinitions =
    importData.groupDefinitionSource === "registration_json"
      ? importData.importedGroupDefinitions || importData.formationCheckResult?.groupDefinitions || []
      : [];
  const settings = normalizeEventFormationSettings({
    ...(options.eventFormationSettings || options),
    importedGroupDefinitions: trustedImportedGroupDefinitions,
  });
  const result = importData.formationCheckResult || createFormationCheckResult(importData, settings);
  const competitions = result.competitions || createFormationCompetitionList(importData.events || [], importData.entries || []);
  const competitionByKey = new Map(competitions.map((competition) => [competition.competitionKey, competition]));
  const underfilledByKey = new Map((result.underfilledItems || []).map((item) => [item.competitionKey, item]));
  const mergedSourceKeys = new Set();
  const canceledKeys = new Set();
  const keptKeys = new Set();
  const mergeSourcesByTargetKey = new Map();
  const formationDecisions = {};
  let canceledCompetitions = [];
  let keptUnderfilledCompetitions = [];
  const mergedCompetitions = [];

  (result.underfilledItems || []).forEach((item) => {
    const decision = normalizeFormationDecision(decisions[item.competitionKey], item);
    formationDecisions[item.competitionKey] = decision;

    if (decision.action === "keep") {
      keptKeys.add(item.competitionKey);
      keptUnderfilledCompetitions.push(createFormationRecord(item, {
        action: "keep",
        note: "参赛不足，人工保留",
      }));
      return;
    }

    if (decision.action === "cancel") {
      canceledKeys.add(item.competitionKey);
      canceledCompetitions.push(createFormationRecord(item, {
        action: "cancel",
        note: "报名不足且无合适合并项目，建议取消。",
      }));
      return;
    }

    if (settings.raceMergeMode === "cancel_only") {
      canceledKeys.add(item.competitionKey);
      canceledCompetitions.push(createFormationRecord(item, {
        action: "cancel",
        note: "当前设置为不合并，只取消不足项目。",
      }));
      return;
    }

    const targetKey = decision.targetCompetitionKey || item.suggestedTargetCompetitionKey || "";
    const sourceCompetition = competitionByKey.get(item.competitionKey);
    const target = competitionByKey.get(targetKey);
    if (!sourceCompetition || !target || target.competitionKey === item.competitionKey) {
      canceledKeys.add(item.competitionKey);
      canceledCompetitions.push(createFormationRecord(item, {
        action: "cancel",
        note: "未选择有效合并目标，已按取消处理。",
      }));
      return;
    }

    mergedSourceKeys.add(item.competitionKey);
    if (!mergeSourcesByTargetKey.has(target.competitionKey)) {
      mergeSourcesByTargetKey.set(target.competitionKey, []);
    }
    mergeSourcesByTargetKey.get(target.competitionKey).push(item.competitionKey);
    const mergeType = target.projectName === sourceCompetition.projectName
      ? "upper_division_same_event"
      : "same_division_larger_event";
    const mergeSuggestion = createMergeSuggestion(sourceCompetition, target, mergeType, settings);
    mergedCompetitions.push(createFormationRecord({ ...item, ...mergeSuggestion }, {
      action: "merge",
      target,
      note: mergeSuggestion.mergeWarning || mergeSuggestion.suggestedReason || "",
    }));
  });

  const finalMergeTargetKeys = new Set(
    Array.from(mergeSourcesByTargetKey.keys()).filter((targetKey) => !mergedSourceKeys.has(targetKey))
  );
  finalMergeTargetKeys.forEach((targetKey) => {
    canceledKeys.delete(targetKey);
    keptKeys.delete(targetKey);
  });
  canceledCompetitions = canceledCompetitions.filter((record) => !finalMergeTargetKeys.has(record.competitionKey));
  keptUnderfilledCompetitions = keptUnderfilledCompetitions.filter((record) => !finalMergeTargetKeys.has(record.competitionKey));

  const finalEntries = [];
  const finalEvents = [];

  competitions.forEach((competition) => {
    if (canceledKeys.has(competition.competitionKey) || mergedSourceKeys.has(competition.competitionKey)) {
      return;
    }

    const sourceKeys = mergeSourcesByTargetKey.get(competition.competitionKey) || [];
    if (sourceKeys.length) {
      const sourceCompetitions = sourceKeys
        .map((key) => competitionByKey.get(key))
        .filter(Boolean);
      const mergedEntries = createMergedCompetitionEntries(competition, sourceCompetitions);
      finalEntries.push(...mergedEntries);
      finalEvents.push(createMergedFormationEvent(competition, sourceCompetitions, mergedEntries, settings));
      return;
    }

    const event = clone((importData.events || []).find((item) => item.compoundId === competition.competitionKey) || {});
    if (keptKeys.has(competition.competitionKey)) {
      event.formationStatus = "kept_underfilled";
      event.formationNote = "参赛不足，人工保留";
    }
    finalEvents.push(event);
    finalEntries.push(
      ...competition.entries.map((entry) =>
        attachOriginalCompetitionFields(entry, competition, competition, "standalone")
      )
    );
  });

  const groupedData = createRegistrationGroupsAndEvents(finalEntries);
  const actualMaxAthletes = getActualMaxAthletesForRoundPlan(null, { events: finalEvents, entries: finalEntries });
  if (
    typeof ensureRoundPlanSettingsReadyForGeneration === "function" &&
    !ensureRoundPlanSettingsReadyForGeneration(options.roundPlanValidationContextLabel || "导入报名 JSON", {
      actualMaxAthletes,
      basisLabel: actualMaxAthletes
        ? `当前报名数据最大单项人数：${actualMaxAthletes} 人`
        : "当前报名数据暂未生成有效项目人数",
    })
  ) {
    const error = new Error("赛制规则存在错误，已停止生成赛程。");
    error.isRoundPlanValidationStopped = true;
    throw error;
  }
  const scheduleItems = createScheduleItemsFromRegistration(finalEvents, finalEntries, {
    maxAthletesPerGroup: options.maxAthletesPerGroup || DEFAULT_AUTO_GROUP_SIZE,
    roundPlanRules: options.roundPlanRules,
    roundSettings: options.roundSettings,
  });
  const bookData = createBookDataFromRegistration({
    eventId: importData.targetEventId || "",
    eventName: importData.targetEventName || "报名导入赛事",
    athletes: importData.athletes || [],
    groups: groupedData.groups,
    events: finalEvents,
    entries: finalEntries,
    organizationRanges: importData.organizationRanges || [],
    generatedAt: importData.generatedAt,
  });
  const mergedCompetitionsWithStatus = annotateMergedFormationRecords(
    mergedCompetitions,
    scheduleItems,
    bookData,
    finalEntries
  );

  return {
    ...importData,
    entries: finalEntries,
    groups: groupedData.groups,
    events: finalEvents,
    registrationEvents: finalEvents,
    scheduleItems,
    bookData,
    formationCheckResult: result,
    formationDecisions,
    mergedCompetitions: mergedCompetitionsWithStatus,
    canceledCompetitions,
    keptUnderfilledCompetitions,
    summary: {
      ...(importData.summary || {}),
      groupsCount: groupedData.groups.length,
      eventsCount: finalEvents.length,
      underfilledCompetitionsCount: result.underfilledItems.length,
      mergedCompetitionsCount: mergedCompetitionsWithStatus.length,
      canceledCompetitionsCount: canceledCompetitions.length,
      keptUnderfilledCompetitionsCount: keptUnderfilledCompetitions.length,
    },
  };
}

function normalizeFormationDecision(decision = {}, item = {}) {
  const suggestedAction = item.suggestedAction === "merge" ? "merge_suggested" : item.suggestedAction || "cancel";
  const action = ["merge_suggested", "merge_manual", "cancel", "keep"].includes(decision.action)
    ? decision.action
    : suggestedAction;
  return {
    action,
    targetCompetitionKey:
      action === "merge_suggested"
        ? item.suggestedTargetCompetitionKey || decision.targetCompetitionKey || ""
        : normalizeText(decision.targetCompetitionKey || item.suggestedTargetCompetitionKey),
  };
}

function createMergedCompetitionEntries(targetCompetition, sourceCompetitions) {
  const mergedByKey = new Map();
  const addEntries = (competition, mergeType) => {
    competition.entries.forEach((entry) => {
      const key = getAthleteIdentityKey(entry) || `${entry.name}|${entry.bibNo}|${competition.competitionKey}`;
      const originalDescriptor = createOriginalCompetitionDescriptor(competition);
      const existing = mergedByKey.get(key);
      if (existing) {
        existing.originalCompetitions = mergeOriginalCompetitions(
          existing.originalCompetitions,
          [originalDescriptor]
        );
        existing.mergeType = "overlap_source_and_target";
        return;
      }
      mergedByKey.set(
        key,
        attachOriginalCompetitionFields(entry, competition, targetCompetition, mergeType)
      );
    });
  };

  addEntries(targetCompetition, "target_original");
  sourceCompetitions.forEach((source) => addEntries(source, "merged_from_underfilled"));
  return Array.from(mergedByKey.values()).sort(compareRegistrationEntriesForDisplay);
}

function attachOriginalCompetitionFields(entry, originalCompetition, targetCompetition, mergeType) {
  const originalDescriptor = createOriginalCompetitionDescriptor(originalCompetition);
  return {
    ...clone(entry),
    eventKey: targetCompetition.competitionKey,
    eventId: targetCompetition.eventId,
    eventName: targetCompetition.projectName,
    groupId: targetCompetition.groupId,
    groupKey: targetCompetition.groupKey,
    groupName: targetCompetition.groupName,
    originalCompetitionKey: originalCompetition.competitionKey,
    originalGroupName: originalCompetition.groupName,
    originalProjectName: originalCompetition.projectName,
    originalGender: originalCompetition.gender,
    mergedIntoCompetitionKey: targetCompetition.competitionKey,
    mergedIntoGroupName: targetCompetition.groupName,
    mergedIntoProjectName: targetCompetition.projectName,
    mergeType,
    originalCompetitions: mergeOriginalCompetitions(entry.originalCompetitions, [originalDescriptor]),
  };
}

function createMergedFormationEvent(targetCompetition, sourceCompetitions, mergedEntries, settings) {
  const base = {
    id: targetCompetition.eventId,
    compoundId: targetCompetition.competitionKey,
    name: targetCompetition.projectName,
    groupId: targetCompetition.groupId,
    groupKey: targetCompetition.groupKey,
    groupName: targetCompetition.groupName,
    gender: targetCompetition.gender,
    entriesCount: mergedEntries.length,
    athletesCount: mergedEntries.length,
    order: targetCompetition.order,
  };
  const mergedFrom = sourceCompetitions.map((competition) => ({
    competitionKey: competition.competitionKey,
    groupName: competition.groupName,
    gender: competition.gender,
    projectName: competition.projectName,
    participantsCount: competition.participantsCount,
  }));

  return {
    ...base,
    isMergedRace: true,
    mergedFrom,
    raceMergeMode: settings.raceMergeMode,
    formationStatus: "merged",
    formationNote:
      settings.raceMergeMode === "race_together_rank_together"
        ? "合并比赛，统一排名"
        : "合并比赛，按原组别/原项目分别排名",
  };
}

function annotateMergedFormationRecords(records, scheduleItems, bookData, finalEntries) {
  const scheduleKeys = new Set(
    (scheduleItems || [])
      .map((item) => normalizeText(item.registrationEventKey || item.competitionKey))
      .filter(Boolean)
  );
  const bookEventKeys = new Set();
  (bookData?.groups || []).forEach((group) => {
    (group.events || []).forEach((event) => {
      if (event.eventKey && event.entries?.length) {
        bookEventKeys.add(event.eventKey);
      }
    });
  });
  const finalEntryCountByEventKey = new Map();
  (finalEntries || []).forEach((entry) => {
    const eventKey = normalizeText(entry.eventKey);
    if (!eventKey) return;
    finalEntryCountByEventKey.set(eventKey, (finalEntryCountByEventKey.get(eventKey) || 0) + 1);
  });

  return (records || []).map((record) => {
    const targetKey = normalizeText(record.targetCompetitionKey);
    const finalMergedAthleteCount =
      finalEntryCountByEventKey.get(targetKey) || record.uniqueMergedAthleteCount || 0;
    const scheduleCreated = Boolean(targetKey && scheduleKeys.has(targetKey));
    const rosterCreated = Boolean(targetKey && bookEventKeys.has(targetKey));

    return {
      ...record,
      uniqueMergedAthleteCount: finalMergedAthleteCount,
      finalMergedAthleteCount,
      scheduleCreated,
      rosterCreated,
      processResult:
        scheduleCreated && rosterCreated
          ? "已生成正式赛程 / 已进入目标项目名单"
          : [
              scheduleCreated ? "已生成正式赛程" : "未生成正式赛程",
              rosterCreated ? "已进入目标项目名单" : "未进入目标项目名单",
            ].join(" / "),
    };
  });
}

function mergeOriginalCompetitions(existing = [], additions = []) {
  const map = new Map();
  [...(Array.isArray(existing) ? existing : []), ...additions].forEach((item) => {
    if (item?.competitionKey && !map.has(item.competitionKey)) {
      map.set(item.competitionKey, item);
    }
  });
  return Array.from(map.values());
}

function createOriginalCompetitionDescriptor(competition) {
  return {
    competitionKey: competition.competitionKey,
    groupName: competition.groupName,
    gender: competition.gender,
    projectName: competition.projectName,
  };
}

function createFormationRecord(item, extra = {}) {
  return {
    competitionKey: item.competitionKey,
    groupName: item.groupName,
    gender: item.gender,
    projectName: item.projectName,
    participantsCount: item.participantsCount,
    minParticipants: item.minParticipants,
    action: extra.action || item.suggestedAction || "",
    targetCompetitionKey: extra.target?.competitionKey || item.suggestedTargetCompetitionKey || "",
    targetGroupName: extra.target?.groupName || "",
    targetProjectName: extra.target?.projectName || "",
    targetGender: extra.target?.gender || "",
    cancelReason: extra.action === "cancel" ? extra.note || item.suggestedReason || "" : "",
    keepReason: extra.action === "keep" ? extra.note || "参赛不足，人工保留" : "",
    mergeReason: extra.action === "merge" ? extra.note || item.suggestedReason || "" : "",
    overlapCount: item.overlapCount || 0,
    overlapAthletes: item.overlapAthletes || [],
    uniqueMergedAthleteCount: item.uniqueMergedAthleteCount || item.participantsCount || 0,
    mergeRiskLevel: item.mergeRiskLevel || "low",
    mergeWarning: item.mergeWarning || "",
    originalEntries: item.originalEntries || [],
  };
}

function formatFormationCompetitionLabel(competition) {
  if (!competition) {
    return "未选择目标";
  }
  return `${competition.groupName || "未命名组别"} · ${competition.gender || "未填性别"} · ${competition.projectName || "未命名项目"}`;
}

function normalizeFormationGroupNameForOrder(groupName) {
  return normalizeGroupNameForChain(groupName);
}

function getFormationActionLabel(action) {
  if (action === "merge_suggested") return "按系统建议合并";
  if (action === "merge_manual") return "手动选择合并目标";
  if (action === "keep") return "保留单独比赛";
  if (action === "cancel") return "取消该项目";
  return "未处理";
}

function getFormationRiskLabel(level) {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  return "低风险";
}

function getRaceMergeModeLabel(mode) {
  if (mode === "race_together_rank_together") return "合并比赛，统一排名";
  if (mode === "cancel_only") return "不合并，只取消";
  return "合并比赛，按原组别/原项目分别排名";
}
