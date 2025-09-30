// utils/safeInsets.ts
import { Dimensions, StatusBar, Platform, PixelRatio } from "react-native";
import { EdgeInsets } from "react-native-safe-area-context";

export function computeSafeBottom(insets: EdgeInsets | null | undefined) {
  const safeInsetBottom = insets?.bottom ?? 0;
  if (Platform.OS !== "android") return Math.max(safeInsetBottom, 0);

  const screen = Dimensions.get("screen");
  const window = Dimensions.get("window");
  const statusBar = StatusBar.currentHeight ?? 0;

  let navBarHeight = Math.max(0, screen.height - window.height - statusBar);
  navBarHeight = Math.round(PixelRatio.roundToNearestPixel(navBarHeight));

  return Math.max(safeInsetBottom, navBarHeight);
}

/**
 * Returns true when device appears to be using the classic 3-button nav.
 * We consider it a 3-button nav if either the reported inset or computed
 * navBarHeight is > 0.
 */
export function isThreeButtonNav(insets: EdgeInsets | null | undefined) {
  if (Platform.OS !== "android") return false;
  const reported = insets?.bottom ?? 0;
  const screen = Dimensions.get("screen");
  const window = Dimensions.get("window");
  const statusBar = StatusBar.currentHeight ?? 0;
  const computedNav = Math.max(0, Math.round(PixelRatio.roundToNearestPixel(screen.height - window.height - statusBar)));
  return reported > 0 || computedNav > 0;
}
