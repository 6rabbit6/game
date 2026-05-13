// 成绩解析与排名计算。
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

  const minutesQuoteMatch = normalized.match(/^(\d+)'(\d{1,2})''(\d+)$/);
  if (minutesQuoteMatch) {
    const [, minutesText, secondsText, fractionText] = minutesQuoteMatch;
    return Number(minutesText) * 60 + Number(`${secondsText}.${fractionText}`);
  }

  const secondsQuoteMatch = normalized.match(/^(\d+)''(\d+)$/);
  if (secondsQuoteMatch) {
    const [, secondsText, fractionText] = secondsQuoteMatch;
    return Number(`${secondsText}.${fractionText}`);
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
    athlete.originalRank = "";
    athlete.mergedOverallRank = "";
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

function recalculateEntryRanks(entry) {
  if (!entry?.groups?.length) {
    return;
  }

  if (entry.isMergedRace && getEntryRaceMergeMode(entry) === "race_together_rank_separately") {
    recalculateMergedEntrySeparateRanks(entry);
    updateEntryResultStatus(entry);
    return;
  }

  if (entry.isMergedRace && getEntryRaceMergeMode(entry) === "race_together_rank_together") {
    recalculateMergedEntryTogetherRanks(entry);
    updateEntryResultStatus(entry);
    return;
  }

  recalculateEntryOverallRanks(entry, { writeMergedOverallRank: false });
  updateEntryResultStatus(entry);
}

function recalculateMergedEntrySeparateRanks(entry) {
  const athletesWithTime = collectRankableEntryAthletes(entry);

  const byCompetition = new Map();
  athletesWithTime.forEach((item) => {
    if (!byCompetition.has(item.competitionKey)) {
      byCompetition.set(item.competitionKey, []);
    }
    byCompetition.get(item.competitionKey).push(item);
  });

  byCompetition.forEach((items) => {
    assignRankValues(items, "originalRank");
  });
  assignRankValues(athletesWithTime, "mergedOverallRank");
  athletesWithTime.forEach((item) => {
    item.athlete.rank = item.athlete.originalRank || "";
  });
}

function recalculateMergedEntryTogetherRanks(entry) {
  recalculateEntryOverallRanks(entry, { writeMergedOverallRank: true });
}

function recalculateEntryOverallRanks(entry, options = {}) {
  const athletesWithTime = collectRankableEntryAthletes(entry);
  assignRankValues(athletesWithTime, "rank");
  if (options.writeMergedOverallRank) {
    assignRankValues(athletesWithTime, "mergedOverallRank");
  }
}

function collectRankableEntryAthletes(entry) {
  const athletes = (entry.groups || []).flatMap((group) => group.athletes || []);
  athletes.forEach((athlete) => {
    athlete.rank = "";
    athlete.originalRank = "";
    athlete.mergedOverallRank = "";
  });

  return athletes
    .map((athlete, index) => ({
      athlete,
      index,
      timeValue: parseCompetitionTime(athlete.result),
      competitionKey: getAthleteOriginalCompetitionKey(athlete, entry),
    }))
    .filter((item) => item.timeValue != null);
}

function getAthleteOriginalCompetitionKey(athlete, entry) {
  return (
    athlete.originalCompetitionKey ||
    [athlete.originalGroupName, athlete.originalProjectName, athlete.originalGender].filter(Boolean).join("|") ||
    athlete.groupId ||
    athlete.groupName ||
    entry.competitionKey ||
    entry.registrationEventKey ||
    "merged"
  );
}

function assignRankValues(items, fieldName) {
  const sorted = items.slice().sort((left, right) => left.timeValue - right.timeValue || left.index - right.index);
  let previousTime = null;
  let previousRank = 0;
  sorted.forEach((item, index) => {
    const currentRank =
      previousTime != null && Math.abs(item.timeValue - previousTime) < 1e-9 ? previousRank : index + 1;
    item.athlete[fieldName] = String(currentRank);
    previousTime = item.timeValue;
    previousRank = currentRank;
  });
}

function recalculateAllGroupRanks(data) {
  data.events?.forEach((event) => {
    event.days?.forEach((day) => {
      day.entries?.forEach((entry) => {
        recalculateEntryRanks(entry);
        updateEntryResultStatus(entry);
      });
    });
  });
}

function getEntryRaceMergeMode(entry = {}) {
  if (entry.raceMergeMode === "race_together_rank_together") {
    return "race_together_rank_together";
  }
  return "race_together_rank_separately";
}

function getEntryRankDisplayMode(entry = {}) {
  const configuredMode = entry.rankDisplayMode || "auto";
  if (configuredMode !== "auto") {
    return configuredMode;
  }
  if (!entry.isMergedRace) {
    return "overall_only";
  }
  if (getEntryRaceMergeMode(entry) === "race_together_rank_together") {
    return "overall_only";
  }
  return "both";
}

function getAthleteRankForEntry(entry, athlete, fieldName = "") {
  if (!athlete) {
    return "";
  }
  if (fieldName === "mergedOverallRank") {
    return athlete.mergedOverallRank || athlete.rank || "";
  }
  if (fieldName === "originalRank") {
    return athlete.originalRank || athlete.rank || "";
  }
  return athlete.rank || athlete.mergedOverallRank || athlete.originalRank || "";
}

function getEntryMergeRankingNotice(entry = {}) {
  if (!entry.isMergedRace) {
    return "";
  }
  if (getEntryRaceMergeMode(entry) === "race_together_rank_together") {
    return "本项目为合并比赛：当前按本场所有运动员统一排名。";
  }
  return "本项目为合并比赛：当前按原组别/原项目分别排名，名次列显示各自小项名次。";
}

function isValidRaceResult(result) {
  const text = normalizeText(result).toUpperCase();
  if (!text || ["DQ", "DNF", "DNS", "犯规", "弃权", "未出发"].includes(text)) {
    return false;
  }
  return parseCompetitionTime(text) != null;
}

function updateEntryResultStatus(entry) {
  if (!entry || entry.type === "break") {
    return entry;
  }

  const athletes = (entry.groups || []).flatMap((group) => group.athletes || []);
  if (athletes.length && athletes.every((athlete) => isValidRaceResult(athlete.result))) {
    entry.scheduleStatus = "已出成绩";
    return entry;
  }

  if (!entry.scheduleStatus || entry.scheduleStatus === "已出成绩") {
    entry.scheduleStatus = getDefaultScheduleStatus(entry);
  }
  return entry;
}

function getEntryDisplayScheduleStatus(entry) {
  if (!entry || entry.type === "break") {
    return "手动录入";
  }
  const athletes = (entry.groups || []).flatMap((group) => group.athletes || []);
  if (athletes.length && athletes.every((athlete) => isValidRaceResult(athlete.result))) {
    return "已出成绩";
  }
  return entry.scheduleStatus === "已出成绩"
    ? getDefaultScheduleStatus(entry)
    : entry.scheduleStatus || getDefaultScheduleStatus(entry);
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

function collectAllAthleteResultRows(data, eventId = "") {
  const rows = [];
  (data.events || []).forEach((event) => {
    if (eventId && event.id !== eventId) {
      return;
    }
    (event.days || []).forEach((day) => {
      (day.entries || []).forEach((entry) => {
        if (entry.type === "break") {
          return;
        }
        (entry.groups || []).forEach((group, groupIndex) => {
          (group.athletes || []).forEach((athlete) => {
            rows.push({
              eventId: event.id,
              eventName: event.name || "",
              dayLabel: day.label || "",
              bib: athlete.bibNo || athlete.bib || "",
              name: athlete.name || "",
              team: athlete.organization || athlete.team || "",
              groupName: entry.division || entry.groupName || "",
              projectName: entry.projectName || entry.name || "",
              round: getEntryRoundName(entry),
              raceGroupName: group.name || `第${groupIndex + 1}组`,
              lane: athlete.lane || "",
              result: athlete.result || "",
              rank: getAthleteRankForEntry(entry, athlete),
              originalRank: athlete.originalRank || "",
              originalGroupName: athlete.originalGroupName || "",
              originalProjectName: athlete.originalProjectName || "",
              mergedRaceName: entry.isMergedRace ? `${entry.division || entry.groupName || ""} ${entry.projectName || entry.name || ""}`.trim() : "",
              mergedOverallRank: athlete.mergedOverallRank || "",
              isMergedRace: Boolean(entry.isMergedRace),
              note: athlete.note || "",
              scheduleStatus: getEntryDisplayScheduleStatus(entry),
            });
          });
        });
      });
    });
  });
  return rows;
}

function searchAthleteResults(keyword, options = {}) {
  const rows = collectAllAthleteResultRows(state.data, options.eventId || "");
  const query = normalizeText(keyword).toLowerCase();
  const projectName = normalizeText(options.projectName).toLowerCase();

  return rows.filter((row) => {
    const matchesKeyword =
      !query ||
      [row.bib, row.name, row.team, row.projectName]
        .map((value) => normalizeText(value).toLowerCase())
        .some((value) => value.includes(query));
    const matchesProject =
      !projectName || normalizeText(row.projectName).toLowerCase().includes(projectName);
    return matchesKeyword && matchesProject;
  });
}

function clearQualificationNotes(entry) {
  (entry?.groups || []).forEach((group) => {
    (group.athletes || []).forEach((athlete) => {
      if (athlete.note === "Q" || athlete.note === "q") {
        athlete.note = "";
      }
    });
  });
}

function calculateQualifiedAthletes(entry) {
  const rule = entry?.qualificationRule || {};
  const mode = rule.mode || "none";
  if (!entry || mode === "none") {
    return { direct: [], fastest: [], all: [] };
  }

  const topN = normalizePositiveInteger(rule.topNPerGroup, 1);
  const fastestCount = mode === "top_n_plus_fastest"
    ? normalizeNonNegativeInteger(rule.fastestRemainderCount, 0)
    : 0;
  const direct = [];
  const remainder = [];

  recalculateEntryRanks(entry);

  (entry.groups || []).forEach((group, sourceGroupIndex) => {
    const validAthletes = (group.athletes || [])
      .map((athlete, sourceAthleteIndex) => ({
        athlete,
        sourceGroupIndex,
        sourceGroupName: group.name || `第${sourceGroupIndex + 1}组`,
        sourceAthleteIndex,
        timeValue: parseCompetitionTime(athlete.result),
      }))
      .filter((item) => Number.isFinite(item.timeValue))
      .sort((left, right) => left.timeValue - right.timeValue || left.sourceAthleteIndex - right.sourceAthleteIndex);

    let previousTime = null;
    let previousRank = 0;
    validAthletes.forEach((item, index) => {
      const currentRank =
        previousTime != null && Math.abs(item.timeValue - previousTime) < 1e-9 ? previousRank : index + 1;
      item.rankValue = currentRank;
      previousTime = item.timeValue;
      previousRank = currentRank;
    });

    validAthletes.forEach((item) => {
      if (Number.isFinite(item.rankValue) && item.rankValue >= 1 && item.rankValue <= topN) {
        direct.push({
          ...item,
          qualificationMark: "Q",
        });
      } else {
        remainder.push(item);
      }
    });
  });

  const directKeys = new Set(direct.map((item) => getPromotionAthleteKey(item.athlete)));
  const fastest = remainder
    .filter((item) => {
      const key = getPromotionAthleteKey(item.athlete);
      return !key || !directKeys.has(key);
    })
    .sort((left, right) => left.timeValue - right.timeValue || left.sourceGroupIndex - right.sourceGroupIndex)
    .slice(0, fastestCount)
    .map((item) => ({
      ...item,
      qualificationMark: "q",
    }));

  return {
    direct,
    fastest,
    all: [...direct, ...fastest],
  };
}

function applyQualificationToTargetEntry(sourceEntry, targetEntry) {
  const calculated = calculateQualifiedAthletes(sourceEntry);
  const qualified = calculated.all;
  const rule = sourceEntry.qualificationRule || {};
  const targetGroupMode = rule.targetGroupMode || "same_group_index";

  clearQualificationNotes(sourceEntry);
  qualified.forEach((item) => {
    item.athlete.note = item.qualificationMark;
  });

  if (!targetEntry.groups) {
    targetEntry.groups = [];
  }
  targetEntry.groups.forEach((group) => {
    group.athletes = [];
  });

  if (targetGroupMode === "balanced") {
    const maxSize =
      targetEntry.maxAthletesPerGroup ||
      state?.data?.importSettings?.maxAthletesPerGroup ||
      DEFAULT_AUTO_GROUP_SIZE;
    const chunks = splitAthletesIntoBalancedGroups(qualified, maxSize);
    targetEntry.groups = chunks.map((chunk, groupIndex) =>
      assignLanesInGroup({
        id: targetEntry.groups?.[groupIndex]?.id || uid("group"),
        name: createRaceGroupName(groupIndex),
        summary: `${targetEntry.division || ""}${targetEntry.gender || ""}${targetEntry.projectName || ""} ${getEntryRoundName(targetEntry)} ${createRaceGroupName(groupIndex)}`.trim(),
        athletes: chunk.map((item) => createQualifiedAthlete(item, sourceEntry)),
      })
    );
  } else {
    qualified.forEach((item, index) => {
      let targetGroup = null;
      if (targetGroupMode === "same_group_index") {
        targetGroup = targetEntry.groups[item.sourceGroupIndex] || null;
        while (!targetGroup && targetEntry.groups.length <= item.sourceGroupIndex) {
          targetEntry.groups.push({
            id: uid("group"),
            name: createRaceGroupName(targetEntry.groups.length),
            summary: `${targetEntry.division || ""}${targetEntry.gender || ""}${targetEntry.projectName || ""} ${getEntryRoundName(targetEntry)} ${createRaceGroupName(targetEntry.groups.length)}`.trim(),
            athletes: [],
          });
          targetGroup = targetEntry.groups[item.sourceGroupIndex] || null;
        }
      }
      if (!targetGroup) {
        targetGroup = targetEntry.groups[index % Math.max(1, targetEntry.groups.length)] || null;
      }
      if (!targetGroup) {
        targetGroup = {
          id: uid("group"),
          name: createRaceGroupName(0),
          summary: `${targetEntry.division || ""}${targetEntry.gender || ""}${targetEntry.projectName || ""} ${getEntryRoundName(targetEntry)} 第1组`.trim(),
          athletes: [],
        };
        targetEntry.groups.push(targetGroup);
      }
      targetGroup.athletes.push(createQualifiedAthlete(item, sourceEntry));
    });
    targetEntry.groups.forEach(assignLanesInGroup);
  }

  targetEntry.groups = (targetEntry.groups || []).filter((group) => group.athletes?.length);
  targetEntry.participantCount = String(qualified.length);
  targetEntry.groupCount = String(targetEntry.groups.length);
  targetEntry.scheduleStatus = targetEntry.groups.length ? "已排组" : "待晋级";
  targetEntry.status = targetEntry.scheduleStatus;
  targetEntry.note = targetEntry.groups.length
    ? `来源：${getEntryRoundName(sourceEntry)}晋级`
    : targetEntry.note;
  updateEntryResultStatus(sourceEntry);
  updateEntryResultStatus(targetEntry);

  return {
    directCount: calculated.direct.length,
    fastestCount: calculated.fastest.length,
    totalCount: qualified.length,
  };
}

function createQualifiedAthlete(item, sourceEntry) {
  const athlete = item.athlete || {};
  return {
    rank: "",
    lane: "",
    bib: athlete.bibNo || athlete.bib || "",
    bibNo: athlete.bibNo || athlete.bib || "",
    name: athlete.name || "",
    team: athlete.organization || athlete.team || "",
    organization: athlete.organization || athlete.team || "",
    result: "",
    note: "",
    athleteId: athlete.athleteId || "",
    registrationNo: athlete.registrationNo || "",
    sourceQualificationEntryId: sourceEntry?.id || "",
    sourceRoundName: getEntryRoundName(sourceEntry),
    sourceGroupName: item.sourceGroupName || "",
    sourceRank: athlete.rank || "",
    sourceResult: athlete.result || "",
    qualificationType: item.qualificationMark || "",
    originalCompetitionKey: athlete.originalCompetitionKey || "",
    originalGroupName: athlete.originalGroupName || "",
    originalProjectName: athlete.originalProjectName || "",
    originalGender: athlete.originalGender || "",
    mergedIntoCompetitionKey: athlete.mergedIntoCompetitionKey || "",
    mergedIntoGroupName: athlete.mergedIntoGroupName || "",
    mergedIntoProjectName: athlete.mergedIntoProjectName || "",
    mergeType: normalizeMergeType(athlete.mergeType),
    originalCompetitions: clone(athlete.originalCompetitions || []),
  };
}

// 本地模式：页面启动和日常录入都优先读写浏览器 localStorage。
