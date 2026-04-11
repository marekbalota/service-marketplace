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

type UserProfile = NonNullable<
  Awaited<ReturnType<typeof api.profiles.me.get>>["data"]
>[number];

const STORAGE_KEY = "activeProfileId";

type ActiveProfileContextValue = {
  activeProfile: UserProfile | null;
  allProfiles: UserProfile[];
  setActiveProfileId: (id: string) => void;
  isLoading: boolean;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

export const profilesQueryOptions = queryOptions({
  queryKey: ["profiles", "me"],
  queryFn: async () => {
    const { data, error } = await api.profiles.me.get();
    if (error) throw error;
    return data;
  },
});

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveProfileIdState(stored);
    }
  }, []);

  const { data: profiles = [], isPending: isProfilesPending } = useQuery({
    ...profilesQueryOptions,
    enabled: !isSessionPending && !!session,
  });

  const activeProfile =
    profiles.find((p) => p.userProfileId === activeProfileId) ??
    profiles[0] ??
    null;

  const isLoading = isSessionPending || (!!session && isProfilesPending);

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
    <ActiveProfileContext.Provider
      value={{ activeProfile, allProfiles: profiles, setActiveProfileId, isLoading }}
    >
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) {
    throw new Error("useActiveProfile must be used inside ActiveProfileProvider");
  }
  return ctx;
}
