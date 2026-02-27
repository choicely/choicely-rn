import React, { useMemo, useContext } from "react";
import { useBrandBlueprints } from "../../hooks/useBrandBlueprints";
import { normalizeBlueprints } from "./templateUtils";

const TemplatesContext = React.createContext(null);

export const TemplatesProvider = ({ children }) => {
  const { data, loading, error, reload } = useBrandBlueprints();
  const templates = useMemo(
    () => normalizeBlueprints(data?.brand_blueprints || []),
    [data]
  );

  const value = useMemo(
    () => ({
      templates,
      loading,
      error,
      reload,
    }),
    [templates, loading, error, reload]
  );

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>;
};

export const useTemplates = () => {
  const ctx = useContext(TemplatesContext);
  if (!ctx) {
    throw new Error("useTemplates must be used within TemplatesProvider");
  }
  return ctx;
};

