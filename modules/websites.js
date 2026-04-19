const WEBSITES_TEXT_FILE = "data/websites-source.txt";

function normalizeWebsiteItem(item) {
  const name = typeof item?.name === "string" ? item.name.trim() : "";
  const description = typeof item?.description === "string" ? item.description.trim() : "";
  const link = typeof item?.link === "string" ? item.link.trim() : "";
  const category = typeof item?.category === "string" ? item.category.trim() : "Uncategorized";

  if (!name || !description || !link) {
    return null;
  }

  return { name, description, link, category: category || "Uncategorized" };
}

function parseWebsitesSourceText(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return [];
  }

  const blocks = rawText
    .split(/\n---\n|\r\n---\r\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const items = [];
  blocks.forEach((block) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    const draft = {};
    lines.forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      if (value) {
        draft[key] = value;
      }
    });

    const normalized = normalizeWebsiteItem({
      name: draft.name,
      description: draft.description,
      link: draft.link,
      category: draft.category
    });

    if (normalized) {
      items.push(normalized);
    }
  });

  return items;
}

async function loadWebsitesTextData() {
  try {
    const response = await fetch(`${WEBSITES_TEXT_FILE}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const rawText = await response.text();
    return parseWebsitesSourceText(rawText);
  } catch (error) {
    return [];
  }
}

async function loadWebsitesData() {
  return loadWebsitesTextData();
}

function toSafeUrl(link) {
  try {
    const url = new URL(link);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return null;
  } catch (error) {
    return null;
  }
}

function initWebsites(root) {
  if (!root) return;

  let allWebsites = [];

  root.innerHTML = `
    <div class="websites-shell">
      <div class="websites-controls">
        <div class="websites-control-block">
          <label class="download-label" for="websites-search">Search websites</label>
          <input
            id="websites-search"
            class="download-input"
            type="text"
            placeholder="Search by name, description, or category"
            autocomplete="off"
          />
        </div>

        <div class="websites-control-block">
          <label class="download-label" for="websites-category">Category</label>
          <select id="websites-category" class="download-select">
            <option value="all">All categories</option>
          </select>
        </div>
      </div>

      <div class="websites-status" id="websites-status" aria-live="polite">Loading websites...</div>
      <div class="websites-list" id="websites-list"></div>
    </div>
  `;

  const searchInput = root.querySelector("#websites-search");
  const categorySelect = root.querySelector("#websites-category");
  const statusEl = root.querySelector("#websites-status");
  const listEl = root.querySelector("#websites-list");

  function renderCategories(items) {
    const categories = [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
    categorySelect.innerHTML = `
      <option value="all">All categories</option>
      ${categories.map((category) => `<option value="${category}">${category}</option>`).join("")}
    `;
  }

  function getFilteredItems() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value;

    return allWebsites
      .filter((item) => {
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
        if (!matchesCategory) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        const combinedText = `${item.name} ${item.description} ${item.category}`.toLowerCase();
        return combinedText.includes(searchTerm);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderList() {
    const filtered = getFilteredItems();

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="websites-empty">
          <h3>No websites found</h3>
          <p>Try a different keyword or category filter.</p>
        </div>
      `;
      statusEl.textContent = "0 results";
      return;
    }

    listEl.innerHTML = filtered
      .map((item) => {
        const safeUrl = toSafeUrl(item.link);
        const linkMarkup = safeUrl
          ? `<a class="cta-button" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Visit Website</a>`
          : `<span class="ghost-button websites-link-disabled">Invalid URL</span>`;

        return `
          <article class="website-card">
            <div class="website-card-top">
              <h3>${item.name}</h3>
              <span class="website-category">${item.category}</span>
            </div>
            <p>${item.description}</p>
            <div class="website-actions">
              ${linkMarkup}
            </div>
          </article>
        `;
      })
      .join("");

    statusEl.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
  }

  function handleFilterChange() {
    renderList();
  }

  searchInput.addEventListener("input", handleFilterChange);
  categorySelect.addEventListener("change", handleFilterChange);

  loadWebsitesData().then((data) => {
    allWebsites = data;

    if (allWebsites.length === 0) {
      statusEl.innerHTML = '<span class="speed-warn">Could not load websites data from text source. If running via file://, use a local server.</span>';
      listEl.innerHTML = "";
      return;
    }

    renderCategories(allWebsites);
    renderList();
  });
}

window.initWebsites = initWebsites;
