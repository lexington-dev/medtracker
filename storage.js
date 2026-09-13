const RECORDS_STORAGE_KEY = "medicationRecords";

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
