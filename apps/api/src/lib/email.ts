export async function sendVerificationEmail(params: { email: string; url: string }): Promise<void> {
  console.log(`[email-verify] ${params.email} → ${params.url}`)
}

export async function sendPasswordResetEmail(params: {
  email: string
  url: string
}): Promise<void> {
  console.log(`[email-reset] ${params.email} → ${params.url}`)
}

export async function sendExistingAccountSignUpEmail(params: {
  email: string
  loginUrl: string
  resetUrl: string
}): Promise<void> {
  console.log(
    `[email-existing-signup] ${params.email} → login:${params.loginUrl} reset:${params.resetUrl}`,
  )
}

export async function sendChangeEmailConfirmationEmail(params: {
  email: string
  url: string
}): Promise<void> {
  console.log(`[email-change-confirm] ${params.email} → ${params.url}`)
}

export async function sendNewEmailVerificationEmail(params: {
  email: string
  url: string
}): Promise<void> {
  console.log(`[email-change-verify-new] ${params.email} → ${params.url}`)
}

export async function sendTwoFactorOtpEmail(params: { email: string; otp: string }): Promise<void> {
  console.log(`[email-2fa-otp] ${params.email} → ${params.otp}`)
}

export async function sendSecurityAlertEmail(params: {
  email: string
  subject: string
  message: string
}): Promise<void> {
  console.log(`[email-security-alert] ${params.email} — ${params.subject}: ${params.message}`)
}
