function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CONTACT_DELIVERY = {
  services: {
    web3formsAccessKey: "28ae7436-435b-4258-8ae7-636791431d40"
  }
};



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
          <p class="about-note">Messages are sent directly to Web3Forms.</p>
          <p class="about-form-status" data-contact-status aria-live="polite"></p>
        </form>
      </article>
    </section>
  `;

  const form = root.querySelector("[data-contact-form]");
  const status = root.querySelector("[data-contact-status]");



  function setStatus(message, type) {
    status.textContent = message;
    status.dataset.state = type;
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
    form.reset();

    try {
      await sendToWeb3Forms(payload);
      setStatus("Message sent successfully!", "success");
    } catch (error) {
      setStatus("Failed to send message. Please try again.", "error");
    }
  });


}

window.initAboutMe = createAboutMeModule;
