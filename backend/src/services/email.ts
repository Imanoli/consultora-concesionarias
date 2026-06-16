import nodemailer from 'nodemailer'

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Faltan variables SMTP_HOST / SMTP_USER / SMTP_PASS')
  }
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT ?? '465', 10),
    secure: true,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export async function sendAlert(subject: string, html: string): Promise<void> {
  const to = process.env.EMAIL_TO
  if (!to) throw new Error('Falta variable EMAIL_TO')

  const transport = createTransport()
  await transport.sendMail({
    from:    `"Dashboard IRM" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
}
