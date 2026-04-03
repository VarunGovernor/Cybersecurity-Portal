import { create } from "zustand";
import { User } from "@/types";
import { authStorage } from "@/lib/utils";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    authStorage.setToken(token);
    authStorage.setUser(user);
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    authStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    if (token && user) {
      set({ user, token, isAuthenticated: true });
    }
  },
}));
