"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keep server-rendered status fresh while the page is visible (other runners are ticking too). */
export function LiveRefresh({ every = 10_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const id = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}
