import { supabase } from "./supabase";

type ErrorPayload = {
  error_type?: string;
  module?: string;
  message?: string;
  company_id?: string | null;
};

export async function reportPlatformError(payload: ErrorPayload) {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("platform-telemetry", {
      body: {
        type: "app_error",
        error_type: payload.error_type || "runtime_error",
        module: payload.module || "unknown",
        message: payload.message || "Application error",
        company_id: payload.company_id || null,
        route: window.location.pathname,
        browser: navigator.userAgent
      }
    });
  } catch {
    // Monitoring must never interrupt stock operations.
  }
}

export async function reportFailedLogin() {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("platform-telemetry", {
      body: { type: "login_failed" }
    });
  } catch {
    // Failed-login telemetry is best effort and never blocks authentication UI.
  }
}
