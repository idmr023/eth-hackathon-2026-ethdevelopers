"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiResult } from "./api";

interface ResourceState<T> {
  data: ApiResult<T> | null;
  error: string | null;
}

/**
 * Carga asíncrona con patrón cancel-safe. `loading` se deriva (no se llama
 * setState de forma síncrona dentro del efecto, cumpliendo la regla
 * react-hooks/set-state-in-effect de React 19). `reload()` fuerza una recarga.
 */
export function useAsyncResource<T>(
  loader: () => Promise<ApiResult<T>>,
  deps: readonly unknown[] = [],
) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((result) => {
        if (!cancelled) setState({ data: result, error: null });
      })
      .catch((cause) => {
        if (!cancelled) {
          setState({
            data: null,
            error:
              cause instanceof ApiError ? cause.message : "No se pudo cargar la información.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: state.data,
    error: state.error,
    loading: state.data === null,
    reload,
  };
}
