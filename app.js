// Step 4では、保存せず「飲んだ」ボタンを押した薬に時刻入力欄を表示します。
const medicineSchedule = [
  { time: "朝", medicines: [{ name: "スルピリド50mg" }] },
  { time: "昼", medicines: [{ name: "スルピリド50mg" }] },
  {
    time: "晩",
    medicines: [
      { name: "スルピリド50mg" },
      { name: "クービビック25mg" },
    ],
  },
];

const todayDateElement = document.querySelector("#today-date");
const scheduleElement = document.querySelector("#schedule");

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
        const timeLabel = document.createElement("label");
        timeLabel.textContent = "服用時刻";

        const timeInput = document.createElement("input");
        timeInput.type = "time";
        timeInput.value = getCurrentTime();

        timeLabel.append(document.createElement("br"), timeInput);
        medicineDetails.append(timeLabel);
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
