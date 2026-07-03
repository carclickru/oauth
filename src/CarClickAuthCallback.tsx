import { useEffect, useRef, type ReactNode } from "react";
import { useCarClickAuth, type CarClickSession } from "./auth";

export type CarClickAuthCallbackProps = {
  onSuccess?: (session: CarClickSession, returnTo?: string) => void;
  onError?: (error: Error) => void;
  loading?: ReactNode;
  errorFallback?: (error: Error) => ReactNode;
};

export function CarClickAuthCallback({
  onSuccess,
  onError,
  loading = null,
  errorFallback
}: CarClickAuthCallbackProps) {
  const { completeSignIn, error } = useCarClickAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void completeSignIn()
      .then(session => {
        onSuccess?.(session, session.returnTo);
      })
      .catch(reason => {
        const callbackError =
          reason instanceof Error ? reason : new Error(String(reason));
        onError?.(callbackError);
      });
  }, [completeSignIn, onError, onSuccess]);

  if (error && errorFallback) return errorFallback(error);
  return loading;
}
