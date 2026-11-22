import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * All dialogs share one top-level portal layer. The layer is fixed to the
 * visual viewport on phones, so module transforms/scroll containers cannot
 * become the containing block for a dialog.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(
    <div className="gsp-modal-portal-root">{children}</div>,
    document.body
  );
}
