import nodemailer from 'nodemailer'
import { env } from './env'

// ---------------------------------------------------------------------------
// Transport (singleton)
// ---------------------------------------------------------------------------

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: false,
    auth:
      env.smtp.user
        ? { user: env.smtp.user, pass: env.smtp.pass }
        : undefined,
  })
}

let _transport: ReturnType<typeof createTransport> | null = null

function getTransport() {
  if (!_transport) _transport = createTransport()
  return _transport
}

// ---------------------------------------------------------------------------
// Test store (NODE_ENV=test) — import in tests to assert sent emails
// ---------------------------------------------------------------------------

export interface SentNotification {
  to: string
  subject: string
  html: string
}

export const sentNotifications: SentNotification[] = []

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]!)
}

function baseTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="color:#3b82f6;">${title}</h2>
  ${bodyHtml}
  <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;">
  <p style="font-size:12px;color:#6b7280;">Marketplace for Services</p>
</body>
</html>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (env.nodeEnv === 'test') {
    sentNotifications.push({ to, subject, html })
    return
  }
  await getTransport().sendMail({ from: env.smtp.from, to, subject, html })
}

// ---------------------------------------------------------------------------
// Auth emails (previously stubs)
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(params: { email: string; url: string }): Promise<void> {
  const html = baseTemplate(
    'Verify your email address',
    `<p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
     <a href="${params.url}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">Verify Email</a>
     <p style="margin-top:16px;font-size:13px;color:#6b7280;">If you didn't create an account, you can safely ignore this email.</p>`,
  )
  await sendEmail(params.email, 'Verify your email address', html)
}

export async function sendPasswordResetEmail(params: {
  email: string
  url: string
}): Promise<void> {
  const html = baseTemplate(
    'Reset your password',
    `<p>We received a request to reset your password. Click the button below to choose a new one.</p>
     <a href="${params.url}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">Reset Password</a>
     <p style="margin-top:16px;font-size:13px;color:#6b7280;">If you didn't request a password reset, you can safely ignore this email.</p>`,
  )
  await sendEmail(params.email, 'Reset your password', html)
}

export async function sendExistingAccountSignUpEmail(params: {
  email: string
  loginUrl: string
  resetUrl: string
}): Promise<void> {
  const html = baseTemplate(
    'Account already exists',
    `<p>Someone tried to sign up with your email address. If that was you, you can <a href="${params.loginUrl}">log in here</a>.</p>
     <p>If you've forgotten your password, you can <a href="${params.resetUrl}">reset it here</a>.</p>`,
  )
  await sendEmail(params.email, 'Account already exists', html)
}

export async function sendChangeEmailConfirmationEmail(params: {
  email: string
  url: string
}): Promise<void> {
  const html = baseTemplate(
    'Confirm your email change',
    `<p>Click the button below to confirm changing your email address.</p>
     <a href="${params.url}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">Confirm Email Change</a>`,
  )
  await sendEmail(params.email, 'Confirm your email change', html)
}

export async function sendNewEmailVerificationEmail(params: {
  email: string
  url: string
}): Promise<void> {
  const html = baseTemplate(
    'Verify your new email address',
    `<p>Please verify your new email address by clicking the button below.</p>
     <a href="${params.url}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">Verify New Email</a>`,
  )
  await sendEmail(params.email, 'Verify your new email address', html)
}

// ---------------------------------------------------------------------------
// Notification emails
// ---------------------------------------------------------------------------

export async function sendMessageNotificationEmail(params: {
  recipientEmail: string
  senderName: string
  postTitle: string
  threadUrl: string
}): Promise<void> {
  const html = baseTemplate(
    'You have a new message',
    `<p><strong>${escapeHtml(params.senderName)}</strong> sent you a message regarding your post <em>${escapeHtml(params.postTitle)}</em>.</p>
     <a href="${params.threadUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">View Message</a>`,
  )
  await sendEmail(params.recipientEmail, `New message: ${params.postTitle}`, html)
}

export async function sendReviewNotificationEmail(params: {
  recipientEmail: string
  reviewerName: string
  postTitle: string
  rating: number
  postUrl: string
}): Promise<void> {
  const stars = '★'.repeat(params.rating) + '☆'.repeat(5 - params.rating)
  const html = baseTemplate(
    'New review on your post',
    `<p><strong>${escapeHtml(params.reviewerName)}</strong> left a ${params.rating}-star review on your post <em>${escapeHtml(params.postTitle)}</em>.</p>
     <p style="font-size:24px;color:#f59e0b;">${stars}</p>
     <a href="${params.postUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">View Post</a>`,
  )
  await sendEmail(params.recipientEmail, `New review on "${params.postTitle}"`, html)
}

export async function sendTwoFactorOtpEmail(params: { email: string; otp: string }): Promise<void> {
  const html = baseTemplate(
    'Your two-factor authentication code',
    `<p>Your one-time verification code is:</p>
     <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#3b82f6;">${escapeHtml(params.otp)}</p>
     <p style="font-size:13px;color:#6b7280;">This code expires in 10 minutes. If you didn't request this, please secure your account immediately.</p>`,
  )
  await sendEmail(params.email, 'Your two-factor authentication code', html)
}

export async function sendSecurityAlertEmail(params: {
  email: string
  subject: string
  message: string
}): Promise<void> {
  const html = baseTemplate(
    escapeHtml(params.subject),
    `<p>${escapeHtml(params.message)}</p>
     <p style="font-size:13px;color:#6b7280;">If you did not perform this action, please contact support immediately.</p>`,
  )
  await sendEmail(params.email, params.subject, html)
}
