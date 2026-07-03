import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserProfile
} from "oidc-client-ts";

export const CARCLICK_AUTHORITY =
  "https://passport.carclick.ru/realms/master";

export type CarClickSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  expired: boolean;
  scopes: string[];
  profile: UserProfile;
  returnTo?: string;
};

export type CarClickAuthProviderProps = {
  children: ReactNode;
  /** Public Keycloak client issued to the integrating application. */
  clientId: string;
  /** Exact URL registered in Keycloak, for example https://app.test/auth/callback. */
  callbackUrl: string;
  /** Exact URL registered in Keycloak for redirect after logout. */
  logoutRedirectUrl?: string;
  scopes?: string[];
  storage?: "local" | "session";
  onSession?: (session: CarClickSession | null) => void;
  onError?: (error: Error) => void;
};

export type CarClickAuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: CarClickSession | null;
  error: Error | null;
  signIn: (returnTo?: string) => Promise<void>;
  completeSignIn: (callbackUrl?: string) => Promise<CarClickSession>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const CarClickAuthContext = createContext<CarClickAuthContextValue | null>(null);

function toSession(user: User): CarClickSession {
  const state =
    typeof user.state === "object" && user.state !== null
      ? (user.state as { returnTo?: unknown })
      : undefined;

  return {
    accessToken: user.access_token,
    idToken: user.id_token,
    refreshToken: user.refresh_token,
    expiresAt: user.expires_at,
    expired: Boolean(user.expired),
    scopes: user.scopes,
    profile: user.profile,
    returnTo:
      typeof state?.returnTo === "string" ? state.returnTo : undefined
  };
}

export function CarClickAuthProvider({
  children,
  clientId,
  callbackUrl,
  logoutRedirectUrl,
  scopes = ["openid", "profile", "email"],
  storage = "session",
  onSession,
  onError
}: CarClickAuthProviderProps) {
  const [manager, setManager] = useState<UserManager | null>(null);
  const [session, setSession] = useState<CarClickSession | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const onSessionRef = useRef(onSession);
  const onErrorRef = useRef(onError);
  const scope = scopes.join(" ");

  useEffect(() => {
    onSessionRef.current = onSession;
    onErrorRef.current = onError;
  }, [onError, onSession]);

  const applyUser = useCallback((user: User | null) => {
    const nextSession = user && !user.expired ? toSession(user) : null;
    setSession(nextSession);
    onSessionRef.current?.(nextSession);
    return nextSession;
  }, []);

  const applyError = useCallback((reason: unknown) => {
    const nextError =
      reason instanceof Error ? reason : new Error(String(reason));
    setError(nextError);
    onErrorRef.current?.(nextError);
    return nextError;
  }, []);

  useEffect(() => {
    const browserStorage =
      storage === "local" ? window.localStorage : window.sessionStorage;
    const nextManager = new UserManager({
      authority: CARCLICK_AUTHORITY,
      client_id: clientId,
      redirect_uri: callbackUrl,
      post_logout_redirect_uri: logoutRedirectUrl,
      response_type: "code",
      scope,
      loadUserInfo: true,
      automaticSilentRenew: true,
      monitorSession: false,
      userStore: new WebStorageStateStore({ store: browserStorage }),
      stateStore: new WebStorageStateStore({ store: browserStorage })
    });

    const userLoaded = (user: User) => {
      setError(null);
      applyUser(user);
    };
    const userUnloaded = () => {
      applyUser(null);
    };
    const silentRenewError = (reason: Error) => {
      applyError(reason);
    };

    nextManager.events.addUserLoaded(userLoaded);
    nextManager.events.addUserUnloaded(userUnloaded);
    nextManager.events.addSilentRenewError(silentRenewError);
    setManager(nextManager);

    void nextManager
      .clearStaleState()
      .then(() => nextManager.getUser())
      .then(applyUser)
      .catch(applyError)
      .finally(() => setIsLoading(false));

    return () => {
      nextManager.events.removeUserLoaded(userLoaded);
      nextManager.events.removeUserUnloaded(userUnloaded);
      nextManager.events.removeSilentRenewError(silentRenewError);
      nextManager.stopSilentRenew();
      setManager(null);
    };
  }, [
    applyError,
    applyUser,
    callbackUrl,
    clientId,
    logoutRedirectUrl,
    scope,
    storage
  ]);

  const requireManager = useCallback(() => {
    if (!manager) {
      throw new Error("CarClickAuthProvider is not ready yet");
    }
    return manager;
  }, [manager]);

  const signIn = useCallback(
    async (returnTo?: string) => {
      setError(null);
      await requireManager().signinRedirect({
        state: { returnTo: returnTo ?? window.location.href }
      });
    },
    [requireManager]
  );

  const completeSignIn = useCallback(
    async (url?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await requireManager().signinRedirectCallback(url);
        return applyUser(user) ?? toSession(user);
      } catch (reason) {
        throw applyError(reason);
      } finally {
        setIsLoading(false);
      }
    },
    [applyError, applyUser, requireManager]
  );

  const signOut = useCallback(async () => {
    setError(null);
    await requireManager().signoutRedirect({
      id_token_hint: session?.idToken
    });
  }, [requireManager, session?.idToken]);

  const getAccessToken = useCallback(async () => {
    const user = await requireManager().getUser();
    return user && !user.expired ? user.access_token : null;
  }, [requireManager]);

  const value = useMemo<CarClickAuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: session !== null,
      session,
      error,
      signIn,
      completeSignIn,
      signOut,
      getAccessToken
    }),
    [
      completeSignIn,
      error,
      getAccessToken,
      isLoading,
      session,
      signIn,
      signOut
    ]
  );

  return (
    <CarClickAuthContext.Provider value={value}>
      {children}
    </CarClickAuthContext.Provider>
  );
}

export function useCarClickAuth() {
  const context = useContext(CarClickAuthContext);
  if (!context) {
    throw new Error(
      "useCarClickAuth must be used inside CarClickAuthProvider"
    );
  }
  return context;
}

export function useOptionalCarClickAuth() {
  return useContext(CarClickAuthContext);
}
