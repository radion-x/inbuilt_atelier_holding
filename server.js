import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import formData from "form-data";
import Mailgun from "mailgun.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const jsonLimit = process.env.PAYLOAD_LIMIT || "1mb";

app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
app.use(express.static(path.join(__dirname, "public")));

const requiredEnv = ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAILGUN_TO"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

const mailgunUsername = process.env.MAILGUN_USERNAME || process.env.MAILGUN_USER || "api";
const mailgunKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_PASSWORD || "";

let mailgunClient = null;
if (missingEnv.length === 0) {
  const mailgun = new Mailgun(formData);
  mailgunClient = mailgun.client({
    username: mailgunUsername,
    key: mailgunKey,
    url: process.env.MAILGUN_API_BASE || "https://api.mailgun.net",
  });
} else {
  console.warn(`Mailgun configuration incomplete. Missing: ${missingEnv.join(", ")}`);
}

const sanitize = (value = "") => value.toString().trim();

const validatePayload = (payload) => {
  const errors = {};
  const name = sanitize(payload.name);
  const email = sanitize(payload.email);
  const phone = sanitize(payload.phone);
  const message = sanitize(payload.message);

  if (name.length < 2) {
    errors.name = "Please provide your full name.";
  }

  const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  if (!emailPattern.test(email)) {
    errors.email = "Please provide a valid email address.";
  }

  if (!message || message.length < 10) {
    errors.message = "Please include a short message.";
  }

  if (phone && phone.length < 6) {
    errors.phone = "Phone number looks too short.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: { name, email, phone, message },
  };
};

app.post("/api/contact", async (req, res) => {
  if (!mailgunClient) {
    return res.status(503).json({
      ok: false,
      error: "Mailgun configuration missing on the server. Check username/password settings.",
    });
  }

  const { isValid, errors, normalized } = validatePayload(req.body || {});
  if (!isValid) {
    return res.status(422).json({ ok: false, errors });
  }

  const { name, email, phone, message } = normalized;

  const subject = `Inbuilt Atelier enquiry from ${name}`;
  const textLines = [
    `Website Enquiry Form Submission`,
    `---`,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : "",
    "",
    "Message:",
    message,
  ].filter(Boolean);

  const htmlLines = [
    `<p><strong>Website Enquiry Form Submission</strong></p>`,
    `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 1rem 0;">`,
    `<p><strong>Name:</strong> ${name}</p>`,
    `<p><strong>Email:</strong> ${email}</p>`,
    phone ? `<p><strong>Phone:</strong> ${phone}</p>` : "",
    `<p><strong>Message:</strong></p>`,
    `<p>${message.replace(/\n/g, "<br>")}</p>`,
  ].filter(Boolean);

  try {
    await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
      from: process.env.MAILGUN_FROM || `Inbuilt Atelier <inbuilt_atelier@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.MAILGUN_TO.split(",").map((emailAddress) => emailAddress.trim()),
      subject,
      text: textLines.join("\n"),
      html: htmlLines.join("\n"),
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Mailgun send failed", error);
    res.status(502).json({
      ok: false,
      error: "Unable to send email at this time.",
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ ok: false, error: "Malformed request body." });
  }
  console.error("Unhandled error", err);
  return res.status(500).json({ ok: false, error: "Unexpected server error." });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
