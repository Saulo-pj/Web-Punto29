import { useContext } from "react";
import { SiteContentContext } from "./siteContentContextStore";

export const useSiteContent = () => {
  const value = useContext(SiteContentContext);
  if (!value) throw new Error("useSiteContent debe usarse dentro de SiteContentProvider.");
  return value;
};
