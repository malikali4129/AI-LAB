const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const DAYS_PER_YEAR = 365.2425;
const MOON_CYCLE_DAYS = 29.530588;

const fastNumber = new Intl.NumberFormat("en-US");
const decimalNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const STAT_DEFINITIONS = [
  { id: "days", visual: "calendar", updater: "slow", statement: (s) => `A lot has happened in the ${fastNumber.format(s.daysAlive)} days since you were born.` },
  { id: "seconds", visual: "clock", updater: "fast", statement: (s) => `You have experienced around ${fastNumber.format(s.secondsAlive)} seconds of life.` },
  { id: "heartbeats", visual: "pulse", updater: "fast", statement: (s) => `Your heart has beaten about ${fastNumber.format(s.heartbeats)} times so far.` },
  { id: "breaths", visual: "lungs", updater: "fast", statement: (s) => `You have taken about ${fastNumber.format(s.breaths)} breaths.` },
  { id: "blood", visual: "blood", updater: "fast", statement: (s) => `Your body has produced about ${fastNumber.format(s.bloodCells)} red blood cells.` },
  { id: "sleep", visual: "sleep", updater: "slow", statement: (s) => `You have spent roughly ${fastNumber.format(s.sleepHours)} hours sleeping.` },
  { id: "blinks", visual: "eye", updater: "fast", statement: (s) => `You have blinked around ${fastNumber.format(s.blinks)} times.` },
  { id: "steps", visual: "steps", updater: "slow", statement: (s) => `If your pace is average, you have walked about ${fastNumber.format(s.steps)} steps.` },
  { id: "water", visual: "water", updater: "slow", statement: (s) => `You have likely consumed about ${fastNumber.format(s.waterLiters)} liters of water.` },
  { id: "weekends", visual: "weekend", updater: "slow", statement: (s) => `You have lived through around ${fastNumber.format(s.weekendDays)} weekend days.` },
  { id: "moons", visual: "moon", updater: "slow", statement: (s) => `The moon has completed about ${decimalNumber.format(s.moonCycles)} cycles in your lifetime.` },
  { id: "seasons", visual: "season", updater: "slow", statement: (s) => `You have passed through nearly ${fastNumber.format(s.seasons)} seasons.` },
  { id: "birthdays", visual: "cake", updater: "slow", statement: (s) => `You have celebrated ${fastNumber.format(s.birthdays)} birthdays.` },
  { id: "orbit", visual: "orbit", updater: "slow", statement: (s) => `You have traveled around the sun about ${decimalNumber.format(s.yearsAlive)} times.` },
  { id: "next-birthday", visual: "countdown", updater: "fast", statement: (s) => `Your next birthday is in ${s.nextBirthdayCountdown}.` }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isValidDob(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  const min = new Date(1900, 0, 1).getTime();
  return date.getTime() >= min && date.getTime() < now;
}

function parseDob(month, day, year) {
  const m = Number.parseInt(month, 10);
  const d = Number.parseInt(day, 10);
  const y = Number.parseInt(year, 10);
  if (!Number.isInteger(m) || !Number.isInteger(d) || !Number.isInteger(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return isValidDob(date) ? date : null;
}

function getBirthdaysCount(dob, now) {
  let count = now.getFullYear() - dob.getFullYear();
  const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (now < thisYearBirthday) {
    count -= 1;
  }
  return Math.max(0, count);
}

function getNextBirthday(dob, now) {
  const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (now <= thisYearBirthday) {
    return thisYearBirthday;
  }
  return new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
}

function formatCountdown(ms) {
  const safeMs = Math.max(0, ms);
  const days = Math.floor(safeMs / MS_DAY);
  const hours = Math.floor((safeMs % MS_DAY) / MS_HOUR);
  const minutes = Math.floor((safeMs % MS_HOUR) / MS_MINUTE);
  const seconds = Math.floor((safeMs % MS_MINUTE) / MS_SECOND);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getLifeSnapshot(dob, now) {
  const elapsedMs = Math.max(0, now.getTime() - dob.getTime());
  const secondsAlive = Math.floor(elapsedMs / MS_SECOND);
  const minutesAlive = Math.floor(elapsedMs / MS_MINUTE);
  const hoursAlive = Math.floor(elapsedMs / MS_HOUR);
  const daysAlive = Math.floor(elapsedMs / MS_DAY);
  const yearsAlive = elapsedMs / (DAYS_PER_YEAR * MS_DAY);

  const nextBirthday = getNextBirthday(dob, now);
  const nextBirthdayMs = Math.max(0, nextBirthday.getTime() - now.getTime());

  return {
    secondsAlive,
    daysAlive,
    yearsAlive,
    heartbeats: Math.floor(minutesAlive * 72),
    breaths: Math.floor(minutesAlive * 16),
    bloodCells: Math.floor(secondsAlive * 2400000),
    sleepHours: Math.floor(hoursAlive * 0.33),
    blinks: Math.floor(minutesAlive * 15),
    steps: Math.floor(daysAlive * 6000),
    waterLiters: Math.floor(daysAlive * 2.3),
    weekendDays: Math.floor(daysAlive * (2 / 7)),
    moonCycles: daysAlive / MOON_CYCLE_DAYS,
    seasons: Math.floor(yearsAlive * 4),
    birthdays: getBirthdaysCount(dob, now),
    nextBirthdayCountdown: formatCountdown(nextBirthdayMs),
    nextBirthday
  };
}

function createVisualMarkup(type, dob) {
  if (type === "calendar") {
    const weekday = dob.toLocaleDateString(undefined, { weekday: "long" });
    const month = dob.toLocaleDateString(undefined, { month: "short" });
    return `
      <article class="life-stats-calendar-card">
        <header>${weekday}</header>
        <div class="life-stats-calendar-day">${dob.getDate()}</div>
        <footer>${month} ${dob.getFullYear()}</footer>
      </article>
    `;
  }

  if (type === "blood") {
    return `
      <div class="life-stats-blood-wrap" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    `;
  }

  if (type === "pulse") {
    return `
      <div class="life-stats-pulse-wrap" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    `;
  }

  return `<div class="life-stats-icon-wrap" aria-hidden="true">${visualEmoji(type)}</div>`;
}

function visualEmoji(type) {
  const map = {
    clock: "⏱️",
    lungs: "🫁",
    sleep: "🌙",
    eye: "👁️",
    steps: "👣",
    water: "💧",
    weekend: "🎉",
    moon: "🌕",
    season: "🍃",
    cake: "🎂",
    orbit: "🌍",
    countdown: "🎈"
  };
  return map[type] || "✨";
}

function createLifeStatsModule(root) {
  if (!root) return;

  const sectionMap = new Map();
  let activeStatId = STAT_DEFINITIONS[0].id;
  let currentDob = null;
  let updateTimer = null;
  let observer = null;

  root.innerHTML = `
    <section class="life-stats-shell">
      <article class="life-stats-gate" data-life-stats-gate>
        <p class="life-stats-avatar" aria-hidden="true">🧑</p>
        <h3>Life Stats</h3>
        <p class="life-stats-gate-copy">Your Birthdate:</p>

        <form class="life-stats-form" data-life-stats-form novalidate>
          <div class="life-stats-fields">
            <input class="download-input" type="number" min="1" max="12" inputmode="numeric" placeholder="Month" aria-label="Birth month" data-life-month required />
            <input class="download-input" type="number" min="1" max="31" inputmode="numeric" placeholder="Day" aria-label="Birth day" data-life-day required />
            <input class="download-input" type="number" min="1900" max="2100" inputmode="numeric" placeholder="Year" aria-label="Birth year" data-life-year required />
          </div>
          <button type="submit" class="cta-button life-stats-go">Go >>></button>
          <p class="life-stats-note">All values are dynamic estimates for educational use.</p>
          <p class="about-form-status" data-life-status aria-live="polite"></p>
        </form>
      </article>

      <section class="life-stats-story" data-life-stats-story hidden>
        <div class="life-stats-progress" data-life-progress aria-hidden="true"></div>
        <div class="life-stats-sections" data-life-sections></div>
      </section>
    </section>
  `;

  const gate = root.querySelector("[data-life-stats-gate]");
  const form = root.querySelector("[data-life-stats-form]");
  const status = root.querySelector("[data-life-status]");
  const story = root.querySelector("[data-life-stats-story]");
  const sectionsRoot = root.querySelector("[data-life-sections]");
  const progress = root.querySelector("[data-life-progress]");
  const monthInput = root.querySelector("[data-life-month]");
  const dayInput = root.querySelector("[data-life-day]");
  const yearInput = root.querySelector("[data-life-year]");

  function setStatus(message, tone) {
    status.textContent = message;
    status.dataset.state = tone;
  }

  function clearRuntime() {
    if (updateTimer) {
      window.clearInterval(updateTimer);
      updateTimer = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function updateProgressDots() {
    const nodes = [...progress.querySelectorAll("button")];
    nodes.forEach((node) => {
      node.classList.toggle("is-active", node.dataset.statId === activeStatId);
    });
  }

  function updateSection(statId, now) {
    const row = sectionMap.get(statId);
    if (!row || !currentDob) return;

    const snapshot = getLifeSnapshot(currentDob, now);
    row.statement.textContent = row.definition.statement(snapshot);

    if (row.definition.id === "next-birthday") {
      row.meta.textContent = `Target: ${snapshot.nextBirthday.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;
      return;
    }

    row.meta.textContent = `Updated: ${now.toLocaleTimeString()}`;
  }

  function tick() {
    const now = new Date();
    const active = sectionMap.get(activeStatId);
    if (!active) return;

    updateSection(activeStatId, now);

    const shouldSlowUpdate = now.getSeconds() % 15 === 0;
    if (!shouldSlowUpdate) {
      return;
    }

    sectionMap.forEach((entry, id) => {
      if (id !== activeStatId && entry.definition.updater === "slow") {
        updateSection(id, now);
      }
    });
  }

  function buildStory() {
    sectionsRoot.innerHTML = "";
    progress.innerHTML = "";
    sectionMap.clear();

    STAT_DEFINITIONS.forEach((definition, index) => {
      const section = document.createElement("article");
      section.className = "life-stats-section";
      section.dataset.statId = definition.id;
      section.innerHTML = `
        <div class="life-stats-visual life-stats-visual-${definition.visual}">
          ${createVisualMarkup(definition.visual, currentDob)}
        </div>
        <div class="life-stats-text">
          <p class="life-stats-statement">Loading...</p>
          <p class="life-stats-meta">Calculating...</p>
        </div>
      `;

      const statement = section.querySelector(".life-stats-statement");
      const meta = section.querySelector(".life-stats-meta");

      sectionMap.set(definition.id, {
        definition,
        section,
        statement,
        meta
      });

      sectionsRoot.appendChild(section);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "life-stats-dot";
      dot.dataset.statId = definition.id;
      dot.setAttribute("aria-label", `Jump to stat ${index + 1}`);
      dot.addEventListener("click", () => {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      progress.appendChild(dot);
    });

    observer = new IntersectionObserver(
      (entries) => {
        let topEntry = null;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (!topEntry || entry.intersectionRatio > topEntry.intersectionRatio) {
            topEntry = entry;
          }
        });

        if (!topEntry) return;

        activeStatId = topEntry.target.dataset.statId;
        sectionMap.forEach((item, id) => {
          item.section.classList.toggle("is-active", id === activeStatId);
        });
        updateProgressDots();
        updateSection(activeStatId, new Date());
      },
      {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: "0px 0px -10% 0px"
      }
    );

    sectionMap.forEach((entry) => observer.observe(entry.section));

    activeStatId = STAT_DEFINITIONS[0].id;
    sectionMap.forEach((item, id) => {
      item.section.classList.toggle("is-active", id === activeStatId);
    });
    updateProgressDots();

    const now = new Date();
    sectionMap.forEach((entry, id) => {
      if (id === activeStatId || entry.definition.updater === "slow") {
        updateSection(id, now);
      }
    });
  }

  function startStory(dob) {
    currentDob = dob;
    gate.hidden = true;
    story.hidden = false;

    clearRuntime();
    buildStory();
    updateTimer = window.setInterval(tick, 1000);
    tick();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const dob = parseDob(monthInput.value, dayInput.value, yearInput.value);
    if (!dob) {
      setStatus("Enter a valid date of birth (MM/DD/YYYY).", "error");
      return;
    }

    setStatus("", "success");
    startStory(dob);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentDob && !story.hidden) {
      tick();
    }
  });

  root.addEventListener("remove", clearRuntime);
}

window.initLifeStats = createLifeStatsModule;
