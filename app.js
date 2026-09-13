// Step 3では、保存せずこの配列の服用済み状態を画面に表示します。
const medicineSchedule = [
  { time: "朝", medicines: [{ name: "スルピリド50mg", taken: false }] },
  { time: "昼", medicines: [{ name: "スルピリド50mg", taken: false }] },
  {
    time: "晩",
    medicines: [
      { name: "スルピリド50mg", taken: false },
      { name: "クービビック25mg", taken: false },
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

      const medicineName = document.createElement("span");
      medicineName.className = "medicine-name";
      medicineName.textContent = medicine.name;

      const takenButton = document.createElement("button");
      takenButton.className = "taken-button";
      takenButton.type = "button";
      takenButton.textContent = "飲んだ";

      takenButton.addEventListener("click", () => {
        medicine.taken = true;
        takenButton.textContent = "服用済み";
        takenButton.disabled = true;
      });

      listItem.append(medicineName, takenButton);
      medicineList.append(listItem);
    });

    timeSlot.append(heading, medicineList);
    scheduleElement.append(timeSlot);
  });
}

displaySchedule();
