import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export type CompanyRole = "owner" | "admin" | "manager" | "warehouse" | "sales" | "viewer" | "staff";

export interface Company {
  id: string;
  name: string;
  currency_code: string;
}

export interface Product {
  id: string;
  company_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
}