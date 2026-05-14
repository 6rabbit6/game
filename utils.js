const STORAGE_KEY = "event-system-data-v1";
const REGISTRATION_EXPORT_SCHEMA_VERSION = "registration-export-v2";
const REGISTRATION_SOURCE_LABEL = "registration-export-v2";
const DEFAULT_BIB_START = 1;
const DEFAULT_BIB_DIGITS = 3;
const DEFAULT_AUTO_GROUP_SIZE = 6;
const DEFAULT_ROUND_PLAN_MAX_EXPECTED_ATHLETES = 100;
const ROUND_PLAN_PRESSURE_TEST_ATHLETES = 1000;
const DEFAULT_ROUND_OPTIONS = [
  { id: "prelim", name: "预赛" },
  { id: "quarter", name: "1/4赛" },
  { id: "semi", name: "半决赛" },
  { id: "final", name: "决赛" },
];
const DEFAULT_ROUND_SETTINGS = {
  roundOptions: DEFAULT_ROUND_OPTIONS,
  defaultFinalRoundName: "决赛",
};
const DEFAULT_ROUND_PLAN_RULES = [
  {
    id: "direct-final",
    name: "6人以内：直接决赛",
    minAthletes: 1,
    maxAthletes: 6,
    rounds: [
      {
        roundId: "final",
        roundName: "决赛",
        source: "registrations",
        maxAthletesPerGroup: 6,
        qualificationRule: { mode: "none" },
      },
    ],
  },
  {
    id: "prelim-final",
    name: "7-18人：预赛 → 决赛",
    minAthletes: 7,
    maxAthletes: 18,
    rounds: [
      {
        roundId: "prelim",
        roundName: "预赛",
        source: "registrations",
        maxAthletesPerGroup: 6,
        qualificationRule: {
          mode: "top_n_plus_fastest",
          topNPerGroup: 2,
          fastestRemainderCount: 0,
          targetRoundId: "final",
          targetGroupMode: "balanced",
        },
      },
      {
        roundId: "final",
        roundName: "决赛",
        source: "qualified",
        maxAthletesPerGroup: 6,
        qualificationRule: { mode: "none" },
      },
    ],
  },
  {
    id: "quarter-semi-final",
    name: "19人以上：1/4赛 → 半决赛 → 决赛",
    minAthletes: 19,
    maxAthletes: 999,
    rounds: [
      {
        roundId: "quarter",
        roundName: "1/4赛",
        source: "registrations",
        maxAthletesPerGroup: 6,
        qualificationRule: {
          mode: "top_n_plus_fastest",
          topNPerGroup: 2,
          fastestRemainderCount: 2,
          targetRoundId: "semi",
          targetGroupMode: "balanced",
        },
      },
      {
        roundId: "semi",
        roundName: "半决赛",
        source: "qualified",
        maxAthletesPerGroup: 6,
        qualificationRule: {
          mode: "top_n_plus_fastest",
          topNPerGroup: 2,
          fastestRemainderCount: 2,
          targetRoundId: "final",
          targetGroupMode: "balanced",
        },
      },
      {
        roundId: "final",
        roundName: "决赛",
        source: "qualified",
        maxAthletesPerGroup: 6,
        qualificationRule: { mode: "none" },
      },
    ],
  },
];
const DEFAULT_FORMATION_GROUP_CHAINS = [
  {
    id: "leisure",
    name: "休闲组别",
    groups: ["休闲幼儿组", "休闲少儿组", "休闲少年组"],
  },
  {
    id: "professional",
    name: "专业组别",
    groups: ["专业幼儿组", "专业少儿组", "专业少年组"],
  },
];
const DEFAULT_FORMATION_GROUP_DEFINITIONS = [
  {
    id: "leisure-kindergarten",
    name: "休闲幼儿组",
    series: "leisure",
    seriesName: "休闲组别",
    order: 1,
    minAge: 5,
    maxAge: 6,
    minBirthYear: "",
    maxBirthYear: "",
  },
  {
    id: "leisure-child",
    name: "休闲少儿组",
    series: "leisure",
    seriesName: "休闲组别",
    order: 2,
    minAge: 7,
    maxAge: 9,
    minBirthYear: "",
    maxBirthYear: "",
  },
  {
    id: "leisure-teen",
    name: "休闲少年组",
    series: "leisure",
    seriesName: "休闲组别",
    order: 3,
    minAge: 10,
    maxAge: 12,
    minBirthYear: "",
    maxBirthYear: "",
  },
  {
    id: "professional-kindergarten",
    name: "专业幼儿组",
    series: "professional",
    seriesName: "专业组别",
    order: 1,
    minAge: 5,
    maxAge: 6,
    minBirthYear: "",
    maxBirthYear: "",
  },
  {
    id: "professional-child",
    name: "专业少儿组",
    series: "professional",
    seriesName: "专业组别",
    order: 2,
    minAge: 7,
    maxAge: 9,
    minBirthYear: "",
    maxBirthYear: "",
  },
  {
    id: "professional-teen",
    name: "专业少年组",
    series: "professional",
    seriesName: "专业组别",
    order: 3,
    minAge: 10,
    maxAge: 12,
    minBirthYear: "",
    maxBirthYear: "",
  },
];
const DEFAULT_IMPORT_SETTINGS = {
  bibMode: "global_auto",
  startBibNo: DEFAULT_BIB_START,
  bibDigits: DEFAULT_BIB_DIGITS,
  maxAthletesPerGroup: DEFAULT_AUTO_GROUP_SIZE,
  roundPlanMaxExpectedAthletes: DEFAULT_ROUND_PLAN_MAX_EXPECTED_ATHLETES,
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
};
const EMPTY_ORGANIZATION_LABEL = "未填写单位";
const SUPABASE_URL = "https://vrismtdascvwxiyepxed.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OIBFAzMGjT4x3T6Dr90E0A_WB2ILWYE";
const CLOUD_TABLE_NAME = "app_state";
const CLOUD_FIRST_HOSTS = ["6rabbit6.github.io", "game.lcty.online", "race.lcty.online"];
const registrationCollator = new Intl.Collator("zh-Hans-CN", {
  numeric: true,
  sensitivity: "base",
});

// 全局配置与通用工具函数。
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function isValidAppData(value) {
  return Boolean(value?.site) && Array.isArray(value?.events);
}

function shouldHideRegistrationScheduleNote(note) {
  const text = normalizeText(note);
  if (!text) {
    return false;
  }

  return (
    text === "合并比赛，按原组别/原项目分别排名" ||
    text === "合并比赛｜按原组别/原项目分别排名" ||
    text === "报名导入自动分组" ||
    text.startsWith("报名导入自动分组；") ||
    text.startsWith("报名导入自动分组;")
  );
}

function sanitizeRegistrationScheduleNote(note) {
  return shouldHideRegistrationScheduleNote(note) ? "" : normalizeText(note);
}

function removeUnwantedRegistrationScheduleNotes(data) {
  data?.events?.forEach((event) => {
    event.days?.forEach((day) => {
      day.entries?.forEach((entry) => {
        if (shouldHideRegistrationScheduleNote(entry.note)) {
          entry.note = "";
        }
      });
    });
  });
  return data;
}

function ensureEntryQualificationDefaults(data) {
  ensureRoundSettingsDefaults(data);
  ensureImportSettingsDefaults(data);
  ensureRoundPlanRuleDefaults(data);
  ensureEventDisplayDefaults(data);
  ensureEventScopedRegistrationImportDefaults(data);
  ensureEntryRoundDefaults(data);
  ensureScheduleStatusDefaults(data);
  ensureQualificationRuleDefaults(data);
  removeUnwantedRegistrationScheduleNotes(data);
  return data;
}

function ensureRoundSettingsDefaults(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  data.roundSettings = {
    ...clone(DEFAULT_ROUND_SETTINGS),
    ...(data.roundSettings || {}),
  };

  if (!Array.isArray(data.roundSettings.roundOptions) || !data.roundSettings.roundOptions.length) {
    data.roundSettings.roundOptions = clone(DEFAULT_ROUND_OPTIONS);
  }

  data.roundSettings.roundOptions = data.roundSettings.roundOptions.map((option, index) => ({
    id: normalizeText(option.id) || createStableId("round", `${option.name || "round"}-${index}`),
    name: normalizeText(option.name) || `赛别${index + 1}`,
  }));

  data.roundSettings.defaultFinalRoundName =
    normalizeText(data.roundSettings.defaultFinalRoundName) || "决赛";

  return data;
}

function ensureImportSettingsDefaults(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  data.importSettings = {
    ...DEFAULT_IMPORT_SETTINGS,
    ...(data.importSettings || {}),
  };

  if (!["global_auto", "keep_source", "group_auto"].includes(data.importSettings.bibMode)) {
    data.importSettings.bibMode = DEFAULT_IMPORT_SETTINGS.bibMode;
  }

  data.importSettings.startBibNo = normalizePositiveInteger(
    data.importSettings.startBibNo,
    DEFAULT_IMPORT_SETTINGS.startBibNo
  );
  data.importSettings.bibDigits = normalizePositiveInteger(
    data.importSettings.bibDigits,
    DEFAULT_IMPORT_SETTINGS.bibDigits
  );
  data.importSettings.maxAthletesPerGroup = normalizePositiveInteger(
    data.importSettings.maxAthletesPerGroup,
    DEFAULT_IMPORT_SETTINGS.maxAthletesPerGroup
  );
  data.importSettings.roundPlanMaxExpectedAthletes = normalizePositiveInteger(
    data.importSettings.roundPlanMaxExpectedAthletes,
    DEFAULT_IMPORT_SETTINGS.roundPlanMaxExpectedAthletes
  );
  data.importSettings.eventFormationSettings = normalizeEventFormationSettings(
    data.importSettings.eventFormationSettings
  );

  return data;
}

function normalizeEventFormationSettings(settings = {}) {
  const defaults = DEFAULT_IMPORT_SETTINGS.eventFormationSettings;
  const sourceSettings = settings || {};
  const normalized = {
    ...clone(defaults),
    ...sourceSettings,
  };

  normalized.enabled = normalized.enabled !== false;
  normalized.minParticipants = normalizePositiveInteger(
    normalized.minParticipants,
    defaults.minParticipants
  );

  if (!["suggest_merge", "auto_merge", "mark_only"].includes(normalized.underfilledAction)) {
    normalized.underfilledAction = defaults.underfilledAction;
  }
  if (![
    "race_together_rank_separately",
    "race_together_rank_together",
    "cancel_only",
  ].includes(normalized.raceMergeMode)) {
    normalized.raceMergeMode = defaults.raceMergeMode;
  }

  const validPriorityItems = new Set([
    "upper_division_same_event",
    "same_division_larger_event",
    "cancel",
  ]);
  const priority = Array.isArray(normalized.mergePriority)
    ? normalized.mergePriority.filter(
        (item, index, list) => validPriorityItems.has(item) && list.indexOf(item) === index
      )
    : [];
  defaults.mergePriority.forEach((item) => {
    if (!priority.includes(item)) {
      priority.push(item);
    }
  });
  normalized.mergePriority = priority.slice(0, defaults.mergePriority.length);

  normalized.groupOrder = Array.isArray(sourceSettings.groupOrder)
    ? sourceSettings.groupOrder.map(normalizeText).filter(Boolean)
    : parseTextList(sourceSettings.groupOrder);

  const importedGroupDefinitions = normalizeFormationGroupDefinitions(
    sourceSettings.importedGroupDefinitions ||
      sourceSettings.registrationGroupDefinitions ||
      sourceSettings.groupDefinitionsFromRegistration ||
      []
  );
  const hasImportedGroupDefinitions = importedGroupDefinitions.length > 0;
  const hasExplicitGroupDefinitions = Array.isArray(sourceSettings.groupDefinitions)
    ? sourceSettings.groupDefinitions.length > 0
    : Boolean(normalizeText(sourceSettings.groupDefinitions));
  const hasExplicitGroupChains = Array.isArray(sourceSettings.groupChains)
    ? sourceSettings.groupChains.length > 0
    : Boolean(normalizeText(sourceSettings.groupChains));
  normalized.groupChains = hasExplicitGroupChains
    ? normalizeFormationGroupChains(sourceSettings.groupChains)
    : [];
  normalized.importedGroupDefinitions = importedGroupDefinitions;
  normalized.groupDefinitions = hasImportedGroupDefinitions
    ? importedGroupDefinitions
    : hasExplicitGroupDefinitions
      ? normalizeFormationGroupDefinitions(sourceSettings.groupDefinitions)
      : hasExplicitGroupChains
        ? createFormationGroupDefinitionsFromChains(normalized.groupChains)
        : normalized.groupOrder.length
          ? createFormationGroupDefinitionsFromOrder(normalized.groupOrder)
          : [];
  normalized.groupDefinitionSource = hasImportedGroupDefinitions
    ? "registration_json"
    : hasExplicitGroupDefinitions
      ? "settings_groupDefinitions"
      : hasExplicitGroupChains
        ? "settings_groupChains"
        : normalized.groupOrder.length
          ? "settings_groupOrder"
          : "none";
  normalized.hasImportedGroupDefinitions = hasImportedGroupDefinitions;

  return normalized;
}

function normalizeFormationGroupDefinitions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seriesFallbackOrders = new Map();
  return value
    .map((definition, index) => {
      const name = normalizeText(definition?.name);
      const groupId = normalizeText(definition?.groupId || definition?.groupID || definition?.value);
      const series = normalizeText(definition?.series || definition?.seriesId) || "custom";
      const fallbackOrder = (seriesFallbackOrders.get(series) || 0) + 1;
      seriesFallbackOrders.set(series, fallbackOrder);
      const parsedOrder = Number(definition?.order);
      const order = Number.isFinite(parsedOrder) && parsedOrder > 0
        ? Math.floor(parsedOrder)
        : fallbackOrder;
      return {
        id: normalizeText(definition?.id) || `${series}-${order}-${index + 1}`,
        groupId,
        name,
        series,
        seriesName: normalizeText(definition?.seriesName || definition?.seriesLabel) || series,
        order,
        minAge: normalizeOptionalInteger(definition?.minAge),
        maxAge: normalizeOptionalInteger(definition?.maxAge),
        minBirthYear: normalizeOptionalInteger(definition?.minBirthYear),
        maxBirthYear: normalizeOptionalInteger(definition?.maxBirthYear),
      };
    })
    .filter((definition) => definition.name && definition.series)
    .filter((definition, index, list) => {
      const key = `${definition.series}|${definition.groupId || normalizeGroupNameForChain(definition.name)}`;
      return list.findIndex((item) => `${item.series}|${item.groupId || normalizeGroupNameForChain(item.name)}` === key) === index;
    });
}

function createFormationGroupDefinitionsFromChains(chains) {
  return normalizeFormationGroupChains(chains).flatMap((chain) =>
    (chain.groups || []).map((groupName, index) => ({
      id: `${chain.id || "chain"}-${index + 1}`,
      name: groupName,
      series: chain.id || "chain",
      seriesName: chain.name || chain.id || "组别链",
      order: index + 1,
      minAge: "",
      maxAge: "",
      minBirthYear: "",
      maxBirthYear: "",
    }))
  );
}

function createFormationGroupDefinitionsFromOrder(groupOrder) {
  return parseTextList(groupOrder).map((groupName, index) => ({
    id: `legacy-${index + 1}`,
    name: normalizeGroupNameForChain(groupName),
    series: "legacy",
    seriesName: "旧组别顺序",
    order: index + 1,
    minAge: "",
    maxAge: "",
    minBirthYear: "",
    maxBirthYear: "",
  }));
}

function createFormationGroupChainsFromDefinitions(definitions) {
  const seriesMap = new Map();
  normalizeFormationGroupDefinitions(definitions).forEach((definition) => {
    if (!seriesMap.has(definition.series)) {
      seriesMap.set(definition.series, {
        id: definition.series,
        name: definition.seriesName || definition.series,
        groups: [],
      });
    }
    const chain = seriesMap.get(definition.series);
    chain.groups.push({
      name: normalizeGroupNameForChain(definition.name),
      order: definition.order,
    });
  });

  return Array.from(seriesMap.values()).map((chain) => ({
    id: chain.id,
    name: chain.name,
    groups: chain.groups
      .sort((left, right) => left.order - right.order || compareRegistrationText(left.name, right.name))
      .map((group) => group.name),
  }));
}

function normalizeFormationGroupChains(value) {
  const sourceChains = typeof value === "string" ? parseFormationGroupChainsText(value) : value;
  if (!Array.isArray(sourceChains)) {
    return [];
  }

  return sourceChains
    .map((chain, index) => {
      const rawGroups = Array.isArray(chain?.groups) ? chain.groups : parseTextList(chain?.groups);
      const groups = rawGroups
        .map(normalizeGroupNameForChain)
        .filter(Boolean)
        .filter((groupName, groupIndex, list) => list.indexOf(groupName) === groupIndex);
      return {
        id: normalizeText(chain?.id) || `chain-${index + 1}`,
        name: normalizeText(chain?.name) || `组别链${index + 1}`,
        groups,
      };
    })
    .filter((chain) => chain.groups.length > 0);
}

function parseFormationGroupChainsText(value) {
  return String(value || "")
    .split(/\n+/)
    .map(normalizeText)
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/[:：]/);
      const hasName = parts.length > 1;
      const name = hasName ? normalizeText(parts.shift()) : `组别链${index + 1}`;
      const groupsText = hasName ? parts.join(":") : line;
      const groups = groupsText
        .split(/\s*(?:→|->|>|,|，|、)\s*/)
        .map(normalizeText)
        .filter(Boolean);
      return {
        id: `chain-${index + 1}`,
        name,
        groups,
      };
    });
}

function formatFormationGroupChainsText(chains) {
  const normalizedChains = normalizeFormationGroupChains(chains);
  return normalizedChains
    .map((chain) => `${chain.name || chain.id}：${(chain.groups || []).join(" → ")}`)
    .join("\n");
}

function parseTextList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }
  return String(value || "")
    .split(/[\n,，、]/)
    .map(normalizeText)
    .filter(Boolean);
}

function ensureRoundPlanRuleDefaults(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (!data.importSettings) {
    ensureImportSettingsDefaults(data);
  }

  if (!Array.isArray(data.importSettings.roundPlanRules) || !data.importSettings.roundPlanRules.length) {
    data.importSettings.roundPlanRules = clone(DEFAULT_ROUND_PLAN_RULES);
  }

  data.importSettings.roundPlanRules = data.importSettings.roundPlanRules.map((rule, ruleIndex) =>
    normalizeRoundPlanRule(rule, ruleIndex)
  );

  return data;
}

function normalizeRoundPlanRule(rule = {}, ruleIndex = 0) {
  const normalized = {
    id: normalizeText(rule.id) || createStableId("round-rule", `${rule.name || "rule"}-${ruleIndex}`),
    name: normalizeText(rule.name) || `赛制规则${ruleIndex + 1}`,
    minAthletes: normalizePositiveInteger(rule.minAthletes, 1),
    maxAthletes: normalizeRoundPlanMaxAthletes(rule.maxAthletes, 999),
    rounds: Array.isArray(rule.rounds) && rule.rounds.length ? rule.rounds : clone(DEFAULT_ROUND_PLAN_RULES[0].rounds),
  };

  if (normalized.maxAthletes !== "" && normalized.maxAthletes < normalized.minAthletes) {
    normalized.maxAthletes = normalized.minAthletes;
  }

  normalized.rounds = normalized.rounds.map((round, roundIndex) =>
    normalizeRoundPlanStep(round, roundIndex)
  );

  return normalized;
}

function normalizeRoundPlanStep(round = {}, roundIndex = 0) {
  const roundId = normalizeText(round.roundId) || DEFAULT_ROUND_OPTIONS[Math.min(roundIndex, DEFAULT_ROUND_OPTIONS.length - 1)]?.id || `round-${roundIndex + 1}`;
  return {
    roundId,
    roundName: normalizeText(round.roundName) || getRoundNameById(roundId) || `第${roundIndex + 1}轮`,
    source: normalizeRoundSource(round.source),
    maxAthletesPerGroup: normalizePositiveInteger(round.maxAthletesPerGroup, DEFAULT_AUTO_GROUP_SIZE),
    qualificationRule: normalizeQualificationRule(round.qualificationRule || {}),
  };
}

function normalizeRoundSource(value) {
  return value === "qualified" ? "qualified" : "registrations";
}

function normalizeRoundPlanMaxAthletes(value, fallback = 999) {
  if (value === "" || value == null) {
    return "";
  }
  return normalizePositiveInteger(value, fallback);
}

function isRoundPlanUnlimitedMax(value) {
  return value === "" || value == null;
}

function getRoundPlanRuleMaxForCompare(rule, maxExpectedAthletes = DEFAULT_ROUND_PLAN_MAX_EXPECTED_ATHLETES) {
  return isRoundPlanUnlimitedMax(rule?.maxAthletes)
    ? maxExpectedAthletes
    : normalizePositiveInteger(rule?.maxAthletes, maxExpectedAthletes);
}

function getRoundPlanRangeText(rule) {
  const min = normalizePositiveInteger(rule?.minAthletes, 1);
  return isRoundPlanUnlimitedMax(rule?.maxAthletes)
    ? `${min}人以上`
    : `${min}-${normalizePositiveInteger(rule?.maxAthletes, min)}人`;
}

function collectRoundPlanAthleteCountsFromSource(source, counts = []) {
  if (!source || typeof source !== "object") {
    return counts;
  }

  const collectCountFields = (item = {}) => {
    ["athletesCount", "participantCount", "participantsCount", "entriesCount", "count"].forEach((field) => {
      const value = Number(item[field]);
      if (Number.isFinite(value) && value > 0) {
        counts.push(value);
      }
    });
  };

  ["events", "registrationEvents", "scheduleItems"].forEach((field) => {
    if (Array.isArray(source[field])) {
      source[field].forEach(collectCountFields);
    }
  });

  if (Array.isArray(source.entries)) {
    const countByCompetition = new Map();
    source.entries.forEach((entry) => {
      const key =
        entry.eventKey ||
        entry.registrationEventKey ||
        entry.competitionKey ||
        [entry.groupKey || entry.groupId || entry.groupName, entry.eventId || entry.projectName || entry.eventName]
          .filter(Boolean)
          .join("|");
      if (!key) return;
      countByCompetition.set(key, (countByCompetition.get(key) || 0) + 1);
    });
    countByCompetition.forEach((count) => counts.push(count));
  }

  if (Array.isArray(source.days)) {
    source.days.forEach((day) => {
      (day.entries || []).forEach((entry) => {
        collectCountFields(entry);
        const groupAthleteCount = (entry.groups || []).reduce(
          (sum, group) => sum + (Array.isArray(group.athletes) ? group.athletes.length : 0),
          0
        );
        if (groupAthleteCount > 0) {
          counts.push(groupAthleteCount);
        }
      });
    });
  }

  return counts;
}

function getActualMaxAthletesForRoundPlan(data, importData = null) {
  const counts = [];
  collectRoundPlanAthleteCountsFromSource(importData, counts);
  (data?.events || []).forEach((event) => {
    collectRoundPlanAthleteCountsFromSource(event.registrationImport, counts);
    collectRoundPlanAthleteCountsFromSource(event.changeSourceImport, counts);
    collectRoundPlanAthleteCountsFromSource(event.bookData, counts);
    collectRoundPlanAthleteCountsFromSource(event, counts);
  });
  return counts.length ? Math.max(...counts) : 0;
}

function getRoundPlanValidationContext(data, options = {}) {
  const settings = ensureImportSettingsDefaults(data || {})?.importSettings || DEFAULT_IMPORT_SETTINGS;
  const optionActualMax = Number(options.actualMaxAthletes);
  const derivedActualMax = options.importData
    ? getActualMaxAthletesForRoundPlan(null, options.importData)
    : getActualMaxAthletesForRoundPlan(data, null);
  const expectedMax = normalizePositiveInteger(
    options.maxExpectedAthletes || settings.roundPlanMaxExpectedAthletes,
    DEFAULT_ROUND_PLAN_MAX_EXPECTED_ATHLETES
  );

  if (Number.isFinite(optionActualMax) && optionActualMax > 0) {
    return {
      hardCheckMaxAthletes: optionActualMax,
      actualMaxAthletes: optionActualMax,
      expectedMaxAthletes: expectedMax,
      basisType: "actual",
      basisLabel: options.basisLabel || `当前报名数据最大单项人数：${optionActualMax} 人`,
    };
  }

  if (derivedActualMax > 0) {
    return {
      hardCheckMaxAthletes: derivedActualMax,
      actualMaxAthletes: derivedActualMax,
      expectedMaxAthletes: expectedMax,
      basisType: "actual",
      basisLabel: `当前赛事最大单项人数：${derivedActualMax} 人`,
    };
  }

  return {
    hardCheckMaxAthletes: expectedMax,
    actualMaxAthletes: 0,
    expectedMaxAthletes: expectedMax,
    basisType: "expected",
    basisLabel: `尚未导入报名数据，使用预计最大单项人数：${expectedMax} 人`,
  };
}

function validateRoundPlanSettings(data, options = {}) {
  const workingData = clone(data || {});
  ensureImportSettingsDefaults(workingData);
  ensureRoundSettingsDefaults(workingData);
  ensureRoundPlanRuleDefaults(workingData);

  const context = getRoundPlanValidationContext(workingData, options);
  const hardCheckMaxAthletes = context.hardCheckMaxAthletes;
  const errors = [];
  const warnings = [];
  const infos = [];
  const roundOptions = workingData.roundSettings?.roundOptions || [];
  const roundOptionIds = new Set(roundOptions.map((option) => normalizeText(option.id)).filter(Boolean));
  const rules = workingData.importSettings?.roundPlanRules || [];

  const pushIssue = (severity, issue) => {
    const normalizedIssue = {
      code: issue.code || "round_plan_issue",
      message: issue.message || "赛制规则存在问题",
      ruleId: issue.ruleId || "",
      ruleName: issue.ruleName || "",
      path: issue.path || "",
      severity,
    };
    if (severity === "info") {
      infos.push(normalizedIssue);
    } else if (severity === "warning") {
      warnings.push(normalizedIssue);
    } else {
      errors.push(normalizedIssue);
    }
  };

  if (!rules.length) {
    pushIssue("error", {
      code: "round_plan_rules_empty",
      message: "人数触发规则不能为空。",
      path: "importSettings.roundPlanRules",
    });
  }

  const normalizedRanges = [];
  rules.forEach((rule, ruleIndex) => {
    const rulePath = `importSettings.roundPlanRules[${ruleIndex}]`;
    const min = Number(rule.minAthletes);
    const maxIsUnlimited = isRoundPlanUnlimitedMax(rule.maxAthletes);
    const max = maxIsUnlimited ? Number.POSITIVE_INFINITY : Number(rule.maxAthletes);
    const ruleLabel = rule.name || `赛制规则${ruleIndex + 1}`;

    if (!Number.isFinite(min) || min < 1) {
      pushIssue("error", {
        code: "round_plan_min_invalid",
        message: `规则“${ruleLabel}”的最少人数必须大于等于 1。`,
        ruleId: rule.id,
        ruleName: ruleLabel,
        path: `${rulePath}.minAthletes`,
      });
    }

    if (!maxIsUnlimited && (!Number.isFinite(max) || max < min)) {
      pushIssue("error", {
        code: "round_plan_max_invalid",
        message: `规则“${ruleLabel}”的最多人数必须大于等于最少人数。`,
        ruleId: rule.id,
        ruleName: ruleLabel,
        path: `${rulePath}.maxAthletes`,
      });
    }

    normalizedRanges.push({
      rule,
      ruleIndex,
      min: Number.isFinite(min) ? min : 1,
      max: Number.isFinite(max) || max === Number.POSITIVE_INFINITY ? max : hardCheckMaxAthletes,
      label: ruleLabel,
      path: rulePath,
    });

    const rounds = Array.isArray(rule.rounds) ? rule.rounds : [];
    if (!rounds.length) {
      pushIssue("error", {
        code: "round_plan_rounds_empty",
        message: `规则“${ruleLabel}”至少需要 1 个轮次。`,
        ruleId: rule.id,
        ruleName: ruleLabel,
        path: `${rulePath}.rounds`,
      });
      return;
    }

    const seenRoundIds = new Map();
    const seenRoundNames = new Map();
    rounds.forEach((round, roundIndex) => {
      const roundPath = `${rulePath}.rounds[${roundIndex}]`;
      const roundId = normalizeText(round.roundId);
      const roundName = normalizeText(round.roundName) || getRoundNameById(roundId, workingData.roundSettings);
      const isLastRound = roundIndex === rounds.length - 1;
      const nextRound = rounds[roundIndex + 1] || null;
      const nextRoundId = normalizeText(nextRound?.roundId);
      const qualificationRule = normalizeQualificationRule(round.qualificationRule || {});

      if (!roundId || !roundOptionIds.has(roundId)) {
        pushIssue("error", {
          code: "round_plan_round_id_missing",
          message: `规则“${ruleLabel}”第 ${roundIndex + 1} 轮引用了不存在的赛别。`,
          ruleId: rule.id,
          ruleName: ruleLabel,
          path: `${roundPath}.roundId`,
        });
      }

      if (roundId) {
        if (seenRoundIds.has(roundId)) {
          pushIssue("error", {
            code: "round_plan_duplicate_round_id",
            message: `规则“${ruleLabel}”中赛别“${roundName || roundId}”重复出现，晋级目标会产生歧义。`,
            ruleId: rule.id,
            ruleName: ruleLabel,
            path: `${roundPath}.roundId`,
          });
        } else {
          seenRoundIds.set(roundId, roundIndex);
        }
      }

      if (roundName) {
        if (seenRoundNames.has(roundName)) {
          pushIssue("warning", {
            code: "round_plan_duplicate_round_name",
            message: `规则“${ruleLabel}”中显示名称“${roundName}”重复，建议保持每轮名称清晰。`,
            ruleId: rule.id,
            ruleName: ruleLabel,
            path: `${roundPath}.roundName`,
          });
        } else {
          seenRoundNames.set(roundName, roundIndex);
        }
      }

      if (roundIndex === 0 && round.source !== "registrations") {
        pushIssue("error", {
          code: "round_plan_first_source_invalid",
          message: `规则“${ruleLabel}”第一轮必须使用报名名单，不能设置为上一轮晋级。`,
          ruleId: rule.id,
          ruleName: ruleLabel,
          path: `${roundPath}.source`,
        });
      }

      if (roundIndex > 0 && round.source !== "qualified") {
        pushIssue("error", {
          code: "round_plan_later_source_invalid",
          message: `规则“${ruleLabel}”第 ${roundIndex + 1} 轮应使用上一轮晋级名单。`,
          ruleId: rule.id,
          ruleName: ruleLabel,
          path: `${roundPath}.source`,
        });
      }

      if (isLastRound) {
        if (qualificationRule.mode !== "none") {
          pushIssue("error", {
            code: "round_plan_last_qualification_invalid",
            message: `规则“${ruleLabel}”最后一轮不应再设置晋级方式。`,
            ruleId: rule.id,
            ruleName: ruleLabel,
            path: `${roundPath}.qualificationRule.mode`,
          });
        }
        if (qualificationRule.targetRoundId) {
          pushIssue("error", {
            code: "round_plan_last_target_invalid",
            message: `规则“${ruleLabel}”最后一轮不能设置晋级目标。`,
            ruleId: rule.id,
            ruleName: ruleLabel,
            path: `${roundPath}.qualificationRule.targetRoundId`,
          });
        }
      } else if (qualificationRule.mode !== "none") {
        if (qualificationRule.targetRoundId !== nextRoundId) {
          pushIssue("error", {
            code: "round_plan_target_not_next",
            message: `规则“${ruleLabel}”第 ${roundIndex + 1} 轮的晋级目标必须是下一轮“${getRoundNameById(nextRoundId, workingData.roundSettings) || nextRound?.roundName || "下一轮"}”。`,
            ruleId: rule.id,
            ruleName: ruleLabel,
            path: `${roundPath}.qualificationRule.targetRoundId`,
          });
        }
      } else if (qualificationRule.targetRoundId) {
        pushIssue("error", {
          code: "round_plan_target_without_mode",
          message: `规则“${ruleLabel}”第 ${roundIndex + 1} 轮未启用晋级方式，不应设置晋级目标。`,
          ruleId: rule.id,
          ruleName: ruleLabel,
          path: `${roundPath}.qualificationRule.targetRoundId`,
        });
      }
    });
  });

  normalizedRanges.forEach((left, leftIndex) => {
    normalizedRanges.slice(leftIndex + 1).forEach((right) => {
      const overlapStart = Math.max(left.min, right.min);
      const overlapEnd = Math.min(left.max, right.max);
      if (overlapStart <= overlapEnd) {
        const overlapText = Number.isFinite(overlapEnd)
          ? `${overlapStart}-${overlapEnd} 人`
          : `${overlapStart} 人以上`;
        pushIssue("error", {
          code: "round_plan_range_overlap",
          message: `人数规则存在重叠：${getRoundPlanRangeText(left.rule)} 与 ${getRoundPlanRangeText(right.rule)} 同时覆盖 ${overlapText}。`,
          ruleId: left.rule.id,
          ruleName: left.label,
          path: left.path,
        });
      }
    });
  });

  for (let count = 1; count <= hardCheckMaxAthletes; count += 1) {
    const matches = normalizedRanges.filter((item) => count >= item.min && count <= item.max);
    if (!matches.length) {
      pushIssue("error", {
        code: "round_plan_range_gap",
        message: `人数规则存在断档：${count} 人未匹配到任何赛制规则。`,
        path: "importSettings.roundPlanRules",
      });
      break;
    }
  }

  if (!normalizedRanges.some((item) => item.max >= hardCheckMaxAthletes || isRoundPlanUnlimitedMax(item.rule.maxAthletes))) {
    pushIssue("error", {
      code: "round_plan_no_large_count_rule",
      message: `人数规则未覆盖当前校验上限 ${hardCheckMaxAthletes} 人，请补充规则或降低预计最大单项人数。`,
      path: "importSettings.roundPlanRules",
    });
  }

  if (
    hardCheckMaxAthletes < ROUND_PLAN_PRESSURE_TEST_ATHLETES &&
    !normalizedRanges.some((item) => item.max >= ROUND_PLAN_PRESSURE_TEST_ATHLETES || isRoundPlanUnlimitedMax(item.rule.maxAthletes))
  ) {
    pushIssue("info", {
      code: "round_plan_pressure_count_unmatched",
      message: `${ROUND_PLAN_PRESSURE_TEST_ATHLETES} 人超出当前校验范围，仅作压力测试，不影响导入或赛前重算。`,
      path: "importSettings.roundPlanRules",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    context,
  };
}

function ensureEventDisplayDefaults(data) {
  if (!data || !Array.isArray(data.events)) {
    return data;
  }

  data.events.forEach((event) => {
    if (event.showAfterFinished == null) {
      event.showAfterFinished = true;
    }
  });

  return data;
}

function shouldShowEventOnHome(event) {
  if (!event) {
    return false;
  }

  if (event.status === "已结束") {
    return event.showAfterFinished !== false;
  }

  return true;
}

function ensureEventScopedRegistrationImportDefaults(data) {
  if (!data || !Array.isArray(data.events)) {
    return data;
  }

  const legacyImport = data.registrationImport || data.lastRegistrationImport || null;
  if (legacyImport?.targetEventId) {
    const targetEvent = data.events.find((event) => event.id === legacyImport.targetEventId) || null;
    if (targetEvent && !targetEvent.registrationImport) {
      targetEvent.registrationImport = normalizeEventRegistrationImport(targetEvent, legacyImport);
    }
  }

  const legacyBookData = data.bookData || legacyImport?.bookData || null;
  if (legacyBookData?.eventId) {
    const targetEvent = data.events.find((event) => event.id === legacyBookData.eventId) || null;
    if (targetEvent && !targetEvent.bookData) {
      targetEvent.bookData = clone(legacyBookData);
    }
  }

  data.events.forEach((event) => {
    if (event.registrationImport) {
      event.registrationImport = normalizeEventRegistrationImport(event, event.registrationImport);
      if (!event.bookData && event.registrationImport.bookData) {
        event.bookData = clone(event.registrationImport.bookData);
      }
      if (!event.organizationRanges && event.registrationImport.organizationRanges) {
        event.organizationRanges = clone(event.registrationImport.organizationRanges);
      }
    }
  });

  return data;
}

function normalizeEventRegistrationImport(event, importData) {
  const normalized = clone(importData);
  normalized.targetEventId = event.id;
  normalized.targetEventName = event.name || normalized.targetEventName || "";
  normalized.registrationEvents = normalized.registrationEvents || normalized.events || [];
  if (normalized.bookData) {
    normalized.bookData.eventId = event.id;
    normalized.bookData.eventName = event.name || normalized.bookData.eventName || "";
  }
  return normalized;
}

function getEventRegistrationImport(event) {
  if (!event) {
    return null;
  }

  if (event.registrationImport) {
    return event.registrationImport;
  }

  return null;
}

function ensureScheduleStatusDefaults(data) {
  data.events?.forEach((event) => {
    event.days?.forEach((day) => {
      day.entries?.forEach((entry) => {
        if (!entry.scheduleStatus || entry.scheduleStatus === "待排组") {
          entry.scheduleStatus = getDefaultScheduleStatus(entry);
        }
      });
    });
  });

  return data;
}

function ensureQualificationRuleDefaults(data) {
  data.events?.forEach((event) => {
    event.days?.forEach((day) => {
      day.entries?.forEach((entry) => {
        const legacyMode = entry.qualificationMode || "manual";
        const legacyTopN = normalizePositiveInteger(entry.qualificationTopN, 1);
        const legacyTargetEntryId = entry.qualificationTargetEntryId || "";
        const legacyTargetGroupMode = entry.qualificationTargetGroupMode || "same_group_index";
        const existingRule = entry.qualificationRule || {};
        const mode = normalizeQualificationMode(existingRule.mode || legacyMode);

        entry.qualificationRule = normalizeQualificationRule({
          ...existingRule,
          mode,
          topNPerGroup: existingRule.topNPerGroup ?? legacyTopN,
          fastestRemainderCount: existingRule.fastestRemainderCount ?? 0,
          targetEntryId: existingRule.targetEntryId || legacyTargetEntryId,
          targetGroupMode: existingRule.targetGroupMode || legacyTargetGroupMode,
        });

        entry.qualificationMode = entry.qualificationRule.mode === "none" ? "manual" : entry.qualificationRule.mode;
        entry.qualificationTopN = entry.qualificationRule.topNPerGroup;
        entry.qualificationTargetEntryId = entry.qualificationRule.targetEntryId;
        entry.qualificationTargetGroupMode = entry.qualificationRule.targetGroupMode;
        if (!entry.qualification || entry.qualification === "待定") {
          entry.qualification = formatQualificationRuleText(entry.qualificationRule, entry.targetRoundName || "");
        }
      });
    });
  });

  return data;
}

function ensureEntryRoundDefaults(data) {
  data.events?.forEach((event) => {
    event.days?.forEach((day) => {
      day.entries?.forEach((entry, entryIndex) => ensureEntryRoundDefaultsForEntry(entry, entryIndex));
    });
  });
  return data;
}

function ensureEntryRoundDefaultsForEntry(entry, entryIndex = 0) {
  if (!entry || entry.type === "break") {
    return entry;
  }

  const legacyRound = normalizeText(entry.round);
  let roundName = normalizeText(entry.roundName);
  if (!roundName) {
    roundName = legacyRound && legacyRound !== "自动分组" && legacyRound !== "报名名单"
      ? legacyRound
      : getDefaultFinalRoundName();
  }

  entry.roundName = roundName;
  entry.roundId = normalizeText(entry.roundId) || getRoundIdByName(roundName) || createStableId("round", roundName);
  entry.roundOrder = normalizePositiveInteger(entry.roundOrder, entryIndex + 1);
  entry.roundSource = normalizeText(entry.roundSource) || (entry.sourceEntryId ? "qualified" : entry.source === REGISTRATION_SOURCE_LABEL ? "registrations" : "manual");
  entry.round = entry.roundName;
  entry.competitionKey = normalizeText(entry.competitionKey) || createEntryCompetitionKey(entry);
  entry.sourceEntryId = normalizeText(entry.sourceEntryId);
  entry.targetEntryId = normalizeText(entry.targetEntryId || entry.qualificationRule?.targetEntryId);
  return entry;
}

function getDefaultScheduleStatus(entry) {
  if (entry?.type === "break") {
    return "手动录入";
  }
  const athletes = (entry?.groups || []).flatMap((group) => group.athletes || []);
  if (athletes.length && athletes.every((athlete) => isValidRaceResult(athlete.result))) {
    return "已出成绩";
  }
  if (entry?.sourceEntryId && !athletes.length) {
    return "待晋级";
  }
  if (athletes.length) {
    return "已排组";
  }
  if (entry?.source === REGISTRATION_SOURCE_LABEL) {
    return entry.groups?.length ? "已排组" : "待排组";
  }
  return "手动录入";
}

function normalizeQualificationRule(rule = {}) {
  const mode = normalizeQualificationMode(rule.mode);
  return {
    mode,
    topNPerGroup: normalizePositiveInteger(rule.topNPerGroup, 1),
    fastestRemainderCount: normalizeNonNegativeInteger(rule.fastestRemainderCount, 0),
    targetEntryId: normalizeText(rule.targetEntryId),
    targetRoundId: normalizeText(rule.targetRoundId),
    targetGroupMode: normalizeQualificationTargetGroupMode(rule.targetGroupMode),
  };
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function normalizeOptionalInteger(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.floor(parsed) : "";
}

function normalizeQualificationMode(value) {
  if (value === "top_n_each_group") {
    return "top_n";
  }
  if (["none", "top_n", "top_n_plus_fastest"].includes(value)) {
    return value;
  }
  return "none";
}

function normalizeQualificationTargetGroupMode(value) {
  if (value === "append_in_order") {
    return "balanced";
  }
  if (["same_group_index", "balanced", "manual"].includes(value)) {
    return value;
  }
  return "same_group_index";
}

function sanitizeProjectName(value) {
  return normalizeText(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[％%￥¥/／\\]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDefaultFinalRoundName() {
  return state?.data?.roundSettings?.defaultFinalRoundName || DEFAULT_ROUND_SETTINGS.defaultFinalRoundName;
}

function getRoundNameById(roundId, roundSettings = state?.data?.roundSettings) {
  const id = normalizeText(roundId);
  const option = roundSettings?.roundOptions?.find((item) => item.id === id);
  return option?.name || DEFAULT_ROUND_OPTIONS.find((item) => item.id === id)?.name || "";
}

function getRoundIdByName(roundName, roundSettings = state?.data?.roundSettings) {
  const name = normalizeText(roundName);
  const option = roundSettings?.roundOptions?.find((item) => item.name === name);
  return option?.id || DEFAULT_ROUND_OPTIONS.find((item) => item.name === name)?.id || "";
}

function createEntryCompetitionKey(entry) {
  return [
    normalizeText(entry.registrationEventKey),
    normalizeText(entry.registrationGroupKey),
    normalizeText(entry.groupId || entry.registrationGroupId),
    normalizeText(entry.division || entry.groupName),
    normalizeText(entry.gender),
    sanitizeProjectName(entry.projectName || entry.name),
  ]
    .filter(Boolean)
    .join("::");
}

function formatQualificationRuleText(rule = {}, targetRoundName = "") {
  const normalized = normalizeQualificationRule(rule);
  if (normalized.mode === "none") {
    return "无晋级";
  }

  const targetText = targetRoundName ? `进入${targetRoundName}` : "晋级";
  if (normalized.mode === "top_n") {
    return `每组前${normalized.topNPerGroup}名${targetText}`;
  }

  if (normalized.mode === "top_n_plus_fastest") {
    const fastestText = normalized.fastestRemainderCount > 0
      ? ` + 剩余最快${normalized.fastestRemainderCount}名`
      : "";
    return `每组前${normalized.topNPerGroup}名${fastestText}${targetText}`;
  }

  return "无晋级";
}

function getEntryRoundName(entry) {
  const legacyRound = normalizeText(entry?.round);
  return entry?.roundName || (legacyRound && !["自动分组", "报名名单"].includes(legacyRound) ? legacyRound : getDefaultFinalRoundName());
}

function getPromotionAthleteKey(athlete) {
  const bib = normalizeText(athlete?.bibNo || athlete?.bib);
  const name = normalizeText(athlete?.name);
  return bib || name ? `${bib}::${name}` : "";
}

function downloadTextFile(content, filename, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], {
    type,
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadJsonFile(data, filename) {
  downloadTextFile(JSON.stringify(data, null, 2), filename, "application/json;charset=utf-8");
}

function normalizeRegistrationList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item));
  }

  if (value == null || value === "") {
    return [];
  }

  return String(value)
    .split(/[,，、]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeRegistrationGenderLabel(registration) {
  const genderLabel = normalizeText(registration.genderLabel);
  if (genderLabel) {
    return genderLabel;
  }

  const gender = normalizeText(registration.gender).toLowerCase();
  if (gender === "male" || gender === "m") return "男";
  if (gender === "female" || gender === "f") return "女";
  return normalizeText(registration.gender);
}

function createRegistrationGroupKey(registration) {
  const groupId = normalizeText(registration.groupId);
  const groupName = normalizeText(registration.groupName);
  const gender = normalizeRegistrationGenderLabel(registration) || normalizeText(registration.gender) || "未填性别";

  if (groupId) {
    return `${groupId}::${gender}`;
  }

  return `group-${hashString(`${groupName}|${gender}`)}::${gender}`;
}

function createRegistrationEventKey(groupKey, eventId) {
  return `${groupKey}::${eventId}`;
}

function getRegistrationRecordLabel(registration, index) {
  const registrationNo = normalizeText(registration?.registrationNo);
  return registrationNo ? `报名号 ${registrationNo}` : `第 ${index + 1} 条报名`;
}

function normalizeText(value) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function normalizeGroupNameForChain(groupName) {
  return normalizeText(groupName)
    .normalize("NFKC")
    .replace(/[（(]\s*(男|女|男子|女子)\s*[）)]/g, "")
    .replace(/\s*(男|女|男子|女子)组?$/g, "")
    .replace(/[\s·・•]+/g, "")
    .replace(/[|｜]+/g, "")
    .trim();
}

function formatGroupNameForDisplay(groupName) {
  return normalizeText(groupName)
    .normalize("NFKC")
    .replace(/[（(]\s*(男|女|男子|女子)\s*[）)]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatEntryDisplayTitle(entry = {}) {
  return [
    formatGroupNameForDisplay(entry.division || entry.groupName),
    entry.gender,
    entry.projectName || entry.name,
    getEntryRoundName(entry),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" · ");
}

function normalizeProjectNameForMerge(projectName) {
  return normalizeText(projectName)
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[%％¥￥$＄#＃@＠!！。；;:：,，、]+$/g, "")
    .trim();
}

function normalizeMergeType(value) {
  const type = normalizeText(value);
  if (type === "merge_target") return "target_original";
  if (type === "merged_source") return "merged_from_underfilled";
  if ([
    "target_original",
    "merged_from_underfilled",
    "overlap_source_and_target",
    "standalone",
  ].includes(type)) {
    return type;
  }
  return "";
}

function getMergeTypeLabel(value) {
  const type = normalizeMergeType(value);
  if (type === "merged_from_underfilled") return "合并进入";
  if (type === "overlap_source_and_target") return "重复报名，已去重";
  return "";
}

function createMergeNote(entry = {}) {
  const type = normalizeMergeType(entry.mergeType);
  if (!type || type === "standalone" || type === "target_original") {
    return "";
  }

  const originalCompetitions = Array.isArray(entry.originalCompetitions) ? entry.originalCompetitions : [];
  const original = type === "overlap_source_and_target" && originalCompetitions.length > 1
    ? [
        `原报名：${originalCompetitions
          .map((item) => [item.groupName, item.projectName].filter(Boolean).join(" / "))
          .filter(Boolean)
          .join("、")}`,
      ]
    : [
        entry.originalGroupName ? `原组别：${entry.originalGroupName}` : "",
        entry.originalProjectName ? `原项目：${entry.originalProjectName}` : "",
      ].filter(Boolean);
  const target = [entry.mergedIntoGroupName, entry.mergedIntoProjectName].filter(Boolean).join(" ");
  const targetText = target ? `合并到：${target}` : "";
  return [...original, targetText].filter(Boolean).join("；");
}

function getMergeTooltip(entry = {}) {
  const type = normalizeMergeType(entry.mergeType);
  if (type === "merged_from_underfilled") {
    return "该运动员来自人数不足项目，已合并到本项目比赛，成绩按原组别/原项目分别排名。";
  }
  if (type === "overlap_source_and_target") {
    return "该运动员同时报名原项目和目标项目，合并名单中已去重，成绩按原组别/原项目分别排名。";
  }
  return "";
}

function compareRegistrationText(left, right) {
  return registrationCollator.compare(normalizeText(left), normalizeText(right));
}

function formatBibNo(value, digits = DEFAULT_BIB_DIGITS) {
  return String(value).padStart(digits, "0");
}

function createStableId(prefix, value) {
  return `${prefix}-${hashString(value)}`;
}

function hashString(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function maskCertificateNumber(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  if (text.length <= 8) {
    return `${text.slice(0, 2)}****${text.slice(-2)}`;
  }

  return `${text.slice(0, 6)}********${text.slice(-4)}`;
}

function formatDateOnly(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return `${date.toLocaleDateString("zh-CN")} ${date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatDateForFilename(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown-date";
  }

  return date.toISOString().slice(0, 10);
}

// 手动发布：把当前本地 state.data 整份推送到 Supabase 正式数据表。

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
    if (current[keys[index]] === undefined || current[keys[index]] === null) {
      current[keys[index]] = /^\d+$/.test(keys[index + 1]) ? [] : {};
    }
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
