import { apiClient } from './client';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/user';

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<AuthResponse>('/auth/register', payload);
  return response.data;
}
