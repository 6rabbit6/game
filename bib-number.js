// 报名导入后的号码分配与俱乐部号段生成。
function assignBibNumbers(athletes, options = {}) {
  const startBibNo = Number(options.startBibNo || DEFAULT_BIB_START);
  const bibDigits = Number(options.bibDigits || DEFAULT_BIB_DIGITS);
  const bibMode = options.bibMode || "global_auto";

  if (bibMode === "keep_source") {
    return assignBibNumbersKeepingSource(athletes, {
      startBibNo,
      bibDigits,
    });
  }

  if (bibMode === "group_auto") {
    return assignBibNumbersByGroup(athletes, {
      startBibNo,
      bibDigits,
    });
  }

  return athletes
    .slice()
    .sort(compareAthletesForBib)
    .map((athlete, index) => ({
      ...athlete,
      bibNo: formatBibNo(startBibNo + index, bibDigits),
    }));
}

function assignBibNumbersKeepingSource(athletes, options = {}) {
  const usedBibNos = new Set();
  let nextBibNo = Number(options.startBibNo || DEFAULT_BIB_START);
  const bibDigits = Number(options.bibDigits || DEFAULT_BIB_DIGITS);

  return athletes
    .slice()
    .sort(compareAthletesForBib)
    .map((athlete) => {
      const sourceBibNo = normalizeText(athlete.sourceBibNo || athlete.bibNo || athlete.bib);
      if (sourceBibNo && !usedBibNos.has(sourceBibNo)) {
        usedBibNos.add(sourceBibNo);
        return {
          ...athlete,
          bibNo: sourceBibNo,
        };
      }

      let nextFormatted = formatBibNo(nextBibNo, bibDigits);
      while (usedBibNos.has(nextFormatted)) {
        nextBibNo += 1;
        nextFormatted = formatBibNo(nextBibNo, bibDigits);
      }
      usedBibNos.add(nextFormatted);
      nextBibNo += 1;
      return {
        ...athlete,
        bibNo: nextFormatted,
      };
    });
}

function assignBibNumbersByGroup(athletes, options = {}) {
  const startBibNo = Number(options.startBibNo || DEFAULT_BIB_START);
  const bibDigits = Number(options.bibDigits || DEFAULT_BIB_DIGITS);
  const groupCounters = new Map();

  return athletes
    .slice()
    .sort(compareAthletesForGroupBib)
    .map((athlete) => {
      const groupKey = normalizeText(athlete.groupKey || athlete.groupId || athlete.groupName) || "default";
      const current = groupCounters.get(groupKey) || startBibNo;
      groupCounters.set(groupKey, current + 1);
      return {
        ...athlete,
        bibNo: formatBibNo(current, bibDigits),
      };
    });
}

function compareAthletesForBib(left, right) {
  const leftOrganization = normalizeText(left.organization);
  const rightOrganization = normalizeText(right.organization);
  const leftOrganizationEmpty = !leftOrganization;
  const rightOrganizationEmpty = !rightOrganization;

  if (leftOrganizationEmpty !== rightOrganizationEmpty) {
    return leftOrganizationEmpty ? 1 : -1;
  }

  return (
    compareRegistrationText(leftOrganization, rightOrganization) ||
    compareRegistrationText(left.groupName, right.groupName) ||
    compareRegistrationText(left.name, right.name) ||
    compareRegistrationText(left.registrationNo, right.registrationNo)
  );
}

function compareAthletesForGroupBib(left, right) {
  return (
    compareRegistrationText(left.groupName, right.groupName) ||
    compareRegistrationText(left.genderLabel || left.gender, right.genderLabel || right.gender) ||
    compareRegistrationText(left.organization, right.organization) ||
    compareRegistrationText(left.name, right.name) ||
    compareRegistrationText(left.registrationNo, right.registrationNo)
  );
}

function createOrganizationRanges(athletes) {
  const ranges = [];

  athletes.forEach((athlete) => {
    const organization = normalizeText(athlete.organization) || EMPTY_ORGANIZATION_LABEL;
    const leader = normalizeText(athlete.organizationLeader || athlete.leader);
    const coach = normalizeText(athlete.organizationCoach || athlete.coach);
    const bibNo = normalizeText(athlete.bibNo || athlete.bib);
    const currentRange = ranges[ranges.length - 1];
    const shouldStartRange =
      !currentRange ||
      currentRange.organization !== organization ||
      !areBibNumbersConsecutive(currentRange.endBibNo, bibNo);

    if (shouldStartRange) {
      ranges.push({
        organization,
        leader,
        coach,
        organizationLeader: leader,
        organizationCoach: coach,
        startBibNo: bibNo,
        endBibNo: bibNo,
        count: 1,
      });
      return;
    }

    currentRange.endBibNo = bibNo;
    currentRange.count += 1;
    currentRange.leader = mergeOrganizationStaffText(currentRange.leader, leader);
    currentRange.coach = mergeOrganizationStaffText(currentRange.coach, coach);
    currentRange.organizationLeader = currentRange.leader;
    currentRange.organizationCoach = currentRange.coach;
  });

  return ranges;
}

function areBibNumbersConsecutive(previousBibNo, nextBibNo) {
  const previousText = normalizeText(previousBibNo);
  const nextText = normalizeText(nextBibNo);
  if (!/^\d+$/.test(previousText) || !/^\d+$/.test(nextText)) {
    return previousText && nextText && previousText === nextText;
  }
  return Number.parseInt(nextText, 10) === Number.parseInt(previousText, 10) + 1;
}

function mergeOrganizationStaffText(existing, next) {
  const values = [];
  [existing, next].forEach((value) => {
    normalizeText(value)
      .split(/[、,，/]/)
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .forEach((item) => {
        if (!values.includes(item)) values.push(item);
      });
  });
  return values.join("、");
}
