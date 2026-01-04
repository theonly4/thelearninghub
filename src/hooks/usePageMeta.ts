import { useEffect } from "react";

type PageMetaOptions = {
  title: string;
  description?: string;
  canonicalPath?: string;
};

export function usePageMeta({ title, description, canonicalPath }: PageMetaOptions) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    if (canonicalPath) {
      const href = `${window.location.origin}${canonicalPath}`;
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = href;
    }
  }, [title, description, canonicalPath]);
}
