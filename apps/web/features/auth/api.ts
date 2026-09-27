"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { AuthResponse, LoginInput, MessageResponse, RegisterInput, ResetPasswordInput } from "./types";

const post = <T>(path: string, body: unknown) => api<T>(path, { method: "POST", body, auth: false });

/** Only same-origin paths are allowed as redirect targets. */
export function safeNextPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Stores the token, reloads the session, then navigates. */
function useSignedIn() {
  const session = useSession();
  const router = useRouter();
  return async (response: AuthResponse, destination: string) => {
    setToken(response.accessToken);
    await session.refresh();
    router.replace(destination);
  };
}

export function useLogin(destination: string) {
  const signedIn = useSignedIn();
  return useMutation({
    mutationFn: (input: LoginInput) => post<AuthResponse>("/auth/login", input),
    onSuccess: (response) => signedIn(response, destination),
  });
}

export function useRegister() {
  const signedIn = useSignedIn();
  return useMutation({
    mutationFn: (input: RegisterInput) => post<AuthResponse>("/auth/register", input),
    onSuccess: (response) => signedIn(response, "/onboarding"),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => post<MessageResponse>("/auth/forgot-password", { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => post<MessageResponse>("/auth/reset-password", input),
  });
}
