import React from "react";

type State = { error: Error | null };
export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Gestion Stock Pro] Application crash:", error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f4f6fa",fontFamily:"Arial,sans-serif",color:"#172033"}}>
      <section style={{width:"min(760px,100%)",background:"#fff",border:"1px solid #e5e9f0",borderRadius:16,padding:28,boxShadow:"0 12px 40px #1d315012"}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:1,color:"#b54757"}}>GESTION STOCK PRO · ERREUR D’AFFICHAGE</div>
        <h1 style={{fontSize:24,margin:"12px 0 8px"}}>Le module n’a pas pu être affiché</h1>
        <p style={{fontSize:14,color:"#647087",lineHeight:1.6}}>Une erreur JavaScript a interrompu l’affichage. Le détail ci-dessous permettra d’identifier le composant concerné. Vos données ne sont pas supprimées.</p>
        <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",background:"#f7f8fb",borderRadius:9,padding:14,fontSize:12,color:"#9b3343"}}>{this.state.error.message}{this.state.error.stack ? "\n\n"+this.state.error.stack : ""}</pre>
        <button onClick={()=>window.location.reload()} style={{border:0,borderRadius:8,padding:"11px 16px",background:"#3157c8",color:"#fff",fontWeight:700,cursor:"pointer"}}>Recharger l’application</button>
      </section>
    </main>;
  }
}
