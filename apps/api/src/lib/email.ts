export async function sendVerificationEmail(params: { email: string; url: string }): Promise<void> {
  console.log(`[email-verify] ${params.email} → ${params.url}`)
}

export async function sendPasswordResetEmail(params: { email: string; url: string }): Promise<void> {
  console.log(`[email-reset] ${params.email} → ${params.url}`)
}
