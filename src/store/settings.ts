import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

interface SettingsState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme: Theme) => {
        // Apply theme class to HTML element
        const htmlElement = document.documentElement;
        if (theme === "dark") {
          htmlElement.classList.add("dark");
        } else {
          htmlElement.classList.remove("dark");
        }

        set({ theme });
      },
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === "dark" ? "light" : "dark";

          // Apply theme class to HTML element
          const htmlElement = document.documentElement;
          if (newTheme === "dark") {
            htmlElement.classList.add("dark");
          } else {
            htmlElement.classList.remove("dark");
          }

          return { theme: newTheme };
        });
      },
    }),
    {
      name: "clipforge-settings",
      version: 1,
    }
  )
);

// Initialize theme on module load
if (typeof window !== "undefined") {
  // Delay initialization to avoid circular dependency
  setTimeout(() => {
    const currentTheme = useSettingsStore.getState().theme;
    const htmlElement = document.documentElement;

    if (currentTheme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }
  }, 0);
}
