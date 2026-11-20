import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Render dialogs outside module layouts so fixed positioning is viewport-relative. */
export default function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
}
