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

type ActiveUserContextValue = {
  user: User | null;
  activeProfile: UserProfile | null;
  setActiveProfileId: (id: string) => void;
  isLoading: boolean;
};

const ActiveUserContext = createContext<ActiveUserContextValue | null>(null);

export const currentUserQueryOptions = queryOptions({
  queryKey: ["users", "me"],
  queryFn: async () => {
    const { data, error } = await api.users.me.get();
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveProfileIdState(stored);
    }
  }, []);

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

  // Keep localStorage in sync with the resolved active profile.
  // Handles the case where the stored ID is stale (e.g. profile deleted,
  // different user) — activeProfile falls back to profiles[0] in that case.
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
