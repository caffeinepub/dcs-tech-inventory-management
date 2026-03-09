import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getRoleString, useGetCallerUserProfile } from "../hooks/useQueries";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: <Package className="h-4 w-4" />,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: "Admin Panel",
    path: "/admin",
    icon: <Settings className="h-4 w-4" />,
    adminOnly: true,
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: userProfile } = useGetCallerUserProfile();

  const role = userProfile ? getRoleString(userProfile.role) : "guest";
  const isAdmin = role === "admin";
  const currentPath = router.state.location.pathname;

  const handleSignOut = async () => {
    await clear();
    queryClient.clear();
    router.navigate({ to: "/login" });
  };

  const userInitials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : identity?.getPrincipal().toString().slice(0, 2).toUpperCase() || "U";

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1 px-3">
      {filteredNavItems.map((item) => {
        const isActive =
          currentPath === item.path ||
          (item.path === "/dashboard" && currentPath === "/");
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            data-ocid={`nav.${item.label.toLowerCase().replace(" ", "-")}.link`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            {item.icon}
            {item.label}
            {isActive && (
              <ChevronRight className="h-3 w-3 ml-auto opacity-70" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{
          backgroundColor: "oklch(var(--sidebar))",
          borderRight: "1px solid oklch(var(--sidebar-border))",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "oklch(var(--sidebar-border))" }}
        >
          <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <img
              src="/assets/generated/dcs-tech-logo.dim_128x128.png"
              alt="DCS Tech"
              className="w-7 h-7 rounded-sm object-cover"
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-sidebar-foreground tracking-tight">
              DCS Tech
            </h1>
            <p
              className="text-xs font-medium"
              style={{ color: "oklch(var(--sidebar-foreground) / 0.55)" }}
            >
              Inventory Manager
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 overflow-y-auto">
          <p
            className="px-6 mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "oklch(var(--sidebar-foreground) / 0.4)" }}
          >
            Navigation
          </p>
          <NavLinks />
        </div>

        {/* User section */}
        <div
          className="p-4 border-t"
          style={{ borderColor: "oklch(var(--sidebar-border))" }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {userProfile?.name || "User"}
                  </p>
                  <p
                    className="text-xs capitalize"
                    style={{ color: "oklch(var(--sidebar-foreground) / 0.55)" }}
                  >
                    {role}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-popover border-border"
            >
              <DropdownMenuItem
                className="text-muted-foreground text-xs"
                disabled
              >
                <User className="h-3 w-3 mr-2" />
                {identity?.getPrincipal().toString().slice(0, 16)}...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMobileOpen(false);
          }}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "oklch(var(--sidebar))" }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: "oklch(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center">
              <img
                src="/assets/generated/dcs-tech-logo.dim_128x128.png"
                alt="DCS Tech"
                className="w-7 h-7 rounded-sm object-cover"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm text-sidebar-foreground">
                DCS Tech
              </h1>
              <p
                className="text-xs"
                style={{ color: "oklch(var(--sidebar-foreground) / 0.55)" }}
              >
                Inventory Manager
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <p
            className="px-6 mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "oklch(var(--sidebar-foreground) / 0.4)" }}
          >
            Navigation
          </p>
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </div>

        <div
          className="p-4 border-t"
          style={{ borderColor: "oklch(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userProfile?.name || "User"}
              </p>
              <p
                className="text-xs capitalize"
                style={{ color: "oklch(var(--sidebar-foreground) / 0.55)" }}
              >
                {role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — card background with visible border */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-border bg-card flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileOpen(true)}
              data-ocid="nav.mobile_menu.button"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-primary opacity-70" />
              <h2 className="font-display font-semibold text-sm text-foreground">
                {navItems.find(
                  (n) =>
                    n.path === currentPath ||
                    (n.path === "/dashboard" && currentPath === "/"),
                )?.label || "DCS Tech"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content — uses bg-background (blue-tinted slate) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
