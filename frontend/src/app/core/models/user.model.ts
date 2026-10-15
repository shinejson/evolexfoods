export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
  status?: string;
  two_factor_enabled?: boolean;
  two_factor_type?: string;
  two_factor_confirmed_at?: string;
  two_factor_required?: boolean;
  role_id?: number;
  permissions?: string[];
}
