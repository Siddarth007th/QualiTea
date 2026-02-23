const nodemailer = require('nodemailer');
const { query } = require('./db');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Get authority email(s) from the SQLite team_members store.
 * Falls back to MANAGER_EMAIL env var if none found.
 */
async function getAuthorityEmails() {
  try {
    const result = await query('SELECT email FROM team_members WHERE role = ?', ['authority']);
    if (result.rows.length > 0) {
      return result.rows.map((row) => row.email);
    }
  } catch (err) {
    console.error('❌ Failed to fetch authority emails from DB:', err.message);
  }

  // Fallback
  const fallback = process.env.MANAGER_EMAIL;
  return fallback ? [fallback] : [];
}

/**
 * Send an alert email to authority members when a QA result is Fail or Semi-Pass.
 */
async function sendAlertEmail(data) {
  const { productName, attributeName, status, difficulty, notes, testedBy } = data;

  const recipients = await getAuthorityEmails();
  if (recipients.length === 0) {
    console.log('⚠️  No authority emails configured — skipping alert');
    return null;
  }

  const statusColor = status === 'Fail' ? '#ef4444' : '#f59e0b';
  const statusEmoji = status === 'Fail' ? '🔴' : '🟡';
  const subject = `${statusEmoji} QA ${status}: ${productName} — ${attributeName}`;

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="margin: 0 0 8px; color: #0f172a;">QA Result Alert</h2>
      <p style="margin: 0 0 24px; color: #64748b;">A quality check has returned a <strong>${status}</strong> status and requires your attention.</p>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Product</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${productName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Attribute</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${attributeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Status</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; color: #fff; background: ${statusColor};">
              ${status}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Tested By</td>
          <td style="padding: 8px 0; color: #0f172a;">${testedBy || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Notes</td>
          <td style="padding: 8px 0; color: #0f172a;">${notes || 'No notes provided.'}</td>
        </tr>
        ${difficulty ? `<tr>
          <td style="padding: 8px 0; color: #64748b;">Difficulty</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${difficulty === 'Hard' ? '🔴' : difficulty === 'Medium' ? '🟡' : '🟢'} ${difficulty}</td>
        </tr>` : ''}
      </table>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">Sent by QualiTea • Automated notification</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"QualiTea" <qualitea@example.com>',
      to: recipients.join(', '),
      subject,
      html,
    });
    console.log('📧 Alert email sent to:', recipients.join(', '), '—', info.messageId);
    if (info.messageId && process.env.SMTP_HOST === 'smtp.ethereal.email') {
      console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (err) {
    console.error('❌ Failed to send alert email:', err.message);
    return null;
  }
}

module.exports = { sendAlertEmail };
