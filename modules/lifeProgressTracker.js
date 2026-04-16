const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

const LUNAR_YEAR_DAYS = 354.367;
const SYNODIC_MONTH_DAYS = 29.530588853;

const ESTIMATED_ANNUAL_EVENTS = [
  {
    id: "new-year",
    label: "New Year",
    icon: "🎆",
    tone: "solar",
    type: "solar",
    month: 0,
    day: 1,
    estimated: false
  },
  {
    id: "ramzan",
    label: "Ramzan (Estimated)",
    icon: "🌙",
    tone: "lunar",
    type: "lunar",
    anchor: new Date(2026, 1, 18, 0, 0, 0),
    estimated: true
  },
  {
    id: "eid-fitr",
    label: "Eid al-Fitr (Estimated)",
    icon: "✨",
    tone: "lunar",
    type: "lunar",
    anchor: new Date(2026, 2, 20, 0, 0, 0),
    estimated: true
  },
  {
    id: "eid-adha",
    label: "Eid al-Adha (Estimated)",
    icon: "🕌",
    tone: "lunar",
    type: "lunar",
    anchor: new Date(2026, 4, 27, 0, 0, 0),
    estimated: true
  }
];

const PROCESS_GROUPS = [
  {
    id: "clock-cycles",
    title: "Clock Cycles",
    description: "Minute to year windows in your local timezone.",
    items: [
      { id: "cycle-minute", label: "Current Minute", icon: "⏱️", tone: "clock", compute: computeMinuteCycle },
      { id: "cycle-hour", label: "Current Hour", icon: "🕐", tone: "clock", compute: computeHourCycle },
      { id: "cycle-day", label: "Current Day", icon: "📅", tone: "clock", compute: computeDayCycle },
      { id: "cycle-month", label: "Current Month", icon: "🗓️", tone: "clock", compute: computeMonthCycle },
      { id: "cycle-year", label: "Current Year", icon: "📈", tone: "clock", compute: computeYearCycle }
    ]
  },
  {
    id: "annual-events",
    title: "Holidays and Annual Events",
    description: "Next target is computed each second from local time.",
    items: ESTIMATED_ANNUAL_EVENTS.map((event) => ({
      id: `event-${event.id}`,
      label: event.label,
      icon: event.icon,
      tone: event.tone,
      compute(now) {
        return computeAnnualEvent(now, event);
      }
    }))
  },
  {
    id: "moon-phases",
    title: "Moon Phases",
    description: "Estimated cycle math, not exact astronomy ephemeris.",
    items: [
      {
        id: "moon-cycle",
        label: "Synodic Cycle Progress",
        icon: "🌔",
        tone: "moon",
        compute: computeMoonCycle
      },
      {
        id: "moon-major",
        label: "Next Major Moon Phase",
        icon: "🌘",
        tone: "moon",
        compute: computeNextMajorMoonPhase
      }
    ]
  },
  {
    id: "long-horizon",
    title: "Long-Term Milestones",
    description: "Decades, quarter-centuries, and deep timeline checkpoints.",
    items: [
      {
        id: "horizon-decade",
        label: "Next Decade Gate",
        icon: "🧭",
        tone: "horizon",
        compute(now) {
          return computeRecurringYearMilestone(now, 10, "Decade");
        }
      },
      {
        id: "horizon-quarter-century",
        label: "Next Quarter-Century",
        icon: "🏛️",
        tone: "horizon",
        compute(now) {
          return computeRecurringYearMilestone(now, 25, "Quarter-century");
        }
      },
      {
        id: "horizon-millennium",
        label: "Year 3000 Checkpoint",
        icon: "🚀",
        tone: "horizon",
        compute: computeMillenniumCheckpoint
      }
    ]
  }
];

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function safeDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }
  return value;
}

function createProgress(now, startDate, endDate, summary, options = {}) {
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return {
      summary,
      targetLabel: "Target unavailable",
      progressPct: 0,
      remainingMs: 0,
      targetMs: null,
      estimated: Boolean(options.estimated)
    };
  }

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const remainingMs = Math.max(0, end.getTime() - now.getTime());

  return {
    summary,
    targetLabel: `Target: ${formatTarget(end)}`,
    progressPct: clampPercent((elapsed / total) * 100),
    remainingMs,
    targetMs: end.getTime(),
    estimated: Boolean(options.estimated)
  };
}

function formatTarget(date) {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "now";
  }

  let remaining = Math.floor(ms / 1000);
  const years = Math.floor(remaining / (365 * 24 * 3600));
  remaining -= years * 365 * 24 * 3600;
  const days = Math.floor(remaining / (24 * 3600));
  remaining -= days * 24 * 3600;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining - minutes * 60;

  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.slice(0, 3).join(" ");
}

function computeMinuteCycle(now) {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + MS_MINUTE);
  const base = createProgress(now, start, end, `Time left: ${formatDuration(end.getTime() - now.getTime())}`);
  base.targetLabel = "Resets at the next minute";
  return base;
}

function computeHourCycle(now) {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + MS_HOUR);
  const base = createProgress(now, start, end, `Time left: ${formatDuration(end.getTime() - now.getTime())}`);
  base.targetLabel = "Resets at the next hour";
  return base;
}

function computeDayCycle(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + MS_DAY);
  return createProgress(now, start, end, `Time left: ${formatDuration(end.getTime() - now.getTime())}`);
}

function computeMonthCycle(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return createProgress(now, start, end, `Time left: ${formatDuration(end.getTime() - now.getTime())}`);
}

function computeYearCycle(now) {
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return createProgress(now, start, end, `Time left: ${formatDuration(end.getTime() - now.getTime())}`);
}

function computeLunarWindow(now, anchorDate) {
  const anchor = safeDate(anchorDate);
  if (!anchor) {
    return { prev: null, next: null };
  }

  const cycleMs = LUNAR_YEAR_DAYS * MS_DAY;
  const anchorMs = anchor.getTime();
  const nowMs = now.getTime();
  const rawCycles = Math.floor((nowMs - anchorMs) / cycleMs);

  let prevMs = anchorMs + rawCycles * cycleMs;
  if (prevMs > nowMs) {
    prevMs -= cycleMs;
  }

  return {
    prev: new Date(prevMs),
    next: new Date(prevMs + cycleMs)
  };
}

function computeAnnualEvent(now, event) {
  if (event.type === "solar") {
    const year = now.getFullYear();
    let next = new Date(year, event.month, event.day, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next = new Date(year + 1, event.month, event.day, 0, 0, 0);
    }

    const prev = new Date(next.getFullYear() - 1, event.month, event.day, 0, 0, 0);
    const result = createProgress(now, prev, next, `In ${formatDuration(next.getTime() - now.getTime())}`);
    result.estimated = false;
    return result;
  }

  const lunarWindow = computeLunarWindow(now, event.anchor);
  const result = createProgress(
    now,
    lunarWindow.prev,
    lunarWindow.next,
    `In ${formatDuration((lunarWindow.next?.getTime() || 0) - now.getTime())}`,
    { estimated: event.estimated }
  );
  return result;
}

function computeMoonCycle(now) {
  const epoch = new Date(2024, 0, 11, 11, 57, 0);
  const cycleMs = SYNODIC_MONTH_DAYS * MS_DAY;
  const elapsedMs = ((now.getTime() - epoch.getTime()) % cycleMs + cycleMs) % cycleMs;

  const start = new Date(now.getTime() - elapsedMs);
  const end = new Date(start.getTime() + cycleMs);
  const result = createProgress(now, start, end, `Next new moon in ${formatDuration(end.getTime() - now.getTime())}`, { estimated: true });
  result.targetLabel = `Cycle target: ${formatTarget(end)}`;
  return result;
}

function phaseNameByPosition(position) {
  if (position < 0.125) return "New Moon";
  if (position < 0.25) return "Waxing Crescent";
  if (position < 0.375) return "First Quarter";
  if (position < 0.5) return "Waxing Gibbous";
  if (position < 0.625) return "Full Moon";
  if (position < 0.75) return "Waning Gibbous";
  if (position < 0.875) return "Last Quarter";
  return "Waning Crescent";
}

function computeNextMajorMoonPhase(now) {
  const epoch = new Date(2024, 0, 11, 11, 57, 0);
  const cycleMs = SYNODIC_MONTH_DAYS * MS_DAY;
  const elapsedMs = ((now.getTime() - epoch.getTime()) % cycleMs + cycleMs) % cycleMs;
  const position = elapsedMs / cycleMs;

  const majorPoints = [
    { point: 0.25, name: "First Quarter" },
    { point: 0.5, name: "Full Moon" },
    { point: 0.75, name: "Last Quarter" },
    { point: 1, name: "New Moon" }
  ];

  const nextPoint = majorPoints.find((item) => item.point > position) || majorPoints[majorPoints.length - 1];
  const remainingRatio = nextPoint.point - position;
  const remainingMs = Math.max(0, Math.floor(remainingRatio * cycleMs));
  const targetDate = new Date(now.getTime() + remainingMs);

  return {
    summary: `${phaseNameByPosition(position)} -> ${nextPoint.name} in ${formatDuration(remainingMs)}`,
    targetLabel: `Target: ${formatTarget(targetDate)}`,
    progressPct: clampPercent(position * 100),
    remainingMs,
    targetMs: targetDate.getTime(),
    estimated: true
  };
}

function computeRecurringYearMilestone(now, stepYears, name) {
  const year = now.getFullYear();
  const startYear = Math.floor(year / stepYears) * stepYears;
  const start = new Date(startYear, 0, 1);
  const end = new Date(startYear + stepYears, 0, 1);
  const result = createProgress(now, start, end, `${name} in ${formatDuration(end.getTime() - now.getTime())}`);
  result.estimated = false;
  return result;
}

function computeMillenniumCheckpoint(now) {
  const start = new Date(2000, 0, 1);
  const end = new Date(3000, 0, 1);
  const result = createProgress(now, start, end, `Year 3000 in ${formatDuration(end.getTime() - now.getTime())}`);
  result.estimated = false;
  return result;
}

function average(values) {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function createLifeProgressTracker(root) {
  if (!root) return;

  const rowRefs = new Map();

  root.innerHTML = `
    <section class="life-progress-shell">
      <div class="life-hero-grid">
        <article class="life-stat-card" data-stat-total>
          <p>Tracked Items</p>
          <strong>0</strong>
          <span>Live rows currently active</span>
        </article>
        <article class="life-stat-card" data-stat-average>
          <p>Average Progress</p>
          <strong>0%</strong>
          <span>Across all visible timelines</span>
        </article>
        <article class="life-stat-card" data-stat-nearest>
          <p>Nearest Target</p>
          <strong>Loading...</strong>
          <span>Live countdown in local time</span>
        </article>
      </div>
      <div class="life-groups" data-life-groups></div>
      <p class="life-footnote" aria-live="polite">Moon and lunar-event rows use estimated cycle math in V1.</p>
    </section>
  `;

  const totalStat = root.querySelector("[data-stat-total] strong");
  const averageStat = root.querySelector("[data-stat-average] strong");
  const nearestStat = root.querySelector("[data-stat-nearest] strong");
  const groupsHost = root.querySelector("[data-life-groups]");

  groupsHost.innerHTML = PROCESS_GROUPS.map((group) => {
    const rows = group.items
      .map(
        (item) => `
        <article class="life-process-row" data-tone="${item.tone}" data-row-id="${item.id}">
          <div class="life-process-head">
            <p class="life-process-label">${item.icon} ${item.label}</p>
            <span class="life-process-remaining">--</span>
          </div>
          <p class="life-process-target">--</p>
          <div class="life-progress-track" role="progressbar" aria-label="${item.label} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span class="life-progress-fill" style="width: 0%"></span>
          </div>
        </article>
      `
      )
      .join("");

    return `
      <section class="life-group-card" aria-labelledby="group-${group.id}">
        <div class="life-group-head">
          <h3 id="group-${group.id}">${group.title}</h3>
          <p>${group.description}</p>
        </div>
        <div class="life-group-rows">${rows}</div>
      </section>
    `;
  }).join("");

  PROCESS_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      const row = root.querySelector(`[data-row-id="${item.id}"]`);
      if (!row) return;
      rowRefs.set(item.id, {
        remaining: row.querySelector(".life-process-remaining"),
        target: row.querySelector(".life-process-target"),
        bar: row.querySelector(".life-progress-track"),
        fill: row.querySelector(".life-progress-fill")
      });
    });
  });

  function tick() {
    const now = new Date();
    const allRows = [];

    PROCESS_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        const result = item.compute(now);
        const rowRef = rowRefs.get(item.id);
        if (!rowRef || !result) return;

        const progress = clampPercent(result.progressPct);
        rowRef.remaining.textContent = result.summary || "--";
        rowRef.target.textContent = `${result.targetLabel || "--"}${result.estimated ? " • estimated" : ""}`;
        rowRef.fill.style.width = `${progress.toFixed(2)}%`;
        rowRef.bar.setAttribute("aria-valuenow", progress.toFixed(1));

        allRows.push({
          id: item.id,
          label: item.label,
          progress,
          remainingMs: Number.isFinite(result.remainingMs) ? result.remainingMs : Number.POSITIVE_INFINITY
        });
      });
    });

    totalStat.textContent = String(allRows.length);
    averageStat.textContent = `${average(allRows.map((item) => item.progress)).toFixed(1)}%`;

    const nearest = allRows
      .filter((item) => Number.isFinite(item.remainingMs) && item.remainingMs > 0)
      .sort((a, b) => a.remainingMs - b.remainingMs)[0];

    nearestStat.textContent = nearest ? `${nearest.label} • ${formatDuration(nearest.remainingMs)}` : "No upcoming target";
  }

  tick();
  const timer = window.setInterval(tick, MS_SECOND);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      tick();
    }
  });

  window.addEventListener("beforeunload", () => {
    window.clearInterval(timer);
  });
}

window.initLifeProgressTracker = createLifeProgressTracker;
