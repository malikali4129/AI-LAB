const DEFAULT_WHEEL_SETS = [
  ["Ali", "Hanan", "Hafeez", "Subhan", "Ayaan", "Zain", "Sara"]
];

const WHEEL_THEMES = [
  ["#2f6cff", "#ffcc34", "#ff4d57", "#32d96d"],
  ["#6e86ff", "#f9bf33", "#e63748", "#34c06a"],
  ["#5ffbff", "#9d7dff", "#ff73d9", "#74f7b3"]
];

function createWheelSoundEngine() {
  let audioContext;

  function getCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function tone(freq, duration = 0.08, gainValue = 0.07, type = "sine") {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  return {
    tick() {
      tone(640, 0.03, 0.025, "square");
    },
    spin() {
      tone(360, 0.1, 0.05, "triangle");
    },
    win() {
      tone(520, 0.12, 0.08, "sine");
      setTimeout(() => tone(760, 0.12, 0.08, "sine"), 90);
      setTimeout(() => tone(1020, 0.12, 0.08, "sine"), 180);
    },
    remove() {
      tone(240, 0.1, 0.06, "sawtooth");
    }
  };
}

function cloneWheelSet(index) {
  const names = DEFAULT_WHEEL_SETS[index % DEFAULT_WHEEL_SETS.length];
  return {
    id: `wheel-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    title: `Wheel ${index + 1}`,
    names: [...names],
    rotation: 0,
    themeIndex: index % WHEEL_THEMES.length,
    lastWinner: ""
  };
}

function normalizeAngle(value) {
  return ((value % 360) + 360) % 360;
}

function parseNames(value) {
  return value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function uniqueWheelTitle(existingWheels, baseTitle = "Wheel") {
  let index = existingWheels.length + 1;
  let title = `${baseTitle} ${index}`;
  const existingTitles = new Set(existingWheels.map((wheel) => wheel.title.toLowerCase()));
  while (existingTitles.has(title.toLowerCase())) {
    index += 1;
    title = `${baseTitle} ${index}`;
  }
  return title;
}

function createWheelPickerApp(root) {
  if (!root) return;

  const sounds = createWheelSoundEngine();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    wheels: [cloneWheelSet(0)],
    activeWheelId: null,
    results: [],
    modalWinners: [],
    spinning: false
  };

  state.activeWheelId = state.wheels[0].id;

  root.innerHTML = `
    <div class="wheel-app-shell">
      <div class="wheel-board-shell">
        <div class="wheel-board" data-wheel-board></div>
        <div class="wheel-toolbar">
          <button type="button" class="cta-button" data-spin-all>Spin wheel</button>
          <button type="button" class="ghost-button" data-add-wheel>Add wheel</button>
        </div>
      </div>

      <div class="wheel-sidebar">
        <div class="wheel-tabs" role="tablist" aria-label="Wheel controls"></div>
        <div class="wheel-panel" data-wheel-panel></div>
      </div>
    </div>
  `;

  const board = root.querySelector("[data-wheel-board]");
  const panel = root.querySelector("[data-wheel-panel]");
  const tabs = root.querySelector(".wheel-tabs");
  const spinAllButton = root.querySelector("[data-spin-all]");
  const addWheelButton = root.querySelector("[data-add-wheel]");
  const modal = document.getElementById("wheel-results-modal");
  const modalOutput = document.getElementById("wheel-modal-output");
  const modalClose = document.getElementById("wheel-modal-close");
  const modalCloseSecondary = document.getElementById("wheel-modal-close-secondary");
  const modalRemove = document.getElementById("wheel-modal-remove");

  function activeWheel() {
    return state.wheels.find((wheel) => wheel.id === state.activeWheelId) || state.wheels[0];
  }

  function openModal() {
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
  }

  function setActiveWheel(id) {
    state.activeWheelId = id;
    renderTabs();
    renderPanel();
  }

  function buildWheelMarkup(wheel) {
    return `
      <article class="wheel-card" data-wheel-card data-wheel-id="${wheel.id}">
        <div class="wheel-card-head">
          <div>
            <p class="wheel-card-label">${escapeHtml(wheel.title)}</p>
            <h3>${wheel.names.length} names</h3>
          </div>
          <span class="wheel-count">${wheel.names.length}</span>
        </div>
        <div class="wheel-disc-shell">
          <div class="wheel-pointer" aria-hidden="true"></div>
          <canvas class="wheel-disc" data-wheel-canvas data-wheel-id="${wheel.id}" aria-label="${escapeHtml(wheel.title)}"></canvas>
          <div class="wheel-center" aria-hidden="true">
            <span>${escapeHtml(wheel.title)}</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderBoard() {
    board.innerHTML = state.wheels.map((wheel) => buildWheelMarkup(wheel)).join("");
    renderWheels();
  }

  function wheelTextColor(index) {
    return index % 2 === 0 ? "#07111c" : "#0b0f16";
  }

  function drawWheel(canvas, wheel) {
    const names = wheel.names.length ? wheel.names : ["Empty"];
    const rect = canvas.getBoundingClientRect();
    const displaySize = Math.max(280, Math.min(rect.width || 320, 520));
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(displaySize * ratio);
    canvas.height = Math.floor(displaySize * ratio);
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, displaySize, displaySize);

    const center = displaySize / 2;
    const radius = center - 10;
    const segmentAngle = (Math.PI * 2) / names.length;
    const startAngle = -Math.PI / 2;
    const theme = WHEEL_THEMES[wheel.themeIndex % WHEEL_THEMES.length];

    const gradient = context.createRadialGradient(center * 0.85, center * 0.8, 24, center, center, radius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    gradient.addColorStop(1, "rgba(4, 6, 12, 0.95)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(center, center, radius + 8, 0, Math.PI * 2);
    context.fill();

    names.forEach((name, index) => {
      const sliceStart = startAngle + index * segmentAngle;
      const sliceEnd = sliceStart + segmentAngle;
      const color = theme[index % theme.length];

      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, sliceStart, sliceEnd);
      context.closePath();
      context.fillStyle = color;
      context.fill();

      context.strokeStyle = "rgba(255, 255, 255, 0.18)";
      context.lineWidth = 2;
      context.stroke();

      context.save();
      context.translate(center, center);
      context.rotate(sliceStart + segmentAngle / 2);
      context.translate(radius * 0.63, 0);
      context.rotate(Math.PI / 2);
      context.fillStyle = wheelTextColor(index);
      context.font = `600 ${Math.max(13, displaySize * 0.045)}px Poppins, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const maxWidth = radius * 0.78;
      let text = name;
      while (context.measureText(text).width > maxWidth && text.length > 1) {
        text = `${text.slice(0, -1)}`;
      }
      if (text !== name) {
        text = `${text.slice(0, Math.max(1, text.length - 1))}…`;
      }
      context.fillText(text, 0, 0);
      context.restore();
    });

    context.beginPath();
    context.arc(center, center, radius * 0.26, 0, Math.PI * 2);
    context.fillStyle = "#d8dde7";
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.55)";
    context.lineWidth = 2;
    context.stroke();
  }

  function renderWheels() {
    const canvases = [...board.querySelectorAll("[data-wheel-canvas]")];
    canvases.forEach((canvas) => {
      const wheel = state.wheels.find((item) => item.id === canvas.dataset.wheelId);
      if (!wheel) return;
      drawWheel(canvas, wheel);
      canvas.style.transitionDuration = state.spinning ? "4.8s" : "0ms";
      canvas.style.transform = `rotate(${wheel.rotation}deg)`;
    });
  }

  function renderTabs() {
    const wheelTabs = state.wheels
      .map((wheel) => {
        const isActive = state.activeWheelId === wheel.id;
        return `
          <button type="button" class="wheel-tab ${isActive ? "is-active" : ""}" data-wheel-tab="${wheel.id}" role="tab" aria-selected="${isActive ? "true" : "false"}">
            <span>${escapeHtml(wheel.title)}</span>
            <strong>${wheel.names.length}</strong>
          </button>
        `;
      })
      .join("");

    const resultsActive = state.activeWheelId === "results";
    tabs.innerHTML = `
      ${wheelTabs}
      <button type="button" class="wheel-tab ${resultsActive ? "is-active" : ""}" data-wheel-tab="results" role="tab" aria-selected="${resultsActive ? "true" : "false"}">
        <span>Results</span>
        <strong>${state.results.length}</strong>
      </button>
    `;
  }

  function renderPanel() {
    if (state.activeWheelId === "results") {
      const historyMarkup = state.results.length
        ? state.results
            .map((entry) => {
              const winnerLine = entry.winners.map((winner) => `<span>${escapeHtml(winner.label)}</span>`).join("");
              return `
                <div class="wheel-history-item">
                  <div>
                    <strong>${new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                    <p>${winnerLine}</p>
                  </div>
                </div>
              `;
            })
            .join("")
        : '<div class="wheel-empty-state">Spin the wheels to build your results list.</div>';

      panel.innerHTML = `
        <div class="wheel-panel-block">
          <p class="download-label">Results</p>
          <div class="wheel-results-list">
            ${historyMarkup}
          </div>
        </div>
      `;
      return;
    }

    const wheel = activeWheel();
    if (!wheel) {
      panel.innerHTML = '<div class="wheel-empty-state">No active wheel selected.</div>';
      return;
    }

    panel.innerHTML = `
      <div class="wheel-panel-block">
        <p class="download-label">Active wheel</p>
        <label class="wheel-field-label" for="wheel-title-input">Wheel title</label>
        <input id="wheel-title-input" class="download-input" type="text" value="${escapeHtml(wheel.title)}" />

        <label class="wheel-field-label" for="wheel-names-input">Names</label>
        <textarea id="wheel-names-input" class="wheel-names-input" rows="11">${escapeHtml(wheel.names.join("\n"))}</textarea>

        <div class="wheel-panel-actions">
          <button type="button" class="ghost-button" data-wheel-shuffle>Shuffle</button>
          <button type="button" class="ghost-button" data-wheel-sort>Sort</button>
          <button type="button" class="ghost-button" data-wheel-theme>Customize</button>
          <button type="button" class="ghost-button" data-wheel-remove ${state.wheels.length <= 1 ? "disabled" : ""}>Remove wheel</button>
        </div>
      </div>
    `;

    const titleInput = panel.querySelector("#wheel-title-input");
    const namesInput = panel.querySelector("#wheel-names-input");
    const shuffleBtn = panel.querySelector("[data-wheel-shuffle]");
    const sortBtn = panel.querySelector("[data-wheel-sort]");
    const themeBtn = panel.querySelector("[data-wheel-theme]");
    const removeBtn = panel.querySelector("[data-wheel-remove]");

    titleInput.addEventListener("input", () => {
      wheel.title = titleInput.value.trim() || "Wheel";
      renderTabs();
      renderBoard();
    });

    namesInput.addEventListener("input", () => {
      wheel.names = parseNames(namesInput.value);
      renderTabs();
      renderBoard();
    });

    shuffleBtn.addEventListener("click", () => {
      wheel.names = shuffleArray(wheel.names);
      namesInput.value = wheel.names.join("\n");
      sounds.tick();
      renderTabs();
      renderBoard();
    });

    sortBtn.addEventListener("click", () => {
      wheel.names = [...wheel.names].sort((a, b) => a.localeCompare(b));
      namesInput.value = wheel.names.join("\n");
      sounds.tick();
      renderTabs();
      renderBoard();
    });

    themeBtn.addEventListener("click", () => {
      wheel.themeIndex = (wheel.themeIndex + 1) % WHEEL_THEMES.length;
      sounds.tick();
      renderBoard();
    });

    removeBtn.addEventListener("click", () => {
      if (state.wheels.length <= 1) return;
      const wheelIndex = state.wheels.findIndex((item) => item.id === wheel.id);
      state.wheels.splice(wheelIndex, 1);
      state.activeWheelId = state.wheels[Math.max(0, wheelIndex - 1)]?.id || state.wheels[0].id;
      renderTabs();
      renderBoard();
      renderPanel();
    });
  }

  function setSpinningState(active) {
    state.spinning = active;
    spinAllButton.disabled = active;
    addWheelButton.disabled = active;
    tabs.querySelectorAll("button").forEach((button) => {
      if (button.dataset.wheelTab !== "results") {
        button.disabled = active;
      }
    });
  }

  function resultLabelForWheel(wheel, winner) {
    return `${wheel.title}: ${winner}`;
  }

  function openWinnerModal(winners) {
    state.modalWinners = winners;
    modalOutput.innerHTML = winners.length
      ? winners.map((winner) => `<div class="wheel-winner-line">${escapeHtml(winner.label)}</div>`).join("")
      : '<div class="wheel-empty-state">No winner selected.</div>';
    openModal();
  }

  function removeWinnersFromWheels() {
    if (!state.modalWinners.length) {
      closeModal();
      return;
    }

    state.modalWinners.forEach((winner) => {
      const wheel = state.wheels.find((item) => item.id === winner.wheelId);
      if (!wheel) return;
      const index = wheel.names.indexOf(winner.name);
      if (index >= 0) {
        wheel.names.splice(index, 1);
      }
    });

    state.modalWinners = [];
    closeModal();
    state.activeWheelId = state.wheels.some((wheel) => wheel.id === state.activeWheelId) ? state.activeWheelId : state.wheels[0].id;
    renderTabs();
    renderBoard();
    renderPanel();
  }

  function getWinnerForWheel(wheel) {
    if (!wheel.names.length) {
      return null;
    }

    const names = [...wheel.names];
    const winnerIndex = Math.floor(Math.random() * names.length);
    const segmentAngle = 360 / names.length;
    const currentRotation = normalizeAngle(wheel.rotation);
    const targetRotation = normalizeAngle(360 - (winnerIndex * segmentAngle + segmentAngle / 2));
    const delta = normalizeAngle(targetRotation - currentRotation);
    const extraTurns = 3 + Math.floor(Math.random() * 2);
    return {
      name: names[winnerIndex],
      winnerIndex,
      finalRotation: wheel.rotation + extraTurns * 360 + delta
    };
  }

  function animateWheelToRotation(wheel, canvas, finalRotation) {
    return new Promise((resolve) => {
      if (reducedMotion) {
        wheel.rotation = finalRotation;
        canvas.style.transitionDuration = "0ms";
        canvas.style.transform = `rotate(${finalRotation}deg)`;
        resolve();
        return;
      }

      const handleEnd = () => {
        canvas.removeEventListener("transitionend", handleEnd);
        resolve();
      };

      canvas.addEventListener("transitionend", handleEnd, { once: true });
      requestAnimationFrame(() => {
        wheel.rotation = finalRotation;
        canvas.style.transitionDuration = "4.8s";
        canvas.style.transform = `rotate(${finalRotation}deg)`;
      });
    });
  }

  async function spinWheel(wheel) {
    const canvas = board.querySelector(`[data-wheel-canvas][data-wheel-id="${wheel.id}"]`);
    if (!canvas || wheel.names.length === 0) {
      return null;
    }

    const choice = getWinnerForWheel(wheel);
    if (!choice) return null;

    sounds.spin();
    await animateWheelToRotation(wheel, canvas, choice.finalRotation);
    sounds.tick();
    wheel.lastWinner = choice.name;
    return {
      wheelId: wheel.id,
      wheelTitle: wheel.title,
      name: choice.name,
      label: resultLabelForWheel(wheel, choice.name)
    };
  }

  async function spinAllWheels() {
    if (state.spinning) return;

    const availableWheels = state.wheels.filter((wheel) => wheel.names.length > 0);
    if (!availableWheels.length) {
      return;
    }

    setSpinningState(true);
    const winners = [];

    for (const wheel of availableWheels) {
      // Spin sequentially so the motion feels deliberate and the audio stays readable.
      // The delays are short enough to keep the interaction snappy.
      // eslint-disable-next-line no-await-in-loop
      const result = await spinWheel(wheel);
      if (result) {
        winners.push(result);
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    state.results.unshift({
      id: `result-${Date.now()}`,
      timestamp: Date.now(),
      winners
    });
    state.results = state.results.slice(0, 8);

    renderTabs();
    renderBoard();
    renderPanel();
    openWinnerModal(winners);
    sounds.win();
    setSpinningState(false);
  }

  function addWheel() {
    const nextIndex = state.wheels.length;
    const nextWheel = {
      id: `wheel-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: uniqueWheelTitle(state.wheels),
      names: [...DEFAULT_WHEEL_SETS[nextIndex % DEFAULT_WHEEL_SETS.length]],
      rotation: 0,
      themeIndex: nextIndex % WHEEL_THEMES.length,
      lastWinner: ""
    };

    state.wheels.push(nextWheel);
    setActiveWheel(nextWheel.id);
    renderBoard();
  }

  function refreshWheelControls() {
    spinAllButton.disabled = state.spinning;
    addWheelButton.disabled = state.spinning;
  }

  function syncWheelCanvases() {
    requestAnimationFrame(() => {
      renderWheels();
    });
  }

  root.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-wheel-tab]");
    if (tab) {
      setActiveWheel(tab.dataset.wheelTab);
      return;
    }
  });

  spinAllButton.addEventListener("click", spinAllWheels);
  addWheelButton.addEventListener("click", addWheel);

  modalClose.addEventListener("click", closeModal);
  modalCloseSecondary.addEventListener("click", closeModal);
  modalRemove.addEventListener("click", removeWinnersFromWheels);
  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

  window.addEventListener("resize", syncWheelCanvases);

  renderTabs();
  renderBoard();
  renderPanel();
  refreshWheelControls();
}

window.initWheelPicker = createWheelPickerApp;
