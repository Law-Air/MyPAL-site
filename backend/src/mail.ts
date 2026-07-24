import nodemailer from 'nodemailer';
import { config } from './config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465, // 465 = SSL implicit; 587 negociaza STARTTLS singur
  auth: { user: config.smtp.user, pass: config.smtp.password },
  // Fara timeout explicit, o conexiune blocata de firewall (packet drop
  // tacut, nu refuz activ) atarna la nesfarsit in loc sa esueze clar.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  await transporter.sendMail({
    from: config.smtp.user,
    to,
    subject,
    text: body,
  });
}
