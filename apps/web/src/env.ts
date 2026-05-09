function required(key: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

export const env = {
  apiUrl: required("VITE_API_URL", import.meta.env.VITE_API_URL),
  turnstileSiteKey: required("VITE_TURNSTILE_SITE_KEY", import.meta.env.VITE_TURNSTILE_SITE_KEY),
}
