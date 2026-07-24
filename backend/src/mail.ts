import nodemailer from 'nodemailer';
import { config } from './config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465, // 465 = SSL implicit; 587 negociaza STARTTLS singur
  auth: { user: config.smtp.user, pass: config.smtp.password },
});

export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  await transporter.sendMail({
    from: config.smtp.user,
    to,
    subject,
    text: body,
  });
}
