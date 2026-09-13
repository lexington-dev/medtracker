const todayDateElement = document.querySelector("#today-date");
const scheduleElement = document.querySelector("#schedule");
const historyList = document.querySelector("#history-list");
const medicationForm = document.querySelector("#medication-form");
const medicationsList = document.querySelector("#medications-list");
const medicationSubmitButton = document.querySelector("#medication-submit-button");
const exportDataButton = document.querySelector("#export-data-button");
const importDataButton = document.querySelector("#import-data-button");
const importFileInput = document.querySelector("#import-file-input");
const dataManagementMessage = document.querySelector("#data-management-message");
const timingInputs = medicationForm.querySelectorAll('input[name="timings"]');
const medicationRecords = loadRecords();
const medications = loadMedications();
let recordSequence = 0;
let medicationSequence = 0;
let editingMedicationId = null;

function formatToday() {
  const today = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${weekdays[today.getDay()]}）`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getScheduledDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const scheduledDate = getScheduledDate();
const timingSlots = [
  { value: "morning", label: "朝" },
  { value: "noon", label: "昼" },
  { value: "evening", label: "晩" },
];
const timingLabels = { morning: "朝", noon: "昼", evening: "晩" };
const timingOrder = { 朝: 0, 昼: 1, 晩: 2 };

function isMedicationScheduledForDate(medication, dateString) {
  return dateString >= medication.startDate && dateString <= medication.endDate;
}

function getScheduledTimings(medication, dateString) {
  if (!isMedicationScheduledForDate(medication, dateString)) {
    return [];
  }

  return [...medication.timings];
}

function createLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDate(dateString) {
  const date = createLocalDate(dateString);
  date.setDate(date.getDate() - 1);
  return formatDateString(date);
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const date = createLocalDate(startDate);
  const lastDate = createLocalDate(endDate);

  while (date <= lastDate) {
    dates.push(formatDateString(date));
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

function getTimingLabel(timing) {
  return timingLabels[timing] || timing;
}

function createRecordKey(medicationId, date, timing) {
  return `${medicationId}|${date}|${getTimingLabel(timing)}`;
}

function getMedicationName(medicationId) {
  const medication = medications.find((item) => item.id === medicationId);
  return medication ? medication.name : "削除された薬";
}

function formatHistoryDate(dateString) {
  const date = createLocalDate(dateString);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}（${weekdays[date.getDay()]}）`;
}

function getTimeFromTakenAt(takenAt) {
  return takenAt.includes("T") ? takenAt.split("T")[1].slice(0, 5) : takenAt;
}

function createPastTakenAt(scheduledDate, time) {
  return `${scheduledDate}T${time}:00`;
}

function getDefaultPastTime(timing) {
  const defaultTimes = { 朝: "08:00", 昼: "12:00", 晩: "20:00" };
  return defaultTimes[timing] || "08:00";
}

function addPastRecord(item, time) {
  medicationRecords.push({
    id: createRecordId(),
    medicationId: item.medicationId,
    scheduledDate: item.date,
    timing: item.timing,
    takenAt: createPastTakenAt(item.date, time),
    recordedAt: new Date().toISOString(),
  });

  saveRecords(medicationRecords);
  displayHistory();
}

function updatePastRecord(recordId, time) {
  const recordIndex = medicationRecords.findIndex((record) => record.id === recordId);

  if (recordIndex === -1) {
    return;
  }

  const record = medicationRecords[recordIndex];
  medicationRecords[recordIndex] = {
    ...record,
    takenAt: createPastTakenAt(record.scheduledDate, time),
    recordedAt: new Date().toISOString(),
  };

  saveRecords(medicationRecords);
  displayHistory();
}

function deletePastRecord(recordId) {
  if (!window.confirm("この服薬記録を削除しますか？")) {
    return;
  }

  const recordIndex = medicationRecords.findIndex((record) => record.id === recordId);

  if (recordIndex === -1) {
    return;
  }

  medicationRecords.splice(recordIndex, 1);
  saveRecords(medicationRecords);
  displayHistory();
}

function createHistoryRecordEditor(item) {
  const editor = document.createElement("div");
  editor.className = "history-record-editor";

  const timeLabel = document.createElement("label");
  timeLabel.textContent = "過去の服用時刻";

  const timeInput = document.createElement("input");
  timeInput.type = "time";
  timeInput.required = true;
  timeInput.value = item.isRecorded
    ? getTimeFromTakenAt(item.takenAt)
    : getDefaultPastTime(item.timing);
  timeLabel.append(timeInput);

  const saveButton = document.createElement("button");
  saveButton.className = "history-action-button";
  saveButton.type = "button";
  saveButton.textContent = item.isRecorded ? "更新する" : "記録する";
  saveButton.addEventListener("click", () => {
    if (!timeInput.reportValidity()) {
      return;
    }

    if (item.isRecorded) {
      updatePastRecord(item.recordId, timeInput.value);
    } else {
      addPastRecord(item, timeInput.value);
    }
  });

  const cancelButton = document.createElement("button");
  cancelButton.className = "history-cancel-button";
  cancelButton.type = "button";
  cancelButton.textContent = "キャンセル";
  cancelButton.addEventListener("click", displayHistory);

  editor.append(timeLabel, saveButton, cancelButton);

  if (item.isRecorded) {
    const deleteButton = document.createElement("button");
    deleteButton.className = "history-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deletePastRecord(item.recordId));
    editor.append(deleteButton);
  }

  return editor;
}

function getHistoryItems() {
  const historyEndDate = getPreviousDate(scheduledDate);
  const recordedKeys = new Set();
  const historyItems = medicationRecords
    .filter((record) => record.scheduledDate < scheduledDate)
    .map((record) => {
      const timing = getTimingLabel(record.timing);
      recordedKeys.add(createRecordKey(record.medicationId, record.scheduledDate, timing));

      return {
        date: record.scheduledDate,
        timing,
        medicationId: record.medicationId,
        medicationName: getMedicationName(record.medicationId),
        takenAt: record.takenAt,
        recordId: record.id,
        isRecorded: true,
      };
    });

  medications.forEach((medication) => {
    const endDate = medication.endDate < historyEndDate ? medication.endDate : historyEndDate;

    if (medication.startDate > endDate) {
      return;
    }

    getDatesInRange(medication.startDate, endDate).forEach((date) => {
      getScheduledTimings(medication, date).forEach((timing) => {
        const timingLabel = getTimingLabel(timing);
        const recordKey = createRecordKey(medication.id, date, timingLabel);

        if (!recordedKeys.has(recordKey)) {
          historyItems.push({
            date,
            timing: timingLabel,
            medicationId: medication.id,
            medicationName: medication.name,
            isRecorded: false,
          });
        }
      });
    });
  });

  return historyItems.sort(
    (first, second) =>
      second.date.localeCompare(first.date) ||
      (timingOrder[first.timing] ?? Number.MAX_SAFE_INTEGER) -
        (timingOrder[second.timing] ?? Number.MAX_SAFE_INTEGER),
  );
}

function displayHistory() {
  historyList.replaceChildren();
  const historyItems = getHistoryItems();

  if (historyItems.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-history-message";
    emptyMessage.textContent = "表示できる服薬履歴はまだありません。";
    historyList.append(emptyMessage);
    return;
  }

  const itemsByDate = new Map();
  historyItems.forEach((item) => {
    if (!itemsByDate.has(item.date)) {
      itemsByDate.set(item.date, []);
    }
    itemsByDate.get(item.date).push(item);
  });

  itemsByDate.forEach((items, date) => {
    const historyDay = document.createElement("section");
    historyDay.className = "history-day";

    const headingButton = document.createElement("button");
    headingButton.className = "history-day-toggle";
    headingButton.type = "button";

    const heading = document.createElement("span");
    heading.textContent = formatHistoryDate(date);

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "history-day-toggle-icon";

    const itemList = document.createElement("div");
    itemList.className = "history-day-content";

    const isLatestDay = date === historyItems[0].date;
    let isExpanded = isLatestDay;

    function updateHistoryDayState() {
      itemList.hidden = !isExpanded;
      toggleIcon.textContent = isExpanded ? "▼" : "▶";
      headingButton.setAttribute("aria-expanded", String(isExpanded));
    }

    headingButton.append(heading, toggleIcon);

    headingButton.addEventListener("click", () => {
      isExpanded = !isExpanded;
      updateHistoryDayState();
    });

    updateHistoryDayState();
    items.forEach((item) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      const timing = document.createElement("span");
      timing.className = "history-item-time";
      timing.textContent = item.timing;

      const medicationName = document.createElement("span");
      medicationName.textContent = item.medicationName;

      const status = document.createElement("span");
      status.className = "history-item-status";
      status.textContent = item.isRecorded ? getTimeFromTakenAt(item.takenAt) : "未記録";

      if (!item.isRecorded) {
        status.classList.add("unrecorded");
      }

      const actions = document.createElement("div");
      actions.className = "history-item-actions";

      const actionButton = document.createElement("button");
      actionButton.className = "history-action-button";
      actionButton.type = "button";
      actionButton.textContent = item.isRecorded ? "編集" : "記録する";
      actionButton.addEventListener("click", () => {
        actions.replaceWith(createHistoryRecordEditor(item));
      });

      actions.append(actionButton);
      historyItem.append(timing, medicationName, status, actions);
      itemList.append(historyItem);
    });

    historyDay.append(headingButton, itemList);
    historyList.append(historyDay);
  });
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

function exportData() {
  const backupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    medications,
    records: medicationRecords,
  };
  const json = JSON.stringify(backupData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = `medication-tracker-${getScheduledDate()}.json`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
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
    let importedData;

    try {
      importedData = JSON.parse(reader.result);
    } catch {
      showDataManagementMessage("JSONファイルを読み込めませんでした。");
      return;
    }

    if (!isValidBackupData(importedData)) {
      showDataManagementMessage("ファイルの形式が正しくありません。");
      return;
    }

    if (!window.confirm("現在のデータをインポートしたデータで置き換えますか？")) {
      return;
    }

    medications.splice(0, medications.length, ...importedData.medications);
    medicationRecords.splice(0, medicationRecords.length, ...importedData.records);
    saveMedications(medications);
    saveRecords(medicationRecords);
    window.location.reload();
  });

  reader.addEventListener("error", () => {
    showDataManagementMessage("ファイルを読み込めませんでした。");
  });

  reader.readAsText(file);
}

function formatTimings(timings) {
  return timings.map((timing) => getTimingLabel(timing)).join("・");
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
  medicationForm.elements.name.value = medication.name;
  medicationForm.elements.startDate.value = medication.startDate;
  medicationForm.elements.endDate.value = medication.endDate;

  timingInputs.forEach((timingInput) => {
    timingInput.checked = medication.timings.includes(timingInput.value);
  });

  medicationSubmitButton.textContent = "更新する";
  medicationForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteMedication(medicationId, medicationName) {
  if (!window.confirm(`「${medicationName}」を削除しますか？`)) {
    return;
  }

  const medicationIndex = medications.findIndex((medication) => medication.id === medicationId);

  if (medicationIndex === -1) {
    return;
  }

  medications.splice(medicationIndex, 1);
  saveMedications(medications);

  if (editingMedicationId === medicationId) {
    resetMedicationForm();
  }

  displayMedications();
  displaySchedule();
  displayHistory();
}

function displayMedications() {
  medicationsList.replaceChildren();

  if (medications.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-medications-message";
    emptyMessage.textContent = "登録した薬はまだありません。";
    medicationsList.append(emptyMessage);
    return;
  }

  medications.forEach((medication) => {
    const listItem = document.createElement("li");
    listItem.className = "registered-medication";

    const name = document.createElement("strong");
    name.textContent = medication.name;

    const details = document.createElement("p");
    details.textContent = `${formatTimings(medication.timings)} / ${medication.startDate} 〜 ${medication.endDate}`;

    const actions = document.createElement("div");
    actions.className = "medication-actions";

    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => startEditingMedication(medication));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteMedication(medication.id, medication.name));

    actions.append(editButton, deleteButton);
    listItem.append(name, details, actions);
    medicationsList.append(listItem);
  });
}

function findRecordedMedicine(medicationId, timing) {
  return medicationRecords.find(
    (record) =>
      record.medicationId === medicationId &&
      record.scheduledDate === scheduledDate &&
      record.timing === timing,
  );
}

function updateTodayRecord(recordId, time) {
  const recordIndex = medicationRecords.findIndex((record) => record.id === recordId);

  if (recordIndex === -1) {
    return;
  }

  medicationRecords[recordIndex] = {
    ...medicationRecords[recordIndex],
    takenAt: time,
    recordedAt: new Date().toISOString(),
  };

  saveRecords(medicationRecords);
  displaySchedule();
}

function deleteTodayRecord(recordId) {
  if (!window.confirm("この服薬記録を削除しますか？")) {
    return;
  }

  const recordIndex = medicationRecords.findIndex((record) => record.id === recordId);

  if (recordIndex === -1) {
    return;
  }

  medicationRecords.splice(recordIndex, 1);
  saveRecords(medicationRecords);
  displaySchedule();
}

function createTodayRecordEditor(record) {
  const editor = document.createElement("div");
  editor.className = "today-record-editor";

  const timeLabel = document.createElement("label");
  timeLabel.textContent = "服用時刻";

  const timeInput = document.createElement("input");
  timeInput.type = "time";
  timeInput.required = true;
  timeInput.value = getTimeFromTakenAt(record.takenAt);
  timeLabel.append(timeInput);

  const updateButton = document.createElement("button");
  updateButton.className = "record-edit-button";
  updateButton.type = "button";
  updateButton.textContent = "更新する";
  updateButton.addEventListener("click", () => {
    if (timeInput.reportValidity()) {
      updateTodayRecord(record.id, timeInput.value);
    }
  });

  const cancelButton = document.createElement("button");
  cancelButton.className = "record-edit-button";
  cancelButton.type = "button";
  cancelButton.textContent = "キャンセル";
  cancelButton.addEventListener("click", displaySchedule);

  const deleteButton = document.createElement("button");
  deleteButton.className = "record-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "削除";
  deleteButton.addEventListener("click", () => deleteTodayRecord(record.id));

  editor.append(timeLabel, updateButton, cancelButton, deleteButton);
  return editor;
}

function createRecordedStatus(record) {
  const recordedStatus = document.createElement("div");
  recordedStatus.className = "today-record-status";

  const statusText = document.createElement("p");
  statusText.textContent = `✓ 服用済み ${getTimeFromTakenAt(record.takenAt)}`;

  const editButton = document.createElement("button");
  editButton.className = "record-edit-button";
  editButton.type = "button";
  editButton.textContent = "編集";
  editButton.addEventListener("click", () => {
    recordedStatus.replaceWith(createTodayRecordEditor(record));
  });

  recordedStatus.append(statusText, editButton);
  return recordedStatus;
}

function displaySchedule() {
  todayDateElement.textContent = formatToday();
  scheduleElement.replaceChildren();

  if (medications.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "登録した薬はまだありません。";
    scheduleElement.append(emptyMessage);
    return;
  }

  timingSlots.forEach((slot) => {
    const medicinesForTiming = medications.filter((medication) =>
      getScheduledTimings(medication, scheduledDate).includes(slot.value),
    );

    if (medicinesForTiming.length === 0) {
      return;
    }

    const timeSlot = document.createElement("section");
    timeSlot.className = "time-slot";

    const heading = document.createElement("h2");
    heading.textContent = `【${slot.label}】`;

    const medicineList = document.createElement("ul");
    medicineList.className = "medicine-list";

    medicinesForTiming.forEach((medicine) => {
      const listItem = document.createElement("li");
      listItem.className = "medicine-item";

      const medicineDetails = document.createElement("div");

      const medicineName = document.createElement("span");
      medicineName.className = "medicine-name";
      medicineName.textContent = medicine.name;
      medicineDetails.append(medicineName);

      const takenButton = document.createElement("button");
      takenButton.className = "taken-button";
      takenButton.type = "button";
      takenButton.textContent = "飲んだ";

      const existingRecord = findRecordedMedicine(medicine.id, slot.label);

      if (existingRecord) {
        takenButton.textContent = "服用済み";
        takenButton.disabled = true;
        medicineDetails.append(createRecordedStatus(existingRecord));
      } else {
        takenButton.addEventListener("click", () => {
          const timeConfirmation = document.createElement("div");

          const timeLabel = document.createElement("label");
          timeLabel.textContent = "服用時刻";

          const timeInput = document.createElement("input");
          timeInput.type = "time";
          timeInput.value = getCurrentTime();

          timeLabel.append(document.createElement("br"), timeInput);

          const recordButton = document.createElement("button");
          recordButton.className = "taken-button";
          recordButton.type = "button";
          recordButton.textContent = "記録する";

          recordButton.addEventListener("click", () => {
            const medicationRecord = {
              id: createRecordId(),
              medicationId: medicine.id,
              scheduledDate,
              timing: slot.label,
              takenAt: timeInput.value,
              recordedAt: new Date().toISOString(),
            };

            medicationRecords.push(medicationRecord);
            saveRecords(medicationRecords);

            takenButton.textContent = "服用済み";
            timeConfirmation.replaceWith(createRecordedStatus(medicationRecord));
          });

          timeConfirmation.append(timeLabel, recordButton);
          medicineDetails.append(timeConfirmation);
          takenButton.disabled = true;
        });
      }

      listItem.append(medicineDetails, takenButton);
      medicineList.append(listItem);
    });

    timeSlot.append(heading, medicineList);
    scheduleElement.append(timeSlot);
  });
}

displaySchedule();
displayMedications();
displayHistory();

exportDataButton.addEventListener("click", exportData);

importDataButton.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", () => {
  const [file] = importFileInput.files;

  if (!file) {
    return;
  }

  showDataManagementMessage("");
  importData(file);
  importFileInput.value = "";
});

timingInputs.forEach((timingInput) => {
  timingInput.addEventListener("change", () => {
    timingInputs[0].setCustomValidity("");
  });
});

medicationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(medicationForm);
  const timings = formData.getAll("timings");
  const firstTimingInput = timingInputs[0];

  if (timings.length === 0) {
    firstTimingInput.setCustomValidity("服用タイミングを1つ以上選択してください。");
    medicationForm.reportValidity();
    return;
  }

  firstTimingInput.setCustomValidity("");

  const medicationDetails = {
    name: formData.get("name").trim(),
    timings,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  };

  if (editingMedicationId) {
    const medicationIndex = medications.findIndex(
      (medication) => medication.id === editingMedicationId,
    );

    if (medicationIndex !== -1) {
      medications[medicationIndex] = { id: editingMedicationId, ...medicationDetails };
    }
  } else {
    medications.push({ id: createMedicationId(), ...medicationDetails });
  }

  saveMedications(medications);
  resetMedicationForm();
  displayMedications();
  displaySchedule();
  displayHistory();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => {
        console.log("Service Worker registered.");
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}