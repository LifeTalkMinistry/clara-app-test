import { ChevronRight } from "lucide-react";

const MIN_READ_DELAY_MS = 5200;
const MAX_READ_DELAY_MS = 8200;

export const POINT_QUESTION_UI = {
  en: { pickerLabel: "Choose a question", buttonLabel: "Questions about this point", backLabel: "Back to point options", answerEyebrow: "CLARA · KEY QUESTION", askedLabel: "Asked", clarityLabel: "Need more clarity?", gotItLabel: "That makes sense", backQuestionsLabel: "Back to questions", supportButtons: ["Explain this answer another way", "Show me a real-life example", "Give me the simplest version"], supportUserText: ["Explain this answer another way.", "Show me a real-life example.", "Give me the simplest version."], supportEyebrows: ["CLARA · ANOTHER WAY · 1/3", "CLARA · REAL-LIFE EXAMPLE · 2/3", "CLARA · SIMPLEST VERSION · 3/3"] },
  tl: { pickerLabel: "Pumili ng tanong", buttonLabel: "Mga tanong tungkol sa point na ito", backLabel: "Bumalik sa point options", answerEyebrow: "CLARA · MAHALAGANG TANONG", askedLabel: "Naitanong na", clarityLabel: "Kailangan pa ng linaw?", gotItLabel: "Gets ko na", backQuestionsLabel: "Bumalik sa mga tanong", supportButtons: ["Ipaliwanag sa ibang paraan", "Bigyan ako ng totoong halimbawa", "Pinakasimpleng version"], supportUserText: ["Ipaliwanag ang sagot sa ibang paraan.", "Bigyan ako ng totoong halimbawa.", "Bigyan ako ng pinakasimpleng version."], supportEyebrows: ["CLARA · IBANG PARAAN · 1/3", "CLARA · TOTOONG HALIMBAWA · 2/3", "CLARA · PINAKASIMPLE · 3/3"] },
  es: { pickerLabel: "Elige una pregunta", buttonLabel: "Preguntas sobre este punto", backLabel: "Volver a las opciones del punto", answerEyebrow: "CLARA · PREGUNTA CLAVE", askedLabel: "Ya preguntada", clarityLabel: "¿Necesitas más claridad?", gotItLabel: "Ya tiene sentido", backQuestionsLabel: "Volver a las preguntas", supportButtons: ["Explícame esta respuesta de otra forma", "Dame un ejemplo real", "Dame la versión más simple"], supportUserText: ["Explícame esta respuesta de otra forma.", "Dame un ejemplo real.", "Dame la versión más simple."], supportEyebrows: ["CLARA · OTRA FORMA · 1/3", "CLARA · EJEMPLO REAL · 2/3", "CLARA · VERSIÓN MÁS SIMPLE · 3/3"] },
};

export function makeMessage(role, text, extra = {}) {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, ...extra };
}

export function ClaraBubble({ message, displayText, typing = false }) {
  const isUser = message.role === "user";
  const text = displayText ?? message.text;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={["max-w-[88%] rounded-[24px] px-4 py-3.5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.18)]", isUser ? "rounded-br-[8px] border border-cyan-100/15 bg-cyan-300/[0.12] text-cyan-50" : message.kind === "clarification" ? "rounded-bl-[8px] border border-yellow-100/14 bg-[linear-gradient(145deg,rgba(252,209,22,0.08),rgba(13,37,75,0.90)_58%,rgba(59,25,79,0.78))] text-white" : "rounded-bl-[8px] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(10,37,69,0.94),rgba(8,21,51,0.96)_54%,rgba(38,20,66,0.88))] text-white"].join(" ")}>
        {!isUser && message.eyebrow ? <p className="mb-2 text-[9px] font-black uppercase tracking-[0.20em] text-cyan-100/48">{message.eyebrow}</p> : null}
        {!isUser && message.title ? <h3 className="mb-2 text-[16px] font-black tracking-[-0.025em] text-white/96">{message.title}</h3> : null}
        <p className="whitespace-pre-line text-[13px] font-semibold leading-[1.72] text-current/90">{text}{typing ? <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-cyan-100/75" /> : null}</p>
      </div>
    </div>
  );
}

export function QuickReply({ children, icon: Icon, onClick, primary = false, disabled = false, used = false, statusLabel = "" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={["flex min-h-11 w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-left text-[12px] font-black transition disabled:cursor-not-allowed", used ? "border-white/[0.045] bg-white/[0.022] text-white/28 shadow-none" : primary ? "border-cyan-100/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.16)_55%,rgba(139,92,246,0.15))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.16)] active:scale-[0.992]" : "border-white/[0.09] bg-white/[0.045] text-white/78 hover:border-white/[0.16] hover:bg-white/[0.07] active:scale-[0.992] disabled:opacity-45"].join(" ")}>
      <span className="flex min-w-0 items-center gap-2.5">{Icon ? <Icon className={`h-4 w-4 shrink-0 ${used ? "text-white/18" : "text-cyan-100/72"}`} /> : null}<span>{children}</span></span>
      {statusLabel ? <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/28">{statusLabel}</span> : <ChevronRight className="h-4 w-4 shrink-0 text-white/28" />}
    </button>
  );
}

export function ClaraExampleBoard({ board }) {
  if (!board) return null;
  return (
    <section className="rounded-[24px] border border-cyan-100/12 bg-[linear-gradient(145deg,rgba(34,211,238,0.07),rgba(8,21,51,0.92)_52%,rgba(89,28,135,0.16))] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[9px] font-black uppercase tracking-[0.20em] text-yellow-200/68">{board.eyebrow}</p>
      <h3 className="mt-1.5 text-[16px] font-black tracking-[-0.025em] text-white/95">{board.title}</h3>
      {board.description ? <p className="mt-2 text-[11.5px] font-semibold leading-[1.6] text-white/58">{board.description}</p> : null}
      {Array.isArray(board.rows) && board.rows.length ? <div className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-black/[0.12]">{board.rows.map((row) => <div key={row.label} className="flex items-center justify-between gap-4 px-3.5 py-2.5"><span className="text-[10.5px] font-semibold text-white/46">{row.label}</span><span className="text-right text-[12px] font-black text-cyan-50/90">{row.value}</span></div>)}</div> : null}
      {board.note ? <p className="mt-3 text-[10.5px] font-semibold leading-[1.55] text-white/45">{board.note}</p> : null}
    </section>
  );
}

export function getReadDelay() {
  return Math.round(MIN_READ_DELAY_MS + Math.random() * (MAX_READ_DELAY_MS - MIN_READ_DELAY_MS));
}
