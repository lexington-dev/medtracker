const RECORDS_STORAGE_KEY = "medicationRecords";
const MEDICATIONS_STORAGE_KEY = "medications";

function loadRecords() {
  const savedRecords = localStorage.getItem(RECORDS_STORAGE_KEY);

  if (!savedRecords) {
    return [];
  }

  try {
    const records = JSON.parse(savedRecords);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function loadMedications() {
  const savedMedications = localStorage.getItem(MEDICATIONS_STORAGE_KEY);

  if (!savedMedications) {
    return [];
  }

  try {
    const medications = JSON.parse(savedMedications);
    return Array.isArray(medications) ? medications : [];
  } catch {
    return [];
  }
}

function saveMedications(medications) {
  localStorage.setItem(MEDICATIONS_STORAGE_KEY, JSON.stringify(medications));
}

/* ===== Alarm Settings ===== */
const ALARM_STORAGE_KEY = "alarmSettings";

const ALARM_DEFAULTS = {
  enabled: false,
  morning: "08:00",
  noon: "12:00",
  evening: "20:00",
};

function loadAlarmSettings() {
  const saved = localStorage.getItem(ALARM_STORAGE_KEY);

  if (!saved) {
    return { ...ALARM_DEFAULTS };
  }

  try {
    const parsed = JSON.parse(saved);
    // Merge with defaults to handle missing keys from old versions
    return { ...ALARM_DEFAULTS, ...parsed };
  } catch {
    return { ...ALARM_DEFAULTS };
  }
}

function saveAlarmSettings(settings) {
  localStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(settings));
}
