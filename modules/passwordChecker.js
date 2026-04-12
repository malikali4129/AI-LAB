function analyzePassword(password) {
  let score = 0;
  const checks = {
    length8: password.length >= 8,
    length12: password.length >= 12,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  };

  if (checks.length8) score += 20;
  if (checks.length12) score += 20;
  if (checks.lower) score += 15;
  if (checks.upper) score += 15;
  if (checks.number) score += 15;
  if (checks.symbol) score += 15;

  const repeated = /(.)\1{2,}/.test(password);
  const commonPattern = /12345|qwerty|password|admin|abcde/i.test(password);

  if (repeated) score -= 12;
  if (commonPattern) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let level = "Weak";
  if (score >= 80) {
    level = "Strong";
  } else if (score >= 55) {
    level = "Medium";
  }

  return { score, level, checks, repeated, commonPattern };
}

function buildTips(result) {
  const tips = [];

  if (!result.checks.length8) {
    tips.push("Use at least 8 characters.");
  }
  if (!result.checks.length12) {
    tips.push("For better security, aim for 12+ characters.");
  }
  if (!result.checks.upper || !result.checks.lower) {
    tips.push("Mix uppercase and lowercase letters.");
  }
  if (!result.checks.number) {
    tips.push("Add at least one number.");
  }
  if (!result.checks.symbol) {
    tips.push("Add symbols like ! @ # $ for stronger entropy.");
  }
  if (result.repeated) {
    tips.push("Avoid repeated characters (like aaa or 111). ");
  }
  if (result.commonPattern) {
    tips.push("Avoid common words and patterns.");
  }

  if (tips.length === 0) {
    tips.push("Great password. Consider using a password manager and 2FA.");
  }

  return tips;
}

function generatePassword(length = 14) {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+";
  const allChars = lower + upper + digits + symbols;

  const required = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  const generated = [...required];
  for (let index = required.length; index < length; index += 1) {
    generated.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  for (let index = generated.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [generated[index], generated[swapIndex]] = [generated[swapIndex], generated[index]];
  }

  return generated.join("");
}

function initPasswordChecker(root) {
  if (!root) return;

  root.innerHTML = `
    <div class="password-card">
      <label for="password-input" class="download-label">Enter password</label>
      <input id="password-input" class="download-input" type="password" placeholder="Type your password" autocomplete="off" />

      <div class="password-actions">
        <button type="button" class="cta-button" data-password-copy>Copy</button>
        <button type="button" class="ghost-button" data-password-generate>Generate</button>
        <button type="button" class="ghost-button" data-password-toggle>Show</button>
        <button type="button" class="ghost-button" data-password-salt-open>Salt</button>
      </div>

      <div class="password-meter-wrap">
        <div class="password-meter" id="password-meter"></div>
      </div>

      <div class="download-result" id="password-result" aria-live="polite">
        Enter a password to see live strength.
      </div>

      <div class="results-modal" id="password-salt-modal" role="dialog" aria-hidden="true">
        <div class="modal-overlay"></div>
        <div class="modal-content glass-card">
          <button class="modal-close" id="password-salt-close" aria-label="Close salt popup" type="button">×</button>
          <div class="modal-header">
            <h3>Write website name</h3>
          </div>
          <div class="password-salt-box">
            <input id="website-name-input" class="download-input" type="text" placeholder="e.g. google" autocomplete="off" />
            <button type="button" class="cta-button" data-password-salt-generate>Create salt</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const input = root.querySelector("#password-input");
  const copyBtn = root.querySelector("[data-password-copy]");
  const generateBtn = root.querySelector("[data-password-generate]");
  const toggleBtn = root.querySelector("[data-password-toggle]");
  const saltOpenBtn = root.querySelector("[data-password-salt-open]");
  const saltModal = root.querySelector("#password-salt-modal");
  const saltCloseBtn = root.querySelector("#password-salt-close");
  const websiteNameInput = root.querySelector("#website-name-input");
  const saltGenerateBtn = root.querySelector("[data-password-salt-generate]");
  const meter = root.querySelector("#password-meter");
  const output = root.querySelector("#password-result");

  function openSaltModal() {
    saltModal.setAttribute("aria-hidden", "false");
    saltModal.classList.add("is-open");
    window.setTimeout(() => websiteNameInput.focus(), 40);
  }

  function closeSaltModal() {
    saltModal.setAttribute("aria-hidden", "true");
    saltModal.classList.remove("is-open");
  }

  function render() {
    const password = input.value;
    if (!password) {
      meter.style.width = "0%";
      meter.className = "password-meter";
      output.textContent = "Enter a password to see live strength.";
      return;
    }

    const result = analyzePassword(password);
    const tips = buildTips(result);

    meter.style.width = `${result.score}%`;
    meter.className = `password-meter level-${result.level.toLowerCase()}`;

    output.innerHTML = `
      <div class="speed-row"><strong>Score:</strong> ${result.score}/100</div>
      <div class="speed-row"><strong>Level:</strong> ${result.level}</div>
      <div class="speed-row"><strong>Tips:</strong> ${tips.join(" ")}</div>
    `;
  }

  copyBtn.addEventListener("click", async () => {
    if (!input.value) {
      output.innerHTML = '<span class="speed-warn">Type or generate a password first to copy it.</span>';
      return;
    }

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      output.innerHTML = '<span class="speed-warn">Copy is not supported in this browser.</span>';
      return;
    }

    try {
      await navigator.clipboard.writeText(input.value);
      output.innerHTML = '<span class="speed-ok">Password copied to clipboard.</span>';
      window.setTimeout(render, 900);
    } catch (error) {
      output.innerHTML = '<span class="speed-warn">Failed to copy. Try again.</span>';
    }
  });

  input.addEventListener("input", render);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      render();
    }
  });

  generateBtn.addEventListener("click", () => {
    input.value = generatePassword();
    input.type = "password";
    toggleBtn.textContent = "Show";
    render();
  });

  toggleBtn.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    toggleBtn.textContent = isPassword ? "Hide" : "Show";
  });

  saltOpenBtn.addEventListener("click", openSaltModal);
  saltCloseBtn.addEventListener("click", closeSaltModal);
  saltGenerateBtn.addEventListener("click", () => {
    const websiteName = websiteNameInput.value.trim();
    if (!websiteName) {
      output.innerHTML = '<span class="speed-warn">Please write website name first.</span>';
      return;
    }

    const finalSalt = `AIMTECHmalik@${websiteName}.com`;
    input.value = finalSalt;
    input.type = "password";
    toggleBtn.textContent = "Show";
    websiteNameInput.value = "";
    closeSaltModal();
    render();
  });

  websiteNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saltGenerateBtn.click();
    }
  });

  saltModal.addEventListener("click", (event) => {
    if (event.target === saltModal || event.target === saltModal.querySelector(".modal-overlay")) {
      closeSaltModal();
    }
  });

  render();
}

window.initPasswordChecker = initPasswordChecker;
