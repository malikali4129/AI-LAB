(function () {
  const PDF_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const TOOLS = {
    jpgToPdf: {
      key: "jpgToPdf",
      icon: "IMG",
      title: "JPG to PDF",
      shortTitle: "Image to PDF",
      description: "Create one PDF from images.",
      accept: "image/jpeg,image/png,image/webp,image/avif",
      actionLabel: "Start Processing",
      outputLabel: "Download PDF",
      emptyHint: "Drop image files here or click to upload.",
      mode: "image"
    },
    pdfToJpg: {
      key: "pdfToJpg",
      icon: "PDF",
      title: "PDF to Image",
      shortTitle: "PDF to Image",
      description: "Extract PNG or JPG images from PDFs.",
      accept: "application/pdf,.pdf",
      actionLabel: "Start Processing",
      outputLabel: "Download Files",
      emptyHint: "Drop PDF files here or click to upload.",
      mode: "pdf"
    },
    mergePdfs: {
      key: "mergePdfs",
      icon: "MRG",
      title: "Merge PDFs",
      shortTitle: "Merge PDFs",
      description: "Merge PDF files into one.",
      accept: "application/pdf,.pdf",
      actionLabel: "Start Merging",
      outputLabel: "Download Merged PDF",
      emptyHint: "Drop PDF files here or click to upload.",
      mode: "pdf"
    }
  };

  const TOAST_LINES = [
    "Done. Your files made it through AIM LAB cleanly.",
    "Export finished. Browser-only pipeline complete.",
    "Operation complete. No upload needed.",
    "Task complete. Your download is ready."
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let unit = 0;
    let value = bytes;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }

    const precision = value >= 10 || unit === 0 ? 0 : 1;
    return value.toFixed(precision) + " " + units[unit];
  }

  function randomToastLine() {
    const index = Math.floor(Math.random() * TOAST_LINES.length);
    return TOAST_LINES[index];
  }

  function fileBaseName(name) {
    return name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "file";
  }

  function splitFileName(name) {
    const safe = String(name || "file");
    const dot = safe.lastIndexOf(".");
    if (dot <= 0 || dot === safe.length - 1) {
      return { base: safe, ext: "" };
    }

    return {
      base: safe.slice(0, dot),
      ext: safe.slice(dot)
    };
  }

  function sanitizeOutputBase(value) {
    return String(value || "")
      .trim()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_ ]+/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function isPdfFile(file) {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  }

  function createItem(file, mode) {
    return {
      id: "pdf-item-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      file: file,
      name: file.name,
      size: file.size,
      mode: mode,
      previewUrl: mode === "image" ? URL.createObjectURL(file) : ""
    };
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image: " + file.name));
      };

      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("Unable to create output blob."));
          return;
        }

        resolve(blob);
      }, type, quality);
    });
  }

  function setPdfWorker() {
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
    }
  }

  function createMarkup() {
    const tabs = Object.values(TOOLS)
      .map(function (tool, index) {
        const tabId = "pdf-tab-" + tool.key;
        return ""
          + '<button type="button" class="pdf-tab-btn" data-tab-target="' + tool.key + '" role="tab" id="' + tabId + '" aria-controls="pdf-panel-' + tool.key + '" aria-selected="false">'
          + "<span>" + tool.icon + "</span>"
          + "<strong>" + tool.shortTitle + "</strong>"
          + "</button>";
      })
      .join("");

    const panels = Object.values(TOOLS)
      .map(function (tool) {
        const panelId = "pdf-panel-" + tool.key;
        const qualityControl = tool.key === "jpgToPdf"
          ? ""
            + '<div class="pdf-control-block pdf-quality-note">'
            + '<p>Images will be converted at highest quality.</p>'
            + "</div>"
          : tool.key === "pdfToJpg"
            ? ""
              + '<div class="pdf-control-block">'
              + '<label class="download-label" for="pdf-image-format-' + tool.key + '">Image format</label>'
              + '<select id="pdf-image-format-' + tool.key + '" class="download-select" data-image-format>'
              + '<option value="jpg">JPG</option>'
              + '<option value="png">PNG</option>'
              + "</select>"
              + "</div>"
              + '<div class="pdf-control-block">'
              + '<label class="download-label" for="pdf-delivery-mode-' + tool.key + '">Download mode</label>'
              + '<select id="pdf-delivery-mode-' + tool.key + '" class="download-select" data-delivery-mode>'
              + '<option value="zip">ZIP package</option>'
              + '<option value="direct">Direct images</option>'
              + "</select>"
              + "</div>"

          : ""
            + '<div class="pdf-control-block pdf-control-note">'
            + '<p>PDF operations use browser-side rendering and remain on your device.</p>'
            + "</div>";

        return ""
          + '<section class="pdf-panel" data-tool-panel="' + tool.key + '" id="' + panelId + '" role="tabpanel" aria-labelledby="pdf-tab-' + tool.key + '">'
          + '<div class="pdf-panel-card glass-card">'
          + '<div class="pdf-panel-header">'
          + '<div class="pdf-step-header">'
          + '<p class="status-line"><span class="status-dot"></span>Step 2</p>'
          + '<button type="button" class="pdf-step-back" data-action="back" aria-label="Back to tool selection">←</button>'
          + "</div>"
          + "<div>"
          + "<h3>" + tool.title + "</h3>"
          + '<p class="subtitle">' + tool.description + "</p>"
          + "</div>"
          + '<div class="pdf-panel-stats">'
          + '<span class="pdf-pill" data-count>0 files</span>'
          + '<span class="pdf-pill" data-size>0 B</span>'
          + "</div>"
          + "</div>"
          + '<div class="pdf-control-grid">'
          + qualityControl
          + '<div class="pdf-control-block">'
          + '<input type="file" id="pdf-file-input-' + tool.key + '" data-file-input multiple accept="' + tool.accept + '" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;" />'
          + '<label for="pdf-file-input-' + tool.key + '" class="download-label pdf-upload-label"><span class="pdf-upload-label-desktop">Add or drop files</span><span class="pdf-upload-label-mobile">Select files</span></label>'
          + '<div class="pdf-drop-zone" data-drop-zone role="button" tabindex="0" aria-label="Upload files">'
          + '<strong class="pdf-dropzone-text-desktop">Add or drop files</strong>'
          + '<strong class="pdf-dropzone-text-mobile">Select files</strong>'
          + '<span data-empty-hint>' + tool.emptyHint + "</span>"
          + "</div>"
          + "</div>"
          + "</div>"
          + '<div class="pdf-panel-meta">'
          + '<div class="pdf-status-copy" data-status>Ready.</div>'
          + '<div class="pdf-spinner" data-spinner hidden aria-hidden="true"></div>'
          + "</div>"
          + '<div class="pdf-progress-shell" data-progress-shell hidden>'
          + '<div class="pdf-progress-track"><span class="pdf-progress-fill" data-progress-fill></span></div>'
          + '<div class="pdf-progress-label" data-progress-label>0%</div>'
          + "</div>"
          + '<div class="pdf-preview-section" data-preview-section hidden>'
          + '<div data-file-summary></div>'
          + '<div class="pdf-preview-grid" data-preview-grid></div>'
          + '<button type="button" class="pdf-reorder-button" data-action="reorder-open" hidden>Change Order</button>'
          + '</div>'
          + '<div class="pdf-actions">'
          + '<button type="button" class="ghost-button" data-action="back">Back</button>'
          + '<button type="button" class="cta-button" data-action="process">' + tool.actionLabel + "</button>"
          + '<button type="button" class="ghost-button" data-action="clear">Clear files</button>'
          + "</div>"
          + '<div class="pdf-output" data-output></div>'
          + "</div>"
          + "</section>";
      })
      .join("");

    return ""
      + '<div class="pdf-tools-shell">'
      + '<section class="pdf-hero glass-card" data-reveal>'
      + '<div class="pdf-hero-header">'
      + '<p class="status-line"><span class="status-dot"></span>Step 1</p>'
      + '<button type="button" class="pdf-step-menu" data-action="menu" aria-label="Menu" hidden>⋯</button>'
      + "</div>"
      + '<div class="pdf-hero-copy">'
      + '<h2>Pick a PDF tool.</h2>'
      + '<p class="subtitle">Choose one module to continue.</p>'
      + "</div>"
      + '<div class="pdf-tab-row" role="tablist" aria-label="PDF tools">'
      + tabs
      + "</div>"
      + "</section>"
      + '<section class="pdf-placeholder glass-card" data-tool-placeholder>'
      + '<p class="status-line"><span class="status-dot"></span>Waiting for selection</p>'
      + '<h3>Select a module to continue.</h3>'
      + '</section>'
      + '<div class="pdf-workspace" data-tool-workspace>'
      + panels
      + "</div>"
      + '<div class="pdf-reorder-modal" data-reorder-modal hidden>'
      + '<div class="pdf-reorder-backdrop"></div>'
      + '<div class="pdf-reorder-content">'
      + '<div class="pdf-reorder-header">'
      + '<h3>Reorder Files</h3>'
      + '<button type="button" class="pdf-modal-close" data-action="reorder-close" aria-label="Close">×</button>'
      + '</div>'
      + '<div class="pdf-reorder-list" data-reorder-list></div>'
      + '<div class="pdf-reorder-footer">'
      + '<button type="button" class="ghost-button" data-action="reorder-close">Done</button>'
      + '</div>'
      + '</div>'
      + '</div>'
      + "</div>";
  }

  function createToastHost(root) {
    const host = document.createElement("div");
    host.className = "pdf-toast-stack";
    root.appendChild(host);
    return host;
  }

  function showToast(toastHost, text) {
    if (!toastHost) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = "pdf-toast";
    toast.textContent = text;
    toastHost.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add("is-visible");
    }, 16);

    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2600);
  }

  function clearUrls(state) {
    if (state.outputUrl) {
      URL.revokeObjectURL(state.outputUrl);
      state.outputUrl = "";
    }

    state.directDownloads = [];

    state.files.forEach(function (item) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }

  function updateSummary(state) {
    const totalBytes = state.files.reduce(function (sum, item) {
      return sum + item.size;
    }, 0);

    state.elements.count.textContent = state.files.length + " file" + (state.files.length === 1 ? "" : "s");
    state.elements.size.textContent = formatBytes(totalBytes);
    state.elements.hint.textContent = state.files.length === 0
      ? state.tool.emptyHint
      : "Ready with " + state.files.length + " file" + (state.files.length === 1 ? "" : "s") + ".";
  }

  function renderOutput(state, html) {
    state.elements.output.innerHTML = html;
    if (html && html.trim().length > 0) {
      state.elements.output.classList.add("has-content");
      window.requestAnimationFrame(function () {
        state.elements.output.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } else {
      state.elements.output.classList.remove("has-content");
    }
  }

  function setExportMode(state, enabled) {
    state.exportReady = !!enabled;
    state.elements.panel.classList.toggle("is-export-ready", !!enabled);
  }

  function renderExportStep(state, outputName, headline, message, options) {
    const settings = options || {};
    const parts = splitFileName(outputName);
    const ext = parts.ext || (state.tool.key === "pdfToJpg" ? ".zip" : ".pdf");
    const base = sanitizeOutputBase(parts.base) || "file";
    const finalName = base + ext;
    const downloadLabel = settings.downloadLabel || (ext === ".pdf" ? "Download PDF" : "Download File");
    const isDirect = !!settings.direct;
    const downloadControl = isDirect
      ? '<button type="button" class="cta-button" data-direct-download data-ext="' + escapeHtml(ext.replace(/^\./, "")) + '">' + escapeHtml(downloadLabel) + '</button>'
      : '<a class="cta-button" data-output-download href="' + state.outputUrl + '" download="' + escapeHtml(finalName) + '">' + escapeHtml(downloadLabel) + "</a>";

    renderOutput(
      state,
      ""
        + '<div class="pdf-export-step">'
        + '<div class="pdf-step-header">'
        + '<p class="status-line"><span class="status-dot"></span>Step 3</p>'
        + '<button type="button" class="pdf-step-back" data-action="back" aria-label="Back to files">←</button>'
        + "</div>"
        + '<div class="pdf-output-copy"><strong>' + escapeHtml(headline) + '</strong><p>' + escapeHtml(message || randomToastLine()) + "</p></div>"
        + '<label class="download-label" for="pdf-output-name-' + state.tool.key + '">Rename file</label>'
        + '<input id="pdf-output-name-' + state.tool.key + '" type="text" class="pdf-output-name-input" data-output-name data-ext="' + escapeHtml(ext) + '" data-fallback-base="' + escapeHtml(base) + '" value="' + escapeHtml(base) + '" />'
        + '<p class="pdf-output-default">Default: <span data-output-default>' + escapeHtml(outputName) + '</span></p>'
        + downloadControl
        + "</div>"
    );

      setExportMode(state, true);
  }

  function setBusy(state, busy, message) {
    state.busy = busy;
    state.elements.dropZone.classList.toggle("is-disabled", busy);
    state.elements.spinner.hidden = !busy;
    state.elements.runButton.disabled = busy;
    state.elements.clearButton.disabled = busy;
    state.elements.input.disabled = busy;
    if (state.elements.quality) {
      state.elements.quality.disabled = busy;
    }
    if (state.elements.imageFormat) {
      state.elements.imageFormat.disabled = busy;
    }
    if (state.elements.deliveryMode) {
      state.elements.deliveryMode.disabled = busy;
    }

    if (busy) {
      setExportMode(state, false);
    }

    state.elements.status.textContent = message || (busy ? "Processing..." : "Ready.");
  }

  function setProgress(state, value) {
    const bounded = Math.max(0, Math.min(100, value));
    state.elements.progressFill.style.width = bounded + "%";
    state.elements.progressLabel.textContent = bounded === 100 ? "Done" : Math.round(bounded) + "%";
  }

  function renderFiles(state) {
    const list = state.elements.preview;
    const summary = state.elements.fileSummary;
    const previewSection = state.elements.previewSection;

    if (state.files.length === 0) {
      if (previewSection) {
        previewSection.hidden = true;
      }
      list.innerHTML = ""
        + '<div class="pdf-empty-state">'
        + "<h4>No files loaded</h4>"
        + "<p>" + escapeHtml(state.tool.emptyHint) + "</p>"
        + "</div>";
      if (summary) {
        summary.innerHTML = "";
      }
      return;
    }

    // Show preview section
    if (previewSection) {
      previewSection.hidden = false;
    }

    // Show compact file cards
    list.innerHTML = state.files
      .map(function (item, index) {
        const thumb = state.tool.mode === "image"
          ? '<img src="' + item.previewUrl + '" alt="' + escapeHtml(item.name) + '" class="pdf-preview-image" />'
          : '<div class="pdf-preview-loading">PDF</div>';

        return ""
          + '<article class="pdf-preview-card" data-id="' + item.id + '" draggable="true">'
          + '<button type="button" class="pdf-remove-btn" data-remove="' + item.id + '" aria-label="Remove">×</button>'
          + '<div class="pdf-preview-thumb">' + thumb + "</div>"
          + '<div class="pdf-preview-info">'
          + '<strong>' + (index + 1) + "</strong>"
          + "</div>"
          + "</article>";
      })
      .join("");

    // Show summary
    if (summary) {
      summary.innerHTML = '<span class="pdf-file-count">' + state.files.length + ' file' + (state.files.length === 1 ? '' : 's') + '</span>';
    }

    // Show reorder button
    const reorderBtn = state.elements.reorderButton;
    if (reorderBtn && state.files.length > 1) {
      reorderBtn.hidden = false;
    } else if (reorderBtn) {
      reorderBtn.hidden = true;
    }
  }

  function reorderFiles(state, fromId, toId) {
    const fromIndex = state.files.findIndex(function (item) {
      return item.id === fromId;
    });
    const toIndex = state.files.findIndex(function (item) {
      return item.id === toId;
    });

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return false;
    }

    const moved = state.files.splice(fromIndex, 1)[0];
    state.files.splice(toIndex, 0, moved);
    renderFiles(state);
    return true;
  }

  function removeFile(state, id) {
    const index = state.files.findIndex(function (item) {
      return item.id === id;
    });

    if (index === -1) {
      return;
    }

    const removed = state.files.splice(index, 1)[0];
    if (removed.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    updateSummary(state);
    renderFiles(state);
  }

  function normalizeFiles(fileList, mode) {
    return Array.from(fileList || []).filter(function (file) {
      if (mode === "image") {
        return file.type.indexOf("image/") === 0;
      }

      return isPdfFile(file);
    });
  }

  function addFiles(state, fileList, toastHost) {
    if (state.busy) {
      return;
    }

    setExportMode(state, false);
    state.directDownloads = [];

    const files = normalizeFiles(fileList, state.tool.mode);
    if (files.length === 0) {
      showToast(toastHost, "No compatible files found.");
      return;
    }

    files.forEach(function (file) {
      state.files.push(createItem(file, state.tool.mode));
    });

    updateSummary(state);
    renderFiles(state);
    showToast(toastHost, files.length + " file" + (files.length === 1 ? "" : "s") + " added.");
  }

  async function convertImageToPdf(state, toastHost) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast(toastHost, "jsPDF not loaded.");
      return;
    }

    if (state.files.length === 0) {
      showToast(toastHost, "Add image files first.");
      return;
    }

    setBusy(state, true, "Converting images to PDF...");
    setProgress(state, 8);

    try {
      const quality = Number(state.elements.quality ? state.elements.quality.value : 0.8);
      let pdf = null;

      for (let index = 0; index < state.files.length; index += 1) {
        const item = state.files[index];
        const image = await loadImage(item.file);

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const width = canvas.width;
        const height = canvas.height;
        const orientation = width >= height ? "landscape" : "portrait";

        if (!pdf) {
          pdf = new window.jspdf.jsPDF({ orientation: orientation, unit: "pt", format: [width, height] });
        } else {
          pdf.addPage([width, height], orientation);
        }

        const page = pdf.getNumberOfPages();
        pdf.setPage(page);
        pdf.addImage(dataUrl, "JPEG", 0, 0, width, height);

        setProgress(state, 10 + Math.round(((index + 1) / state.files.length) * 80));
      }

      const blob = pdf.output("blob");
      if (state.outputUrl) {
        URL.revokeObjectURL(state.outputUrl);
      }
      state.outputUrl = URL.createObjectURL(blob);

      const outputName = fileBaseName(state.files[0].name) + "-images.pdf";
      renderExportStep(state, outputName, "Conversion complete.", randomToastLine());

      setProgress(state, 100);
      showToast(toastHost, "PDF ready.");
    } catch (error) {
      renderOutput(state, '<div class="pdf-output-copy"><strong>Conversion failed.</strong><p>' + escapeHtml(error.message || "Unknown error") + "</p></div>");
      setProgress(state, 0);
    } finally {
      setBusy(state, false, "Ready.");
    }
  }

  async function convertPdfToJpgZip(state, toastHost) {
    if (!window.pdfjsLib) {
      showToast(toastHost, "pdf.js not loaded.");
      return;
    }

    if (state.files.length === 0) {
      showToast(toastHost, "Add PDF files first.");
      return;
    }

    const imageFormat = state.elements.imageFormat ? state.elements.imageFormat.value : "jpg";
    const deliveryMode = state.elements.deliveryMode ? state.elements.deliveryMode.value : "zip";

    if (deliveryMode === "zip" && !window.JSZip) {
      showToast(toastHost, "JSZip not loaded.");
      return;
    }

    const mimeType = imageFormat === "png" ? "image/png" : "image/jpeg";
    const extension = imageFormat === "png" ? "png" : "jpg";

    setBusy(state, true, "Converting PDF pages to " + extension.toUpperCase() + "...");
    setProgress(state, 8);

    try {
      setPdfWorker();

      let totalPages = 0;
      const loadedPdfs = [];
      for (let fileIndex = 0; fileIndex < state.files.length; fileIndex += 1) {
        const item = state.files[fileIndex];
        const loaded = await window.pdfjsLib.getDocument({ data: await item.file.arrayBuffer() }).promise;
        loadedPdfs.push({ item: item, pdf: loaded });
        totalPages += loaded.numPages;
      }

      const zip = deliveryMode === "zip" ? new window.JSZip() : null;
      const directFiles = [];
      let processedPages = 0;

      for (let pdfIndex = 0; pdfIndex < loadedPdfs.length; pdfIndex += 1) {
        const pair = loadedPdfs[pdfIndex];
        const prefix = fileBaseName(pair.item.name);

        for (let pageNumber = 1; pageNumber <= pair.pdf.numPages; pageNumber += 1) {
          const page = await pair.pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const imageBlob = await canvasToBlob(canvas, mimeType, imageFormat === "png" ? undefined : 0.92);
          const fileName = prefix + "-page-" + String(pageNumber).padStart(2, "0") + "." + extension;

          if (zip) {
            zip.file(fileName, imageBlob);
          } else {
            directFiles.push({ name: fileName, blob: imageBlob });
          }

          processedPages += 1;
          setProgress(state, 10 + Math.round((processedPages / totalPages) * 75));
        }
      }

      if (zip) {
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, function (meta) {
          setProgress(state, 85 + Math.round((meta.percent / 100) * 15));
        });

        if (state.outputUrl) {
          URL.revokeObjectURL(state.outputUrl);
        }
        state.outputUrl = URL.createObjectURL(zipBlob);
        state.directDownloads = [];

        const outputName = fileBaseName(state.files[0].name) + "-pages.zip";
        renderExportStep(state, outputName, "Conversion complete.", randomToastLine(), {
          downloadLabel: "Download ZIP"
        });
        showToast(toastHost, "ZIP ready.");
      } else {
        if (state.outputUrl) {
          URL.revokeObjectURL(state.outputUrl);
          state.outputUrl = "";
        }

        state.directDownloads = directFiles;
        const outputName = fileBaseName(state.files[0].name) + "-images." + extension;
        renderExportStep(state, outputName, "Conversion complete.", "Ready for direct download.", {
          direct: true,
          downloadLabel: "Download Images"
        });
        showToast(toastHost, "Images ready.");
      }

      setProgress(state, 100);
    } catch (error) {
      renderOutput(state, '<div class="pdf-output-copy"><strong>Conversion failed.</strong><p>' + escapeHtml(error.message || "Unknown error") + "</p></div>");
      setProgress(state, 0);
    } finally {
      setBusy(state, false, "Ready.");
    }
  }

  async function mergePdfFiles(state, toastHost) {
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      showToast(toastHost, "pdf-lib not loaded.");
      return;
    }

    if (state.files.length === 0) {
      showToast(toastHost, "Add PDF files first.");
      return;
    }

    setBusy(state, true, "Merging PDF files...");
    setProgress(state, 8);

    try {
      const merged = await window.PDFLib.PDFDocument.create();

      for (let index = 0; index < state.files.length; index += 1) {
        const item = state.files[index];
        const source = await window.PDFLib.PDFDocument.load(await item.file.arrayBuffer());
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach(function (page) {
          merged.addPage(page);
        });

        setProgress(state, 10 + Math.round(((index + 1) / state.files.length) * 80));
      }

      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      if (state.outputUrl) {
        URL.revokeObjectURL(state.outputUrl);
      }
      state.outputUrl = URL.createObjectURL(blob);

      const outputName = fileBaseName(state.files[0].name) + "-merged.pdf";
      renderExportStep(state, outputName, "Merge complete.", randomToastLine());

      setProgress(state, 100);
      showToast(toastHost, "Merged PDF ready.");
    } catch (error) {
      renderOutput(state, '<div class="pdf-output-copy"><strong>Merge failed.</strong><p>' + escapeHtml(error.message || "Unknown error") + "</p></div>");
      setProgress(state, 0);
    } finally {
      setBusy(state, false, "Ready.");
    }
  }

  function runTool(state, toastHost) {
    if (state.tool.key === "jpgToPdf") {
      convertImageToPdf(state, toastHost);
      return;
    }

    if (state.tool.key === "pdfToJpg") {
      convertPdfToJpgZip(state, toastHost);
      return;
    }

    mergePdfFiles(state, toastHost);
  }

  function bindPanelEvents(state, toastHost, onBack) {
    const dropZone = state.elements.dropZone;
    const input = state.elements.input;

    dropZone.addEventListener("click", function (event) {
      if (event.target.closest("button,a,input")) {
        return;
      }
      if (!state.busy) {
        input.click();
      }
    });

    dropZone.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && !state.busy) {
        event.preventDefault();
        input.click();
      }
    });

    input.addEventListener("change", function () {
      addFiles(state, input.files, toastHost);
      input.value = "";
    });

    // Mobile fallback: ensure the label always opens the picker.
    const uploadLabel = state.elements.panel.querySelector(".pdf-upload-label");
    if (uploadLabel) {
      uploadLabel.addEventListener("click", function () {
        if (!state.busy) {
          input.click();
        }
      });
    }

    ["dragenter", "dragover"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.remove("is-dragover");
      });
    });

    dropZone.addEventListener("drop", function (event) {
      if (state.busy) {
        return;
      }

      addFiles(state, event.dataTransfer.files, toastHost);
    });

    state.elements.preview.addEventListener("click", function (event) {
      const removeButton = event.target.closest("[data-remove]");
      if (!removeButton || state.busy) {
        return;
      }

      removeFile(state, removeButton.getAttribute("data-remove"));
      showToast(toastHost, "File removed.");
    });

    state.elements.preview.addEventListener("dragstart", function (event) {
      const card = event.target.closest(".pdf-preview-card");
      if (!card || state.busy) {
        return;
      }

      state.draggedId = card.getAttribute("data-id");
      card.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", state.draggedId);
      }
    });

    state.elements.preview.addEventListener("dragover", function (event) {
      if (!state.draggedId || state.busy) {
        return;
      }

      event.preventDefault();
      const card = event.target.closest(".pdf-preview-card");
      Array.from(state.elements.preview.querySelectorAll(".pdf-preview-card.is-dragover")).forEach(function (item) {
        item.classList.remove("is-dragover");
      });

      if (card && card.getAttribute("data-id") !== state.draggedId) {
        card.classList.add("is-dragover");
      }
    });

    state.elements.preview.addEventListener("drop", function (event) {
      if (!state.draggedId || state.busy) {
        return;
      }

      event.preventDefault();
      const card = event.target.closest(".pdf-preview-card");
      const targetId = card ? card.getAttribute("data-id") : "";

      Array.from(state.elements.preview.querySelectorAll(".pdf-preview-card.is-dragover")).forEach(function (item) {
        item.classList.remove("is-dragover");
      });

      if (targetId && targetId !== state.draggedId) {
        const moved = reorderFiles(state, state.draggedId, targetId);
        if (moved) {
          showToast(toastHost, "Order updated.");
        }
      }

      state.draggedId = "";
    });

    state.elements.preview.addEventListener("dragend", function () {
      Array.from(state.elements.preview.querySelectorAll(".pdf-preview-card.is-dragging,.pdf-preview-card.is-dragover")).forEach(function (item) {
        item.classList.remove("is-dragging", "is-dragover");
      });
      state.draggedId = "";
    });

    state.elements.runButton.addEventListener("click", function () {
      if (!state.busy && state.files.length > 0) {
        runTool(state, toastHost);
      }
    });

    state.elements.clearButton.addEventListener("click", function () {
      clearUrls(state);
      state.files = [];
      state.directDownloads = [];
      setExportMode(state, false);
      renderOutput(state, "");
      renderFiles(state);
      updateSummary(state);
      setProgress(state, 0);
      showToast(toastHost, "Files cleared.");
    });

    if (state.elements.backButton) {
      state.elements.backButton.addEventListener("click", function () {
        if (!state.busy && typeof onBack === "function") {
          onBack();
        }
      });
    }

    if (state.elements.reorderButton) {
      state.elements.reorderButton.addEventListener("click", function () {
        openReorderModal(state);
      });
    }

    state.elements.output.addEventListener("input", function (event) {
      const renameInput = event.target.closest("[data-output-name]");
      if (!renameInput) {
        return;
      }

      const ext = renameInput.getAttribute("data-ext") || "";
      const fallbackBase = renameInput.getAttribute("data-fallback-base") || "file";
      const safeBase = sanitizeOutputBase(renameInput.value) || fallbackBase;
      const finalName = safeBase + ext;
      const downloadLink = state.elements.output.querySelector("[data-output-download]");

      if (downloadLink) {
        downloadLink.setAttribute("download", finalName);
      }
    });

    state.elements.output.addEventListener("click", function (event) {
      const backButton = event.target.closest("[data-action='back']");
      if (backButton) {
        event.preventDefault();
        clearUrls(state);
        setExportMode(state, false);
        renderOutput(state, "");
        renderFiles(state);
        setProgress(state, 0);
        showToast(toastHost, "Ready for new files.");
        return;
      }

      const directDownloadButton = event.target.closest("[data-direct-download]");
      if (!directDownloadButton || !state.directDownloads || state.directDownloads.length === 0) {
        return;
      }

      event.preventDefault();
      const renameInput = state.elements.output.querySelector("[data-output-name]");
      const ext = (directDownloadButton.getAttribute("data-ext") || "jpg").replace(/^\./, "");
      const fallbackBase = renameInput ? (renameInput.getAttribute("data-fallback-base") || "file") : "file";
      const safeBase = renameInput ? (sanitizeOutputBase(renameInput.value) || fallbackBase) : fallbackBase;

      state.directDownloads.forEach(function (file, index) {
        const pageSuffix = String(index + 1).padStart(2, "0");
        const fileName = safeBase + "-" + pageSuffix + "." + ext;
        const url = URL.createObjectURL(file.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 600);
      });

      showToast(toastHost, "Direct download started.");
    });

    if (state.elements.quality && state.elements.qualityValue) {
      state.elements.qualityValue.textContent = Number(state.elements.quality.value).toFixed(2);
      state.elements.quality.addEventListener("input", function () {
        state.elements.qualityValue.textContent = Number(state.elements.quality.value).toFixed(2);
      });
    }
  }

  function openReorderModal(state) {
    const shell = document.querySelector(".pdf-tools-shell");
    const modal = shell.querySelector("[data-reorder-modal]");
    const list = modal.querySelector("[data-reorder-list]");

    list.innerHTML = state.files
      .map(function (item, index) {
        const thumb = state.tool.mode === "image"
          ? '<img src="' + item.previewUrl + '" alt="' + escapeHtml(item.name) + '" class="pdf-reorder-thumb" />'
          : '<div class="pdf-reorder-placeholder">PDF ' + (index + 1) + "</div>";

        return ""
          + '<div class="pdf-reorder-item" data-reorder-id="' + item.id + '" draggable="true">'
          + '<div class="pdf-reorder-handle">:::</div>'
          + '<div class="pdf-reorder-image">' + thumb + "</div>"
          + '<div class="pdf-reorder-text">'
          + '<strong>' + (index + 1) + "</strong>"
          + "<span>" + escapeHtml(item.name) + "</span>"
          + "</div>"
          + "</div>";
      })
      .join("");

    modal.hidden = false;

  // Scroll to top to center modal
  window.scrollTo({ top: 0, behavior: "instant" });

    // Add reorder modal events
    let draggedId = "";

    list.addEventListener("dragstart", function (event) {
      const item = event.target.closest(".pdf-reorder-item");
      if (item) {
        draggedId = item.getAttribute("data-reorder-id");
        item.classList.add("is-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
        }
      }
    }, { once: false });

    list.addEventListener("dragend", function (event) {
      const item = event.target.closest(".pdf-reorder-item");
      if (item) {
        item.classList.remove("is-dragging");
      }
      Array.from(list.querySelectorAll(".pdf-reorder-item.is-dragover")).forEach(function (el) {
        el.classList.remove("is-dragover");
      });
    }, { once: false });

    list.addEventListener("dragover", function (event) {
      if (!draggedId) {
        return;
      }
      event.preventDefault();
      const item = event.target.closest(".pdf-reorder-item");
      if (item && item.getAttribute("data-reorder-id") !== draggedId) {
        item.classList.add("is-dragover");
      }
    }, { once: false });

    list.addEventListener("dragleave", function (event) {
      const item = event.target.closest(".pdf-reorder-item");
      if (item) {
        item.classList.remove("is-dragover");
      }
    }, { once: false });

    list.addEventListener("drop", function (event) {
      event.preventDefault();
      if (!draggedId) {
        return;
      }
      const item = event.target.closest(".pdf-reorder-item");
      if (!item) {
        return;
      }
      const targetId = item.getAttribute("data-reorder-id");
      if (targetId !== draggedId) {
        reorderFiles(state, draggedId, targetId);
        openReorderModal(state);
      }
    }, { once: false });

      // Add touch event handlers for mobile drag support
      let touchDraggedId = "";
      let touchSource = null;

      list.addEventListener("touchstart", function (event) {
        const item = event.target.closest(".pdf-reorder-item");
        if (item) {
          touchDraggedId = item.getAttribute("data-reorder-id");
          touchSource = item;
          item.classList.add("is-dragging");
        }
      }, { once: false });

      list.addEventListener("touchmove", function (event) {
        if (!touchDraggedId || !touchSource) {
          return;
        }
        event.preventDefault();
        const touch = event.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const item = target ? target.closest(".pdf-reorder-item") : null;
      
        // Remove dragover from all items
        Array.from(list.querySelectorAll(".pdf-reorder-item.is-dragover")).forEach(function (el) {
          el.classList.remove("is-dragover");
        });
      
        if (item && item.getAttribute("data-reorder-id") !== touchDraggedId) {
          item.classList.add("is-dragover");
        }
      }, { once: false });

      list.addEventListener("touchend", function (event) {
        if (!touchDraggedId) {
          return;
        }
      
        const touch = event.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const item = target ? target.closest(".pdf-reorder-item") : null;
      
        if (item && touchSource) {
          touchSource.classList.remove("is-dragging");
          item.classList.remove("is-dragover");
        
          const targetId = item.getAttribute("data-reorder-id");
          if (targetId !== touchDraggedId) {
            reorderFiles(state, touchDraggedId, targetId);
            openReorderModal(state);
          }
        }
      
        touchDraggedId = "";
        touchSource = null;
      }, { once: false });

      list.addEventListener("touchcancel", function (event) {
        if (touchSource) {
          touchSource.classList.remove("is-dragging");
        }
        Array.from(list.querySelectorAll(".pdf-reorder-item.is-dragover")).forEach(function (el) {
          el.classList.remove("is-dragover");
        });
        touchDraggedId = "";
        touchSource = null;
      }, { once: false });
  }

  function closeReorderModal() {
    const shell = document.querySelector(".pdf-tools-shell");
    const modal = shell.querySelector("[data-reorder-modal]");
    modal.hidden = true;
  }

  function initPdfTools(root) {
    if (!root) {
      return;
    }

    setPdfWorker();
    root.innerHTML = createMarkup();

    const toastHost = createToastHost(root);
    const states = {};
    const stepHero = root.querySelector(".pdf-hero");
    const placeholder = root.querySelector("[data-tool-placeholder]");

    Object.values(TOOLS).forEach(function (tool) {
      const panel = root.querySelector('[data-tool-panel="' + tool.key + '"]');
      const state = {
        tool: tool,
        files: [],
        busy: false,
        outputUrl: "",
        directDownloads: [],
        elements: {
          panel: panel,
          count: panel.querySelector("[data-count]"),
          size: panel.querySelector("[data-size]"),
          hint: panel.querySelector("[data-empty-hint]"),
          dropZone: panel.querySelector("[data-drop-zone]"),
          input: panel.querySelector("[data-file-input]"),
          status: panel.querySelector("[data-status]"),
          spinner: panel.querySelector("[data-spinner]"),
          progressFill: panel.querySelector("[data-progress-fill]"),
          progressLabel: panel.querySelector("[data-progress-label]"),
          progressShell: panel.querySelector("[data-progress-shell]"),
          preview: panel.querySelector("[data-preview-grid]"),
          previewSection: panel.querySelector("[data-preview-section]"),
          output: panel.querySelector("[data-output]"),
          fileSummary: panel.querySelector("[data-file-summary]"),
          reorderButton: panel.querySelector('[data-action="reorder-open"]'),
          backButton: panel.querySelector('[data-action="back"]'),
          runButton: panel.querySelector('[data-action="process"]'),
          clearButton: panel.querySelector('[data-action="clear"]'),
          quality: panel.querySelector('[id^="pdf-quality-slider-"]'),
          imageFormat: panel.querySelector("[data-image-format]"),
          deliveryMode: panel.querySelector("[data-delivery-mode]"),
          qualityValue: panel.querySelector("[data-quality-value]")
        }
      };

      state.draggedId = "";
      state.exportReady = false;

      states[tool.key] = state;
      updateSummary(state);
      renderFiles(state);
      renderOutput(state, "");
      bindPanelEvents(state, toastHost, function () {
        activate(null);
      });
    });

    const tabs = Array.from(root.querySelectorAll("[data-tab-target]"));
    const panels = Array.from(root.querySelectorAll("[data-tool-panel]"));

    function activate(toolKey) {
      const hasSelection = !!toolKey;

      root.classList.toggle("is-tool-selected", hasSelection);

      if (stepHero) {
        stepHero.classList.toggle("is-hidden", hasSelection);
      }

      if (placeholder) {
        placeholder.classList.toggle("is-hidden", hasSelection);
      }

      tabs.forEach(function (tab) {
        const active = tab.getAttribute("data-tab-target") === toolKey;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(function (panel) {
        const active = panel.getAttribute("data-tool-panel") === toolKey;
        panel.classList.toggle("is-active", active);
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activate(tab.getAttribute("data-tab-target"));
      });
    });

    // Add reorder modal event handlers
    const reorderModal = root.querySelector("[data-reorder-modal]");
    if (reorderModal) {
      const backdrop = reorderModal.querySelector(".pdf-reorder-backdrop");
      const closeButtons = reorderModal.querySelectorAll('[data-action="reorder-close"]');

      backdrop.addEventListener("click", function () {
        closeReorderModal();
      });

      closeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          closeReorderModal();
        });
      });
    }

    activate(null);

    if (!window.jspdf || !window.pdfjsLib || !window.PDFLib || !window.JSZip) {
      showToast(toastHost, "Some libraries are still loading. Tools will work when CDN scripts finish.");
    }
  }

  window.initPdfTools = initPdfTools;
})();
