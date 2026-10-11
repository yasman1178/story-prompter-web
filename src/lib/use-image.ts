"use client";

import { useEffect, useState } from "react";
import { getImage } from "@/lib/db";

export function useImageUrl(imageId: string | undefined): string | null {
  const [entry, setEntry] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!imageId) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      const stored = await getImage(imageId).catch(() => undefined);
      if (cancelled || !stored) return;
      objectUrl = URL.createObjectURL(stored.blob);
      setEntry({ id: imageId, url: objectUrl });
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  return entry && entry.id === imageId ? entry.url : null;
}
