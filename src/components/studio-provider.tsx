"use client";

import { useEffect } from "react";
import { initStudioPersistence } from "@/lib/store";

export function StudioProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = initStudioPersistence();
    return () => unsubscribe();
  }, []);
  return <>{children}</>;
}
