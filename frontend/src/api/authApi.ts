import { apiClient } from './client';
import type { AuthResponse, CreateUserPayload, LoginPayload, ManagedUser, User } from '../types/user';

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

export async function getMe() {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}

export async function logout() {
  const response = await apiClient.post<{ message: string }>('/auth/logout');
  return response.data;
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  const response = await apiClient.post<AuthResponse>('/auth/change-password', payload);
  return response.data;
}

export async function getUsers() {
  const response = await apiClient.get<ManagedUser[]>('/admin/users');
  return response.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await apiClient.post<ManagedUser>('/admin/users', payload);
  return response.data;
}

export async function disableUser(id: string) {
  const response = await apiClient.patch<ManagedUser>(`/admin/users/${id}/disable`);
  return response.data;
}

export async function resetUserPassword(id: string, password: string) {
  const response = await apiClient.post<ManagedUser>(`/admin/users/${id}/reset-password`, { password });
  return response.data;
}
