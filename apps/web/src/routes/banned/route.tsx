import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';

export const Route = createFileRoute('/banned')({
  component: BannedPage,
  beforeLoad: async () => {
    if (!sessionStorage.getItem('banInfo')) {
      throw redirect({ to: '/' });
    }
  },
});

interface BanInfo {
  reason?: string | null;
  expiresAt?: string | null;
}

function BannedPage() {
  const navigate = useNavigate();
  const [banInfo] = useState<BanInfo>(() => {
    // Get ban info from sessionStorage (set by auth error handler)
    const stored = sessionStorage.getItem('banInfo');
    return stored ? JSON.parse(stored) : {};
  });

  const handleUnderstand = () => {
    // Clear ban info
    sessionStorage.removeItem('banInfo');
    navigate({ to: '/' });
  };

  const formattedExpiration = banInfo.expiresAt
    ? new Date(banInfo.expiresAt).toLocaleString()
    : 'Permanent';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-300" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            Your account has been suspended from the platform.
          </p>

          {banInfo.reason && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">Reason:</p>
              <p className="text-foreground">{banInfo.reason}</p>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-1">Duration:</p>
            <p className="text-foreground">{formattedExpiration}</p>
          </div>

          <Button onClick={handleUnderstand} className="w-full">
            I Understand
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
