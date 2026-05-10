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
