const PROJECTS_DATA_URL = "data/referenceProjects.json";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEntries(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.projects)) return source.projects;
  return [];
}

function normalizeProject(item) {
  return {
    name: item && typeof item.name === "string" ? item.name : "Untitled Project",
    category: item && typeof item.category === "string" ? item.category : "General",
    summary: item && typeof item.summary === "string" ? item.summary : "No description provided.",
    href: item && typeof item.href === "string" ? item.href : "#",
    linkLabel: item && typeof item.linkLabel === "string" ? item.linkLabel : "Open",
    openInNewTab: Boolean(item && item.openInNewTab)
  };
}

async function loadProjectEntries() {
  const response = await fetch(`${PROJECTS_DATA_URL}?noCache=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to load project data: ${response.status}`);
  }

  const raw = await response.json();
  return normalizeEntries(raw).map(normalizeProject);
}

function createRows(entries) {
  return entries
    .map((project, index) => {
      const target = project.openInNewTab ? "_blank" : "_self";
      const rel = project.openInNewTab ? "noopener noreferrer" : "";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(project.name)}</td>
          <td><span class="projects-tag">${escapeHtml(project.category)}</span></td>
          <td>${escapeHtml(project.summary)}</td>
          <td>
            <a
              class="ghost-button projects-open-link"
              href="${escapeHtml(project.href)}"
              aria-label="Open ${escapeHtml(project.name)}"
              target="${target}"
              rel="${rel}"
            >
              ${escapeHtml(project.linkLabel)}
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function initProjectsTable(root) {
  if (!root) return;

  root.innerHTML = '<p class="projects-meta">Loading projects...</p>';

  let entries = [];
  try {
    entries = await loadProjectEntries();
  } catch (error) {
    root.innerHTML = `
      <section class="projects-shell">
        <p class="projects-meta">Could not load projects JSON.</p>
        <div class="download-result">
          <span class="speed-warn">${escapeHtml(error.message)}</span>
        </div>
      </section>
    `;
    return;
  }

  const rows = createRows(entries);
  const emptyState = entries.length === 0
    ? '<tr><td colspan="5">No project entries found. Add items in data/referenceProjects.json.</td></tr>'
    : rows;

  root.innerHTML = `
    <section class="projects-shell">
      <p class="projects-meta">Total Projects: <strong>${entries.length}</strong></p>
      <div class="projects-table-wrap" role="region" aria-label="Projects table" tabindex="0">
        <table class="projects-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Project</th>
              <th scope="col">Category</th>
              <th scope="col">Description</th>
              <th scope="col">Link</th>
            </tr>
          </thead>
          <tbody>
            ${emptyState}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

window.initProjectsTable = initProjectsTable;
