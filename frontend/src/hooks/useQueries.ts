import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { AppRole, Variant_add_remove, type UserProfile, type InventoryItem, type AdjustmentLog } from '../backend';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';

// ─── Profile ───────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(name, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export function useInventoryItems() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<InventoryItem[]>({
    queryKey: ['inventoryItems'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInventoryItems();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useAddInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      sku: string;
      category: string;
      quantity: bigint;
      unit: string;
      lowStockThreshold: bigint;
      description: string;
      price: number;
      supplier: string;
      expirationDate: bigint | null;
      barcode: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addInventoryItem(
        params.name, params.sku, params.category, params.quantity,
        params.unit, params.lowStockThreshold, params.description,
        params.price, params.supplier, params.expirationDate, params.barcode
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast.success('Item added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });
}

export function useAdjustInventory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      itemId: bigint;
      adjustmentType: Variant_add_remove;
      amount: bigint;
      notes: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.adjustInventory(params.itemId, params.adjustmentType, params.amount, params.notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['adjustmentLogs'] });
      toast.success('Inventory adjusted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to adjust inventory: ${error.message}`);
    },
  });
}

// ─── Adjustment Logs ───────────────────────────────────────────────────────

export function useAdjustmentLogs() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<AdjustmentLog[]>({
    queryKey: ['adjustmentLogs'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAdjustmentLogs();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

// ─── Users ─────────────────────────────────────────────────────────────────

export function useAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserProfile[]>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllUsers();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useUpdateUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: AppRole }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateUserRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

export function useApproveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('User approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve user: ${error.message}`);
    },
  });
}

export function useRejectUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('User rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject user: ${error.message}`);
    },
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });
}

// ─── Admin Seed ────────────────────────────────────────────────────────────

export function useSeedDemoInventory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.seedDemoInventory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast.success('Demo inventory seeded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to seed inventory: ${error.message}`);
    },
  });
}

export function useSeedDemoUsers() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.seedDemoUsers();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Demo users seeded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to seed users: ${error.message}`);
    },
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getRoleString(role: AppRole | unknown): string {
  const r = role as unknown;
  if (typeof r === 'string') return r;
  const s = JSON.stringify(r);
  if (s.includes('admin')) return 'admin';
  if (s.includes('staff')) return 'staff';
  return 'guest';
}

export function getStatusString(status: unknown): string {
  const s = JSON.stringify(status);
  if (s.includes('approved')) return 'approved';
  if (s.includes('rejected')) return 'rejected';
  if (s.includes('pending')) return 'pending';
  return 'pending';
}
