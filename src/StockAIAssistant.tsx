import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Trash2, LoaderCircle } from "lucide-react";
import { supabase } from "./lib/supabase";

type Lang = "fr" | "en" | "ar";
type Message = { role: "user" | "assistant"; content: string };
type Props = {
  companyName: string;
  companyId: string;
  lang: Lang;
  page: string;
  role: string;
  context: Record<string, unknown>;
};

const words = {
  fr: { title:"Assistant intelligent", sub:"Votre copilote de gestion", hello:"Bonjour ! Je suis votre assistant Stock Pro. Je peux vous aider à comprendre vos stocks, vos achats, vos ventes, vos rapports et l’utilisation du logiciel.", placeholder:"Posez votre question…", send:"Envoyer", listen:"Parler", stop:"Arrêter", voiceOn:"Lecture vocale activée", voiceOff:"Lecture vocale désactivée", thinking:"Je réfléchis…", error:"Impossible de contacter l’assistant. Réessayez dans un instant.", temp:"Le service IA est momentanément très sollicité. Réessayez dans quelques secondes.", config:"L’assistant IA n’est pas encore configuré. Ajoutez la clé Gemini dans les secrets Supabase pour activer les réponses.", hint:"Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne", clear:"Effacer la conversation", online:"En ligne" },
  en: { title:"AI Assistant", sub:"Your management copilot", hello:"Hello! I’m your Stock Pro assistant. I can help you understand inventory, purchasing, sales, reports, and how to use the application.", placeholder:"Ask your question…", send:"Send", listen:"Speak", stop:"Stop", voiceOn:"Voice playback enabled", voiceOff:"Voice playback disabled", thinking:"Thinking…", error:"Could not reach the assistant. Please try again.", temp:"The AI service is temporarily busy. Please try again in a few seconds.", config:"The AI assistant is not configured yet. Add the Gemini key in Supabase secrets to enable answers.", hint:"Enter to send · Shift + Enter for a new line", clear:"Clear conversation", online:"Online" },
  ar: { title:"المساعد الذكي", sub:"مساعدك في التسيير", hello:"مرحباً! أنا مساعدك في Stock Pro. يمكنني مساعدتك في فهم المخزون والمشتريات والمبيعات والتقارير واستعمال البرنامج.", placeholder:"اكتب سؤالك…", send:"إرسال", listen:"تحدث", stop:"إيقاف", voiceOn:"تم تفعيل القراءة الصوتية", voiceOff:"تم إيقاف القراءة الصوتية", thinking:"أفكر…", error:"تعذر الاتصال بالمساعد. حاول مرة أخرى.", temp:"خدمة الذكاء الاصطناعي مشغولة مؤقتاً. عاود بعد ثوانٍ.", config:"المساعد الذكي غير مهيأ بعد. أضف مفتاح Gemini في أسرار Supabase لتفعيل الإجابات.", hint:"Enter للإرسال · Shift + Enter لسطر جديد", clear:"مسح المحادثة", online:"متصل" }
};

export default function StockAIAssistant({ companyName, companyId, lang, page, role, context }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const t = words[lang];
  const direction = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lower = text.toLowerCase();
    if (/[\\u0600-\\u06ff]/.test(text)) utterance.lang = "ar-DZ";
    else if (/\\b(wach|wesh|kifach|kifeh|3lach|chhal|rani|rah|rahi|nheb|bghit|baghi|ndir|dirli|ta3|m3a|hada|hadi)\\b/i.test(lower)) utterance.lang = "ar-DZ";
    else if (/\\b(what|how|why|where|when|please|hello|thanks|product|warehouse|inventory|purchase|sales|report)\\b/i.test(lower)) utterance.lang = "en-US";
    else utterance.lang = "fr-FR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setError("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
      const { data, error: invokeError } = await supabase.functions.invoke("stock-ai-assistant", {
        body: {
          messages: next.slice(-14),
          company: { id: companyId, name: companyName },
          language: lang,
          currentPage: page,
          userRole: role,
          context
        }
      });
      if (invokeError) {
        const response = (invokeError as any).context;
        let detail = "";
        try { detail = await response?.json?.().then((v: any) => v?.error || v?.message || ""); } catch {}
        if (detail === "AI_NOT_CONFIGURED") throw new Error("AI_NOT_CONFIGURED");
        throw new Error(detail || invokeError.message);
      }
      const answer = String(data?.answer || "").trim();
      if (!answer) throw new Error("EMPTY_RESPONSE");
      setMessages(current => [...current, { role: "assistant", content: answer }]);
      speak(answer);
    } catch (e: any) {
      setError(e?.message === "AI_NOT_CONFIGURED" ? t.config : e?.message === "AI_TEMPORARILY_UNAVAILABLE" ? t.temp : e?.message === "SUPABASE_NOT_CONFIGURED" ? t.error : (e?.message || t.error));
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(lang === "ar" ? "التعرف الصوتي غير مدعوم في هذا المتصفح. استعمل Chrome." : lang === "en" ? "Speech recognition is not supported in this browser. Try Chrome." : "La reconnaissance vocale n’est pas prise en charge par ce navigateur. Essayez Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) { setInput(value => value ? value + " " + transcript : transcript); setError(""); }
    };
    recognition.onerror = () => setError(lang === "ar" ? "لم يتم التقاط الصوت. تحقق من إذن الميكروفون." : lang === "en" ? "Voice capture failed. Check microphone permission." : "La capture vocale a échoué. Vérifiez l’autorisation du microphone.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setError(""); }
    catch { setListening(false); }
  };

  return <>
    <button className={"stock-ai-fab " + (open ? "is-open" : "")} onClick={() => setOpen(v => !v)} aria-label={t.title} title={t.title}>
      {open ? <X size={24}/> : <span className="stock-ai-fab-icon"><Sparkles size={23}/><i/></span>}
      {!open && <span className="stock-ai-fab-pulse"/>}
    </button>
    {open && <section className="stock-ai-panel" dir={direction} aria-label={t.title}>
      <header className="stock-ai-head">
        <div className="stock-ai-avatar"><Bot size={22}/><i/></div>
        <div className="stock-ai-head-copy"><b>{t.title}</b><span><i/> {t.online} · {t.sub}</span></div>
        <button className="stock-ai-head-action" onClick={() => { setMessages([]); setError(""); window.speechSynthesis?.cancel?.(); }} title={t.clear} aria-label={t.clear}><Trash2 size={16}/></button>
        <button className="stock-ai-head-action" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button>
      </header>
      <div className="stock-ai-messages" ref={listRef}>
        <div className="stock-ai-welcome"><span className="stock-ai-welcome-icon"><Sparkles size={18}/></span><b>{t.title}</b><p>{t.hello}</p><small>{companyName}</small></div>
        {messages.map((m, i) => <div key={i} className={"stock-ai-message " + m.role}><div className="stock-ai-message-avatar">{m.role === "assistant" ? <Bot size={15}/> : <span>U</span>}</div><div className="stock-ai-bubble">{m.content}{m.role === "assistant" && <button className="stock-ai-speak" onClick={() => speak(m.content)} title={t.listen}><Volume2 size={13}/></button>}</div></div>)}
        {busy && <div className="stock-ai-typing"><span/><span/><span/>{t.thinking}</div>}
      </div>
      {error && <div className="stock-ai-error">{error}</div>}
      <div className="stock-ai-controls"><button className={"stock-ai-tool " + (listening ? "active" : "")} onClick={toggleMic} title={listening ? t.stop : t.listen} aria-label={listening ? t.stop : t.listen}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button><button className={"stock-ai-tool " + (!voiceEnabled ? "muted" : "")} onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) window.speechSynthesis?.cancel?.(); }} title={voiceEnabled ? t.voiceOn : t.voiceOff} aria-label={t.voiceOn}>{voiceEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button><textarea ref={inputRef} rows={1} value={input} onChange={e => setInput(e.target.value)} placeholder={listening ? (lang === "ar" ? "استمع إليك..." : lang === "en" ? "Listening…" : "Je vous écoute…") : t.placeholder} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} /><button className="stock-ai-send" onClick={() => void send()} disabled={!input.trim() || busy} aria-label={t.send}>{busy ? <LoaderCircle size={17} className="stock-ai-spin"/> : <Send size={17}/>}</button></div>
      <div className="stock-ai-hint">{t.hint}</div>
    </section>}
  </>;
}
