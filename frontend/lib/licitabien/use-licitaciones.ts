"use client";

import { useCallback, useEffect, useState } from "react";
import { getLicitacion, getLicitaciones } from "./api";
import type { Licitacion } from "./types";

export function useLicitaciones() {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLicitaciones(await getLicitaciones());
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getLicitaciones().then((data) => {
      if (cancelled) return;
      setLicitaciones(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { licitaciones, loading, refresh };
}

export function useLicitacion(id: string) {
  const [licitacion, setLicitacion] = useState<Licitacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getLicitacion(id).then((found) => {
      if (cancelled) return;
      setLicitacion(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { licitacion, loading };
}
