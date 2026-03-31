import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({
    width:  typeof window !== 'undefined' ? window.innerWidth  : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const h = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  return size;
}

/**
 * Bootstrap 5–aligned breakpoints
 *   sm  ≥ 576 px
 *   md  ≥ 768 px
 *   lg  ≥ 992 px  ← sidebar appears here
 *   xl  ≥ 1200 px ← "desktop" layout (wider padding, larger type, etc.)
 *   xxl ≥ 1400 px ← 3-column card grid
 */
export function useBreakpoints() {
  const { width, height } = useWindowSize();
  return {
    isMobile:  width < 576,
    isSm:      width >= 576,
    isMd:      width >= 768,
    isLg:      width >= 992,   // sidebar visible breakpoint
    isXl:      width >= 1200,
    isXxl:     width >= 1400,
    isDesktop: width >= 1200,  // kept for existing layout logic in screens
    width,
    height,
  };
}