const todayDateElement = document.querySelector("#today-date");
const scheduleElement = document.querySelector("#schedule");
const medicationForm = document.querySelector("#medication-form");
const medicationsList = document.querySelector("#medications-list");
const medicationSubmitButton = document.querySelector("#medication-submit-button");
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

function isMedicationScheduledForDate(medication, dateString) {
  return dateString >= medication.startDate && dateString <= medication.endDate;
}

function getScheduledTimings(medication, dateString) {
  if (!isMedicationScheduledForDate(medication, dateString)) {
    return [];
  }

  return [...medication.timings];
}

function createRecordId() {
  recordSequence += 1;
  return `record-${Date.now()}-${recordSequence}`;
}

function createMedicationId() {
  medicationSequence += 1;
  return `med-${Date.now()}-${medicationSequence}`;
}

function formatTimings(timings) {
  const timingLabels = { morning: "朝", noon: "昼", evening: "晩" };
  return timings.map((timing) => timingLabels[timing]).join("・");
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

function createRecordedStatus(record) {
  const recordedStatus = document.createElement("p");
  recordedStatus.textContent = `✓ 服用済み ${record.takenAt}`;

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
});
