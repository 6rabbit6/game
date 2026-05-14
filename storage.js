// 本地存储、完整状态 JSON 导入导出，以及云端数据格式兼容。
function normalizeCloudAppData(value) {
  if (typeof value === "string") {
    return normalizeCloudAppData(JSON.parse(value));
  }

  if (isValidAppData(value)) {
    return ensureEntryQualificationDefaults(value);
  }

  // 兼容一些早期/错误写入格式，例如 { data: {...真实业务数据...} }
  if (value && typeof value === "object" && isValidAppData(value.data)) {
    return ensureEntryQualificationDefaults(value.data);
  }

  return null;
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return ensureEntryQualificationDefaults(clone(defaultData));
    }
    const parsed = JSON.parse(raw);
    if (!isValidAppData(parsed)) {
      return ensureEntryQualificationDefaults(clone(defaultData));
    }
    ensureEntryQualificationDefaults(parsed);
    recalculateAllGroupRanks(parsed);
    return parsed;
  } catch (error) {
    console.warn("读取本地数据失败，已回退到默认数据。", error);
    return ensureEntryQualificationDefaults(clone(defaultData));
  }
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateLocalCacheRuntimeStatus({
      localCacheStatus: "success",
      localCacheError: "",
      lastLocalCacheAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    });
    return true;
  } catch (error) {
    const message = getStorageErrorMessage(error);
    updateLocalCacheRuntimeStatus({
      localCacheStatus: "failed",
      localCacheError: message,
    });
    console.warn("写入本地缓存失败，页面将继续使用当前内存数据。", error);
    return false;
  }
}

function markLocalCacheSkipped(reason) {
  updateLocalCacheRuntimeStatus({
    localCacheStatus: "skipped",
    localCacheError: reason || "",
  });
}

function clearLocalDataCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    updateLocalCacheRuntimeStatus({
      localCacheStatus: "cleared",
      localCacheError: "",
      lastLocalCacheAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    });
    return true;
  } catch (error) {
    const message = getStorageErrorMessage(error);
    updateLocalCacheRuntimeStatus({
      localCacheStatus: "failed",
      localCacheError: message,
    });
    console.warn("清理本地缓存失败。", error);
    return false;
  }
}

function updateLocalCacheRuntimeStatus(patch) {
  if (typeof state === "undefined" || !state) {
    return;
  }
  state.cloudRuntime = {
    ...(state.cloudRuntime || {}),
    ...patch,
  };
}

function getStorageErrorMessage(error) {
  const message = error?.message || "";
  if (
    error?.name === "QuotaExceededError" ||
    error?.code === 22 ||
    /quota/i.test(message)
  ) {
    return "本地缓存容量已满，云端数据仍会正常显示，但不会写入 localStorage。";
  }
  return message || "本地缓存写入失败。";
}

function exportJson() {
  downloadJsonFile(state.data, "event-system-data.json");
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
        if (isRegistrationExportData(parsed)) {
          applyRegistrationExportJson(parsed);
          return;
        }
        if (!isValidAppData(parsed)) {
          throw new Error("JSON 结构不合法");
        }
        ensureEntryQualificationDefaults(parsed);
        recalculateAllGroupRanks(parsed);
        state.data = parsed;
        state.registrationImportExpanded = false;
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
