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
