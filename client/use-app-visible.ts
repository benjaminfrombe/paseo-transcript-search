import { AppState, Platform } from "react-native";
import { useSyncExternalStore } from "react";
import { appVisible, onVisibility } from "./visibility";

const visible = () => Platform.OS === "web" ? appVisible() : AppState?.currentState !== "background" && AppState?.currentState !== "inactive";
const subscribe = (listener: () => void) => {
  if (Platform.OS === "web") return onVisibility(listener);
  const subscription = AppState?.addEventListener("change", listener);
  return () => subscription?.remove();
};
export const useAppVisible = () => useSyncExternalStore(subscribe, visible, () => true);
