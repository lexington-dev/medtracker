/**
 * app.js — MedTracker v0.2 コアロジック
 *
 * 依存ロード順: storage.js → alarm.js → charts.js → app.js (このファイル)
 */

/* =============================================
   DOM References
   ============================================= */
const todayDateElement        = document.querySelector("#today-date");
const scheduleElement         = document.querySelector("#schedule");
const historyList             = document.querySelector("#history-list");
const medicationForm          = document.querySelector("#medication-form");
const medicationsList         = document.querySelector("#medications-list");
const medicationSubmitButton  = document.querySelector("#medication-submit-button");
const exportDataButton        = document.querySelector("#export-data-button");
const shareDataButton         = document.querySelector("#share-data-button");
const importDataButton        = document.querySelector("#import-data-button");
const importFileInput         = document.querySelector("#import-file-input");
const dataManagementMessage   = document.querySelector("#data-management-message");
const headerBadge             = document.querySelector("#today-progress-badge");
const timingInputs            = medicationForm.querySelectorAll('input[name="timings"]');

/* =============================================
   Data
   ============================================= */
const medicationRecords = loadRecords();
const medications       = loadMedications();
let recordSequence      = 0;
let medicationSequence  = 0;
let editingMedicationId = null;

/* =============================================
   Constants
   ============================================= */
function formatToday() {
  const today    = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${weekdays[today.getDay()]}）`;
}

function getCurrentTime() {
  const now = new Date();
  return (
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0")
  );
}

function getScheduledDate() {
  const today = new Date();
  const year  = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day   = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const scheduledDate = getScheduledDate();

const timingSlots = [
  { value: "morning", label: "朝", icon: "🌅" },
  { value: "noon",    label: "昼", icon: "☀️"  },
  { value: "evening", label: "晩", icon: "🌙" },
];

const timingLabels = { morning: "朝", noon: "昼", evening: "晩" };
const timingOrder  = { 朝: 0, 昼: 1, 晩: 2 };

/* =============================================
   Utility Functions
   ============================================= */
function createLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateString(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDate(dateString) {
  const date = createLocalDate(dateString);
  date.setDate(date.getDate() - 1);
  return formatDateString(date);
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const date  = createLocalDate(startDate);
  const last  = createLocalDate(endDate);
  while (date <= last) {
    dates.push(formatDateString(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

function isMedicationScheduledForDate(medication, dateString) {
  return dateString >= medication.startDate && dateString <= medication.endDate;
}

function getScheduledTimings(medication, dateString) {
  if (!isMedicationScheduledForDate(medication, dateString)) return [];
  return [...medication.timings];
}

function getTimingLabel(timing) {
  return timingLabels[timing] || timing;
}

function createRecordKey(medicationId, date, timing) {
  return `${medicationId}|${date}|${getTimingLabel(timing)}`;
}

function getMedicationName(medicationId) {
  const med = medications.find((m) => m.id === medicationId);
  return med ? med.name : "削除された薬";
}

function formatHistoryDate(dateString) {
  const date     = createLocalDate(dateString);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const year     = date.getFullYear();
  const month    = String(date.getMonth() + 1).padStart(2, "0");
  const day      = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}（${weekdays[date.getDay()]}）`;
}

function getTimeFromTakenAt(takenAt) {
  return takenAt.includes("T") ? takenAt.split("T")[1].slice(0, 5) : takenAt;
}

function createPastTakenAt(scheduledD, time) {
  return `${scheduledD}T${time}:00`;
}

function getDefaultPastTime(timing) {
  const defaults = { 朝: "08:00", 昼: "12:00", 晩: "20:00" };
  return defaults[timing] || "08:00";
}

function createRecordId() {
  recordSequence += 1;
  return `record-${Date.now()}-${recordSequence}`;
}

function createMedicationId() {
  medicationSequence += 1;
  return `med-${Date.now()}-${medicationSequence}`;
}

function showDataManagementMessage(message) {
  dataManagementMessage.textContent = message;
}

/* =============================================
   Header Progress Badge
   ============================================= */
function updateHeaderBadge() {
  let total = 0;
  let taken = 0;

  medications.forEach((med) => {
    const timings = getScheduledTimings(med, scheduledDate);
    total += timings.length;
    timings.forEach((timing) => {
      const label = getTimingLabel(timing);
      if (findRecordedMedicine(med.id, label)) taken++;
    });
  });

  if (total === 0) {
    headerBadge.textContent = "";
    headerBadge.className = "header-badge";
    return;
  }

  headerBadge.textContent = `${taken}/${total}`;
  if (taken === total) {
    headerBadge.className = "header-badge badge-complete";
  } else if (taken > 0) {
    headerBadge.className = "header-badge badge-partial";
  } else {
    headerBadge.className = "header-badge badge-empty";
  }
}

/* =============================================
   Record Management
   ============================================= */
function findRecordedMedicine(medicationId, timing) {
  return medicationRecords.find(
    (r) =>
      r.medicationId === medicationId &&
      r.scheduledDate === scheduledDate &&
      r.timing === timing,
  );
}

function addPastRecord(item, time) {
  medicationRecords.push({
    id:            createRecordId(),
    medicationId:  item.medicationId,
    scheduledDate: item.date,
    timing:        item.timing,
    takenAt:       createPastTakenAt(item.date, time),
    recordedAt:    new Date().toISOString(),
  });
  saveRecords(medicationRecords);
  displayHistory();
}

function updatePastRecord(recordId, time) {
  const idx = medicationRecords.findIndex((r) => r.id === recordId);
  if (idx === -1) return;
  const record = medicationRecords[idx];
  medicationRecords[idx] = {
    ...record,
    takenAt:    createPastTakenAt(record.scheduledDate, time),
    recordedAt: new Date().toISOString(),
  };
  saveRecords(medicationRecords);
  displayHistory();
}

function deletePastRecord(recordId) {
  if (!window.confirm("この服薬記録を削除しますか？")) return;
  const idx = medicationRecords.findIndex((r) => r.id === recordId);
  if (idx === -1) return;
  medicationRecords.splice(idx, 1);
  saveRecords(medicationRecords);
  displayHistory();
}

function updateTodayRecord(recordId, time) {
  const idx = medicationRecords.findIndex((r) => r.id === recordId);
  if (idx === -1) return;
  medicationRecords[idx] = {
    ...medicationRecords[idx],
    takenAt:    time,
    recordedAt: new Date().toISOString(),
  };
  saveRecords(medicationRecords);
  displaySchedule();
}

function deleteTodayRecord(recordId) {
  if (!window.confirm("この服薬記録を削除しますか？")) return;
  const idx = medicationRecords.findIndex((r) => r.id === recordId);
  if (idx === -1) return;
  medicationRecords.splice(idx, 1);
  saveRecords(medicationRecords);
  displaySchedule();
}

/* =============================================
   Today's Schedule
   ============================================= */
function createTodayRecordEditor(record) {
  const editor = document.createElement("div");
  editor.className = "today-record-editor";

  const timeLabel = document.createElement("label");
  timeLabel.textContent = "服用時刻";
  const timeInput = document.createElement("input");
  timeInput.type    = "time";
  timeInput.required = true;
  timeInput.value   = getTimeFromTakenAt(record.takenAt);
  timeLabel.append(timeInput);

  const updateBtn = document.createElement("button");
  updateBtn.className = "record-edit-button";
  updateBtn.type      = "button";
  updateBtn.textContent = "更新する";
  updateBtn.addEventListener("click", () => {
    if (timeInput.reportValidity()) updateTodayRecord(record.id, timeInput.value);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className   = "record-edit-button";
  cancelBtn.type        = "button";
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", displaySchedule);

  const deleteBtn = document.createElement("button");
  deleteBtn.className   = "record-delete-button";
  deleteBtn.type        = "button";
  deleteBtn.textContent = "削除";
  deleteBtn.addEventListener("click", () => deleteTodayRecord(record.id));

  editor.append(timeLabel, updateBtn, cancelBtn, deleteBtn);
  return editor;
}

function createRecordedStatus(record) {
  const statusDiv = document.createElement("div");
  statusDiv.className = "today-record-status";

  const statusText = document.createElement("p");
  statusText.textContent = `✓ 服用済み ${getTimeFromTakenAt(record.takenAt)}`;

  const editBtn = document.createElement("button");
  editBtn.className   = "record-edit-button";
  editBtn.type        = "button";
  editBtn.textContent = "編集";
  editBtn.addEventListener("click", () => {
    statusDiv.replaceWith(createTodayRecordEditor(record));
  });

  statusDiv.append(statusText, editBtn);
  return statusDiv;
}

function displaySchedule() {
  todayDateElement.textContent = formatToday();
  scheduleElement.replaceChildren();

  if (medications.length === 0) {
    const empty = document.createElement("p");
    empty.className   = "empty-schedule-message";
    empty.textContent = "薬が登録されていません。\n「設定」タブから薬を登録してください。";
    scheduleElement.append(empty);
    updateHeaderBadge();
    return;
  }

  timingSlots.forEach((slot) => {
    const todayMeds = medications.filter((med) =>
      getScheduledTimings(med, scheduledDate).includes(slot.value),
    );
    if (todayMeds.length === 0) return;

    const timeSlot = document.createElement("div");
    timeSlot.className = "time-slot";

    // Header
    const slotHeader = document.createElement("div");
    slotHeader.className = "time-slot-header";
    const slotIcon = document.createElement("span");
    slotIcon.className = "time-slot-icon";
    slotIcon.setAttribute("aria-hidden", "true");
    slotIcon.textContent = slot.icon;
    const slotTitle = document.createElement("p");
    slotTitle.className   = "time-slot-title";
    slotTitle.textContent = slot.label;
    slotHeader.append(slotIcon, slotTitle);

    const medList = document.createElement("ul");
    medList.className = "medicine-list";

    todayMeds.forEach((medicine) => {
      const listItem = document.createElement("li");
      listItem.className = "medicine-item";

      const details = document.createElement("div");
      details.className = "medicine-details";

      const medicineName = document.createElement("span");
      medicineName.className   = "medicine-name";
      medicineName.textContent = medicine.name;
      details.append(medicineName);

      const takenBtn = document.createElement("button");
      takenBtn.className   = "taken-button";
      takenBtn.type        = "button";
      takenBtn.textContent = "飲んだ";

      const existingRecord = findRecordedMedicine(medicine.id, slot.label);

      if (existingRecord) {
        takenBtn.textContent = "服用済み";
        takenBtn.disabled    = true;
        details.append(createRecordedStatus(existingRecord));
      } else {
        takenBtn.addEventListener("click", () => {
          const confirmation = document.createElement("div");
          confirmation.className = "today-record-editor";

          const tLabel = document.createElement("label");
          tLabel.textContent = "服用時刻";
          const tInput = document.createElement("input");
          tInput.type  = "time";
          tInput.value = getCurrentTime();
          tLabel.append(tInput);

          const recordBtn = document.createElement("button");
          recordBtn.className   = "taken-button";
          recordBtn.type        = "button";
          recordBtn.textContent = "記録する";
          recordBtn.addEventListener("click", () => {
            const newRecord = {
              id:            createRecordId(),
              medicationId:  medicine.id,
              scheduledDate,
              timing:        slot.label,
              takenAt:       tInput.value,
              recordedAt:    new Date().toISOString(),
            };
            medicationRecords.push(newRecord);
            saveRecords(medicationRecords);
            takenBtn.textContent = "服用済み";
            confirmation.replaceWith(createRecordedStatus(newRecord));
            updateHeaderBadge();
            refreshCharts();
          });

          const cancelBtn2 = document.createElement("button");
          cancelBtn2.className   = "record-edit-button";
          cancelBtn2.type        = "button";
          cancelBtn2.textContent = "キャンセル";
          cancelBtn2.addEventListener("click", () => {
            confirmation.remove();
            takenBtn.disabled = false;
          });

          confirmation.append(tLabel, recordBtn, cancelBtn2);
          details.append(confirmation);
          takenBtn.disabled = true;
        });
      }

      listItem.append(details, takenBtn);
      medList.append(listItem);
    });

    timeSlot.append(slotHeader, medList);
    scheduleElement.append(timeSlot);
  });

  updateHeaderBadge();
}

/* =============================================
   History
   ============================================= */
function getHistoryItems() {
  const historyEndDate = getPreviousDate(scheduledDate);
  const recordedKeys   = new Set();

  const historyItems = medicationRecords
    .filter((r) => r.scheduledDate < scheduledDate)
    .map((r) => {
      const timing = getTimingLabel(r.timing);
      recordedKeys.add(createRecordKey(r.medicationId, r.scheduledDate, timing));
      return {
        date:           r.scheduledDate,
        timing,
        medicationId:   r.medicationId,
        medicationName: getMedicationName(r.medicationId),
        takenAt:        r.takenAt,
        recordId:       r.id,
        isRecorded:     true,
      };
    });

  medications.forEach((med) => {
    const endDate = med.endDate < historyEndDate ? med.endDate : historyEndDate;
    if (med.startDate > endDate) return;
    getDatesInRange(med.startDate, endDate).forEach((date) => {
      getScheduledTimings(med, date).forEach((timing) => {
        const label = getTimingLabel(timing);
        const key   = createRecordKey(med.id, date, label);
        if (!recordedKeys.has(key)) {
          historyItems.push({
            date,
            timing:         label,
            medicationId:   med.id,
            medicationName: med.name,
            isRecorded:     false,
          });
        }
      });
    });
  });

  return historyItems.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (timingOrder[a.timing] ?? Number.MAX_SAFE_INTEGER) -
        (timingOrder[b.timing] ?? Number.MAX_SAFE_INTEGER),
  );
}

function createHistoryRecordEditor(item) {
  const editor = document.createElement("div");
  editor.className = "history-record-editor";

  const tLabel = document.createElement("label");
  tLabel.textContent = "過去の服用時刻";
  const tInput = document.createElement("input");
  tInput.type     = "time";
  tInput.required = true;
  tInput.value    = item.isRecorded
    ? getTimeFromTakenAt(item.takenAt)
    : getDefaultPastTime(item.timing);
  tLabel.append(tInput);

  const saveBtn = document.createElement("button");
  saveBtn.className   = "history-action-button";
  saveBtn.type        = "button";
  saveBtn.textContent = item.isRecorded ? "更新する" : "記録する";
  saveBtn.addEventListener("click", () => {
    if (!tInput.reportValidity()) return;
    if (item.isRecorded) {
      updatePastRecord(item.recordId, tInput.value);
    } else {
      addPastRecord(item, tInput.value);
    }
    refreshCharts();
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className   = "history-cancel-button";
  cancelBtn.type        = "button";
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", displayHistory);

  editor.append(tLabel, saveBtn, cancelBtn);

  if (item.isRecorded) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className   = "history-delete-button";
    deleteBtn.type        = "button";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => {
      deletePastRecord(item.recordId);
      refreshCharts();
    });
    editor.append(deleteBtn);
  }

  return editor;
}

function displayHistory() {
  historyList.replaceChildren();
  const items = getHistoryItems();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className   = "empty-history-message";
    empty.textContent = "表示できる服薬履歴はまだありません。";
    historyList.append(empty);
    return;
  }

  const byDate = new Map();
  items.forEach((item) => {
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date).push(item);
  });

  byDate.forEach((dayItems, date) => {
    const daySection = document.createElement("div");
    daySection.className = "history-day";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "history-day-toggle";
    toggleBtn.type = "button";

    const dateSpan = document.createElement("span");
    dateSpan.textContent = formatHistoryDate(date);

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "history-day-toggle-icon";

    const dayContent = document.createElement("div");
    dayContent.className = "history-day-content";

    const isLatest    = date === items[0].date;
    let   isExpanded  = isLatest;

    function updateState() {
      dayContent.hidden = !isExpanded;
      toggleIcon.textContent = isExpanded ? "▼" : "▶";
      toggleBtn.setAttribute("aria-expanded", String(isExpanded));
    }

    toggleBtn.append(dateSpan, toggleIcon);
    toggleBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      updateState();
    });
    updateState();

    dayItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "history-item";

      const timingEl = document.createElement("span");
      timingEl.className   = "history-item-time";
      timingEl.textContent = item.timing;

      const nameEl = document.createElement("span");
      nameEl.textContent = item.medicationName;

      const statusEl = document.createElement("span");
      statusEl.className = "history-item-status";
      if (item.isRecorded) {
        statusEl.textContent = getTimeFromTakenAt(item.takenAt);
      } else {
        statusEl.textContent = "未記録";
        statusEl.classList.add("unrecorded");
      }

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "history-item-actions";

      const actionBtn = document.createElement("button");
      actionBtn.className   = "history-action-button";
      actionBtn.type        = "button";
      actionBtn.textContent = item.isRecorded ? "編集" : "記録する";
      actionBtn.addEventListener("click", () => {
        actionsDiv.replaceWith(createHistoryRecordEditor(item));
      });

      actionsDiv.append(actionBtn);
      row.append(timingEl, nameEl, statusEl, actionsDiv);
      dayContent.append(row);
    });

    daySection.append(toggleBtn, dayContent);
    historyList.append(daySection);
  });
}

/* =============================================
   Medications Management
   ============================================= */
function formatTimings(timings) {
  return timings.map(getTimingLabel).join("・");
}

function resetMedicationForm() {
  medicationForm.reset();
  timingInputs[0].setCustomValidity("");
  editingMedicationId = null;
  medicationSubmitButton.textContent = "登録する";
}

function startEditingMedication(medication) {
  editingMedicationId = medication.id;
  timingInputs[0].setCustomValidity("");
  medicationForm.elements.name.value      = medication.name;
  medicationForm.elements.startDate.value = medication.startDate;
  medicationForm.elements.endDate.value   = medication.endDate;
  timingInputs.forEach((input) => {
    input.checked = medication.timings.includes(input.value);
  });
  medicationSubmitButton.textContent = "更新する";
  medicationForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteMedication(medicationId, medicationName) {
  if (!window.confirm(`「${medicationName}」を削除しますか？`)) return;
  const idx = medications.findIndex((m) => m.id === medicationId);
  if (idx === -1) return;
  medications.splice(idx, 1);
  saveMedications(medications);
  if (editingMedicationId === medicationId) resetMedicationForm();
  displayMedications();
  displaySchedule();
  displayHistory();
}

function displayMedications() {
  medicationsList.replaceChildren();

  if (medications.length === 0) {
    const empty = document.createElement("li");
    empty.className   = "empty-medications-message";
    empty.textContent = "登録した薬はまだありません。";
    medicationsList.append(empty);
    return;
  }

  medications.forEach((medication) => {
    const li = document.createElement("li");
    li.className = "registered-medication";

    const name = document.createElement("strong");
    name.textContent = medication.name;

    const details = document.createElement("p");
    details.textContent = `${formatTimings(medication.timings)} / ${medication.startDate} 〜 ${medication.endDate}`;

    const actions = document.createElement("div");
    actions.className = "medication-actions";

    const editBtn = document.createElement("button");
    editBtn.className   = "edit-button";
    editBtn.type        = "button";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => startEditingMedication(medication));

    const deleteBtn = document.createElement("button");
    deleteBtn.className   = "delete-button";
    deleteBtn.type        = "button";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => deleteMedication(medication.id, medication.name));

    actions.append(editBtn, deleteBtn);
    li.append(name, details, actions);
    medicationsList.append(li);
  });
}

/* =============================================
   Data Management — Export / Share / Import
   ============================================= */
function buildBackupData() {
  return {
    version:    2,
    exportedAt: new Date().toISOString(),
    medications,
    records: medicationRecords,
  };
}

function exportData() {
  const json     = JSON.stringify(buildBackupData(), null, 2);
  const blob     = new Blob([json], { type: "application/json" });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement("a");
  anchor.href     = url;
  anchor.download = `medtracker-${scheduledDate}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function shareData() {
  const json     = JSON.stringify(buildBackupData(), null, 2);
  const fileName = `medtracker-${scheduledDate}.json`;
  const blob     = new Blob([json], { type: "application/json" });
  const file     = new File([blob], fileName, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "MedTracker バックアップ",
        text:  `服薬記録のバックアップ（${scheduledDate}）`,
      });
      showDataManagementMessage("");
    } catch (err) {
      if (err.name !== "AbortError") {
        showDataManagementMessage("共有に失敗しました。ダウンロードをお試しください。");
      }
    }
  } else {
    // Fallback: direct download
    exportData();
    showDataManagementMessage("このブラウザは共有機能に対応していないため、ダウンロードしました。");
  }
}

function isValidBackupData(data) {
  return (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray(data.medications) &&
    Array.isArray(data.records)
  );
}

function importData(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    let imported;
    try {
      imported = JSON.parse(reader.result);
    } catch {
      showDataManagementMessage("JSONファイルを読み込めませんでした。");
      return;
    }

    if (!isValidBackupData(imported)) {
      showDataManagementMessage("ファイルの形式が正しくありません。");
      return;
    }

    if (!window.confirm("現在のデータをインポートしたデータで置き換えますか？")) return;

    medications.splice(0, medications.length, ...imported.medications);
    medicationRecords.splice(0, medicationRecords.length, ...imported.records);
    saveMedications(medications);
    saveRecords(medicationRecords);
    window.location.reload();
  });

  reader.addEventListener("error", () => {
    showDataManagementMessage("ファイルを読み込めませんでした。");
  });

  reader.readAsText(file);
}

/* =============================================
   Tab Navigation
   ============================================= */
let _chartsInitialized = false;

function initTabs() {
  const panels   = document.querySelectorAll(".tab-panel");
  const navItems = document.querySelectorAll(".nav-item");

  function switchTab(tabId) {
    panels.forEach((p) => (p.hidden = true));
    navItems.forEach((n) => {
      n.classList.remove("active");
      n.setAttribute("aria-selected", "false");
    });

    const targetPanel = document.getElementById(`tab-${tabId}`);
    const targetNav   = document.getElementById(`nav-${tabId}`);

    if (targetPanel) targetPanel.hidden = false;
    if (targetNav) {
      targetNav.classList.add("active");
      targetNav.setAttribute("aria-selected", "true");
    }

    // Lazy-init charts on first visit
    if (tabId === "chart" && !_chartsInitialized) {
      initCharts();
      _chartsInitialized = true;
    }
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => switchTab(item.dataset.tab));
  });
}

/* =============================================
   Medication Form — Submit Handler
   ============================================= */
timingInputs.forEach((input) => {
  input.addEventListener("change", () => timingInputs[0].setCustomValidity(""));
});

medicationForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData  = new FormData(medicationForm);
  const timings   = formData.getAll("timings");
  const firstTiming = timingInputs[0];

  if (timings.length === 0) {
    firstTiming.setCustomValidity("服用タイミングを1つ以上選択してください。");
    medicationForm.reportValidity();
    return;
  }
  firstTiming.setCustomValidity("");

  const details = {
    name:      formData.get("name").trim(),
    timings,
    startDate: formData.get("startDate"),
    endDate:   formData.get("endDate"),
  };

  if (editingMedicationId) {
    const idx = medications.findIndex((m) => m.id === editingMedicationId);
    if (idx !== -1) medications[idx] = { id: editingMedicationId, ...details };
  } else {
    medications.push({ id: createMedicationId(), ...details });
  }

  saveMedications(medications);
  resetMedicationForm();
  displayMedications();
  displaySchedule();
  displayHistory();
  refreshCharts();
});

/* =============================================
   Event Listeners
   ============================================= */
exportDataButton.addEventListener("click", exportData);
shareDataButton.addEventListener("click", shareData);

importDataButton.addEventListener("click", () => importFileInput.click());

importFileInput.addEventListener("change", () => {
  const [file] = importFileInput.files;
  if (!file) return;
  showDataManagementMessage("");
  importData(file);
  importFileInput.value = "";
});

/* =============================================
   Initialization
   ============================================= */
displaySchedule();
displayMedications();
displayHistory();

// Alarm module (defined in alarm.js)
renderAlarmSettings();
const _savedAlarm = loadAlarmSettings();
if (_savedAlarm.enabled) startAlarmChecking();

// Tab navigation
initTabs();

// Service Worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => console.log("[MedTracker] Service Worker registered."))
      .catch((err) => console.error("[MedTracker] Service Worker registration failed:", err));
  });
}