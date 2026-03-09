import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@dfinity/principal";
import {
  CheckCircle,
  Database,
  FileUp,
  Loader2,
  Package,
  Shield,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { AppRole, UserProfile } from "../backend";
import CsvImportSection from "../components/CsvImportSection";
import {
  getRoleString,
  getStatusString,
  useAllUsers,
  useApproveUser,
  useDeleteUser,
  useGetCallerUserProfile,
  useRejectUser,
  useSeedDemoInventory,
  useSeedDemoUsers,
  useUpdateUserRole,
} from "../hooks/useQueries";

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "\u2014";
  return new Date(ms).toLocaleString();
}

function truncatePrincipal(p: Principal): string {
  const s = p.toString();
  if (s.length <= 20) return s;
  return `${s.slice(0, 10)}...${s.slice(-6)}`;
}

function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    admin: "bg-primary/15 text-primary border-primary/30",
    staff: "bg-info/15 text-info border-info/30",
    guest: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge
      className={`text-xs capitalize border ${classes[role] || classes.guest}`}
    >
      {role}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    approved: "bg-success/15 text-success border-success/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <Badge
      className={`text-xs capitalize border ${
        classes[status] || classes.pending
      }`}
    >
      {status}
    </Badge>
  );
}

export default function AdminPanel() {
  const { data: userProfile } = useGetCallerUserProfile();
  const role = userProfile ? getRoleString(userProfile.role) : "guest";

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Access Restricted
          </h2>
          <p className="text-muted-foreground">
            This page is only accessible to administrators.
          </p>
        </div>
      </div>
    );
  }

  return <AdminPanelContent />;
}

function AdminPanelContent() {
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const updateRole = useUpdateUserRole();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const deleteUser = useDeleteUser();
  const seedInventory = useSeedDemoInventory();
  const seedUsers = useSeedDemoUsers();

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  const handleRoleChange = async (user: UserProfile, newRole: string) => {
    const principalStr = user.principal.toString();
    setPendingRoles((prev) => ({ ...prev, [principalStr]: newRole }));
    try {
      await updateRole.mutateAsync({
        user: user.principal,
        role: newRole as AppRole,
      });
    } finally {
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[principalStr];
        return next;
      });
    }
  };

  const handleApprove = async (user: UserProfile) => {
    await approveUser.mutateAsync(user.principal);
  };

  const handleReject = async (user: UserProfile) => {
    await rejectUser.mutateAsync(user.principal);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteUser.mutateAsync(deleteTarget.principal);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users, roles, and system data
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-card border border-border shadow-xs">
          <TabsTrigger
            value="users"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-ocid="admin.users.tab"
          >
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-ocid="admin.import.tab"
          >
            <FileUp className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
          <TabsTrigger
            value="demo"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-ocid="admin.demo.tab"
          >
            <Database className="h-4 w-4" />
            Demo Data
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            {usersLoading ? (
              <div
                className="p-4 space-y-3"
                data-ocid="admin.users.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !users || users.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="admin.users.empty_state"
              >
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No users found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Users will appear here after they log in
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent bg-muted/50">
                      <TableHead className="font-semibold text-muted-foreground">
                        User
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground hidden md:table-cell">
                        Principal ID
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground hidden lg:table-cell">
                        Last Login
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Role
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: UserProfile, idx: number) => {
                      const userRole = getRoleString(user.role);
                      const userStatus = getStatusString(user.status);
                      const principalStr = user.principal.toString();
                      const isPendingRole = !!pendingRoles[principalStr];

                      return (
                        <TableRow
                          key={principalStr}
                          data-ocid={`admin.users.item.${idx + 1}`}
                          className="border-border hover:bg-muted/40 transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {user.name || "Unnamed User"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.email || "\u2014"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="font-mono text-xs text-muted-foreground">
                              {truncatePrincipal(user.principal)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {formatTimestamp(user.createdAt)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {formatTimestamp(user.lastLoginAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <RoleBadge role={userRole} />
                              <Select
                                value={userRole}
                                onValueChange={(v) => handleRoleChange(user, v)}
                                disabled={isPendingRole}
                              >
                                <SelectTrigger
                                  className="h-7 w-24 text-xs bg-background border-border"
                                  data-ocid="admin.users.role.select"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="guest">Guest</SelectItem>
                                </SelectContent>
                              </Select>
                              {isPendingRole && (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={userStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {userStatus === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-success hover:text-success hover:bg-success/10"
                                    onClick={() => handleApprove(user)}
                                    disabled={approveUser.isPending}
                                    title="Approve"
                                    data-ocid="admin.users.confirm_button"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleReject(user)}
                                    disabled={rejectUser.isPending}
                                    title="Reject"
                                    data-ocid="admin.users.cancel_button"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(user)}
                                title="Delete user"
                                data-ocid="admin.users.delete_button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* CSV Import Tab */}
        <TabsContent value="import" className="mt-4">
          <Card className="bg-card border-border shadow-card">
            <CardHeader className="bg-muted/30 border-b border-border rounded-t-xl">
              <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                <FileUp className="h-4 w-4 text-primary" />
                Bulk Inventory Import
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Upload a CSV file to create new inventory items or update
                existing ones by part number. Duplicate part numbers will be
                updated with the new data; invalid rows will be skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <CsvImportSection />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demo Data Tab */}
        <TabsContent value="demo" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border shadow-card border-l-4 border-l-primary">
              <CardHeader className="bg-muted/30 border-b border-border rounded-t-xl">
                <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Demo Inventory
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Seed 12 sample inventory items across multiple categories
                  including electronics, apparel, furniture, tools, and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <Button
                  onClick={() => seedInventory.mutate()}
                  disabled={seedInventory.isPending}
                  className="w-full"
                  data-ocid="admin.demo.seed_inventory.button"
                >
                  {seedInventory.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Seeding...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Seed Demo Inventory
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-card border-l-4 border-l-info">
              <CardHeader className="bg-muted/30 border-b border-border rounded-t-xl">
                <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" />
                  Demo Users
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Seed 5 sample users with mixed roles (admin, staff, guest) and
                  statuses (approved, pending, rejected).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <Button
                  onClick={() => seedUsers.mutate()}
                  disabled={seedUsers.isPending}
                  className="w-full"
                  variant="secondary"
                  data-ocid="admin.demo.seed_users.button"
                >
                  {seedUsers.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Seeding...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Seed Demo Users
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent
          className="max-w-md border-border"
          style={{
            backgroundColor: "oklch(var(--card))",
            color: "oklch(var(--card-foreground))",
          }}
          data-ocid="admin.users.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold text-card-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete User
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name || "this user"}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteUser.isPending}
              data-ocid="admin.users.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteUser.isPending}
              data-ocid="admin.users.confirm_button"
            >
              {deleteUser.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
