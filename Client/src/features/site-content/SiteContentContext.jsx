import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SITE_CONTENT } from "./defaultSiteContent";
import { SiteContentContext } from "./siteContentContextStore";

const CONTENT_UPDATED_EVENT = "punto29-site-content-updated";

const readSiteContent = async () => {
  const response = await fetch("/api/site-content", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el contenido del sitio.");
  return response.json();
};

export const SiteContentProvider = ({ children }) => {
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const nextContent = await readSiteContent();
      setContent((current) => JSON.stringify(current) === JSON.stringify(nextContent) ? current : nextContent);
      setStatus("ready");
      setError("");
    } catch (loadError) {
      setStatus("error");
      setError(loadError.message || "No se pudo conectar con el servidor de contenido.");
    }
  }, []);

  const saveContent = useCallback(async (nextContent) => {
    const response = await fetch("/api/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextContent),
    });
    if (!response.ok) {
      let message = "No se pudieron guardar los cambios.";
      try {
        const result = await response.json();
        if (result.error) message = result.error;
      } catch {
        // Keep the generic message when the server does not return JSON.
      }
      throw new Error(message);
    }
    setContent(nextContent);
    setStatus("ready");
    setError("");
    window.dispatchEvent(new Event(CONTENT_UPDATED_EVENT));
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(refresh, 0);
    window.addEventListener(CONTENT_UPDATED_EVENT, refresh);
    if (!import.meta.env.DEV) {
      return () => {
        window.clearTimeout(initialLoadId);
        window.removeEventListener(CONTENT_UPDATED_EVENT, refresh);
      };
    }
    const intervalId = window.setInterval(refresh, 8000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.removeEventListener(CONTENT_UPDATED_EVENT, refresh);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const value = useMemo(() => ({ content, status, error, refresh, saveContent }), [content, status, error, refresh, saveContent]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
};
