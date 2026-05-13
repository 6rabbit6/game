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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
