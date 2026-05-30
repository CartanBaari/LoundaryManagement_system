import nodemailer from 'nodemailer';

let transporter;

const requiredEmailKeys = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
const placeholderPatterns = [/your-app-password/i, /your-email/i, /example\.com/i, /changeme/i];

const getNormalizedEmailConfig = () => ({
  EMAIL_HOST: process.env.EMAIL_HOST?.trim() || '',
  EMAIL_PORT: process.env.EMAIL_PORT?.trim() || '',
  EMAIL_USER: process.env.EMAIL_USER?.trim() || '',
  EMAIL_PASS: process.env.EMAIL_PASS?.trim() || '',
  EMAIL_FROM: process.env.EMAIL_FROM?.trim() || '',
});

const isPlaceholderValue = (value) => placeholderPatterns.some((pattern) => pattern.test(value));

const hasValidFromAddress = (value) => {
  if (!value) {
    return false;
  }

  const extractedAddress = value.match(/<([^>]+)>/)?.[1] || value;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extractedAddress.replace(/^"+|"+$/g, '').trim());
};

const getInvalidEmailConfig = () => {
  const config = getNormalizedEmailConfig();
  const invalid = [];

  for (const key of requiredEmailKeys) {
    const value = config[key];
    if (!value || isPlaceholderValue(value)) {
      invalid.push(key);
    }
  }

  if (config.EMAIL_FROM && !hasValidFromAddress(config.EMAIL_FROM) && !invalid.includes('EMAIL_FROM')) {
    invalid.push('EMAIL_FROM');
  }

  return invalid;
};

const hasEmailConfig = () => getInvalidEmailConfig().length === 0;

const getTransporter = () => {
  if (!hasEmailConfig()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
};

export const emailIsConfigured = () => hasEmailConfig();

export const getMissingEmailConfig = () => getInvalidEmailConfig();

export const sendEmail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();

  if (!mailer) {
    throw new Error(`Email service is not configured. Fix: ${getMissingEmailConfig().join(', ')}`);
  }

  return mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
};

export const sendBulkEmail = async ({ recipients, subject, textBuilder, htmlBuilder }) => {
  if (!Array.isArray(recipients) || !recipients.length) {
    return { sent: 0, skipped: 0 };
  }

  const mailer = getTransporter();

  if (!mailer) {
    throw new Error(`Email service is not configured. Fix: ${getMissingEmailConfig().join(', ')}`);
  }

  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    if (!recipient?.email) {
      skipped += 1;
      continue;
    }

    const text = typeof textBuilder === 'function' ? textBuilder(recipient) : '';
    const html = typeof htmlBuilder === 'function' ? htmlBuilder(recipient) : undefined;

    await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient.email,
      subject,
      text,
      html,
    });

    sent += 1;
  }

  return { sent, skipped };
};
