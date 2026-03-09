import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Package,
  TrendingDown,
  Users,
} from "lucide-react";
import type { AdjustmentLog, InventoryItem } from "../backend";
import {
  getRoleString,
  useAdjustmentLogs,
  useAllUsers,
  useInventoryItems,
} from "../hooks/useQueries";
import { useGetCallerUserProfile } from "../hooks/useQueries";

function StatCard({
  title,
  value,
  icon,
  description,
  loading,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  loading?: boolean;
  accent?: "primary" | "warning" | "success" | "destructive";
}) {
  const accentConfig = {
    primary: {
      icon: "bg-primary/15 text-primary",
      border: "border-l-primary",
    },
    warning: {
      icon: "bg-warning/15 text-warning",
      border: "border-l-warning",
    },
    success: {
      icon: "bg-success/15 text-success",
      border: "border-l-success",
    },
    destructive: {
      icon: "bg-destructive/15 text-destructive",
      border: "border-l-destructive",
    },
  };

  const config = accentConfig[accent || "primary"];

  return (
    <Card
      className={`bg-card border-border shadow-card border-l-4 ${config.border} transition-shadow hover:shadow-md`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-display font-bold text-foreground">
                {value}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {description}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${config.icon} flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: inventoryItems, isLoading: inventoryLoading } =
    useInventoryItems();
  const { data: adjustmentLogs, isLoading: logsLoading } = useAdjustmentLogs();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const { data: userProfile } = useGetCallerUserProfile();

  const role = userProfile ? getRoleString(userProfile.role) : "guest";
  const isAdmin = role === "admin";

  const lowStockItems = (inventoryItems || []).filter(
    (item: InventoryItem) => item.quantity <= item.lowStockThreshold,
  );

  const recentLogs = [...(adjustmentLogs || [])]
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 10);

  const handleLowStockHeaderClick = () => {
    navigate({
      to: "/inventory",
      search: { filter: "low-stock" } as Record<string, string>,
    });
  };

  const handleLowStockItemClick = (item: InventoryItem) => {
    navigate({
      to: "/inventory",
      search: { itemId: String(item.id) } as Record<string, string>,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back{userProfile?.name ? `, ${userProfile.name}` : ""}.
          Here\'s your inventory overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={inventoryItems?.length ?? 0}
          icon={<Package className="h-5 w-5" />}
          description="Inventory items tracked"
          loading={inventoryLoading}
          accent="primary"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="Items below threshold"
          loading={inventoryLoading}
          accent="warning"
        />
        {isAdmin && (
          <StatCard
            title="Total Users"
            value={allUsers?.length ?? 0}
            icon={<Users className="h-5 w-5" />}
            description="Registered users"
            loading={usersLoading}
            accent="success"
          />
        )}
        <StatCard
          title="Recent Activity"
          value={adjustmentLogs?.length ?? 0}
          icon={<Activity className="h-5 w-5" />}
          description="Total adjustments logged"
          loading={logsLoading}
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="pb-3 bg-muted/30 rounded-t-lg border-b border-border">
            <button
              type="button"
              onClick={handleLowStockHeaderClick}
              className="flex items-center justify-between w-full group"
              data-ocid="dashboard.low_stock.button"
            >
              <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                Low Stock Alerts
                {lowStockItems.length > 0 && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">
                    {lowStockItems.length}
                  </Badge>
                )}
              </CardTitle>
              <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                View all <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          </CardHeader>
          <CardContent className="pt-3">
            {inventoryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div
                className="text-center py-8"
                data-ocid="dashboard.low_stock.empty_state"
              >
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  All items are well stocked!
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {lowStockItems
                  .slice(0, 6)
                  .map((item: InventoryItem, idx: number) => (
                    <button
                      type="button"
                      key={String(item.id)}
                      onClick={() => handleLowStockItemClick(item)}
                      data-ocid={`dashboard.low_stock.item.${idx + 1}`}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-warning/5 hover:border-warning/20 border border-transparent transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className="text-sm font-semibold text-warning">
                          {String(item.quantity)} {item.unit}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs border-warning/30 text-warning bg-warning/10"
                        >
                          Low
                        </Badge>
                      </div>
                    </button>
                  ))}
                {lowStockItems.length > 6 && (
                  <button
                    type="button"
                    onClick={handleLowStockHeaderClick}
                    className="w-full text-center text-xs text-primary hover:underline py-1"
                  >
                    +{lowStockItems.length - 6} more items
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="pb-3 bg-muted/30 rounded-t-lg border-b border-border">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div
                className="text-center py-8"
                data-ocid="dashboard.activity.empty_state"
              >
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentLogs.map((log: AdjustmentLog) => {
                  const isAdd = JSON.stringify(log.adjustmentType).includes(
                    "add",
                  );
                  return (
                    <div
                      key={String(log.id)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isAdd ? "bg-success" : "bg-destructive"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span
                            className={`font-semibold ${
                              isAdd ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isAdd ? "+" : "-"}
                            {String(log.amount)}
                          </span>{" "}
                          {log.itemName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.adjustedByEmail || "Unknown user"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
