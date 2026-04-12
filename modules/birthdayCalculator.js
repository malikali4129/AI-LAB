function monthsUntilNextBirthday(birthDate, now) {
  const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < now) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }

  const diffMs = nextBirthday - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  return { days, hours, minutes, nextBirthday };
}

function calculateAge(birthDate, now) {
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  let days = now.getDate() - birthDate.getDate();

  if (days < 0) {
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += previousMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function createKeyboardSound() {
  let audioContext = null;

  function ensureContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return null;
    }

    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioContext = new Ctx();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  }

  return function playKeyClick() {
    const ctx = ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(880 + Math.random() * 180, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.03);
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeIntoLine(line, text, playKeyClick, animationToken) {
  const textNode = line.querySelector("[data-line-text]");
  const cursor = line.querySelector(".typing-cursor");
  if (!textNode) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    textNode.textContent = text;
    if (cursor) cursor.remove();
    line.classList.remove("is-typing");
    return;
  }

  textNode.textContent = "";

  for (let index = 0; index < text.length; index += 1) {
    if (animationToken.cancelled) {
      return;
    }

    textNode.textContent += text[index];
    if (text[index] !== " " && /[.,:!?]/.test(text[index]) === false) {
      playKeyClick();
    }

    const delay = /[.,:!?]/.test(text[index]) ? 54 : 16 + Math.random() * 24;
    await wait(delay);
  }

  line.classList.remove("is-typing");
  if (cursor) cursor.remove();
}

async function animateBirthdayReport(output, lines, playKeyClick, animationToken) {
  output.innerHTML = "";

  for (let index = 0; index < lines.length; index += 1) {
    if (animationToken.cancelled) {
      return;
    }

    const line = document.createElement("div");
    line.className = "birthday-stat is-typing";
    line.innerHTML = '<span class="line-prefix">&gt;&gt;</span><span data-line-text></span><span class="typing-cursor" aria-hidden="true"></span>';
    output.appendChild(line);

    await wait(90 + index * 35);
    await typeIntoLine(line, lines[index], playKeyClick, animationToken);
  }
}

function buildRoast(age) {
  if (age.years < 13) {
    return "You are still in the tutorial level of life. Respectfully overconfident though.";
  }

  if (age.years < 20) {
    return "Teen mode detected. Dramatic updates every 5 minutes are expected.";
  }

  if (age.years < 30) {
    return "Prime scrolling years. Knees still mostly cooperative.";
  }

  if (age.years < 40) {
    return "Certified adult. Your back now sends meeting invites before pain.";
  }

  if (age.years < 55) {
    return "Vintage human edition. Wisdom increased, patience for nonsense decreased.";
  }

  return "Legend tier unlocked. You survived trends that should never return.";
}

function initBirthdayCalculator(root) {
  if (!root) return;

  root.innerHTML = `
    <div class="birthday-calculator-minimal">
      <label for="birthday-input" class="birthday-label">When were you born?</label>
      <input id="birthday-input" type="date" class="birthday-input-mobile" />
      <button class="cta-button" type="button" data-birthday-action>Calculate</button>
    </div>
  `;

  const input = root.querySelector("#birthday-input");
  const actionButton = root.querySelector("[data-birthday-action]");
  const resultModal = document.getElementById("results-modal");
  const resultOutput = document.getElementById("birthday-result-output");
  const modalClose = document.getElementById("modal-close");
  const playKeyClick = createKeyboardSound();
  let currentAnimation = { cancelled: false };

  function showModal() {
    resultModal.setAttribute("aria-hidden", "false");
    resultModal.classList.add("is-open");
  }

  function hideModal() {
    resultModal.setAttribute("aria-hidden", "true");
    resultModal.classList.remove("is-open");
    currentAnimation.cancelled = true;
  }

  async function renderResult() {
    const value = input.value;
    if (!value) {
      resultOutput.innerHTML = '<div class="birthday-stat">No birthday selected. The machine refuses to guess your age.</div>';
      showModal();
      return;
    }

    const birthDate = new Date(`${value}T00:00:00`);
    const now = new Date();
    const age = calculateAge(birthDate, now);
    const birthdayCountdown = monthsUntilNextBirthday(birthDate, now);
    const roastLine = buildRoast(age);

    currentAnimation.cancelled = true;
    currentAnimation = { cancelled: false };

    actionButton.disabled = true;
    actionButton.textContent = "...";

    showModal();

    await animateBirthdayReport(
      resultOutput,
      [
        `Age: ${age.years} years, ${age.months} months, ${age.days} days.`,
        `Next birthday in: ${birthdayCountdown.days} days, ${birthdayCountdown.hours} hours, ${birthdayCountdown.minutes} minutes.`,
        `Date lock: ${formatDate(birthdayCountdown.nextBirthday)}.`,
        roastLine
      ],
      playKeyClick,
      currentAnimation
    );

    if (!currentAnimation.cancelled) {
      actionButton.disabled = false;
      actionButton.textContent = "Calculate";
    }
  }

  actionButton.addEventListener("click", renderResult);
  if (modalClose) {
    modalClose.addEventListener("click", hideModal);
  }
  if (resultModal) {
    resultModal.addEventListener("click", (e) => {
      if (e.target === resultModal || e.target === resultModal.querySelector(".modal-overlay")) {
        hideModal();
      }
    });
  }
}

window.initBirthdayCalculator = initBirthdayCalculator;