export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role: string;
}
