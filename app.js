const todayDateElement = document.querySelector("#today-date");
const scheduleElement = document.querySelector("#schedule");
const medicationRecords = [];
let recordSequence = 0;

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

function createRecordId() {
  recordSequence += 1;
  return `record-${Date.now()}-${recordSequence}`;
}

function displaySchedule() {
  todayDateElement.textContent = formatToday();

  medicineSchedule.forEach((slot) => {
    const timeSlot = document.createElement("section");
    timeSlot.className = "time-slot";

    const heading = document.createElement("h2");
    heading.textContent = `【${slot.time}】`;

    const medicineList = document.createElement("ul");
    medicineList.className = "medicine-list";

    slot.medicines.forEach((medicine) => {
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
            timing: slot.time,
            takenAt: timeInput.value,
            recordedAt: new Date().toISOString(),
          };

          medicationRecords.push(medicationRecord);

          takenButton.textContent = "服用済み";

          const recordedStatus = document.createElement("p");
          recordedStatus.textContent = `✓ 服用済み ${medicationRecord.takenAt}`;

          timeConfirmation.replaceWith(recordedStatus);
        });

        timeConfirmation.append(timeLabel, recordButton);
        medicineDetails.append(timeConfirmation);
        takenButton.disabled = true;
      });

      listItem.append(medicineDetails, takenButton);
      medicineList.append(listItem);
    });

    timeSlot.append(heading, medicineList);
    scheduleElement.append(timeSlot);
  });
}

displaySchedule();
