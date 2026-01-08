(() => {
  const FORM_ENDPOINT = "/api/contact";

  const form = document.getElementById("contact-form");
  if (!form) return;

  const submitButton = form.querySelector("button[type='submit']");
  const statusMount = document.createElement("div");
  statusMount.setAttribute("aria-live", "polite");
  statusMount.setAttribute("role", "status");
  form.appendChild(statusMount);

  const fieldErrors = new Map();
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    fieldErrors.set(node.dataset.errorFor, node);
  });

  const setStatusMessage = (templateId, fallbackText = "") => {
    const template = document.getElementById(templateId);
    statusMount.innerHTML = "";
    if (template && template.content) {
      statusMount.appendChild(template.content.cloneNode(true));
    } else if (fallbackText) {
      const p = document.createElement("p");
      p.className = "contact__status contact__status--error";
      p.textContent = fallbackText;
      statusMount.appendChild(p);
    }
  };

  const clearStatus = () => {
    statusMount.innerHTML = "";
  };

  const setSubmitting = (isSubmitting) => {
    if (submitButton) {
      submitButton.disabled = isSubmitting;
      submitButton.setAttribute("aria-busy", String(isSubmitting));
    }
  };

  const validators = {
    name(value) {
      return value.trim().length >= 2
        ? ""
        : "Please enter your full name.";
    },
    email(value) {
      if (!value) return "Email is required.";
      const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
      return emailPattern.test(value) ? "" : "Enter a valid email address.";
    },
    message(value) {
      return value.trim().length >= 10
        ? ""
        : "Let us know how we can help.";
    },
  };

  const showError = (field, message) => {
    const errorEl = fieldErrors.get(field.id || field.name);
    if (errorEl) errorEl.textContent = message;
  };

  const clearErrors = () => {
    fieldErrors.forEach((node) => {
      node.textContent = "";
    });
  };

  const formToJSON = (formElement) => {
    const data = new FormData(formElement);
    return Object.fromEntries(data.entries());
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();
    clearErrors();

    const fields = Array.from(form.elements).filter(
      (element) => element.name && !element.disabled
    );

    let isValid = true;
    fields.forEach((field) => {
      const validator = validators[field.name];
      if (validator) {
        const errorMessage = validator(field.value);
        if (errorMessage) {
          isValid = false;
          showError(field, errorMessage);
        }
      }
    });

    if (!isValid) {
      return;
    }

    if (!FORM_ENDPOINT) {
      setStatusMessage(
        "form-error",
        "No contact form endpoint configured. Set FORM_ENDPOINT in script.js."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formToJSON(form)),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 422 && payload && payload.errors) {
          Object.entries(payload.errors).forEach(([fieldName, message]) => {
            const field = form.elements.namedItem(fieldName);
            if (field) {
              showError(field, message);
            }
          });
          throw new Error("Validation failed");
        }

        const fallbackResponseMessage =
          response.status === 404 || response.status === 405
            ? "Contact service is unavailable. Is the server running?"
            : `Request failed with status ${response.status}`;
        const errorMessage = payload.error || fallbackResponseMessage;
        throw new Error(errorMessage);
      }

      form.reset();
      setStatusMessage("form-success");
    } catch (error) {
      console.error(error);
      const fallbackMessage =
        "We could not send your message right now. Please try again shortly.";
      const message = error.message && error.message !== "Validation failed"
        ? error.message
        : fallbackMessage;
      setStatusMessage("form-error", message);
    } finally {
      setSubmitting(false);
    }
  });
})();
