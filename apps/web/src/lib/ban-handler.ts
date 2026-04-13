interface BanError {
  message: string;
  reason: string | null;
  expiresAt: string | null;
}

export function handleBanError(error: unknown): boolean {
  const banInfo = extractBanInfo(error);
  if (banInfo) {
    // Store ban info for the banned page
    sessionStorage.setItem('banInfo', JSON.stringify({
      reason: banInfo.reason,
      expiresAt: banInfo.expiresAt,
    }));

    // Navigate to banned page using window.location
    window.location.href = '/banned';
    return true;
  }
  return false;
}

function extractBanInfo(error: unknown): BanError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const err = error as { message?: unknown; body?: unknown };

  // Handle API error response (403 with ban info)
  if (err.body && typeof err.body === 'object') {
    const body = err.body as { message?: string; reason?: string | null; expiresAt?: string | null };
    if (body.message?.toLowerCase().includes('banned') ||
        body.message?.toLowerCase().includes('ban')) {
      return {
        message: body.message ?? 'Account banned',
        reason: body.reason ?? null,
        expiresAt: body.expiresAt ?? null,
      };
    }
  }

  // Handle BetterAuth ban error
  if (typeof err.message === 'string') {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed.code === 'BANNED') {
        return {
          message: 'Account banned',
          reason: parsed.reason ?? null,
          expiresAt: parsed.expiresAt ?? null,
        };
      }
    } catch {
      if (err.message.toLowerCase().includes('banned')) {
        return {
          message: err.message,
          reason: null,
          expiresAt: null,
        };
      }
    }
  }

  return null;
}
