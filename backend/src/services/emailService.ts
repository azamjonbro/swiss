import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;
let usingRealSmtp = false;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
    usingRealSmtp = true;
  } else {
    // No SMTP configured — a dev-safe transport that never actually delivers mail.
    // The link is logged to the console instead so the verification flow stays testable.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    usingRealSmtp = false;
  }

  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const mail = await getTransporter().sendMail({
    from: env.smtp.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (!usingRealSmtp) {
    // eslint-disable-next-line no-console
    console.log(`\n[email:dev] SMTP not configured — email not actually sent.\n[email:dev] To: ${options.to}\n[email:dev] Subject: ${options.subject}\n[email:dev] ${options.text}\n`);
    void mail;
  }
}

export function sendVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  return sendEmail({
    to,
    subject: 'Confirm your SwissWatch account',
    text: `Hello ${name},\n\nPlease confirm your email address to activate your SwissWatch account:\n${verifyUrl}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #0a0a0a;">
        <h1 style="font-weight: 400; font-size: 22px;">SwissWatch</h1>
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
          Please confirm your email address to activate your SwissWatch account.
        </p>
        <p style="margin: 28px 0;">
          <a href="${verifyUrl}" style="background: #0a0a0a; color: #fff; padding: 14px 28px; text-decoration: none; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">
            Confirm Email
          </a>
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6f6a63;">
          This link expires in 24 hours. If you did not create an account, you can ignore this email.
        </p>
      </div>
    `,
  });
}

export function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  return sendEmail({
    to,
    subject: 'Reset your SwissWatch password',
    text: `Hello ${name},\n\nWe received a request to reset the password on your SwissWatch account:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email — your password will not change.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #0a0a0a;">
        <h1 style="font-weight: 400; font-size: 22px;">SwissWatch</h1>
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password on your SwissWatch account.
        </p>
        <p style="margin: 28px 0;">
          <a href="${resetUrl}" style="background: #0a0a0a; color: #fff; padding: 14px 28px; text-decoration: none; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">
            Reset Password
          </a>
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6f6a63;">
          This link expires in 1 hour. If you did not request this, you can safely ignore this email — your password will not change.
        </p>
      </div>
    `,
  });
}
