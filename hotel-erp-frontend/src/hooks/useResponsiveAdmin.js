import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

function getViewportFlags() {
  if (typeof window === "undefined") {
    return {
      width: TABLET_BREAKPOINT,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    };
  }

  const width = window.innerWidth;
  return {
    width,
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
  };
}

export function useResponsiveAdmin() {
  const [viewport, setViewport] = useState(getViewportFlags);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewport(getViewportFlags());

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}

export function getResponsiveValue({
  isMobile,
  isTablet,
  mobile,
  tablet,
  desktop,
}) {
  if (isMobile) return mobile;
  if (isTablet) return tablet ?? desktop;
  return desktop;
}
