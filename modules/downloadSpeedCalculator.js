function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const FILE_SIZE_FACTORS = {
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4
};

const FILE_SIZE_OPTIONS = ["KB", "MB", "GB", "TB"];

const SPEED_FACTORS_BITS = {
  Kbit: 1000,
  Mbit: 1000 ** 2,
  Gbit: 1000 ** 3,
  KByte: 8 * 1024,
  MByte: 8 * 1024 ** 2,
  GByte: 8 * 1024 ** 3
};

const SPEED_UNIT_OPTIONS = ["Kbit", "Mbit", "Gbit", "KByte", "MByte", "GByte"];

const TIME_DIVISOR = {
  sec: 1,
  min: 60,
  hour: 3600
};

const SPEED_INTERVAL_OPTIONS = ["sec", "min", "hour"];

const AUTO_SPEED_TEST_URL = "https://speed.cloudflare.com/__down";
const AUTO_SPEED_TEST_BYTES = 8_000_000;

function secondsToClock(totalSeconds) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return { hrs, mins, secs };
}

function calculateDownloadMetrics(fileSizeValue, fileSizeUnit, speedValue, speedUnit, speedInterval) {
  const fileSizeBytes = fileSizeValue * FILE_SIZE_FACTORS[fileSizeUnit];
  const fileSizeBits = fileSizeBytes * 8;
  const bitsPerInterval = speedValue * SPEED_FACTORS_BITS[speedUnit];
  const bitsPerSecond = bitsPerInterval / TIME_DIVISOR[speedInterval];
  const totalSeconds = fileSizeBits / bitsPerSecond;
  const clock = secondsToClock(totalSeconds);

  return {
    fileSizeBytes,
    bitsPerSecond,
    totalSeconds,
    clock
  };
}

function renderOptions(options, selectedValue) {
  return options
    .map((option) => `<option value="${option}"${option === selectedValue ? " selected" : ""}>${option}</option>`)
    .join("");
}

function formatModeLabel(mode) {
  return mode === "auto" ? "Auto mode" : "Manual mode";
}

function buildResultMarkup(result) {
  const modeLabel = formatModeLabel(result.mode);
  const speedLine = result.mode === "auto"
    ? `${formatNumber(result.speedValue)} Mbit/sec`
    : `${formatNumber(result.speedValue)} ${result.speedUnit}/${result.speedInterval}`;

  return `
    <div class="speed-row"><strong>Mode:</strong> ${escapeHtml(modeLabel)}</div>
    <div class="speed-row"><strong>File size:</strong> ${formatNumber(result.fileSizeValue)} ${escapeHtml(result.fileSizeUnit)}</div>
    <div class="speed-row"><strong>Speed:</strong> ${escapeHtml(speedLine)}</div>
    <div class="speed-row"><strong>Equivalent:</strong> ${formatNumber(result.metrics.bitsPerSecond)} bit/sec</div>
    <div class="speed-row"><strong>Total time:</strong> ${result.metrics.clock.hrs}h ${result.metrics.clock.mins}m ${result.metrics.clock.secs}s (${formatNumber(result.metrics.totalSeconds, 2)} sec)</div>
    <div class="speed-row"><strong>Source:</strong> ${escapeHtml(result.sourceLabel)}</div>
    ${result.mode === "auto" && result.testSeconds > 0 ? `<div class="speed-row"><strong>Test payload:</strong> ${formatNumber(result.testBytes / (1024 ** 2), 2)} MB in ${formatNumber(result.testSeconds, 2)} sec</div>` : ""}
    ${result.mode === "auto" && result.testSeconds <= 0 ? `<div class="speed-row"><strong>Test payload:</strong> Browser connection estimate used</div>` : ""}
    <div class="speed-row"><strong>Total data:</strong> ${formatNumber(result.metrics.fileSizeBytes / (1024 ** 2), 2)} MB</div>
  `;
}

function buildFileStepMarkup(state) {
  const modeLabel = formatModeLabel(state.mode);
  const helpText = state.mode === "auto"
    ? "Auto mode starts the live speed test after you confirm the file size."
    : "Manual mode continues to the speed entry step after this screen.";

  return `
    <div class="download-step-card">
      <div class="download-step-copy">
        <p class="download-step-eyebrow">${escapeHtml(modeLabel)}</p>
        <h4>Step 1: file size</h4>
        <p>${escapeHtml(helpText)}</p>
      </div>
      <form class="download-flow-form" data-flow-form>
        <div class="download-calc-block">
          <label class="download-label" for="download-flow-file-size">File size</label>
          <div class="download-row-control">
            <input
              id="download-flow-file-size"
              class="download-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter file size"
              inputmode="decimal"
              value="${escapeHtml(state.fileSizeValue)}"
              data-flow-file-size
            />
            <select id="download-flow-file-size-unit" class="download-select compact" data-flow-file-size-unit>
              ${renderOptions(FILE_SIZE_OPTIONS, state.fileSizeUnit)}
            </select>
          </div>
        </div>
        <div class="download-flow-actions">
          <button type="button" class="ghost-button" data-flow-action="close">Cancel</button>
          <button type="submit" class="cta-button">${state.mode === "auto" ? "Run speed test" : "Continue"}</button>
        </div>
      </form>
    </div>
  `;
}

function buildSpeedStepMarkup(state) {
  return `
    <div class="download-step-card">
      <div class="download-step-copy">
        <p class="download-step-eyebrow">Manual mode</p>
        <h4>Step 2: download speed</h4>
        <p>Enter the network speed you want to check against the selected file size.</p>
      </div>
      <form class="download-flow-form" data-flow-form>
        <div class="download-calc-block">
          <label class="download-label">File size locked in</label>
          <div class="download-result is-compact">
            <div class="speed-row"><strong>File size:</strong> ${formatNumber(state.fileSizeValue)} ${escapeHtml(state.fileSizeUnit)}</div>
          </div>
        </div>
        <div class="download-calc-block">
          <label class="download-label" for="download-flow-speed">Download speed</label>
          <div class="download-row-control speed-row-control">
            <input
              id="download-flow-speed"
              class="download-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter speed"
              inputmode="decimal"
              value="${escapeHtml(state.speedValue)}"
              data-flow-speed
            />
            <select id="download-flow-speed-unit" class="download-select compact" data-flow-speed-unit>
              ${renderOptions(SPEED_UNIT_OPTIONS, state.speedUnit)}
            </select>
            <span class="divider">/</span>
            <select id="download-flow-speed-interval" class="download-select compact" data-flow-speed-interval>
              ${renderOptions(SPEED_INTERVAL_OPTIONS, state.speedInterval)}
            </select>
          </div>
        </div>
        <div class="download-flow-actions">
          <button type="button" class="ghost-button" data-flow-action="back">Back</button>
          <button type="submit" class="cta-button">Show result</button>
        </div>
      </form>
    </div>
  `;
}

function buildMeasureStepMarkup(state) {
  const progressText = state.measurementMessage || "Preparing the live speed test...";
  const statusText = state.measurementStatus || "Keep this popup open while the download is measured.";

  return `
    <div class="download-step-card">
      <div class="download-step-copy">
        <p class="download-step-eyebrow">Auto mode</p>
        <h4>Step 2: live speed test</h4>
        <p>${escapeHtml(statusText)}</p>
      </div>
      <div class="download-progress-shell">
        <div class="download-progress-track" aria-hidden="true">
          <span class="download-progress-fill" style="width: ${Math.max(8, Math.min(100, state.measurementProgress || 8))}%" data-flow-progress-fill></span>
        </div>
        <div class="download-flow-progress-text" data-flow-progress-text>${escapeHtml(progressText)}</div>
        <div class="download-flow-status${state.measurementTone === "warn" ? " is-warn" : ""}" data-flow-status>${escapeHtml(statusText)}</div>
      </div>
      <div class="download-flow-actions">
        <button type="button" class="ghost-button" data-flow-action="back" ${state.isMeasuring ? "disabled" : ""}>Back</button>
        <button type="button" class="cta-button" data-flow-action="close">${state.isMeasuring ? "Cancel test" : "Close"}</button>
      </div>
    </div>
  `;
}

function buildResultStepMarkup(state) {
  const result = state.result;
  if (!result) {
    return `
      <div class="download-step-card">
        <div class="download-step-copy">
          <p class="download-step-eyebrow">${escapeHtml(formatModeLabel(state.mode))}</p>
          <h4>No result yet</h4>
          <p>Something interrupted the flow before the calculation finished.</p>
        </div>
        <div class="download-flow-actions">
          <button type="button" class="ghost-button" data-flow-action="restart">Restart</button>
          <button type="button" class="cta-button" data-flow-action="close">Close</button>
        </div>
      </div>
    `;
  }

  const resultActions = result.mode === "manual"
    ? `
      <button type="button" class="ghost-button" data-flow-action="edit-file">Edit file size</button>
      <button type="button" class="ghost-button" data-flow-action="edit-speed">Edit speed</button>
      <button type="button" class="ghost-button" data-flow-action="restart">Restart</button>
      <button type="button" class="cta-button" data-flow-action="share">Share result</button>
    `
    : `
      <button type="button" class="ghost-button" data-flow-action="edit-file">Edit file size</button>
      <button type="button" class="ghost-button" data-flow-action="restart">Restart</button>
      <button type="button" class="cta-button" data-flow-action="share">Share result</button>
    `;

  return `
    <div class="download-step-card">
      <div class="download-step-copy">
        <p class="download-step-eyebrow">${escapeHtml(formatModeLabel(result.mode))}</p>
        <h4>Results</h4>
        <p>${result.mode === "auto" ? "The popup measured your connection and calculated the download time." : "The popup used your entered speed to calculate the download time."}</p>
      </div>
      <div class="download-time-grid" id="download-time-grid">
        <div class="time-pill"><strong>${result.metrics.clock.hrs}</strong><span>hrs</span></div>
        <div class="time-pill"><strong>${result.metrics.clock.mins}</strong><span>min</span></div>
        <div class="time-pill"><strong>${result.metrics.clock.secs}</strong><span>sec</span></div>
      </div>
      <div class="download-result" id="speed-result" aria-live="polite">
        ${buildResultMarkup(result)}
      </div>
      <div class="download-flow-actions download-flow-actions--results">
        ${resultActions}
        <button type="button" class="cta-button is-secondary" data-flow-action="close">Close</button>
      </div>
    </div>
  `;
}

function initDownloadSpeedCalculator(root) {
  if (!root) return;

  root.innerHTML = `
    <div class="download-landing download-minimal-shell">
      <div class="download-landing-copy download-minimal-copy">
        <h3 class="download-landing-title">Download Speed Calc</h3>
        <p class="download-landing-subtitle">Choose a mode and open the popup.</p>
      </div>

      <div class="download-mode-grid download-minimal-grid">
        <button type="button" class="download-mode-card" data-download-open="manual" onclick="window.openDownloadSpeedMode && window.openDownloadSpeedMode('manual')">
          <strong>Manual mode</strong>
        </button>

        <button type="button" class="download-mode-card" data-download-open="auto" onclick="window.openDownloadSpeedMode && window.openDownloadSpeedMode('auto')">
          <strong>Auto mode</strong>
        </button>
      </div>
    </div>

    <div class="download-flow-modal" data-download-modal aria-hidden="true">
      <div class="download-flow-backdrop" data-flow-close></div>
      <div class="download-flow-dialog" role="dialog" aria-modal="true" aria-labelledby="download-flow-title">
        <button type="button" class="download-flow-close" data-flow-close aria-label="Close download popup">×</button>
        <p class="download-flow-kicker" data-flow-kicker>Manual mode</p>
        <h3 class="download-flow-title" id="download-flow-title" data-flow-title>Guided download test</h3>
        <p class="download-flow-note" data-flow-note>Choose a step and keep moving through the popup.</p>
        <div class="download-flow-body" data-flow-body></div>
      </div>
    </div>
  `;

  const modal = root.querySelector("[data-download-modal]");
  const modalBody = root.querySelector("[data-flow-body]");
  const modalKicker = root.querySelector("[data-flow-kicker]");
  const modalTitle = root.querySelector("[data-flow-title]");
  const modalNote = root.querySelector("[data-flow-note]");
  const launchButtons = root.querySelectorAll("[data-download-open]");
  let lastFocusedElement = null;

  const state = {
    mode: "manual",
    step: "idle",
    fileSizeValue: "",
    fileSizeUnit: "MB",
    speedValue: "",
    speedUnit: "Mbit",
    speedInterval: "sec",
    result: null,
    measurementProgress: 8,
    measurementMessage: "Preparing the live speed test...",
    measurementStatus: "Keep this popup open while the download is measured.",
    measurementTone: "normal",
    isMeasuring: false,
    runId: 0,
    abortController: null
  };

  function setModalOpen(isOpen) {
    modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
    modal.classList.toggle("is-open", isOpen);
  }

  function setHeaderText() {
    modalKicker.textContent = formatModeLabel(state.mode);

    if (state.step === "file") {
      modalTitle.textContent = state.mode === "auto" ? "Enter the file size" : "Start with the file size";
      modalNote.textContent = state.mode === "auto"
        ? "The popup will run a speed test after this step."
        : "You will enter speed on the next screen.";
      return;
    }

    if (state.step === "speed") {
      modalTitle.textContent = "Enter the download speed";
      modalNote.textContent = "This is the manual mode only step where the connection value is entered directly.";
      return;
    }

    if (state.step === "measure") {
      modalTitle.textContent = "Running speed test";
      modalNote.textContent = state.isMeasuring
        ? "A live fetch is measuring your download speed now."
        : "The popup is ready to rerun the test or go back.";
      return;
    }

    if (state.step === "result") {
      modalTitle.textContent = "Download result";
      modalNote.textContent = "Review the numbers, share them, or restart the flow.";
      return;
    }

    modalTitle.textContent = "Guided download test";
    modalNote.textContent = "Choose a mode to begin.";
  }

  function renderFlow() {
    setHeaderText();

    if (state.step === "file") {
      modalBody.innerHTML = buildFileStepMarkup(state);
      focusFirstField();
      return;
    }

    if (state.step === "speed") {
      modalBody.innerHTML = buildSpeedStepMarkup(state);
      focusFirstField();
      return;
    }

    if (state.step === "measure") {
      modalBody.innerHTML = buildMeasureStepMarkup(state);
      return;
    }

    if (state.step === "result") {
      modalBody.innerHTML = buildResultStepMarkup(state);
      return;
    }

    modalBody.innerHTML = "";
  }

  function focusFirstField() {
    window.requestAnimationFrame(() => {
      const firstField = modal.querySelector("[data-flow-file-size], [data-flow-speed]");
      if (firstField && typeof firstField.focus === "function") {
        firstField.focus();
      }
    });
  }

  function resetFlow(mode) {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }

    state.mode = mode;
    state.step = "file";
    state.fileSizeValue = "";
    state.fileSizeUnit = "MB";
    state.speedValue = "";
    state.speedUnit = "Mbit";
    state.speedInterval = "sec";
    state.result = null;
    state.measurementProgress = 8;
    state.measurementMessage = "Preparing the live speed test...";
    state.measurementStatus = "Keep this popup open while the download is measured.";
    state.measurementTone = "normal";
    state.isMeasuring = false;
    state.runId += 1;
    renderFlow();
  }

  function openFlow(mode) {
    lastFocusedElement = document.activeElement;
    resetFlow(mode);
    setModalOpen(true);
  }

  window.downloadSpeedLauncher = {
    open: openFlow,
    close: closeFlow
  };

  window.openDownloadSpeedMode = openFlow;

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-download-open]");
    if (!button) {
      return;
    }

    event.preventDefault();
    openFlow(button.dataset.downloadOpen || "manual");
  });

  launchButtons.forEach((button) => {
    button.addEventListener("pointerdown", () => {
      button.style.touchAction = "manipulation";
      openFlow(button.dataset.downloadOpen || "manual");
    });

    button.addEventListener("click", () => {
      openFlow(button.dataset.downloadOpen || "manual");
    });
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-download-open]");
    if (!button) {
      return;
    }

    openFlow(button.dataset.downloadOpen || "manual");
  });

  function closeFlow() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }

    state.isMeasuring = false;
    state.step = "idle";
    state.runId += 1;
    setModalOpen(false);
    modalBody.innerHTML = "";

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function readFileStepValues() {
    const fileSizeInput = modal.querySelector("[data-flow-file-size]");
    const fileSizeUnit = modal.querySelector("[data-flow-file-size-unit]");

    return {
      fileValue: Number.parseFloat(fileSizeInput?.value),
      fileUnit: fileSizeUnit?.value || "MB"
    };
  }

  function readSpeedStepValues() {
    const speedInput = modal.querySelector("[data-flow-speed]");
    const speedUnit = modal.querySelector("[data-flow-speed-unit]");
    const speedInterval = modal.querySelector("[data-flow-speed-interval]");

    return {
      speedValue: Number.parseFloat(speedInput?.value),
      speedUnit: speedUnit?.value || "Mbit",
      speedInterval: speedInterval?.value || "sec"
    };
  }

  function showStatus(message, tone = "normal") {
    state.measurementStatus = message;
    state.measurementTone = tone;

    const statusNode = modal.querySelector("[data-flow-status]");
    if (statusNode) {
      statusNode.textContent = message;
      statusNode.classList.toggle("is-warn", tone === "warn");
      statusNode.classList.toggle("is-good", tone === "good");
    }
  }

  function updateMeasurementProgress(progressValue, message) {
    state.measurementProgress = progressValue;
    state.measurementMessage = message;

    const progressFill = modal.querySelector("[data-flow-progress-fill]");
    const progressText = modal.querySelector("[data-flow-progress-text]");

    if (progressFill) {
      progressFill.style.width = `${Math.max(8, Math.min(100, progressValue))}%`;
    }

    if (progressText) {
      progressText.textContent = message;
    }
  }

  function buildResultState(fileValue, fileUnit, speedValue, speedUnit, speedInterval, sourceLabel, extra = {}) {
    const metrics = calculateDownloadMetrics(fileValue, fileUnit, speedValue, speedUnit, speedInterval);

    return {
      mode: state.mode,
      fileSizeValue: fileValue,
      fileSizeUnit: fileUnit,
      speedValue,
      speedUnit,
      speedInterval,
      metrics,
      sourceLabel,
      ...extra
    };
  }

  function showResult(resultState) {
    state.result = resultState;
    state.step = "result";
    state.isMeasuring = false;
    renderFlow();
  }

  function handleFileStepSubmit() {
    const { fileValue, fileUnit } = readFileStepValues();

    if (!Number.isFinite(fileValue) || fileValue <= 0) {
      showStatus("Please enter a valid file size greater than 0.", "warn");
      return;
    }

    state.fileSizeValue = String(fileValue);
    state.fileSizeUnit = fileUnit;

    if (state.mode === "manual") {
      state.step = "speed";
      renderFlow();
      return;
    }

    state.step = "measure";
    state.measurementProgress = 8;
    state.measurementMessage = "Preparing the live speed test...";
    state.measurementStatus = "Keep this popup open while the download is measured.";
    state.measurementTone = "normal";
    state.isMeasuring = true;
    renderFlow();
    startAutoMeasurement();
  }

  function handleSpeedStepSubmit() {
    const { speedValue, speedUnit, speedInterval } = readSpeedStepValues();
    const fileValue = Number.parseFloat(state.fileSizeValue);

    if (!Number.isFinite(speedValue) || speedValue <= 0) {
      showStatus("Please enter a valid download speed greater than 0.", "warn");
      return;
    }

    const resultState = buildResultState(
      fileValue,
      state.fileSizeUnit,
      speedValue,
      speedUnit,
      speedInterval,
      "Manual entry"
    );

    state.speedValue = String(speedValue);
    state.speedUnit = speedUnit;
    state.speedInterval = speedInterval;
    showResult(resultState);
  }

  async function startAutoMeasurement() {
    const runId = state.runId + 1;
    state.runId = runId;

    if (state.abortController) {
      state.abortController.abort();
    }

    const controller = new AbortController();
    state.abortController = controller;

    updateMeasurementProgress(12, "Downloading the test payload...");
    showStatus("A live fetch is measuring your connection now.");

    try {
      const testUrl = `${AUTO_SPEED_TEST_URL}?bytes=${AUTO_SPEED_TEST_BYTES}&t=${Date.now()}`;
      const startedAt = performance.now();
      const response = await fetch(testUrl, {
        cache: "no-store",
        mode: "cors",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Speed test request failed with status ${response.status}.`);
      }

      let loadedBytes = 0;
      const expectedBytes = Number.parseInt(response.headers.get("content-length"), 10) || AUTO_SPEED_TEST_BYTES;

      if (response.body && typeof response.body.getReader === "function") {
        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (state.runId !== runId) {
            return;
          }

          if (done) {
            break;
          }

          loadedBytes += value.byteLength;
          const progress = Math.max(12, Math.min(96, Math.round((loadedBytes / expectedBytes) * 100)));
          updateMeasurementProgress(progress, `Measuring connection... ${progress}%`);
        }
      } else {
        const buffer = await response.arrayBuffer();
        if (state.runId !== runId) {
          return;
        }

        loadedBytes = buffer.byteLength;
        updateMeasurementProgress(94, "Finalizing the live speed test...");
      }

      if (state.runId !== runId) {
        return;
      }

      const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
      const bitsPerSecond = (loadedBytes * 8) / elapsedSeconds;
      const speedValue = bitsPerSecond / (1000 ** 2);
      const resultState = buildResultState(
        Number.parseFloat(state.fileSizeValue),
        state.fileSizeUnit,
        speedValue,
        "Mbit",
        "sec",
        "Cloudflare live speed test",
        {
          testBytes: loadedBytes,
          testSeconds: elapsedSeconds
        }
      );

      state.speedValue = String(speedValue);
      state.speedUnit = "Mbit";
      state.speedInterval = "sec";
      state.abortController = null;
      showStatus("Live speed test complete.", "good");
      updateMeasurementProgress(100, "Live speed test complete.");
      showResult(resultState);
    } catch (error) {
      if (state.runId !== runId) {
        return;
      }

      state.isMeasuring = false;
      state.abortController = null;

      const fallbackDownlink = navigator.connection && Number.isFinite(navigator.connection.downlink)
        ? navigator.connection.downlink
        : null;

      if (fallbackDownlink && fallbackDownlink > 0) {
        const resultState = buildResultState(
          Number.parseFloat(state.fileSizeValue),
          state.fileSizeUnit,
          fallbackDownlink,
          "Mbit",
          "sec",
          "Browser connection estimate",
          {
            testBytes: AUTO_SPEED_TEST_BYTES,
            testSeconds: 0
          }
        );

        state.speedValue = String(fallbackDownlink);
        state.speedUnit = "Mbit";
        state.speedInterval = "sec";
        showStatus("Live fetch failed, so the browser connection estimate was used instead.", "warn");
        updateMeasurementProgress(100, "Browser estimate ready.");
        showResult(resultState);
        return;
      }

      state.step = "measure";
      state.measurementProgress = 8;
      state.measurementMessage = "The live speed test could not finish.";
      state.measurementStatus = error instanceof Error
        ? error.message
        : "The live speed test could not finish.";
      state.measurementTone = "warn";
      renderFlow();
    }
  }

  function shareResult() {
    const result = state.result;
    if (!result) {
      return;
    }

    const textLines = [
      `${formatModeLabel(result.mode)} result`,
      `File size: ${formatNumber(result.fileSizeValue)} ${result.fileSizeUnit}`,
      result.mode === "auto"
        ? `Speed: ${formatNumber(result.speedValue)} Mbit/sec`
        : `Speed: ${formatNumber(result.speedValue)} ${result.speedUnit}/${result.speedInterval}`,
      `Download time: ${result.metrics.clock.hrs} hrs ${result.metrics.clock.mins} min ${result.metrics.clock.secs} sec`,
      `Source: ${result.sourceLabel}`
    ];

    if (result.mode === "auto" && result.testSeconds > 0) {
      textLines.push(`Test payload: ${formatNumber(result.testBytes / (1024 ** 2), 2)} MB`);
    }

    const text = textLines.join("\n");

    if (navigator.share) {
      navigator.share({
        title: "Download Speed Result",
        text
      }).catch(() => {
        copyResult(text);
      });
      return;
    }

    copyResult(text);
  }

  function copyResult(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          modalNote.textContent = "Result copied to clipboard.";
        })
        .catch(() => {
          modalNote.textContent = "Copy failed. You can select and copy the result manually.";
        });
      return;
    }

    modalNote.textContent = "Sharing is not supported in this browser.";
  }

  modal.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || !form.matches("[data-flow-form]")) {
      return;
    }

    event.preventDefault();

    if (state.step === "file") {
      handleFileStepSubmit();
      return;
    }

    if (state.step === "speed") {
      handleSpeedStepSubmit();
    }
  });

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-flow-close]");
    if (closeTarget) {
      closeFlow();
      return;
    }

    const actionButton = event.target.closest("[data-flow-action]");
    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.flowAction;

    if (action === "close") {
      closeFlow();
      return;
    }

    if (action === "back") {
      if (state.abortController) {
        state.abortController.abort();
        state.abortController = null;
      }

      state.isMeasuring = false;

      if (state.step === "speed") {
        state.step = "file";
        renderFlow();
        return;
      }

      if (state.step === "measure") {
        state.step = "file";
        renderFlow();
      }
      return;
    }

    if (action === "restart") {
      resetFlow(state.mode);
      return;
    }

    if (action === "share") {
      shareResult();
      return;
    }

    if (action === "edit-file") {
      state.step = "file";
      renderFlow();
      return;
    }

    if (action === "edit-speed") {
      state.step = "speed";
      renderFlow();
    }
  });

  launchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openFlow(button.dataset.downloadOpen || "manual");
    });
  });
}

window.initDownloadSpeedCalculator = initDownloadSpeedCalculator;