export type UserRole = 'OWNER' | 'MANAGER' | 'VISITOR';

export type PropertyType = 'apartment' | 'commercial' | 'mixed-use';

export type RentType = 'monthly' | 'yearly';

export type UnitStatus = 'occupied' | 'vacant' | 'maintenance';

export type PaymentMethod = 'cash' | 'bank' | 'mobile';

export type ExpenseCategory =
  | 'maintenance'
  | 'utilities'
  | 'renovation'
  | 'other';

export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  tax_rate: number;
  description: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_name: string;
  rent_type: RentType;
  rent_amount: number;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  full_name: string;
  phone: string;
  id_number: string;
  emergency_contact: string | null;
  deposit_amount: number;
  unit_id: string;
  lease_start_date: string | null;
  lease_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  unit_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  property_id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netProfit: number;
  taxPayable: number;
}

export interface PropertyWithUnits extends Property {
  units: Unit[];
}

export interface UnitWithTenant extends Unit {
  tenant: Tenant | null;
  property: Property;
}

export interface PaymentWithDetails extends Payment {
  unit: Unit;
  property: Property;
}

export interface ExpenseWithProperty extends Expense {
  property: Property;
}

export interface MaintenanceWithDetails extends MaintenanceRequest {
  unit: Unit;
  property: Property;
}
