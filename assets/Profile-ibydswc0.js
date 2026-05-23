import{r as c,j as e}from"./react-vendor-DVG3ZxCM.js";import{P as ue,e as E,s as R,n as pe}from"./index-qTq0nEkE.js";import{u as me}from"./router-vendor-F_TATGrn.js";import{a4 as ge,a5 as X,ac as he,ad as xe,ae as Q,af as Z,T as be,S as fe,ag as ye,O as V,ah as ve,ai as we,aj as je,ak as _e,al as Ne,a3 as ee,am as Se,a1 as Ae,_ as Le}from"./shared-vendor-mEfF7xMc.js";import"./query-vendor-Dwh_T3ys.js";import"./supabase-vendor-B8iMMjPO.js";import"./ui-vendor-BNiy6XjK.js";const z={admin:"bg-emerald-500/15 text-emerald-300 border-emerald-400/20",student:"bg-cyan-500/15 text-cyan-300 border-cyan-400/20",free_user:"bg-white/10 text-slate-200 border-white/10",user:"bg-white/10 text-slate-200 border-white/10"},B=[{value:"young_earner",label:"Young Earner",headline:"Income is growing, habits are still forming.",trend:"People in this season often feel the pressure of payday spending, lifestyle upgrades, food delivery, transportation, and delayed emergency fund building.",struggles:["Payday lifestyle inflation","Convenience spending","Weak emergency buffer"],watch:["Unplanned spending after payday","Small repeated purchases","Savings skipped too often"],recommendation:"CLARA will prioritize simple budgeting, emergency starter funds, and gentle spending brakes before payday habits become permanent."},{value:"working_student",label:"Working Student",headline:"Time, school, and income are competing at the same time.",trend:"Working students commonly juggle school costs, transportation, food, projects, and unstable part-time income while still trying to stay socially connected.",struggles:["Irregular income","School-related expenses","Food and commute pressure"],watch:["Academic month spending spikes","Part-time income gaps","Stress spending after deadlines"],recommendation:"CLARA will focus on cash-flow stability, school expense protection, and realistic savings instead of aggressive targets."},{value:"single_parent",label:"Single Parent",headline:"Protection and stability matter more than perfection.",trend:"Single parents often carry household pressure, child-related expenses, emergency risk, and guilt-based spending while trying to keep life stable.",struggles:["Childcare and school costs","Emergency vulnerability","Guilt-based spending"],watch:["Child-related surprise expenses","Emergency fund weakness","Overspending to compensate emotionally"],recommendation:"CLARA will prioritize protection-focused budgeting, emergency readiness, and compassionate spending boundaries."},{value:"living_with_partner",label:"Living With Partner",headline:"Shared life needs shared money clarity.",trend:"People living with a partner often face shared bills, unclear money roles, silent expectations, and conflict around priorities.",struggles:["Unclear bill sharing","Different spending habits","Hidden financial pressure"],watch:["Shared expense imbalance","Unspoken expectations","Lifestyle drift"],recommendation:"CLARA will help clarify shared responsibilities, protect individual budgets, and make money conversations easier."},{value:"breadwinner",label:"Breadwinner",headline:"Generosity needs a system so it does not become survival pressure.",trend:"Breadwinners commonly experience family support requests, guilt, emergency dependency, and difficulty separating personal goals from household obligations.",struggles:["Family support pressure","Difficulty saying no","Personal savings delay"],watch:["Repeated support requests","No personal safety fund","Emotional yes decisions"],recommendation:"CLARA will focus on boundaries, protected personal savings, and planned family support instead of reactive giving."},{value:"freelancer",label:"Freelancer / Irregular Income",headline:"Irregular income needs a calmer operating system.",trend:"Freelancers and irregular earners often overspend during strong months and feel pressure during low-income gaps.",struggles:["Income unpredictability","Weak monthly baseline","Overspending after big payments"],watch:["High-income month splurge","Low-income month bills","No tax or buffer planning"],recommendation:"CLARA will focus on baseline budgeting, income smoothing, emergency reserves, and safer spending decisions during strong months."},{value:"career_transition",label:"Career Transition / Unemployed",headline:"The goal is to stretch stability while rebuilding income.",trend:"People in transition often face uncertainty, reduced spending confidence, and pressure to preserve cash while looking for the next opportunity.",struggles:["Uncertain income","Survival budgeting","Confidence pressure"],watch:["Fixed bills","Emergency fund burn rate","Avoidable spending leaks"],recommendation:"CLARA will prioritize survival runway, expense trimming, and low-pressure planning until income becomes stable again."},{value:"business_owner",label:"Business Owner",headline:"Personal money and business money need clear separation.",trend:"Small business owners often mix personal and business cash, underestimate irregular costs, and struggle with reinvestment decisions.",struggles:["Mixed cash flow","Reinvestment pressure","Irregular operating costs"],watch:["Personal-business wallet mixing","Inventory or operating spikes","Owner pay inconsistency"],recommendation:"CLARA will help separate wallets, protect owner pay, and make spending decisions based on cash-flow reality."}],se=[{value:"single",label:"Single"},{value:"in_relationship",label:"In a relationship"},{value:"living_with_partner",label:"Living with partner"},{value:"married",label:"Married"},{value:"separated",label:"Separated"},{value:"prefer_not_to_say",label:"Prefer not to say"}],te=[{value:"full_time",label:"Full-time employed"},{value:"part_time",label:"Part-time employed"},{value:"student",label:"Student"},{value:"working_student",label:"Working student"},{value:"freelance",label:"Freelance / contract"},{value:"business_owner",label:"Business owner"},{value:"unemployed",label:"Currently unemployed"},{value:"prefer_not_to_say",label:"Prefer not to say"}],ne=[{value:"0",label:"No children"},{value:"1",label:"1 child"},{value:"2",label:"2 children"},{value:"3_plus",label:"3+ children"},{value:"prefer_not_to_say",label:"Prefer not to say"}],ie=[{value:"emergency_fund",label:"Emergency fund"},{value:"reduce_spending",label:"Reduce spending"},{value:"debt_control",label:"Debt control"},{value:"support_family",label:"Support family"},{value:"budget_discipline",label:"Budget discipline"},{value:"save_for_goal",label:"Save for a goal"},{value:"control_emotional_spending",label:"Control emotional spending"}],F={life_stage:"young_earner",relationship_status:"single",children_count:"0",employment_status:"full_time",goals:["emergency_fund","budget_discipline"],current_note:""},re="clara_me_life_setup";function Ce(a){return((a==null?void 0:a.role)||"user").toString().toLowerCase()}function ke(a,s){return s==="admin"?"admin":pe((a==null?void 0:a.plan)||"free")}function Pe(a,s){const r=(a==null?void 0:a.trim())||(s==null?void 0:s.trim())||"U",i=r.split(" ").filter(Boolean);return i.length>=2?`${i[0][0]}${i[1][0]}`.toUpperCase():r.slice(0,2).toUpperCase()}function Ee(a){if(!a)return"Not available";try{return new Date(a).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}catch{return"Not available"}}function U(a,s,r="Not set"){var i;return((i=a.find(h=>h.value===s))==null?void 0:i.label)||r}function le(a){if(!a)return{};if(typeof a=="object")return a;if(typeof a!="string")return{};try{const s=JSON.parse(a);return s&&typeof s=="object"?s:{}}catch{return{}}}function Re(a){if(typeof window>"u"||!a)return{};try{return le(window.localStorage.getItem(`${re}:${a}`))}catch{return{}}}function ze(a,s){if(!(typeof window>"u"||!a))try{window.localStorage.setItem(`${re}:${a}`,JSON.stringify(s))}catch{}}function Fe(a){return le((a==null?void 0:a.clara_life_setup)||(a==null?void 0:a.life_setup)||(a==null?void 0:a.life_profile)||(a==null?void 0:a.financial_environment))}function Ie(a){var s;return{life_stage:a.life_stage,relationship_status:a.relationship_status,children_count:a.children_count,employment_status:a.employment_status,goals:Array.isArray(a.goals)?a.goals:[],current_note:((s=a.current_note)==null?void 0:s.trim())||""}}function Oe(a){var b;const s=B.find(g=>g.value===a.life_stage)||B[0],r=U(se,a.relationship_status),i=U(ne,a.children_count),h=U(te,a.employment_status),l=ie.filter(g=>{var n;return(n=a.goals)==null?void 0:n.includes(g.value)}),x=((b=l[0])==null?void 0:b.label)||"Financial stability",o=a.children_count==="1"||a.children_count==="2"||a.children_count==="3_plus"?"child-related surprise costs":null,A=a.relationship_status==="living_with_partner"||a.relationship_status==="married"?"shared financial decisions":null,L=a.employment_status==="freelance"||a.employment_status==="unemployed"?"cash-flow uncertainty":null,v=[o,A,L].filter(Boolean);return{stage:s,relationship:r,children:i,employment:h,primaryGoal:x,selectedGoals:l,adaptiveSignals:v,pressureSignals:[...s.struggles,...v].slice(0,5),watchList:[...s.watch,`${x} consistency`].slice(0,5)}}function Te(){return e.jsx("div",{className:"min-h-screen bg-[#020817] text-white",children:e.jsx("div",{className:"mx-auto flex min-h-screen max-w-md items-center justify-center px-4",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400"}),e.jsx("p",{className:"mt-3 text-sm text-slate-400",children:"Loading Me..."})]})})})}function S({icon:a,label:s,children:r,hint:i}){return e.jsxs("div",{className:"rounded-2xl border border-white/10 bg-white/5 p-4",children:[e.jsxs("div",{className:"mb-3 flex items-center gap-2",children:[e.jsx("div",{className:"flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200",children:e.jsx(a,{size:16})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-sm font-semibold text-white",children:s}),i?e.jsx("p",{className:"text-xs text-slate-400",children:i}):null]})]}),r]})}function I({icon:a,label:s,hint:r,value:i,onChange:h,options:l}){return e.jsx(S,{icon:a,label:s,hint:r,children:e.jsx("select",{value:i,onChange:h,className:"input select-input",children:l.map(x=>e.jsx("option",{value:x.value,children:x.label},x.value))})})}function M({label:a,value:s}){return e.jsxs("div",{className:"rounded-2xl border border-white/10 bg-white/[0.06] p-3",children:[e.jsx("p",{className:"text-[10px] uppercase tracking-[0.16em] text-white/45",children:a}),e.jsx("p",{className:"mt-1 text-sm font-semibold text-white",children:s})]})}function ae({title:a,items:s}){return e.jsxs("div",{className:"rounded-3xl border border-white/10 bg-slate-950/30 p-4",children:[e.jsx("p",{className:"mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70",children:a}),e.jsx("div",{className:"space-y-2",children:s.map(r=>e.jsxs("div",{className:"flex items-start gap-2 text-sm text-slate-200",children:[e.jsx("span",{className:"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300"}),e.jsx("span",{children:r})]},r))})]})}function Ue({active:a,label:s,onClick:r}){return e.jsx("button",{type:"button",onClick:r,className:`goal-chip ${a?"goal-chip-active":"goal-chip-idle"}`,children:s})}function Ye(){var Y,J;const a=me(),[s,r]=c.useState(!0),[i,h]=c.useState(!1),[l,x]=c.useState(null),[o,A]=c.useState(null),[L,v]=c.useState(""),[b,g]=c.useState(""),[n,O]=c.useState({full_name:"",display_name:"",phone:"",...F}),[oe,$]=c.useState({full_name:"",display_name:"",phone:"",...F});c.useEffect(()=>{let t=!0;return(async()=>{var u,j;try{r(!0),v(""),g("");const{data:{user:p},error:k}=await R.auth.getUser();if(k)throw k;if(!p){a("/login",{replace:!0});return}if(!t)return;x(p);const{data:P,error:q}=await R.from("profiles").select("*").eq("id",p.id).maybeSingle();if(q)throw q;if(!t)return;const y=P||{};A(y);const T={...F,...Re(p.id),...Fe(y)},K={full_name:y.full_name||((u=p.user_metadata)==null?void 0:u.full_name)||((j=p.user_metadata)==null?void 0:j.name)||"",display_name:y.display_name||y.nickname||"",phone:y.phone||y.mobile_number||y.contact_number||"",...T,goals:Array.isArray(T.goals)?T.goals:F.goals};O(K),$(K)}catch(p){console.error("Failed to load account:",p),t&&v("Failed to load Me details.")}finally{t&&r(!1)}})(),()=>{t=!1}},[a]);const w=c.useMemo(()=>Ce(o),[o]),C=c.useMemo(()=>ke(o,w),[o,w]),m=c.useMemo(()=>Oe(n),[n]),_=(o==null?void 0:o.email)||(l==null?void 0:l.email)||"",D=(o==null?void 0:o.avatar_url)||"",de=(o==null?void 0:o.created_at)||(l==null?void 0:l.created_at),G=w==="admin"?"Admin":w==="student"?"Student":w==="free_user"?"Free User":"User",W=C==="admin"?"Admin":ue[C]||"Free",N=JSON.stringify(n)!==JSON.stringify(oe),f=t=>d=>{const u=d.target.value;O(j=>({...j,[t]:u})),b&&g("")},ce=t=>{O(d=>{const u=new Set(d.goals||[]);return u.has(t)?u.delete(t):u.add(t),{...d,goals:Array.from(u)}}),b&&g("")},H=async()=>{try{if(!(l!=null&&l.id))return;h(!0),v(""),g("");const t=Ie(n),d={id:l.id,full_name:n.full_name.trim(),display_name:n.display_name.trim(),phone:n.phone.trim(),updated_at:new Date().toISOString()},u={...d,clara_life_setup:t};let j=!0;const{error:p}=await R.from("profiles").upsert(u,{onConflict:"id"});if(p){j=!1,console.warn("CLARA life setup profile column unavailable. Saving account fields only.",p);const{error:P}=await R.from("profiles").upsert(d,{onConflict:"id"});if(P)throw P}ze(l.id,t);const k={...o||{},...d,clara_life_setup:t};A(k),$({...n,...t}),g(j?"Me page updated successfully.":"Me page updated. Life setup is saved on this device for now.")}catch(t){console.error("Failed to save profile:",t),v("Unable to save your changes. Please try again.")}finally{h(!1)}};return s?e.jsx(Te,{}):e.jsxs("div",{className:"min-h-screen bg-[#020817] text-white",children:[e.jsxs("div",{className:"mx-auto max-w-md px-4 pb-32 pt-4",children:[e.jsxs("div",{className:"mb-4 flex items-center justify-between",children:[e.jsx("button",{type:"button",onClick:()=>a(-1),className:"btn-icon",children:e.jsx(ge,{size:18})}),e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-xs tracking-[0.3em] text-emerald-300/70",children:"CLARA PROFILE"}),e.jsx("h1",{className:"text-lg font-bold",children:"Me"})]}),e.jsx("button",{type:"button",onClick:H,disabled:!N||i,className:`save-chip ${!N||i?"cursor-not-allowed border-white/10 bg-white/5 text-slate-500":"border-emerald-400/20 bg-emerald-500/15 text-emerald-300"}`,children:e.jsx(X,{size:15})})]}),L?e.jsxs("div",{className:"mb-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200",children:[e.jsx(he,{size:16,className:"mt-0.5 shrink-0"}),e.jsx("span",{children:L})]}):null,b?e.jsxs("div",{className:"mb-4 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200",children:[e.jsx(xe,{size:16,className:"mt-0.5 shrink-0"}),e.jsx("span",{children:b})]}):null,N&&!b?e.jsx("div",{className:"mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200",children:"You have unsaved changes."}):null,e.jsxs("section",{className:"climate-screen",children:[e.jsx("div",{className:"climate-glow climate-glow-one"}),e.jsx("div",{className:"climate-glow climate-glow-two"}),e.jsxs("div",{className:"relative z-10",children:[e.jsxs("div",{className:"mb-4 flex items-start justify-between gap-3",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100",children:[e.jsx(Q,{size:12}),"Live climate preview"]}),e.jsxs("h2",{className:"text-2xl font-black leading-tight text-white",children:[m.stage.label," Financial Climate"]})]}),e.jsx("div",{className:"rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]",children:e.jsx(Z,{size:20})})]}),e.jsx("p",{className:"text-sm font-semibold text-emerald-50",children:m.stage.headline}),e.jsx("p",{className:"mt-2 text-sm leading-6 text-slate-300",children:m.stage.trend}),e.jsxs("div",{className:"mt-4 grid grid-cols-3 gap-2",children:[e.jsx(M,{label:"Stage",value:m.stage.label}),e.jsx(M,{label:"Children",value:m.children}),e.jsx(M,{label:"Work",value:m.employment})]}),e.jsxs("div",{className:"mt-4 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.08] p-4",children:[e.jsxs("div",{className:"mb-2 flex items-center gap-2 text-emerald-100",children:[e.jsx(be,{size:16}),e.jsx("p",{className:"text-sm font-bold",children:"CLARA trend reading"})]}),e.jsxs("p",{className:"text-sm leading-6 text-slate-200",children:["Based on your selected setup, CLARA should prioritize ",e.jsx("span",{className:"font-semibold text-white",children:m.primaryGoal}),", watch your spending environment, and compare your behavior against common pressure patterns for people in a similar season."]})]}),e.jsxs("div",{className:"mt-4 grid gap-3",children:[e.jsx(ae,{title:"Common pressure signals",items:m.pressureSignals}),e.jsx(ae,{title:"CLARA should watch",items:m.watchList})]}),e.jsxs("div",{className:"mt-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4",children:[e.jsxs("div",{className:"mb-2 flex items-center gap-2 text-cyan-100",children:[e.jsx(fe,{size:16}),e.jsx("p",{className:"text-sm font-bold",children:"Recommended coaching mode"})]}),e.jsx("p",{className:"text-sm leading-6 text-slate-300",children:m.stage.recommendation})]})]})]}),e.jsxs("div",{className:"mt-5 overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#04111f]",children:[e.jsx("div",{className:"bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] px-6 py-6",children:e.jsxs("div",{className:"flex gap-4",children:[e.jsxs("div",{className:"relative shrink-0",children:[D?e.jsx("img",{src:D,alt:"Profile",className:"avatar object-cover"}):e.jsx("div",{className:"avatar",children:Pe(n.full_name||n.display_name,_)}),e.jsx("button",{type:"button",className:"camera-badge",onClick:()=>alert("Avatar upload can be added next once your storage flow is ready."),children:e.jsx(ye,{size:14})})]}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("h2",{className:"truncate text-2xl font-bold",children:((Y=n.display_name)==null?void 0:Y.trim())||((J=n.full_name)==null?void 0:J.trim())||_.split("@")[0]||"User"}),e.jsx("p",{className:"truncate text-sm text-white/75",children:_}),e.jsxs("div",{className:"mt-2 flex flex-wrap gap-2",children:[e.jsx("span",{className:`badge ${z[w]||z.user}`,children:G}),e.jsxs("span",{className:`badge ${E[C]||E.free}`,children:[W," Plan"]})]})]})]})}),e.jsxs("div",{className:"grid grid-cols-1 gap-3 p-4",children:[e.jsxs("div",{className:"info-card",children:[e.jsx(V,{size:16}),e.jsx("span",{className:"truncate",children:_||"No email available"})]}),e.jsxs("div",{className:"info-card",children:[e.jsx(ve,{size:16}),e.jsxs("span",{children:["Joined ",Ee(de)]})]})]})]}),e.jsxs("div",{className:"mt-5 space-y-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Life Season Setup"}),e.jsx("p",{className:"mt-2 text-sm leading-6 text-slate-400",children:"This is the primary information CLARA uses to understand your financial environment without forcing you to answer a long form."}),e.jsxs("div",{className:"mt-3 space-y-3",children:[e.jsx(I,{icon:Q,label:"Current Life Season",hint:"Choose the setup closest to your current reality",value:n.life_stage,onChange:f("life_stage"),options:B.map(({value:t,label:d})=>({value:t,label:d}))}),e.jsx(I,{icon:we,label:"Relationship Setup",hint:"Helps CLARA understand shared or solo money pressure",value:n.relationship_status,onChange:f("relationship_status"),options:se}),e.jsx(I,{icon:je,label:"Children",hint:"Used only to adjust household and emergency planning",value:n.children_count,onChange:f("children_count"),options:ne}),e.jsx(I,{icon:_e,label:"Employment Status",hint:"This helps CLARA read cash-flow stability",value:n.employment_status,onChange:f("employment_status"),options:te})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Current Financial Priorities"}),e.jsxs("div",{className:"mt-3 rounded-2xl border border-white/10 bg-white/5 p-4",children:[e.jsxs("div",{className:"mb-3 flex items-center gap-2 text-white",children:[e.jsx("div",{className:"flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5",children:e.jsx(Ne,{size:16})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold",children:"What should CLARA focus on?"}),e.jsx("p",{className:"text-xs text-slate-400",children:"Select one or more priorities."})]})]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:ie.map(t=>{var d;return e.jsx(Ue,{active:(d=n.goals)==null?void 0:d.includes(t.value),label:t.label,onClick:()=>ce(t.value)},t.value)})})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Basic Account Info"}),e.jsxs("div",{className:"mt-3 space-y-3",children:[e.jsx(S,{icon:ee,label:"Full Name",hint:"Your real name shown on your account",children:e.jsx("input",{type:"text",value:n.full_name,onChange:f("full_name"),placeholder:"Enter your full name",className:"input"})}),e.jsx(S,{icon:ee,label:"Display Name",hint:"The name CLARA can call you inside the app",children:e.jsx("input",{type:"text",value:n.display_name,onChange:f("display_name"),placeholder:"Enter your display name",className:"input"})}),e.jsx(S,{icon:Se,label:"Phone Number",hint:"Optional contact number",children:e.jsx("input",{type:"tel",value:n.phone,onChange:f("phone"),placeholder:"e.g. 09123456789",className:"input"})}),e.jsx(S,{icon:V,label:"Email Address",hint:"Managed by your login account",children:e.jsx("input",{type:"email",value:_,disabled:!0,className:"input input-disabled"})})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"CLARA Notes"}),e.jsxs("div",{className:"mt-3 rounded-2xl border border-white/10 bg-white/5 p-4",children:[e.jsxs("div",{className:"mb-3 flex items-center gap-2 text-white",children:[e.jsx("div",{className:"flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5",children:e.jsx(Z,{size:16})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold",children:"Anything CLARA should understand right now?"}),e.jsx("p",{className:"text-xs text-slate-400",children:"Optional. Keep it short and practical."})]})]}),e.jsx("textarea",{value:n.current_note,onChange:f("current_note"),rows:4,placeholder:"Example: I am trying to stop random food spending after work.",className:"input min-h-[112px] resize-none"})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Account Identity"}),e.jsxs("div",{className:"mt-3 grid grid-cols-1 gap-3",children:[e.jsxs("div",{className:"identity-card",children:[e.jsxs("div",{className:"identity-label",children:[e.jsx(Ae,{size:16}),e.jsx("span",{children:"Role"})]}),e.jsx("span",{className:`badge ${z[w]||z.user}`,children:G})]}),e.jsxs("div",{className:"identity-card",children:[e.jsxs("div",{className:"identity-label",children:[e.jsx(Le,{size:16}),e.jsx("span",{children:"Current Plan"})]}),e.jsxs("span",{className:`badge ${E[C]||E.free}`,children:[W," Plan"]})]})]})]})]})]}),e.jsx("div",{className:"sticky-save-wrap",children:e.jsx("div",{className:"mx-auto max-w-md px-4 pb-5",children:e.jsxs("button",{type:"button",onClick:H,disabled:!N||i,className:`save-button ${!N||i?"cursor-not-allowed opacity-60":"hover:brightness-110 active:scale-[0.99]"}`,children:[e.jsx(X,{size:18}),e.jsx("span",{children:i?"Saving...":"Save Me Setup"})]})})}),e.jsx("style",{children:`
        .btn-icon {
          height: 44px;
          width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .save-chip {
          height: 44px;
          width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          border: 1px solid;
          transition: 0.2s ease;
        }

        .climate-screen {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid rgba(110, 231, 183, 0.16);
          background:
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.2), transparent 32%),
            radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.18), transparent 32%),
            linear-gradient(145deg, rgba(4, 17, 31, 0.96), rgba(2, 8, 23, 0.98));
          padding: 22px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
        }

        .climate-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(8px);
          opacity: 0.72;
          pointer-events: none;
        }

        .climate-glow-one {
          top: -80px;
          right: -80px;
          height: 170px;
          width: 170px;
          background: rgba(45, 212, 191, 0.18);
        }

        .climate-glow-two {
          bottom: -70px;
          left: -70px;
          height: 150px;
          width: 150px;
          background: rgba(16, 185, 129, 0.16);
        }

        .avatar {
          height: 84px;
          width: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.12);
          font-size: 26px;
          font-weight: 700;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .camera-badge {
          position: absolute;
          right: -4px;
          bottom: -4px;
          height: 32px;
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          color: white;
          border: 3px solid #04111f;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid;
          white-space: nowrap;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          min-width: 0;
        }

        .section-title {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(110, 231, 183, 0.75);
          padding-left: 2px;
        }

        .input {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 8, 23, 0.65);
          color: white;
          padding: 14px 15px;
          outline: none;
          transition: 0.2s ease;
        }

        .select-input {
          appearance: none;
        }

        .input::placeholder {
          color: rgba(148, 163, 184, 0.7);
        }

        .input:focus {
          border-color: rgba(16, 185, 129, 0.45);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }

        .input-disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .goal-chip {
          border-radius: 999px;
          border: 1px solid;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .goal-chip-active {
          border-color: rgba(16, 185, 129, 0.42);
          background: rgba(16, 185, 129, 0.16);
          color: rgb(167, 243, 208);
          box-shadow: 0 10px 28px rgba(16, 185, 129, 0.12);
        }

        .goal-chip-idle {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgb(203, 213, 225);
        }

        .identity-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
        }

        .identity-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-weight: 600;
        }

        .sticky-save-wrap {
          position: sticky;
          bottom: 0;
          z-index: 30;
          background: linear-gradient(to top, rgba(2, 8, 23, 0.98), rgba(2, 8, 23, 0.82), transparent);
          padding-top: 20px;
        }

        .save-button {
          width: 100%;
          height: 56px;
          border: none;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #0f8f5a, #06b6d4);
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.18);
          transition: 0.2s ease;
        }
      `})]})}export{Ye as default};
