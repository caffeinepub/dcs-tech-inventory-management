import { useState } from 'react';
import { Shield, Users, Database, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useAllUsers,
  useUpdateUserRole,
  useApproveUser,
  useRejectUser,
  useDeleteUser,
  useSeedDemoInventory,
  useSeedDemoUsers,
  useGetCallerUserProfile,
  getRoleString,
  getStatusString,
} from '../hooks/useQueries';
import { AppRole, type UserProfile } from '../backend';
import { Principal } from '@dfinity/principal';

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return '—';
  return new Date(ms).toLocaleString();
}

function truncatePrincipal(p: Principal): string {
  const s = p.toString();
  if (s.length <= 20) return s;
  return s.slice(0, 10) + '...' + s.slice(-6);
}

function RoleBadge({ role }: { role: string }) {
  const classes = {
    admin: 'bg-primary/10 text-primary border-primary/20',
    staff: 'bg-info/10 text-info border-info/20',
    guest: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge className={`text-xs capitalize ${classes[role as keyof typeof classes] || classes.guest}`}>
      {role}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes = {
    approved: 'bg-success/10 text-success border-success/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <Badge className={`text-xs capitalize ${classes[status as keyof typeof classes] || classes.pending}`}>
      {status}
    </Badge>
  );
}

export default function AdminPanel() {
  const { data: userProfile } = useGetCallerUserProfile();
  const role = userProfile ? getRoleString(userProfile.role) : 'guest';

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">This page is only accessible to administrators.</p>
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
    setPendingRoles(prev => ({ ...prev, [principalStr]: newRole }));
    try {
      await updateRole.mutateAsync({
        user: user.principal,
        role: newRole as AppRole,
      });
    } finally {
      setPendingRoles(prev => {
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
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage users, roles, and system data</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2">
            <Database className="h-4 w-4" />
            Demo Data
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            {usersLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No users found</p>
                <p className="text-sm text-muted-foreground mt-1">Users will appear here after they log in</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground">User</TableHead>
                      <TableHead className="font-semibold text-foreground hidden md:table-cell">Principal ID</TableHead>
                      <TableHead className="font-semibold text-foreground hidden lg:table-cell">Created</TableHead>
                      <TableHead className="font-semibold text-foreground hidden lg:table-cell">Last Login</TableHead>
                      <TableHead className="font-semibold text-foreground">Role</TableHead>
                      <TableHead className="font-semibold text-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: UserProfile) => {
                      const userRole = getRoleString(user.role);
                      const userStatus = getStatusString(user.status);
                      const principalStr = user.principal.toString();
                      const isPendingRole = !!pendingRoles[principalStr];

                      return (
                        <TableRow key={principalStr} className="border-border hover:bg-accent/30">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {user.name || 'Unnamed User'}
                              </p>
                              <p className="text-xs text-muted-foreground">{user.email || '—'}</p>
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
                              <Select
                                value={userRole}
                                onValueChange={(v) => handleRoleChange(user, v)}
                                disabled={isPendingRole}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs bg-background border-border">
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
                              {userStatus === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-success hover:text-success hover:bg-success/10"
                                    onClick={() => handleApprove(user)}
                                    disabled={approveUser.isPending}
                                    title="Approve"
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

        {/* Demo Data Tab */}
        <TabsContent value="demo" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Demo Inventory
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Seed 12 sample inventory items across multiple categories including electronics, apparel, furniture, tools, and more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => seedInventory.mutate()}
                  disabled={seedInventory.isPending}
                  className="w-full"
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

            <Card className="bg-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Demo Users
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Seed 5 sample users with mixed roles (admin, staff, guest) and statuses (approved, pending, rejected).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => seedUsers.mutate()}
                  disabled={seedUsers.isPending}
                  className="w-full"
                  variant="secondary"
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
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent
          className="max-w-md border-border"
          style={{
            backgroundColor: 'oklch(var(--card))',
            color: 'oklch(var(--card-foreground))',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold text-card-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete User
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name || 'this user'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteUser.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Need to import Package for the demo data tab
import { Package } from 'lucide-react';
