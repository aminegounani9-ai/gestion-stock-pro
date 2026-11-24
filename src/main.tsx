import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "./AppErrorBoundary";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

// Temporarily disable the PWA service worker while diagnosing mobile startup.
// Clear only this app's shell cache; application data in Supabase is untouched.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("stock-project-management-shell-")).map((key) => caches.delete(key)));
    } catch (error) {
      console.warn("Mobile startup cache cleanup failed:", error);
    }
  });
}


// Keep the installed Android PWA in portrait whenever the browser supports
// the Screen Orientation API. Some browsers require a user gesture before lock().
if (typeof window !== "undefined" && "orientation" in screen) {
  const lockPortrait = async () => {
    const isInstalledApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isInstalledApp || !screen.orientation?.lock) return;

    try {
      await screen.orientation.lock("portrait-primary");
    } catch (error) {
      // Retry on the next user interaction; browser/platform policy may block
      // an automatic lock during initial page load.
      console.info("Portrait orientation lock will retry after user interaction.", error);
    }
  };

  window.addEventListener("load", () => { void lockPortrait(); });
  window.addEventListener("pageshow", () => { void lockPortrait(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void lockPortrait();
  });
  document.addEventListener("pointerdown", () => { void lockPortrait(); }, { passive: true });
  document.addEventListener("touchstart", () => { void lockPortrait(); }, { passive: true });
}
