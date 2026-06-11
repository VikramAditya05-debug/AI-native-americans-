const seminarPrice = 1595;

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function currentFileName() {
  const path = window.location.pathname.split("/").pop();
  return path || "index.html";
}

function setActiveNav() {
  const current = currentFileName();
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === current) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function wireMenu() {
  const header = document.querySelector(".site-header");
  const button = document.querySelector(".menu-toggle");
  if (!header || !button) return;

  button.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function wireDateButtons() {
  document.querySelectorAll("[data-register-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const date = button.getAttribute("data-register-date");
      window.location.href = `register.html?date=${encodeURIComponent(date)}`;
    });
  });
}

function injectFloatingActions() {
  if (document.querySelector(".floating-actions")) return;

  const actions = document.createElement("nav");
  actions.className = "floating-actions";
  actions.setAttribute("aria-label", "Quick actions");
  actions.innerHTML = `
    <a class="float-btn float-primary" href="register.html" data-cause-register><span>Register</span></a>
    <a class="float-btn" href="seminars.html"><span>Dates</span></a>
    <a class="float-btn" href="contact.html"><span>Help</span></a>
  `;
  document.body.appendChild(actions);
}

function injectSkipLink() {
  if (document.querySelector(".skip-link")) return;
  const main = document.querySelector("main");
  if (!main) return;
  if (!main.id) main.id = "main-content";

  const link = document.createElement("a");
  link.className = "skip-link";
  link.href = `#${main.id}`;
  link.textContent = "Skip to content";
  document.body.prepend(link);
}

function getContributionTotal(form) {
  let total = 0;
  form.querySelectorAll("[data-contribution]").forEach((input) => {
    if (input.checked) total += Number(input.value || 0);
  });

  const custom = form.querySelector("[data-custom-amount]");
  const customValue = Number(custom?.value || 0);
  if (customValue > 0) total += customValue;
  return total;
}

function registrationPayload(form) {
  const data = new FormData(form);
  const contributions = {};
  form.querySelectorAll("[data-contribution]").forEach((input) => {
    contributions[input.name] = input.checked ? Number(input.value) : 0;
  });

  contributions.customAmount = Number(form.querySelector("[data-custom-amount]")?.value || 0);

  return {
    fullName: String(data.get("fullName") || ""),
    organization: String(data.get("organization") || ""),
    email: String(data.get("email") || ""),
    phone: String(data.get("phone") || ""),
    seminarDate: String(data.get("seminarDate") || ""),
    role: String(data.get("role") || ""),
    baseAmount: seminarPrice,
    contributionTotal: getContributionTotal(form),
    contributions
  };
}

function createModal() {
  let backdrop = document.querySelector("[data-modal-backdrop]");
  if (backdrop) return backdrop;

  backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("data-modal-backdrop", "");
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">Registration Reserved</h2>
      <p data-modal-copy></p>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-modal-close>Close</button>
        <a class="btn btn-primary" href="contact.html">Contact Us</a>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector("[data-modal-close]").addEventListener("click", () => {
    backdrop.classList.remove("is-open");
  });
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.classList.remove("is-open");
  });
  return backdrop;
}

function showDemoConfirmation(payload, total) {
  const confirmationId = `AINA-${Date.now().toString().slice(-6)}`;
  localStorage.setItem(
    "aina:lastRegistration",
    JSON.stringify({ ...payload, total, confirmationId, createdAt: new Date().toISOString() })
  );

  const backdrop = createModal();
  const copy = backdrop.querySelector("[data-modal-copy]");
  copy.textContent = `Demo checkout is active on this local preview. ${payload.fullName || "The participant"} is reserved for ${payload.seminarDate || "the selected seminar"} with a total of ${money(total)}. Add a Stripe secret key on Vercel to send this button to real secure payment. Confirmation ${confirmationId}.`;
  backdrop.classList.add("is-open");
}

function wireRegistrationForm() {
  const form = document.querySelector("[data-registration-form]");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const selectedDate = params.get("date");
  if (selectedDate) {
    const dateInput = Array.from(form.querySelectorAll('input[name="seminarDate"]')).find(
      (input) => input.value === selectedDate
    );
    if (dateInput) dateInput.checked = true;
  }

  const causeTotal = Number(params.get("causeTotal") || 0);
  if (causeTotal > 0) {
    const customInput = form.querySelector("[data-custom-amount]");
    if (customInput) customInput.value = String(causeTotal);
  }

  const subtotalEl = document.querySelector("[data-subtotal]");
  const contributionsEl = document.querySelector("[data-contribution-total]");
  const totalEl = document.querySelector("[data-total]");
  const payButton = form.querySelector("[data-pay-button]");
  const status = document.querySelector("[data-payment-status]");

  function updateSummary() {
    const contributions = getContributionTotal(form);
    const total = seminarPrice + contributions;
    subtotalEl.textContent = money(seminarPrice);
    contributionsEl.textContent = money(contributions);
    totalEl.textContent = money(total);
  }

  form.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", updateSummary);
    input.addEventListener("change", updateSummary);
  });

  updateSummary();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const payload = registrationPayload(form);
    const total = payload.baseAmount + payload.contributionTotal;
    payButton.disabled = true;
    payButton.textContent = "Opening Secure Checkout...";
    status.className = "status-message";
    status.textContent = "";

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.url) {
          window.location.href = result.url;
          return;
        }
      }

      showDemoConfirmation(payload, total);
    } catch (error) {
      showDemoConfirmation(payload, total);
    } finally {
      payButton.disabled = false;
      payButton.textContent = "Pay & Register Now";
    }
  });
}

function wireCauseGivingForm() {
  const form = document.querySelector("[data-cause-giving-form]");
  if (!form) return;

  const totalEl = form.querySelector("[data-cause-total]");
  const registerLinks = document.querySelectorAll("[data-cause-register]");

  function updateCauseTotal() {
    let total = 0;
    form.querySelectorAll("[data-cause-row]").forEach((row) => {
      const checkbox = row.querySelector("[data-cause-check]");
      const amount = row.querySelector("[data-cause-amount]");
      const other = row.querySelector("[data-cause-other]");
      const value = Number(amount?.value || 0);
      const otherValue = Number(other?.value || 0);
      if (checkbox.checked) {
        if (otherValue > 0) {
          total += otherValue;
        } else if (value > 0) {
          total += value;
        }
      }
    });

    if (totalEl) totalEl.textContent = money(total);
    registerLinks.forEach((link) => {
      link.href = total > 0 ? `register.html?causeTotal=${encodeURIComponent(total)}` : "register.html";
    });
  }

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("[data-cause-row]");
      if (row && (input.matches("[data-cause-amount]") || input.matches("[data-cause-other]")) && Number(input.value || 0) > 0) {
        row.querySelector("[data-cause-check]").checked = true;
      }
      updateCauseTotal();
    });
    input.addEventListener("change", updateCauseTotal);
  });

  updateCauseTotal();
}

function wireContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
  const status = document.querySelector("[data-contact-status]");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem("aina:lastMessage", JSON.stringify({ ...data, createdAt: new Date().toISOString() }));
    form.reset();
    status.className = "status-message success is-visible";
    status.textContent = "Message received in this preview. Connect the form to your email service before launch.";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  injectSkipLink();
  setActiveNav();
  wireMenu();
  injectFloatingActions();
  wireDateButtons();
  wireRegistrationForm();
  wireCauseGivingForm();
  wireContactForm();
});
