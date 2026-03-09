import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";
import { BarChart3, Package, Shield, Users } from "lucide-react";
import { useEffect } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function Login() {
  const { login, isLoggingIn, identity, isInitializing } =
    useInternetIdentity();
  const router = useRouter();

  useEffect(() => {
    if (identity) {
      router.navigate({ to: "/dashboard" });
    }
  }, [identity, router]);

  const features = [
    {
      icon: <Package className="h-5 w-5" />,
      label: "Inventory Tracking",
      color: "text-primary",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Reports & Analytics",
      color: "text-info",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Team Management",
      color: "text-success",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: "Role-Based Access",
      color: "text-warning",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, oklch(var(--background)) 0%, oklch(var(--secondary)) 50%, oklch(var(--accent) / 0.25) 100%)",
      }}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center p-4 px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <img
              src="/assets/generated/dcs-tech-logo.dim_128x128.png"
              alt="DCS Tech"
              className="w-5 h-5 rounded-sm object-cover"
            />
          </div>
          <span className="font-display font-bold text-sm text-foreground">
            DCS Tech
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="relative">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl scale-110" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30 border border-primary/30 flex items-center justify-center">
                  <img
                    src="/assets/generated/dcs-tech-logo.dim_128x128.png"
                    alt="DCS Tech Logo"
                    className="w-14 h-14 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">
              DCS Tech
            </h1>
            <p className="text-lg font-display font-semibold text-primary mb-2">
              Inventory Management
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Streamline your inventory operations with real-time tracking and
              insights
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
            {/* Accent bar */}
            <div className="h-1 w-12 rounded-full bg-primary mb-5" />
            <h2 className="text-xl font-display font-semibold text-card-foreground mb-2">
              Sign In
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use your Internet Identity to securely access the system
            </p>

            <Button
              onClick={login}
              disabled={isLoggingIn || isInitializing}
              className="w-full h-11 text-base font-semibold"
              size="lg"
              data-ocid="login.primary_button"
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
              New users will be placed in a pending state until approved by an
              administrator.
            </p>
          </div>

          {/* Features */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2.5 bg-card/80 border border-border rounded-lg px-3 py-3 backdrop-blur-sm"
              >
                <span className={feature.color}>{feature.icon}</span>
                <span className="text-xs font-medium text-card-foreground">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DCS Tech &middot; Built with{" "}
          <span className="text-destructive">&hearts;</span> using{" "}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "dcs-tech-inventory")}`}
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
