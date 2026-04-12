function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  });
}

const FILE_SIZE_FACTORS = {
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4
};

const SPEED_FACTORS_BITS = {
  Kbit: 1000,
  Mbit: 1000 ** 2,
  Gbit: 1000 ** 3,
  KByte: 8 * 1024,
  MByte: 8 * 1024 ** 2,
  GByte: 8 * 1024 ** 3
};

const TIME_DIVISOR = {
  sec: 1,
  min: 60,
  hour: 3600
};

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

function initDownloadSpeedCalculator(root) {
  if (!root) return;

  root.innerHTML = `
    <div class="download-calc-shell">
      <div class="download-calc-block">
        <label class="download-label" for="file-size-input">File size</label>
        <div class="download-row-control">
          <input
            id="file-size-input"
            class="download-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter file size"
            inputmode="decimal"
          />
          <select id="file-size-unit" class="download-select compact">
            <option value="KB">KB</option>
            <option value="MB" selected>MB</option>
            <option value="GB">GB</option>
            <option value="TB">TB</option>
          </select>
        </div>
      </div>

      <div class="download-calc-block">
        <label class="download-label" for="speed-input">Download speed</label>
        <div class="download-row-control speed-row-control">
          <input
            id="speed-input"
            class="download-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter speed"
            inputmode="decimal"
          />
          <select id="speed-unit" class="download-select compact">
            <option value="Kbit">Kbit</option>
            <option value="Mbit" selected>Mbit</option>
            <option value="Gbit">Gbit</option>
            <option value="KByte">KByte</option>
            <option value="MByte">MByte</option>
            <option value="GByte">GByte</option>
          </select>
          <span class="divider">/</span>
          <select id="speed-interval" class="download-select compact">
            <option value="sec" selected>sec</option>
            <option value="min">min</option>
            <option value="hour">hour</option>
          </select>
        </div>
      </div>

      <div class="download-calc-block">
        <label class="download-label">Download time</label>
        <div class="download-time-grid" id="download-time-grid">
          <div class="time-pill"><strong id="time-hrs">0</strong><span>hrs</span></div>
          <div class="time-pill"><strong id="time-min">0</strong><span>min</span></div>
          <div class="time-pill"><strong id="time-sec">0</strong><span>sec</span></div>
        </div>
      </div>

      <div class="download-result" id="speed-result" aria-live="polite">
        Fill values and click Calculate to see results.
      </div>

      <div class="download-actions">
        <button type="button" class="ghost-button" data-speed-calc>Calculate</button>
        <button type="button" class="ghost-button" data-speed-reload>Reload calculator</button>
        <button type="button" class="ghost-button" data-speed-clear>Clear all changes</button>
        <button type="button" class="cta-button" data-speed-share>Share result</button>
      </div>
    </div>
  `;

  const fileSizeInput = root.querySelector("#file-size-input");
  const fileSizeUnit = root.querySelector("#file-size-unit");
  const speedInput = root.querySelector("#speed-input");
  const speedUnit = root.querySelector("#speed-unit");
  const speedInterval = root.querySelector("#speed-interval");
  const speedResult = root.querySelector("#speed-result");
  const timeHrs = root.querySelector("#time-hrs");
  const timeMin = root.querySelector("#time-min");
  const timeSec = root.querySelector("#time-sec");
  const calcButton = root.querySelector("[data-speed-calc]");
  const reloadButton = root.querySelector("[data-speed-reload]");
  const clearButton = root.querySelector("[data-speed-clear]");
  const shareButton = root.querySelector("[data-speed-share]");

  function updateTimeDisplay(clock) {
    timeHrs.textContent = String(clock.hrs);
    timeMin.textContent = String(clock.mins);
    timeSec.textContent = String(clock.secs);
  }

  function resetOutput(message) {
    updateTimeDisplay({ hrs: 0, mins: 0, secs: 0 });
    speedResult.textContent = message;
  }

  function getSnapshotText() {
    return `File size: ${fileSizeInput.value || 0} ${fileSizeUnit.value}\nDownload speed: ${speedInput.value || 0} ${speedUnit.value}/${speedInterval.value}\nDownload time: ${timeHrs.textContent} hrs ${timeMin.textContent} min ${timeSec.textContent} sec`;
  }

  async function shareResult() {
    const text = getSnapshotText();

    if (navigator.share) {
      try {
        await navigator.share({ title: "Download Speed Result", text });
        return;
      } catch (error) {
        // Fall through to clipboard if share is canceled or unavailable.
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        speedResult.innerHTML = '<span class="speed-ok">Result copied to clipboard.</span>';
        return;
      } catch (error) {
        speedResult.innerHTML = '<span class="speed-warn">Share failed. Copy manually from the result.</span>';
        return;
      }
    }

    speedResult.innerHTML = '<span class="speed-warn">Share is not supported on this browser.</span>';
  }

  function renderResult() {
    const fileValue = Number.parseFloat(fileSizeInput.value);
    const speedValue = Number.parseFloat(speedInput.value);

    if (!Number.isFinite(fileValue) || fileValue <= 0) {
      resetOutput("Please enter a valid file size greater than 0.");
      return;
    }

    if (!Number.isFinite(speedValue) || speedValue <= 0) {
      resetOutput("Please enter a valid download speed greater than 0.");
      return;
    }

    const metrics = calculateDownloadMetrics(
      fileValue,
      fileSizeUnit.value,
      speedValue,
      speedUnit.value,
      speedInterval.value
    );

    if (!Number.isFinite(metrics.totalSeconds) || metrics.totalSeconds <= 0) {
      resetOutput("Could not calculate time. Please verify your values.");
      return;
    }

    updateTimeDisplay(metrics.clock);
    speedResult.innerHTML = `
      <div class="speed-row"><strong>File size:</strong> ${formatNumber(fileValue)} ${fileSizeUnit.value}</div>
      <div class="speed-row"><strong>Speed:</strong> ${formatNumber(speedValue)} ${speedUnit.value}/${speedInterval.value}</div>
      <div class="speed-row"><strong>Equivalent:</strong> ${formatNumber(metrics.bitsPerSecond)} bit/sec</div>
      <div class="speed-row"><strong>Total time:</strong> ${metrics.clock.hrs}h ${metrics.clock.mins}m ${metrics.clock.secs}s (${formatNumber(metrics.totalSeconds, 2)} sec)</div>
      <div class="speed-row"><strong>Total data:</strong> ${formatNumber(metrics.fileSizeBytes / (1024 ** 2), 2)} MB</div>
    `;
  }

  function clearAll() {
    fileSizeInput.value = "";
    speedInput.value = "";
    fileSizeUnit.value = "MB";
    speedUnit.value = "Mbit";
    speedInterval.value = "sec";
    resetOutput("All values cleared.");
  }

  function reloadCalculator() {
    fileSizeInput.value = "";
    speedInput.value = "";
    resetOutput("Calculator reloaded. Enter values to calculate again.");
  }

  calcButton.addEventListener("click", renderResult);
  reloadButton.addEventListener("click", reloadCalculator);
  clearButton.addEventListener("click", clearAll);
  shareButton.addEventListener("click", shareResult);

  resetOutput("Fill values and click Calculate to see results.");
}

window.initDownloadSpeedCalculator = initDownloadSpeedCalculator;
