const GPA_SCALE = {
  A: 4.0,
  "A-": 3.67,
  "B+": 3.33,
  B: 3.00,
  "B-": 2.67,
  "C+": 2.33,
  C: 2.00,
  "C-": 1.67,
  F: 0.0
};

function gradeBadge(gpa) {
  if (gpa >= 3.7) return "Excellent";
  if (gpa >= 3.0) return "Great";
  if (gpa >= 2.3) return "Good";
  if (gpa >= 2.0) return "Average";
  return "Needs Improvement";
}

function createRow(index) {
  return `
    <div class="gpa-row" data-row>
      <input class="download-input" data-course-name type="text" placeholder="Subject ${index}" />
      <input class="download-input" data-course-credit type="number" min="0" step="0.5" value="3" />
      <select class="download-select" data-course-grade>
        ${Object.keys(GPA_SCALE).map((grade) => `<option value="${grade}">${grade}</option>`).join("")}
      </select>
      <button type="button" class="ghost-button gpa-remove" data-remove-row>Remove</button>
    </div>
  `;
}

function initGpaCalculator(root) {
  if (!root) return;

  root.innerHTML = `
    <div class="gpa-card">
      <div class="gpa-head">
        <p class="download-label">Semester subjects</p>
        <div class="gpa-columns">
          <span>Subject</span><span>Credits</span><span>Grade</span><span>Action</span>
        </div>
      </div>

      <div id="gpa-rows" class="gpa-rows"></div>

      <div class="gpa-actions">
        <button type="button" class="ghost-button" data-add-row>Add subject</button>
        <button type="button" class="ghost-button" data-reset>Reset</button>
      </div>

      <div class="gpa-cumulative">
        <p class="download-label">Cumulative GPA (optional)</p>
        <div class="gpa-cumulative-grid">
          <input class="download-input" data-prev-credits type="number" min="0" step="0.5" placeholder="Previous credits" />
          <input class="download-input" data-prev-gpa type="number" min="0" max="4" step="0.01" placeholder="Previous GPA" />
        </div>
      </div>

      <div class="download-result" id="gpa-result" aria-live="polite"></div>
    </div>
  `;

  const rowsRoot = root.querySelector("#gpa-rows");
  const addBtn = root.querySelector("[data-add-row]");
  const resetBtn = root.querySelector("[data-reset]");
  const prevCreditsInput = root.querySelector("[data-prev-credits]");
  const prevGpaInput = root.querySelector("[data-prev-gpa]");
  const result = root.querySelector("#gpa-result");

  function addRow() {
    const index = rowsRoot.querySelectorAll("[data-row]").length + 1;
    rowsRoot.insertAdjacentHTML("beforeend", createRow(index));
    render();
  }

  function resetAll() {
    rowsRoot.innerHTML = "";
    prevCreditsInput.value = "";
    prevGpaInput.value = "";
    addRow();
    addRow();
    addRow();
    render();
  }

  function parseRows() {
    const rows = [...rowsRoot.querySelectorAll("[data-row]")];
    return rows
      .map((row) => {
        const credit = Number.parseFloat(row.querySelector("[data-course-credit]").value);
        const grade = row.querySelector("[data-course-grade]").value;
        return {
          credit: Number.isFinite(credit) ? credit : 0,
          point: GPA_SCALE[grade] ?? 0
        };
      })
      .filter((item) => item.credit > 0);
  }

  function render() {
    const courses = parseRows();

    if (courses.length === 0) {
      result.innerHTML = '<span class="speed-warn">Add at least one subject with valid credits.</span>';
      return;
    }

    const totalCredits = courses.reduce((sum, c) => sum + c.credit, 0);
    const qualityPoints = courses.reduce((sum, c) => sum + c.credit * c.point, 0);
    const semesterGpa = qualityPoints / totalCredits;

    const prevCredits = Number.parseFloat(prevCreditsInput.value);
    const prevGpa = Number.parseFloat(prevGpaInput.value);

    let cumulativeLine = '<div class="speed-row"><strong>Cumulative GPA:</strong> Add previous credits and GPA to compute.</div>';

    if (Number.isFinite(prevCredits) && Number.isFinite(prevGpa) && prevCredits > 0 && prevGpa >= 0 && prevGpa <= 4) {
      const cumulativeQuality = prevCredits * prevGpa + qualityPoints;
      const cumulativeCredits = prevCredits + totalCredits;
      const cumulativeGpa = cumulativeQuality / cumulativeCredits;
      cumulativeLine = `<div class="speed-row"><strong>Cumulative GPA:</strong> ${cumulativeGpa.toFixed(2)} (${gradeBadge(cumulativeGpa)})</div>`;
    }

    result.innerHTML = `
      <div class="speed-row"><strong>Subjects counted:</strong> ${courses.length}</div>
      <div class="speed-row"><strong>Total credits:</strong> ${totalCredits.toFixed(1)}</div>
      <div class="speed-row"><strong>Semester GPA:</strong> ${semesterGpa.toFixed(2)} (${gradeBadge(semesterGpa)})</div>
      ${cumulativeLine}
    `;
  }

  rowsRoot.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-remove-row]");
    if (!removeBtn) return;

    const rows = rowsRoot.querySelectorAll("[data-row]");
    if (rows.length <= 1) {
      return;
    }

    removeBtn.closest("[data-row]").remove();
    render();
  });

  rowsRoot.addEventListener("input", render);
  rowsRoot.addEventListener("change", render);
  prevCreditsInput.addEventListener("input", render);
  prevGpaInput.addEventListener("input", render);
  addBtn.addEventListener("click", addRow);
  resetBtn.addEventListener("click", resetAll);

  resetAll();
}

window.initGpaCalculator = initGpaCalculator;
