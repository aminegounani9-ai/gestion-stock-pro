import React from "react";

type Props = { children: React.ReactNode; resetKey: string; lang: "fr"|"en"|"ar" };
type State = { error: Error | null };

export default class ModuleErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Gestion Stock Pro] Module render error:", error, info.componentStack);
  }
  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      const fr = this.props.lang === "fr";
      const ar = this.props.lang === "ar";
      return <section className="panel module-error" role="alert">
        <div className="empty-state">
          <div className="empty-icon">!</div>
          <b>{ar ? "تعذر تحميل هذه الصفحة" : fr ? "Impossible de charger ce module" : "This module could not be loaded"}</b>
          <span>{ar ? "حدث خطأ أثناء عرض البيانات. أعد المحاولة أو أرسل تفاصيل الخطأ للدعم." : fr ? "Une erreur est survenue pendant l’affichage. Réessayez ou transmettez le détail ci-dessous au support." : "An error occurred while rendering this page. Retry or share the details below with support."}</span>
          <code>{this.state.error.message || "Erreur de rendu"}</code>
          <button className="primary-btn" onClick={() => this.setState({ error: null })}>{ar ? "إعادة المحاولة" : fr ? "Réessayer" : "Try again"}</button>
        </div>
      </section>;
    }
    return this.props.children;
  }
}
