import{r as i,j as e}from"./react-vendor-DVG3ZxCM.js";import{P as J,e as N,s as k,n as Q}from"./index-B8Zs6Zpp.js";import{a as V}from"./router-vendor-DmN0Vx7J.js";import{ak as W,al as Y,ar as X,as as Z,at as ee,a6 as B,au as ae,K,av as se,M as te,ah as re}from"./shared-vendor-DPZ1nalG.js";import"./query-vendor-CD6bgd32.js";import"./supabase-vendor-FNdQBYSB.js";import"./ui-vendor-Ca4VSs3l.js";const w={admin:"bg-emerald-500/15 text-emerald-300 border-emerald-400/20",student:"bg-cyan-500/15 text-cyan-300 border-cyan-400/20",free_user:"bg-white/10 text-slate-200 border-white/10",user:"bg-white/10 text-slate-200 border-white/10"};function ne(a){return((a==null?void 0:a.role)||"user").toString().toLowerCase()}function ie(a,d){return d==="admin"?"admin":Q((a==null?void 0:a.plan)||"free")}function le(a,d){const o=(a==null?void 0:a.trim())||(d==null?void 0:d.trim())||"U",r=o.split(" ").filter(Boolean);return r.length>=2?`${r[0][0]}${r[1][0]}`.toUpperCase():o.slice(0,2).toUpperCase()}function de(a){if(!a)return"Not available";try{return new Date(a).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}catch{return"Not available"}}function oe(){return e.jsx("div",{className:"min-h-screen bg-[#020817] text-white",children:e.jsx("div",{className:"mx-auto flex min-h-screen max-w-md items-center justify-center px-4",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400"}),e.jsx("p",{className:"mt-3 text-sm text-slate-400",children:"Loading account..."})]})})})}function _({icon:a,label:d,children:o,hint:r}){return e.jsxs("div",{className:"rounded-2xl border border-white/10 bg-white/5 p-4",children:[e.jsxs("div",{className:"mb-3 flex items-center gap-2",children:[e.jsx("div",{className:"flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200",children:e.jsx(a,{size:16})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-sm font-semibold text-white",children:d}),r?e.jsx("p",{className:"text-xs text-slate-400",children:r}):null]})]}),o]})}function ge(){var R,U;const a=V(),[d,o]=i.useState(!0),[r,P]=i.useState(!1),[l,q]=i.useState(null),[t,z]=i.useState(null),[E,g]=i.useState(""),[f,j]=i.useState(""),[s,A]=i.useState({full_name:"",display_name:"",phone:""}),[S,L]=i.useState({full_name:"",display_name:"",phone:""});i.useEffect(()=>{let n=!0;return(async()=>{var p,v;try{o(!0),g(""),j("");const{data:{user:m},error:I}=await k.auth.getUser();if(I)throw I;if(!m){a("/login",{replace:!0});return}if(!n)return;q(m);const{data:H,error:M}=await k.from("profiles").select("*").eq("id",m.id).maybeSingle();if(M)throw M;if(!n)return;const x=H||{};z(x);const T={full_name:x.full_name||((p=m.user_metadata)==null?void 0:p.full_name)||((v=m.user_metadata)==null?void 0:v.name)||"",display_name:x.display_name||x.nickname||"",phone:x.phone||x.mobile_number||x.contact_number||""};A(T),L(T)}catch(m){console.error("Failed to load account:",m),n&&g("Failed to load account details.")}finally{n&&o(!1)}})(),()=>{n=!1}},[a]);const c=i.useMemo(()=>ne(t),[t]),y=i.useMemo(()=>ie(t,c),[t,c]),u=(t==null?void 0:t.email)||(l==null?void 0:l.email)||"",F=(t==null?void 0:t.avatar_url)||"",G=(t==null?void 0:t.created_at)||(l==null?void 0:l.created_at),$=c==="admin"?"Admin":c==="student"?"Student":c==="free_user"?"Free User":"User",D=y==="admin"?"Admin":J[y]||"Free",h=s.full_name!==S.full_name||s.display_name!==S.display_name||s.phone!==S.phone,C=n=>b=>{const p=b.target.value;A(v=>({...v,[n]:p})),f&&j("")},O=async()=>{try{if(!(l!=null&&l.id))return;P(!0),g(""),j("");const n={id:l.id,full_name:s.full_name.trim(),display_name:s.display_name.trim(),phone:s.phone.trim(),updated_at:new Date().toISOString()},{error:b}=await k.from("profiles").upsert(n,{onConflict:"id"});if(b)throw b;const p={...t||{},...n};z(p),L({full_name:s.full_name,display_name:s.display_name,phone:s.phone}),j("Profile updated successfully.")}catch(n){console.error("Failed to save profile:",n),g("Unable to save your changes. Please try again.")}finally{P(!1)}};return d?e.jsx(oe,{}):e.jsxs("div",{className:"min-h-screen bg-[#020817] text-white",children:[e.jsxs("div",{className:"mx-auto max-w-md px-4 pb-32 pt-4",children:[e.jsxs("div",{className:"mb-4 flex items-center justify-between",children:[e.jsx("button",{type:"button",onClick:()=>a(-1),className:"btn-icon",children:e.jsx(W,{size:18})}),e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-xs tracking-[0.3em] text-emerald-300/70",children:"CONTROL CENTER"}),e.jsx("h1",{className:"text-lg font-bold",children:"Edit Profile"})]}),e.jsx("button",{type:"button",onClick:O,disabled:!h||r,className:`save-chip ${!h||r?"cursor-not-allowed border-white/10 bg-white/5 text-slate-500":"border-emerald-400/20 bg-emerald-500/15 text-emerald-300"}`,children:e.jsx(Y,{size:15})})]}),E?e.jsxs("div",{className:"mb-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200",children:[e.jsx(X,{size:16,className:"mt-0.5 shrink-0"}),e.jsx("span",{children:E})]}):null,f?e.jsxs("div",{className:"mb-4 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200",children:[e.jsx(Z,{size:16,className:"mt-0.5 shrink-0"}),e.jsx("span",{children:f})]}):null,h&&!f?e.jsx("div",{className:"mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200",children:"You have unsaved changes."}):null,e.jsxs("div",{className:"overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#04111f]",children:[e.jsx("div",{className:"bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] px-6 py-6",children:e.jsxs("div",{className:"flex gap-4",children:[e.jsxs("div",{className:"relative shrink-0",children:[F?e.jsx("img",{src:F,alt:"Profile",className:"avatar object-cover"}):e.jsx("div",{className:"avatar",children:le(s.full_name||s.display_name,u)}),e.jsx("button",{type:"button",className:"camera-badge",onClick:()=>alert("Avatar upload can be added next once your storage flow is ready."),children:e.jsx(ee,{size:14})})]}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("h2",{className:"truncate text-2xl font-bold",children:((R=s.display_name)==null?void 0:R.trim())||((U=s.full_name)==null?void 0:U.trim())||u.split("@")[0]||"User"}),e.jsx("p",{className:"truncate text-sm text-white/75",children:u}),e.jsxs("div",{className:"mt-2 flex flex-wrap gap-2",children:[e.jsx("span",{className:`badge ${w[c]||w.user}`,children:$}),e.jsxs("span",{className:`badge ${N[y]||N.free}`,children:[D," Plan"]})]})]})]})}),e.jsxs("div",{className:"grid grid-cols-1 gap-3 p-4",children:[e.jsxs("div",{className:"info-card",children:[e.jsx(B,{size:16}),e.jsx("span",{className:"truncate",children:u||"No email available"})]}),e.jsxs("div",{className:"info-card",children:[e.jsx(ae,{size:16}),e.jsxs("span",{children:["Joined ",de(G)]})]})]})]}),e.jsxs("div",{className:"mt-5 space-y-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Personal Information"}),e.jsxs("div",{className:"mt-3 space-y-3",children:[e.jsx(_,{icon:K,label:"Full Name",hint:"Your real name shown on your account",children:e.jsx("input",{type:"text",value:s.full_name,onChange:C("full_name"),placeholder:"Enter your full name",className:"input"})}),e.jsx(_,{icon:K,label:"Display Name",hint:"Optional name shown more casually in the app",children:e.jsx("input",{type:"text",value:s.display_name,onChange:C("display_name"),placeholder:"Enter your display name",className:"input"})}),e.jsx(_,{icon:se,label:"Phone Number",hint:"Optional contact number",children:e.jsx("input",{type:"tel",value:s.phone,onChange:C("phone"),placeholder:"e.g. 09123456789",className:"input"})}),e.jsx(_,{icon:B,label:"Email Address",hint:"Managed by your login account",children:e.jsx("input",{type:"email",value:u,disabled:!0,className:"input input-disabled"})})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Account Identity"}),e.jsxs("div",{className:"mt-3 grid grid-cols-1 gap-3",children:[e.jsxs("div",{className:"identity-card",children:[e.jsxs("div",{className:"identity-label",children:[e.jsx(te,{size:16}),e.jsx("span",{children:"Role"})]}),e.jsx("span",{className:`badge ${w[c]||w.user}`,children:$})]}),e.jsxs("div",{className:"identity-card",children:[e.jsxs("div",{className:"identity-label",children:[e.jsx(re,{size:16}),e.jsx("span",{children:"Current Plan"})]}),e.jsxs("span",{className:`badge ${N[y]||N.free}`,children:[D," Plan"]})]})]})]})]})]}),e.jsx("div",{className:"sticky-save-wrap",children:e.jsx("div",{className:"mx-auto max-w-md px-4 pb-5",children:e.jsxs("button",{type:"button",onClick:O,disabled:!h||r,className:`save-button ${!h||r?"cursor-not-allowed opacity-60":"hover:brightness-110 active:scale-[0.99]"}`,children:[e.jsx(Y,{size:18}),e.jsx("span",{children:r?"Saving...":"Save Changes"})]})})}),e.jsx("style",{children:`
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
      `})]})}export{ge as default};
