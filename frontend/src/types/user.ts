export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
  position?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ManagedUser extends User {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role: string;
  position?: string;
}
