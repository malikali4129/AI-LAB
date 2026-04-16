function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CONTACT_DELIVERY = {
  recipientEmail: "",
  useMailtoFallback: true,
  services: {
    formspreeEndpoint: "",
    web3formsAccessKey: "28ae7436-435b-4258-8ae7-636791431d40"
  }
};

function loadRecentContacts() {
  try {
    const raw = window.localStorage.getItem("aimlab-about-contacts");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveRecentContacts(items) {
  try {
    window.localStorage.setItem("aimlab-about-contacts", JSON.stringify(items));
  } catch (error) {
    // Ignore storage failures and keep form functional.
  }
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toPayload(name, email, message) {
  return {
    name,
    email,
    message,
    timestamp: Date.now(),
    source: "AIM LAB About Form"
  };
}

function createAboutMeModule(root) {
  if (!root) return;

  root.innerHTML = `
    <section class="about-shell">
      <article class="about-card">
        <h3>Hi, I am Malik</h3>
        <p>
          I build practical web tools and experiment with playful interfaces.
          This section is sample text for now, and will later be replaced with final bio content.
        </p>
        <p>
          I enjoy turning small daily problems into simple, useful apps with clean UX and clear behavior.
        </p>
      </article>

      <article class="about-card">
        <h3>Contact Now</h3>
        <form class="contact-form" data-contact-form novalidate>
          <label class="download-label" for="contact-name">Name</label>
          <input id="contact-name" name="name" class="download-input" type="text" autocomplete="name" required />

          <label class="download-label" for="contact-email">Email</label>
          <input id="contact-email" name="email" class="download-input" type="email" autocomplete="email" required />

          <label class="download-label" for="contact-message">Message</label>
          <textarea id="contact-message" name="message" class="about-textarea" rows="5" required></textarea>

          <button type="submit" class="cta-button">Send Message</button>
          <div class="about-action-row">
            <button type="button" class="ghost-button" data-contact-email-draft>Email Draft</button>
            <button type="button" class="ghost-button" data-contact-export-txt>Export TXT</button>
            <button type="button" class="ghost-button" data-contact-export-json>Export JSON</button>
          </div>
          <p class="about-note">Web3Forms delivery is enabled. You can still set recipientEmail for mail draft fallback.</p>
          <p class="about-form-status" data-contact-status aria-live="polite"></p>
        </form>

        <div class="about-recent" data-contact-recent>
          <p class="download-label">Recent messages</p>
          <div class="about-recent-list" data-contact-list></div>
        </div>
      </article>
    </section>
  `;

  const form = root.querySelector("[data-contact-form]");
  const status = root.querySelector("[data-contact-status]");
  const list = root.querySelector("[data-contact-list]");
  const emailDraftButton = root.querySelector("[data-contact-email-draft]");
  const exportTxtButton = root.querySelector("[data-contact-export-txt]");
  const exportJsonButton = root.querySelector("[data-contact-export-json]");

  function renderRecent() {
    const items = loadRecentContacts();
    if (!items.length) {
      list.innerHTML = '<p class="about-empty">No messages yet.</p>';
      return;
    }

    list.innerHTML = items
      .map((item) => {
        const date = new Date(item.timestamp).toLocaleString();
        return `
          <article class="about-recent-item">
            <h4>${escapeHtml(item.name)}</h4>
            <p>${escapeHtml(item.email)}</p>
            <p>${escapeHtml(item.message)}</p>
            <small>${escapeHtml(date)}</small>
          </article>
        `;
      })
      .join("");
  }

  function setStatus(message, type) {
    status.textContent = message;
    status.dataset.state = type;
  }

  function openEmailDraft(name, email, message) {
    if (!CONTACT_DELIVERY.recipientEmail) {
      setStatus("recipientEmail is not set yet in modules/aboutMe.js.", "error");
      return;
    }

    const subject = encodeURIComponent(`Contact request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    window.location.href = `mailto:${CONTACT_DELIVERY.recipientEmail}?subject=${subject}&body=${body}`;
  }

  async function sendToFormspree(payload) {
    const endpoint = CONTACT_DELIVERY.services.formspreeEndpoint;
    if (!endpoint) {
      return false;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Formspree failed with status ${response.status}`);
    }

    return true;
  }

  async function sendToWeb3Forms(payload) {
    const accessKey = CONTACT_DELIVERY.services.web3formsAccessKey;
    if (!accessKey) {
      return false;
    }

    const web3FormData = new FormData();
    web3FormData.append("access_key", accessKey);
    web3FormData.append("subject", "New About Contact Form Submission");
    web3FormData.append("name", payload.name);
    web3FormData.append("email", payload.email);
    web3FormData.append("message", payload.message);
    web3FormData.append("source", payload.source);
    web3FormData.append("timestamp", String(payload.timestamp));

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: web3FormData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(`Web3Forms failed: ${data.message || response.status}`);
    }

    return true;
  }

  async function sendToFreeService(payload) {
    const sentByFormspree = await sendToFormspree(payload);
    if (sentByFormspree) {
      return "formspree";
    }

    const sentByWeb3Forms = await sendToWeb3Forms(payload);
    if (sentByWeb3Forms) {
      return "web3forms";
    }

    return "none";
  }

  function exportAsTxt() {
    const rows = loadRecentContacts();
    if (!rows.length) {
      setStatus("No saved messages to export yet.", "error");
      return;
    }

    const text = rows
      .map((item, index) => {
        return [
          `Message ${index + 1}`,
          `Name: ${item.name}`,
          `Email: ${item.email}`,
          `Message: ${item.message}`,
          `Time: ${new Date(item.timestamp).toLocaleString()}`,
          "------------------------------"
        ].join("\n");
      })
      .join("\n");

    downloadTextFile("about-contact-messages.txt", text, "text/plain;charset=utf-8");
    setStatus("TXT export downloaded.", "success");
  }

  function exportAsJson() {
    const rows = loadRecentContacts();
    if (!rows.length) {
      setStatus("No saved messages to export yet.", "error");
      return;
    }

    downloadTextFile("about-contact-messages.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
    setStatus("JSON export downloaded.", "success");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      setStatus("Please fill in all fields.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(email)) {
      setStatus("Please enter a valid email address.", "error");
      return;
    }

    const payload = toPayload(name, email, message);

    const nextItems = [
      payload,
      ...loadRecentContacts()
    ].slice(0, 4);

    saveRecentContacts(nextItems);
    renderRecent();
    form.reset();

    try {
      const service = await sendToFreeService(payload);
      if (service === "formspree") {
        setStatus("Message delivered via Formspree and saved locally.", "success");
        return;
      }

      if (service === "web3forms") {
        setStatus("Message delivered via Web3Forms and saved locally.", "success");
        return;
      }

      if (CONTACT_DELIVERY.useMailtoFallback && CONTACT_DELIVERY.recipientEmail) {
        openEmailDraft(name, email, message);
        setStatus("Email draft opened and message saved locally.", "success");
        return;
      }

      setStatus("Saved locally. Set Formspree endpoint, Web3Forms key, or recipientEmail for external delivery.", "success");
    } catch (error) {
      setStatus("Saved locally, but external delivery failed. Check Formspree endpoint or Web3Forms key.", "error");
    }
  });

  emailDraftButton.addEventListener("click", () => {
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim() || "Unknown";
    const email = String(formData.get("email") || "").trim() || "not-provided@example.com";
    const message = String(formData.get("message") || "").trim() || "(empty message)";
    openEmailDraft(name, email, message);
  });

  exportTxtButton.addEventListener("click", exportAsTxt);
  exportJsonButton.addEventListener("click", exportAsJson);

  renderRecent();
}

window.initAboutMe = createAboutMeModule;
