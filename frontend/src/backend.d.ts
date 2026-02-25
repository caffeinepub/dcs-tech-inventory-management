import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface InventoryItem {
    id: bigint;
    sku: string;
    lowStockThreshold: bigint;
    supplier: string;
    name: string;
    createdAt: bigint;
    unit: string;
    description: string;
    updatedAt: bigint;
    expirationDate?: bigint;
    barcode: string;
    quantity: bigint;
    category: string;
    price: number;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface AdjustmentLog {
    id: bigint;
    itemId: bigint;
    adjustedByEmail: string;
    notes: string;
    timestamp: bigint;
    itemName: string;
    newQuantity: bigint;
    amount: bigint;
    adjustmentType: Variant_add_remove;
    adjustedBy: Principal;
}
export interface UserProfile {
    status: UserStatus;
    principal: Principal;
    lastLoginAt: bigint;
    name: string;
    createdAt: bigint;
    role: AppRole;
    email: string;
}
export enum AppRole {
    admin = "admin",
    staff = "staff",
    guest = "guest"
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_add_remove {
    add = "add",
    remove = "remove"
}
export interface backendInterface {
    addInventoryItem(name: string, sku: string, category: string, quantity: bigint, unit: string, lowStockThreshold: bigint, description: string, price: number, supplier: string, expirationDate: bigint | null, barcode: string): Promise<bigint>;
    adjustInventory(itemId: bigint, adjustmentType: Variant_add_remove, amount: bigint, notes: string): Promise<void>;
    approveUser(user: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteUser(user: Principal): Promise<void>;
    getAdjustmentLogs(): Promise<Array<AdjustmentLog>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getInventoryItems(): Promise<Array<InventoryItem>>;
    getInventoryItemsByCategory(category: string): Promise<Array<InventoryItem>>;
    getMyProfile(): Promise<UserProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    registerOrLogin(): Promise<UserProfile>;
    rejectUser(user: Principal): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(name: string, email: string): Promise<void>;
    seedDemoInventory(): Promise<void>;
    seedDemoUsers(): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    updateInventoryItem(id: bigint, newItem: InventoryItem): Promise<void>;
    updateUserRole(user: Principal, role: AppRole): Promise<void>;
}
