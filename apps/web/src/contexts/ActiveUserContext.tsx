import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "#/api";
import { authClient } from "#/auth";
import type { User, UserProfile } from "#/types/api";

const STORAGE_KEY = "activeProfileId";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["users", "me"],
  queryFn: async () => {
    const { data, error } = await api.users.me.get();
    if (error) {
      // Return null on 401 so QueryCache.onError can handle logout redirect
      if (error.status === 401) return null;
      throw error;
    }
    return data ?? null;
  },
  staleTime: 1 * 60 * 1000, // 1 minute — checks for ban/status changes
});

type ActiveUserContextValue = {
  user: User | null;
  activeProfile: UserProfile | null;
  setActiveProfileId: (id: string) => void;
  isLoading: boolean;
};

const ActiveUserContext = createContext<ActiveUserContextValue | null>(null);

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveProfileIdState(stored);
    }
  }, []);

  // Fetch user only when session exists
  const { data: currentUser, isPending: isUserPending } = useQuery({
    ...currentUserQueryOptions,
    enabled: !isSessionPending && !!session,
  });

  // Reset active profile if it's not in the current user's profiles
  useEffect(() => {
    if (currentUser?.profiles && activeProfileId) {
      const profileExists = currentUser.profiles.some(
        (p) => p.userProfileId === activeProfileId
      );
      if (!profileExists) {
        setActiveProfileIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [currentUser?.profiles, activeProfileId]);

  const activeProfile =
    currentUser?.profiles.find((p) => p.userProfileId === activeProfileId) ??
    currentUser?.profiles[0] ??
    null;

  const isLoading = isSessionPending || (!!session && isUserPending);

  // Clear stored profile when user logs out
  useEffect(() => {
    if (!isSessionPending && !session) {
      setActiveProfileIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isSessionPending, session]);

  // Keep localStorage in sync with the resolved active profile
  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem(STORAGE_KEY, activeProfile.userProfileId);
      setActiveProfileIdState(activeProfile.userProfileId);
    }
  }, [activeProfile?.userProfileId]);

  const setActiveProfileId = (id: string) => {
    setActiveProfileIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <ActiveUserContext.Provider
      value={{
        user: currentUser ?? null,
        activeProfile,
        setActiveProfileId,
        isLoading,
      }}
    >
      {children}
    </ActiveUserContext.Provider>
  );
}

export function useActiveUser() {
  const ctx = useContext(ActiveUserContext);
  if (!ctx) {
    throw new Error("useActiveUser must be used inside ActiveUserProvider");
  }
  return ctx;
}
