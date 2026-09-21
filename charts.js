/**
 * charts.js — 服薬グラフモジュール (Chart.js v4 使用)
 *
 * 依存: Chart.js CDN, app.js で定義された以下のグローバル変数・関数
 *   medications, medicationRecords,
 *   getScheduledTimings, getTimingLabel, getDatesInRange,
 *   formatDateString, getScheduledDate, getPreviousDate
 *
 * app.js より後にロードされるが、関数は app.js 初期化後に呼ばれるので問題なし。
 */

/* =============================================
   Adherence Calculation
   ============================================= */

/**
 * 過去 N 日分（昨日まで）の日別遵守データを計算する。
 * @param {number} days
 * @returns {{ date: string, scheduled: number, taken: number, rate: number|null }[]}
 */
function calculateAdherence(days) {
  const today = getScheduledDate();
  const endDate = getPreviousDate(today); // yesterday

  // Start date: N days before today
  const startD = new Date();
  startD.setDate(startD.getDate() - days + 1);
  const startDate = formatDateString(startD);

  // Edge case: not enough history yet
  if (startDate > endDate) return [];

  const dates = getDatesInRange(startDate, endDate);

  return dates.map((date) => {
    let scheduled = 0;
    let taken = 0;

    medications.forEach((med) => {
      const timings = getScheduledTimings(med, date);
      scheduled += timings.length;

      timings.forEach((timing) => {
        const label = getTimingLabel(timing);
        const hasRecord = medicationRecords.some(
          (r) =>
            r.medicationId === med.id &&
            r.scheduledDate === date &&
            r.timing === label,
        );
        if (hasRecord) taken++;
      });
    });

    const rate = scheduled > 0 ? Math.round((taken / scheduled) * 100) : null;
    return { date, scheduled, taken, rate };
  });
}

/** "2026-09-21" → "9/21" */
function _shortDate(dateString) {
  const [, m, d] = dateString.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

/** 遵守率から色を返す */
function _rateColor(rate, alpha = 0.85) {
  if (rate === null) return `rgba(226, 232, 240, ${alpha})`;
  if (rate === 100)  return `rgba(16, 185, 129, ${alpha})`;  // green
  if (rate >= 50)    return `rgba(245, 158, 11, ${alpha})`;  // amber
  return `rgba(239, 68, 68, ${alpha})`;                      // red
}

/* =============================================
   Chart Instance
   ============================================= */

let _adherenceChartInstance = null;

/**
 * 日別遵守率の棒グラフを描画する。
 * @param {number} period - 表示する日数
 */
function renderAdherenceChart(period) {
  const data = calculateAdherence(period);
  const canvas = document.getElementById("adherence-chart");
  if (!canvas) return;

  // Destroy previous instance to avoid canvas reuse error
  if (_adherenceChartInstance) {
    _adherenceChartInstance.destroy();
    _adherenceChartInstance = null;
  }

  if (data.length === 0) {
    const wrapper = canvas.closest(".chart-wrapper");
    if (wrapper) {
      wrapper.innerHTML =
        '<p class="chart-empty-message">履歴データがまだありません。</p>';
    }
    return;
  }

  const labels = data.map((d) => _shortDate(d.date));
  const values = data.map((d) => d.rate ?? 0);
  const colors = data.map((d) => _rateColor(d.rate));

  _adherenceChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "遵守率 (%)",
          data: values,
          backgroundColor: colors,
          borderRadius: 5,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: "rgba(226, 232, 240, 0.7)" },
          ticks: {
            callback: (v) => `${v}%`,
            font: { size: 11 },
            maxTicksLimit: 6,
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: period > 14 ? 9 : 11 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = data[ctx.dataIndex];
              if (item.scheduled === 0) return "予定なし";
              return `${item.taken}/${item.scheduled} 回 (${ctx.raw}%)`;
            },
          },
        },
      },
    },
  });
}

/* =============================================
   Per-Medication Adherence Bars
   ============================================= */

/**
 * 薬別の遵守率バーをレンダリングする。
 * @param {number} period
 */
function renderMedicationAdherence(period) {
  const container = document.getElementById("medication-adherence-list");
  if (!container) return;
  container.replaceChildren();

  if (medications.length === 0) {
    const msg = document.createElement("p");
    msg.className = "chart-empty-message";
    msg.textContent = "登録した薬がありません。";
    container.append(msg);
    return;
  }

  const today = getScheduledDate();
  const endDate = getPreviousDate(today);
  const startD = new Date();
  startD.setDate(startD.getDate() - period + 1);
  const startDate = formatDateString(startD);

  medications.forEach((med) => {
    // Clamp dates to the medication's valid range
    const effectiveStart =
      med.startDate > startDate ? med.startDate : startDate;
    const effectiveEnd = med.endDate < endDate ? med.endDate : endDate;

    if (effectiveStart > effectiveEnd) {
      // Medication not active in this period — still show with N/A
      _appendMedAdherenceRow(container, med.name, null);
      return;
    }

    let scheduled = 0;
    let taken = 0;
    const dates = getDatesInRange(effectiveStart, effectiveEnd);

    dates.forEach((date) => {
      const timings = getScheduledTimings(med, date);
      scheduled += timings.length;
      timings.forEach((timing) => {
        const label = getTimingLabel(timing);
        if (
          medicationRecords.some(
            (r) =>
              r.medicationId === med.id &&
              r.scheduledDate === date &&
              r.timing === label,
          )
        ) {
          taken++;
        }
      });
    });

    const rate = scheduled > 0 ? Math.round((taken / scheduled) * 100) : null;
    _appendMedAdherenceRow(container, med.name, rate);
  });
}

function _appendMedAdherenceRow(container, name, rate) {
  const item = document.createElement("div");
  item.className = "med-adherence-item";

  const nameRow = document.createElement("div");
  nameRow.className = "med-adherence-name";

  const nameText = document.createElement("span");
  nameText.textContent = name;

  const rateText = document.createElement("span");
  rateText.className = "adherence-rate-text";
  rateText.textContent = rate === null ? "対象外" : `${rate}%`;
  if (rate === 100) rateText.style.color = "var(--color-success)";
  else if (rate !== null && rate < 50) rateText.style.color = "var(--color-danger)";

  nameRow.append(nameText, rateText);

  const track = document.createElement("div");
  track.className = "adherence-bar-track";

  const fill = document.createElement("div");
  fill.className = "adherence-bar-fill";
  fill.style.width = "0%";
  fill.style.backgroundColor = _rateColor(rate);

  track.append(fill);
  item.append(nameRow, track);
  container.append(item);

  // Animate width after paint
  requestAnimationFrame(() => {
    fill.style.width = `${rate ?? 0}%`;
  });
}

/* =============================================
   Stats Summary
   ============================================= */

/**
 * 期間サマリーカードをレンダリングする。
 * @param {number} period
 */
function renderStatsSummary(period) {
  const container = document.getElementById("stats-summary");
  if (!container) return;
  container.replaceChildren();

  const data = calculateAdherence(period);
  const withData = data.filter((d) => d.scheduled > 0);
  const totalScheduled = withData.reduce((s, d) => s + d.scheduled, 0);
  const totalTaken = withData.reduce((s, d) => s + d.taken, 0);
  const overallRate =
    totalScheduled > 0
      ? Math.round((totalTaken / totalScheduled) * 100)
      : null;
  const fullDays = withData.filter((d) => d.rate === 100).length;
  const missedDays = withData.filter((d) => d.rate === 0).length;

  const title = document.createElement("p");
  title.className = "stats-chart-title";
  title.textContent = `直近${period}日のサマリー`;
  container.append(title);

  const grid = document.createElement("div");
  grid.className = "stats-grid";

  const stats = [
    {
      label: "総合遵守率",
      value: overallRate !== null ? `${overallRate}%` : "—",
    },
    { label: "完全達成日", value: `${fullDays}日` },
    { label: "服用回数", value: `${totalTaken}回` },
    { label: "未服用日", value: `${missedDays}日` },
  ];

  stats.forEach(({ label, value }) => {
    const statItem = document.createElement("div");
    statItem.className = "stat-item";

    const valEl = document.createElement("div");
    valEl.className = "stat-value";
    valEl.textContent = value;

    const lblEl = document.createElement("div");
    lblEl.className = "stat-label";
    lblEl.textContent = label;

    statItem.append(valEl, lblEl);
    grid.append(statItem);
  });

  container.append(grid);
}

/* =============================================
   Initialization (called lazily on first tab open)
   ============================================= */

let _currentPeriod = 7;

/**
 * グラフタブを初期化する。
 * タブを初めて開いた時に app.js から呼ばれる。
 */
function initCharts() {
  renderAdherenceChart(_currentPeriod);
  renderMedicationAdherence(_currentPeriod);
  renderStatsSummary(_currentPeriod);

  // Period buttons
  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newPeriod = parseInt(btn.dataset.period, 10);
      if (newPeriod === _currentPeriod) return;
      _currentPeriod = newPeriod;

      document
        .querySelectorAll(".period-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      renderAdherenceChart(_currentPeriod);
      renderMedicationAdherence(_currentPeriod);
      renderStatsSummary(_currentPeriod);
    });
  });
}

/**
 * グラフを再描画する（外部から服薬記録が更新された時に呼ぶ）。
 */
function refreshCharts() {
  if (!_adherenceChartInstance) return; // not initialized yet
  renderAdherenceChart(_currentPeriod);
  renderMedicationAdherence(_currentPeriod);
  renderStatsSummary(_currentPeriod);
}
