const typedText = document.getElementById("typed-text");
const particleLayer = document.getElementById("particles");
const birthdayModuleRoot = document.getElementById("birthday-module");
const downloadSpeedModuleRoot = document.getElementById("download-speed-module");
const passwordModuleRoot = document.getElementById("password-module");
const gpaModuleRoot = document.getElementById("gpa-module");
const roasterModuleRoot = document.getElementById("roaster-module");
const menuBtn = document.getElementById("menu-btn");
const menuDropdown = document.getElementById("menu-dropdown");
let revealItems = [];
let isNavigating = false;

const MODULE_REGISTRY = [
  {
    href: "index.html",
    icon: "🏠",
    shortTitle: "Home",
    menuTitle: "Home"
  },
  {
    href: "birthday.html",
    icon: "🎂",
    shortTitle: "Birthday",
    menuTitle: "Birthday",
    homeTitle: "Birthday Calculator",
    homeDescription: "Find your age and next birthday"
  },
  {
    href: "download-speed.html",
    icon: "⚡",
    shortTitle: "Download",
    menuTitle: "Download",
    homeTitle: "Download Speed Calculator",
    homeDescription: "Calculate download times"
  },
  {
    href: "password-checker.html",
    icon: "🔐",
    shortTitle: "Password",
    menuTitle: "Password",
    homeTitle: "Password Strength Checker",
    homeDescription: "Check password strength and safety tips"
  },
  {
    href: "gpa-calculator.html",
    icon: "🎓",
    shortTitle: "GPA",
    menuTitle: "GPA",
    homeTitle: "GPA Calculator",
    homeDescription: "Calculate semester and cumulative GPA"
  },
  {
    href: "roaster.html",
    icon: "🔥",
    shortTitle: "Roaster",
    menuTitle: "Roaster",
    homeTitle: "Roaster Module",
    homeDescription: "Generate funny roasts with intensity controls"
  }
];

const typingLines = [
  "Neural networks are thinking about lunch.",
  "Confidence level: dangerously unverified.",
  "Our AI reads emotions using vibes and guessing.",
  "The lab is running on sarcasm and caffeine."
];

const typingState = {
  lineIndex: 0,
  charIndex: 0,
  deleting: false
};

function initializePageTransitions() {
  revealItems = [...document.querySelectorAll("[data-reveal]")];
  revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${220 + index * 90}ms`);
  });
}

function renderSharedNavigation() {
  const shortcutNav = document.querySelector(".header-shortcuts");
  if (shortcutNav) {
    shortcutNav.innerHTML = MODULE_REGISTRY.map(
      (module) => `<a href="${module.href}" class="shortcut-icon" title="${module.shortTitle}">${module.icon}</a>`
    ).join("");
  }

  if (menuDropdown) {
    menuDropdown.innerHTML = MODULE_REGISTRY.map(
      (module) => `<a href="${module.href}" class="menu-item">${module.icon} ${module.menuTitle}</a>`
    ).join("");
  }
}

function renderHomeCards() {
  const appsGrid = document.querySelector(".apps-grid");
  if (!appsGrid) {
    return;
  }

  const modulesForHome = MODULE_REGISTRY.filter((module) => module.homeTitle && module.homeDescription);
  appsGrid.innerHTML = modulesForHome
    .map(
      (module) => `
        <a class="app-card" href="${module.href}" data-reveal>
          <span class="app-icon">${module.icon}</span>
          <h3>${module.homeTitle}</h3>
          <p>${module.homeDescription}</p>
        </a>
      `
    )
    .join("");
}

function finishPageTransitions() {
  document.body.classList.add("page-ready");
}

function updateTyping() {
  if (!typedText) {
    return;
  }

  const current = typingLines[typingState.lineIndex];
  if (!typingState.deleting) {
    typingState.charIndex += 1;
    typedText.textContent = current.slice(0, typingState.charIndex);
    if (typingState.charIndex === current.length) {
      typingState.deleting = true;
      setTimeout(updateTyping, 1300);
      return;
    }
  } else {
    typingState.charIndex -= 1;
    typedText.textContent = current.slice(0, typingState.charIndex);
    if (typingState.charIndex === 0) {
      typingState.deleting = false;
      typingState.lineIndex = (typingState.lineIndex + 1) % typingLines.length;
    }
  }

  setTimeout(updateTyping, typingState.deleting ? 32 : 44);
}

function createParticles() {
  if (!particleLayer) {
    return;
  }

  const count = window.innerWidth < 700 ? 16 : 28;
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    const size = 3 + Math.random() * 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${10 + Math.random() * 16}s`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.opacity = `${0.2 + Math.random() * 0.6}`;
    particleLayer.appendChild(particle);
  }
}

function setupMobileMenu() {
  if (!menuBtn || !menuDropdown) {
    return;
  }

  function closeMenu() {
    menuDropdown.classList.remove("open");
    menuBtn.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menuDropdown.classList.add("open");
    menuBtn.classList.add("active");
    menuBtn.setAttribute("aria-expanded", "true");
  }

  menuBtn.addEventListener("click", () => {
    if (menuDropdown.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuDropdown.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (!menuDropdown.classList.contains("open")) {
      return;
    }
    if (!menuDropdown.contains(event.target) && !menuBtn.contains(event.target)) {
      closeMenu();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuDropdown.classList.contains("open")) {
      closeMenu();
    }
  });
}

function setupPageSwitchTransitions() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || isNavigating) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || link.hasAttribute("download") || link.target === "_blank") {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) {
      return;
    }

    if (!/\.html?$/.test(destination.pathname) && destination.pathname !== "/") {
      return;
    }

    if (destination.href === window.location.href) {
      return;
    }

    event.preventDefault();
    isNavigating = true;
    document.body.classList.add("page-transition-out");

    window.setTimeout(() => {
      window.location.href = destination.href;
    }, 230);
  });
}

document.querySelectorAll(".chip, .ghost-button, .cta-button").forEach((element) => {
  element.addEventListener("pointerdown", () => element.classList.add("glow-pulse"));
  element.addEventListener("pointerup", () => element.classList.remove("glow-pulse"));
  element.addEventListener("pointerleave", () => element.classList.remove("glow-pulse"));
});

renderSharedNavigation();
renderHomeCards();
initializePageTransitions();

createParticles();
if (typedText) {
  updateTyping();
}
if (window.initBirthdayCalculator && birthdayModuleRoot) {
  window.initBirthdayCalculator(birthdayModuleRoot);
}
if (window.initDownloadSpeedCalculator && downloadSpeedModuleRoot) {
  window.initDownloadSpeedCalculator(downloadSpeedModuleRoot);
}
if (window.initPasswordChecker && passwordModuleRoot) {
  window.initPasswordChecker(passwordModuleRoot);
}
if (window.initGpaCalculator && gpaModuleRoot) {
  window.initGpaCalculator(gpaModuleRoot);
}
if (window.initRoaster && roasterModuleRoot) {
  window.initRoaster(roasterModuleRoot);
}
setupMobileMenu();
setupPageSwitchTransitions();

requestAnimationFrame(() => {
  setTimeout(finishPageTransitions, 80);
});
