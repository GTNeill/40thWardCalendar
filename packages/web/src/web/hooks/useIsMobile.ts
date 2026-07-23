import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 640px)";

/**
 * True when the viewport is narrow enough to be considered "mobile" for
 * layout purposes (matches Tailwind's `sm` breakpoint). Reactive to resize
 * and orientation changes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
