import type { RequestFn } from "../client";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: { id: string; email: string; name: string };
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function createAuthModule(req: RequestFn) {
  return {
    login(credentials: LoginRequest): Promise<LoginResponse> {
      return req<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    },

    logout(): Promise<void> {
      return req<void>("/auth/logout", { method: "POST" });
    },

    me(): Promise<CurrentUser> {
      return req<CurrentUser>("/auth/me");
    },
  };
}
