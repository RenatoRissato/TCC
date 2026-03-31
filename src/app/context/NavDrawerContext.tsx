import { createContext, useContext } from 'react';

interface NavDrawerCtx {
  /** Call this from any screen header to open the offcanvas nav drawer */
  openDrawer: () => void;
}

export const NavDrawerContext = createContext<NavDrawerCtx>({
  openDrawer: () => {},
});

/** Convenience hook — use inside any screen to get openDrawer() */
export const useNavDrawer = () => useContext(NavDrawerContext);
