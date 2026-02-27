import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBrandBlueprints } from "../services/ChoicelyApiService";

export function useBrandBlueprints(options = {}) {
  const { accessFilter = "public_use", pageSize = 20 } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchBrandBlueprints({
        accessFilter,
        pageSize,
      });
      if (!isMounted.current) return;
      setData(payload);
      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err?.message || "Failed to load templates");
      setLoading(false);
    }
  }, [accessFilter, pageSize]);

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  return {
    data,
    loading,
    error,
    reload: load,
  };
}
