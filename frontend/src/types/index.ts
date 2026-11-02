export type Role =
  | 'HR_ADMIN'
  | 'FINANCE_MANAGER'
  | 'PROJECT_MANAGER'
  | 'HOD'
  | 'REPORTING_MANAGER'
  | 'EMPLOYEE';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
