/** Roles stored in Supabase profiles.role */
export type UserRole = 'admin' | 'staff' | 'manager';

/** Cashier-only role — blocked from /inventory, /reports, /users */
export function isStaff(role: string | null | undefined): boolean {
  return role === 'staff';
}

/** Can add/edit products on the POS screen */
export function isAdmin(role: string | null | undefined): boolean {
  return role === 'admin';
}
