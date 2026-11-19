import { createClient } from "@supabase/supabase-js";

// Publishable keys are intended for browser use. Never place sb_secret_* or service_role keys here.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://kguywkmfiddztkpotmbo.supabase.co";
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || "sb_publishable_nayJiO0Lf_heMC_WfyC7Nw_D8925_Fy";

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
  legal_name?: string | null;
  tax_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string;
}

export interface Product {
  id: string;
  company_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  purchase_price: number;
  min_stock: number;
  category_id?: string | null;
  is_active: boolean;
  created_at: string;
}