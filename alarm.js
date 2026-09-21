/**
 * alarm.js — アラーム / 通知モジュール
 * storage.js の loadAlarmSettings / saveAlarmSettings を使用
 */

/* =============================================
   Notification API Helpers
   ============================================= */

/**
 * 通知許可をリクエストする。
 * @returns {Promise<boolean>} 許可されていれば true
 */
async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Service Worker 経由で通知を表示する。
 * SW未対応の場合は Notification API を直接使う。
 * @param {string} timingLabel - "朝" / "昼" / "晩"
 */
async function showMedicationNotification(timingLabel) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title = "服薬の時間です 💊";
  const body = `${timingLabel}の薬を服用する時間です`;
  const icon = "./icons/icon-192.png";
  const tag = `med-alarm-${timingLabel}`;

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon,
        badge: icon,
        tag,
        requireInteraction: true,
        data: { url: "./" },
      });
    } else {
      new Notification(title, { body, icon, tag });
    }
  } catch (err) {
    console.warn("[MedTracker] 通知の表示に失敗しました:", err);
  }
}

/* =============================================
   Alarm Check (Polling — every 30 s)
   ============================================= */

let _alarmIntervalId = null;
let _lastTriggeredMinute = ""; // "HH:MM" format — prevent double-fire in same minute

const ALARM_TIMING_KEYS = [
  { key: "morning", label: "朝" },
  { key: "noon",    label: "昼" },
  { key: "evening", label: "晩" },
];

function _checkAlarms() {
  const settings = loadAlarmSettings();
  if (!settings.enabled) return;

  const now = new Date();
  const currentMinute =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  // Already fired this minute?
  if (currentMinute === _lastTriggeredMinute) return;

  for (const { key, label } of ALARM_TIMING_KEYS) {
    if (settings[key] === currentMinute) {
      _lastTriggeredMinute = currentMinute;
      showMedicationNotification(label);
      break; // at most one alarm per minute
    }
  }
}

/** ポーリングを開始する（多重起動を防ぐ）*/
function startAlarmChecking() {
  if (_alarmIntervalId !== null) return;
  _checkAlarms(); // immediate check on start
  _alarmIntervalId = setInterval(_checkAlarms, 30_000);
}

/** ポーリングを停止する */
function stopAlarmChecking() {
  if (_alarmIntervalId !== null) {
    clearInterval(_alarmIntervalId);
    _alarmIntervalId = null;
  }
}

/* =============================================
   Alarm Settings UI
   ============================================= */

/**
 * #alarm-settings-panel にアラーム設定UIをレンダリングする。
 * app.js の初期化時に呼び出す。
 */
function renderAlarmSettings() {
  const panel = document.getElementById("alarm-settings-panel");
  if (!panel) return;

  // Clear
  panel.replaceChildren();

  const settings = loadAlarmSettings();

  /* --- Toggle Row --- */
  const toggleRow = document.createElement("div");
  toggleRow.className = "alarm-toggle-row";

  const toggleLabel = document.createElement("span");
  toggleLabel.className = "alarm-toggle-label";
  toggleLabel.textContent = "アラームを有効にする";

  const toggleId = "alarm-enabled-toggle";
  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.className = "toggle-input";
  toggleInput.id = toggleId;
  toggleInput.checked = settings.enabled;

  const toggleSwitch = document.createElement("label");
  toggleSwitch.className = "toggle-switch";
  toggleSwitch.htmlFor = toggleId;
  toggleSwitch.setAttribute("aria-label", "アラームの有効・無効");

  toggleRow.append(toggleLabel, toggleInput, toggleSwitch);
  panel.append(toggleRow);

  /* --- Notification Permission Button (if needed) --- */
  if ("Notification" in window && Notification.permission !== "granted") {
    const permBtn = document.createElement("button");
    permBtn.className = "btn-outline permission-btn";
    permBtn.type = "button";
    permBtn.innerHTML = '<span class="btn-icon" aria-hidden="true">🔔</span> 通知を許可する';
    permBtn.id = "alarm-permission-btn";

    permBtn.addEventListener("click", async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        permBtn.remove();
        updateTimingInputsState();
      } else {
        permBtn.textContent = "通知が拒否されています（ブラウザ設定から変更してください）";
        permBtn.disabled = true;
      }
    });

    panel.append(permBtn);
  }

  /* --- Timing Rows (朝/昼/晩) --- */
  const timingsContainer = document.createElement("div");
  timingsContainer.className = "alarm-timings";
  timingsContainer.id = "alarm-timings-container";

  const timeInputMap = {};

  for (const { key, label } of ALARM_TIMING_KEYS) {
    const row = document.createElement("div");
    row.className = "alarm-timing-row";

    const rowLabel = document.createElement("span");
    rowLabel.className = "alarm-timing-label";
    rowLabel.textContent = label;

    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.className = "form-input alarm-time-input";
    timeInput.id = `alarm-time-${key}`;
    timeInput.value = settings[key];
    timeInput.disabled = !settings.enabled;
    timeInput.setAttribute("aria-label", `${label}のアラーム時刻`);

    timeInput.addEventListener("change", () => {
      settings[key] = timeInput.value;
      saveAlarmSettings(settings);
    });

    timeInputMap[key] = timeInput;
    row.append(rowLabel, timeInput);
    timingsContainer.append(row);
  }

  panel.append(timingsContainer);

  /* --- Toggle change handler --- */
  function updateTimingInputsState() {
    const enabled = settings.enabled;
    for (const input of Object.values(timeInputMap)) {
      input.disabled = !enabled;
    }
  }

  toggleInput.addEventListener("change", () => {
    settings.enabled = toggleInput.checked;
    saveAlarmSettings(settings);
    updateTimingInputsState();

    if (settings.enabled) {
      startAlarmChecking();
    } else {
      stopAlarmChecking();
    }
  });

  /* --- Test Notification Button --- */
  if ("Notification" in window) {
    const testBtn = document.createElement("button");
    testBtn.className = "btn-outline alarm-test-btn";
    testBtn.type = "button";
    testBtn.innerHTML = '<span class="btn-icon" aria-hidden="true">🔔</span> テスト通知を送る';
    testBtn.id = "alarm-test-btn";

    testBtn.addEventListener("click", async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        showMedicationNotification("テスト");
      } else {
        alert("通知が許可されていません。「通知を許可する」ボタンを先に押してください。");
      }
    });

    panel.append(testBtn);
  }

  /* --- iOS Notice --- */
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const notice = document.createElement("p");
    notice.className = "alarm-notice";
    notice.textContent =
      "※ iOSでは、アプリをホーム画面に追加してPWAとして起動している場合のみアラームが動作します（iOS 16.4以降）。";
    panel.append(notice);
  } else if (!("serviceWorker" in navigator)) {
    const notice = document.createElement("p");
    notice.className = "alarm-notice";
    notice.textContent =
      "※ このブラウザはService Workerに対応していないため、アプリを開いている間のみアラームが動作します。";
    panel.append(notice);
  }
}
