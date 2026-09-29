import type { SessionUser } from "@/lib/contracts";

export interface AuthResponse {
  user: SessionUser;
  accessToken: string;
}

export interface MessageResponse {
  message: string;
}

export interface RegisterResponse extends MessageResponse {
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}
