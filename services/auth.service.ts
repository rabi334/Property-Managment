import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { UserRole } from '@/types/database';

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserData {
  full_name?: string;
  role?: 'MANAGER' | 'VISITOR';
  phone?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  phone?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

function toUser(data: any) {
  return {
    id: data.id,
    email: data.email,
    password_hash: data.password_hash ?? '',
    full_name: data.full_name,
    role: data.role,
    phone: data.phone ?? null,
    created_by: data.created_by ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

class AuthService {
  async register(data: RegisterData) {
    const res = await apiPost<{ user: any; token: string }>(
      '/api/auth/register',
      {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone || undefined,
      },
    );
    return { user: toUser(res.user), token: res.token };
  }

  async login(data: LoginData) {
    const res = await apiPost<{ user: any; token: string }>('/api/auth/login', {
      email: data.email,
      password: data.password,
    });
    return { user: toUser(res.user), token: res.token };
  }

  async logout() {
    // No server-side logout for JWT; client clears token
  }

  async getCurrentUser() {
    const data = await apiGet<any>('/api/auth/me');
    return toUser(data);
  }

  async updateProfile(data: UpdateProfileData) {
    const res = await apiPatch<any>('/api/auth/profile', {
      full_name: data.full_name,
      phone: data.phone,
    });
    return toUser(res);
  }

  async createUser(data: CreateUserData) {
    await apiPost('/api/users', {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      role: data.role,
      phone: data.phone || undefined,
    });
  }

  async updateUser(id: string, data: UpdateUserData) {
    const res = await apiPatch<any>(`/api/users/${id}`, data);
    return {
      id: res.id,
      email: res.email,
      full_name: res.full_name,
      role: res.role,
      phone: res.phone,
      created_at: res.created_at,
    };
  }

  async deleteUser(id: string) {
    await apiDelete(`/api/users/${id}`);
  }

  async getCreatedUsers() {
    const data = await apiGet<any[]>('/api/users');
    return data.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      phone: u.phone,
      created_at: u.created_at,
    }));
  }

  async changePassword(data: ChangePasswordData) {
    await apiPatch('/api/auth/password', {
      current_password: data.current_password,
      new_password: data.new_password,
    });
  }
}

export const authService = new AuthService();
