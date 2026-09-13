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
