import { apiFetch } from "./client";

export interface UserSession {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  workspaceId: string;
  workspaces?: Array<{ id: string; name: string }>;
}

export async function loginUser(email: string, password: string): Promise<{ user: UserSession }> {
  return apiFetch<{ user: UserSession }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ user: UserSession }> {
  return apiFetch<{ user: UserSession }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function logoutUser(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<{ user: UserSession | null }> {
  return apiFetch<{ user: UserSession | null }>("/api/auth/me");
}
