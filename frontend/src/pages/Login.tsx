import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Shield, Package, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login, isLoggingIn, identity, isInitializing } = useInternetIdentity();
  const router = useRouter();

  useEffect(() => {
    if (identity) {
      router.navigate({ to: '/dashboard' });
    }
  }, [identity, router]);

  const features = [
    { icon: <Package className="h-5 w-5" />, label: 'Inventory Tracking' },
    { icon: <BarChart3 className="h-5 w-5" />, label: 'Reports & Analytics' },
    { icon: <Users className="h-5 w-5" />, label: 'Team Management' },
    { icon: <Shield className="h-5 w-5" />, label: 'Role-Based Access' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <img
                    src="/assets/generated/dcs-tech-logo.dim_128x128.png"
                    alt="DCS Tech Logo"
                    className="w-14 h-14 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">DCS Tech</h1>
            <p className="text-lg font-display font-medium text-primary mb-1">Inventory Management</p>
            <p className="text-sm text-muted-foreground">
              Streamline your inventory operations with real-time tracking and insights
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-card">
            <h2 className="text-xl font-display font-semibold text-card-foreground mb-2">Sign In</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use your Internet Identity to securely access the system
            </p>

            <Button
              onClick={login}
              disabled={isLoggingIn || isInitializing}
              className="w-full h-11 text-base font-semibold"
              size="lg"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Sign in with Internet Identity
                </span>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              New users will be placed in a pending state until approved by an administrator.
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5"
              >
                <span className="text-primary">{feature.icon}</span>
                <span className="text-xs font-medium text-card-foreground">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} DCS Tech · Built with{' '}
          <span className="text-destructive">♥</span>{' '}
          using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'dcs-tech-inventory')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
