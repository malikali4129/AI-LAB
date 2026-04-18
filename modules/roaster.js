const ROAST_DATA_FILES = {
  hinglish: "data/roastData.json",
  english: "data/englishRoastData.json"
};

function normalizeRoastData(data) {
  return {
    soft: Array.isArray(data?.soft) ? data.soft.filter(Boolean) : [],
    medium: Array.isArray(data?.medium) ? data.medium.filter(Boolean) : [],
    savage: Array.isArray(data?.savage) ? data.savage.filter(Boolean) : []
  };
}

async function loadRoastData(language) {
  const filePath = ROAST_DATA_FILES[language] || ROAST_DATA_FILES.hinglish;

  try {
    const response = await fetch(`${filePath}?v=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const json = await response.json();
      return normalizeRoastData(json);
    }
  } catch (error) {
    // Fetch can fail if page is opened via file:// without a local server.
  }

  return { soft: [], medium: [], savage: [] };
}

function createSoundEngine() {
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

  function tone(freq, duration = 0.06, gainValue = 0.015) {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  return {
    click() {
      tone(640, 0.05, 0.016);
    },
    tick() {
      tone(860 + Math.random() * 120, 0.03, 0.01);
    },
    done() {
      tone(520, 0.07, 0.014);
      setTimeout(() => tone(780, 0.07, 0.014), 65);
    }
  };
}

function pickIntensity(value) {
  if (value <= 1.5) return "soft";
  if (value <= 2.5) return "medium";
  return "savage";
}

function formatRoast(template, name) {
  return template.includes("{{name}}")
    ? template.replaceAll("{{name}}", name)
    : `${name}, ${template}`;
}

function initRoaster(root) {
  if (!root) return;

  const sounds = createSoundEngine();
  let roastData = { soft: [], medium: [], savage: [] };
  let roastLanguage = "hinglish";
  try {
    const storedLanguage = window.localStorage?.getItem("aimlab-roast-language");
    roastLanguage = storedLanguage === "english" ? "english" : "hinglish";
  } catch (error) {
    roastLanguage = "hinglish";
  }
  let typingToken = { cancelled: false };
  let isGenerating = false;

  root.innerHTML = `
    <div class="roast-card">
      <div class="roast-grid">
        <div class="roast-language">
          <label class="download-label">Roast language</label>
          <div class="roast-language-toggle" role="tablist" aria-label="Roast language">
            <button type="button" class="ghost-button" data-roast-language="hinglish">Hinglish</button>
            <button type="button" class="ghost-button" data-roast-language="english">English</button>
          </div>
        </div>
        <input class="download-input" id="roast-name" type="text" placeholder="Enter name" autocomplete="off" />
        <div class="roast-intensity">
          <label class="download-label" for="roast-intensity">Roast intensity</label>
          <input id="roast-intensity" type="range" min="1" max="3" step="1" value="2" />
          <div class="roast-intensity-labels"><span>Soft</span><span id="roast-intensity-value">Medium</span><span>Savage</span></div>
        </div>
      </div>

      <div class="roast-actions">
        <button type="button" class="cta-button" data-roast-generate>Generate Roast</button>
        <button type="button" class="ghost-button" data-roast-copy>Copy Roast</button>
        <button type="button" class="ghost-button" data-roast-share>Share Roast</button>
        <button type="button" class="ghost-button" data-roast-stop disabled>Stop</button>
      </div>

      <div class="roast-status" id="roast-status" aria-live="polite">Ready to roast.</div>
      <div class="download-result roast-output" id="roast-output" aria-live="polite">
        Enter a name, choose intensity, and generate a roast.
      </div>
    </div>
  `;

  const nameInput = root.querySelector("#roast-name");
  const intensityInput = root.querySelector("#roast-intensity");
  const intensityValue = root.querySelector("#roast-intensity-value");
  const output = root.querySelector("#roast-output");
  const languageButtons = [...root.querySelectorAll("[data-roast-language]")];

  const generateBtn = root.querySelector("[data-roast-generate]");
  const copyBtn = root.querySelector("[data-roast-copy]");
  const shareBtn = root.querySelector("[data-roast-share]");
  const stopBtn = root.querySelector("[data-roast-stop]");
  const statusEl = root.querySelector("#roast-status");

  function getLanguageLabel(language) {
    return language === "english" ? "English" : "Hinglish";
  }

  function persistLanguage(language) {
    roastLanguage = language;
    try {
      window.localStorage?.setItem("aimlab-roast-language", language);
    } catch (error) {
      // Ignore storage failures in private or restricted browsing modes.
    }
    updateLanguageUI();
  }

  function updateLanguageUI() {
    languageButtons.forEach((button) => {
      const active = button.dataset.roastLanguage === roastLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setGeneratingState(active) {
    isGenerating = active;
    generateBtn.disabled = active;
    copyBtn.disabled = active;
    shareBtn.disabled = active;
    stopBtn.disabled = !active;
    nameInput.disabled = active;
    intensityInput.disabled = active;
    languageButtons.forEach((button) => {
      button.disabled = active;
    });
    generateBtn.textContent = active ? "Generating..." : "Generate Roast";
    statusEl.classList.toggle("is-active", active);
    statusEl.textContent = active ? "Generating roast" : "Ready to roast.";
  }

  function setStoppedState() {
    typingToken.cancelled = true;
    output.innerHTML = '<span class="speed-warn">Roast generation stopped.</span>';
    setGeneratingState(false);
  }

  function setIntensityLabel() {
    const level = pickIntensity(Number(intensityInput.value));
    intensityValue.textContent = level.charAt(0).toUpperCase() + level.slice(1);
  }

  async function typeRoast(text) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    typingToken = { cancelled: false };

    if (reducedMotion) {
      output.textContent = text;
      return;
    }

    output.textContent = "";
    for (let index = 0; index < text.length; index += 1) {
      if (typingToken.cancelled) return;
      output.textContent += text[index];
      if (text[index] !== " " && !".,!?".includes(text[index])) {
        sounds.tick();
      }
      await new Promise((resolve) => setTimeout(resolve, 16 + Math.random() * 20));
    }
    sounds.done();
  }

  function getRandomRoast() {
    const name = nameInput.value.trim() || "Legend";
    const intensity = pickIntensity(Number(intensityInput.value));
    const pool = roastData[intensity] || roastData.medium;
    const line = pool[Math.floor(Math.random() * pool.length)] || "{{name}}, roast list is empty. Please check data/roastData.json.";
    return formatRoast(line, name);
  }

  async function generateRoast() {
    if (isGenerating) {
      return;
    }

    if (roastData.soft.length + roastData.medium.length + roastData.savage.length === 0) {
      output.innerHTML = '<span class="speed-warn">Roast list is empty. Check data/roastData.json.</span>';
      return;
    }

    setGeneratingState(true);
    sounds.click();

    try {
      await typeRoast(getRandomRoast());
    } finally {
      if (!typingToken.cancelled) {
        setGeneratingState(false);
      }
    }
  }

  async function copyRoast() {
    const text = output.textContent.trim();
    if (!text || text === "Enter a name, choose intensity, and generate a roast.") {
      output.innerHTML = '<span class="speed-warn">Generate a roast first to copy.</span>';
      return;
    }

    if (!navigator.clipboard?.writeText) {
      output.innerHTML = '<span class="speed-warn">Clipboard is not supported in this browser.</span>';
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      output.innerHTML = '<span class="speed-ok">Roast copied to clipboard.</span>';
      setTimeout(() => {
        output.textContent = text;
      }, 900);
    } catch (error) {
      output.innerHTML = '<span class="speed-warn">Failed to copy roast.</span>';
    }
  }

  function switchLanguage(language) {
    if (language === roastLanguage) {
      return;
    }

    persistLanguage(language);
    output.innerHTML = `<span class="speed-ok">Switched to ${getLanguageLabel(language)} roasts.</span>`;
    loadRoastData(language).then((data) => {
      if (roastLanguage !== language) {
        return;
      }

      roastData = normalizeRoastData(data);
      if (roastData.soft.length + roastData.medium.length + roastData.savage.length === 0) {
        output.innerHTML = `<span class="speed-warn">Could not load ${language} roast data. If running via file://, use a local server.</span>`;
      }
    });
  }

  async function shareRoast() {
    const text = output.textContent.trim();
    if (!text || text === "Enter a name, choose intensity, and generate a roast.") {
      output.innerHTML = '<span class="speed-warn">Generate a roast first to share.</span>';
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "AIM LAB Roast", text });
        return;
      } catch (error) {
        // Fall through to clipboard fallback.
      }
    }

    await copyRoast();
  }

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => switchLanguage(button.dataset.roastLanguage));
  });

  intensityInput.addEventListener("input", setIntensityLabel);
  generateBtn.addEventListener("click", generateRoast);
  copyBtn.addEventListener("click", copyRoast);
  shareBtn.addEventListener("click", shareRoast);
  stopBtn.addEventListener("click", setStoppedState);
  updateLanguageUI();

  const initialLanguage = roastLanguage;
  loadRoastData(initialLanguage).then((data) => {
    if (roastLanguage !== initialLanguage) {
      return;
    }

    roastData = normalizeRoastData(data);
    if (roastData.soft.length + roastData.medium.length + roastData.savage.length === 0) {
      output.innerHTML = `<span class="speed-warn">Could not load ${initialLanguage} roast data. If running via file://, use a local server.</span>`;
    }
  });

  setIntensityLabel();
}

window.initRoaster = initRoaster;
