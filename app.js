// Step 2では、保存せずこの配列の仮データだけを画面に表示します。
const medicineSchedule = [
  { time: "朝", medicines: ["スルピリド50mg"] },
  { time: "昼", medicines: ["スルピリド50mg"] },
  { time: "晩", medicines: ["スルピリド50mg","クービビック25mg"] },
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
      medicineName.textContent = medicine;

      const takenButton = document.createElement("button");
      takenButton.className = "taken-button";
      takenButton.type = "button";
      takenButton.textContent = "飲んだ";

      listItem.append(medicineName, takenButton);
      medicineList.append(listItem);
    });

    timeSlot.append(heading, medicineList);
    scheduleElement.append(timeSlot);
  });
}

displaySchedule();
