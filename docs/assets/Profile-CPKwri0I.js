import{r as i,j as e}from"./react-vendor-DVG3ZxCM.js";import{s as k}from"./index-CdnwMeSU.js";import{a as K}from"./router-vendor-DmN0Vx7J.js";import{a9 as Q,aa as Y,ad as V,ae as W,af as X,ac as B,ag as Z,a1 as q,ab as ee,a4 as ae,ah as te}from"./shared-vendor-L2fK3L32.js";import"./query-vendor-CD6bgd32.js";import"./supabase-vendor-FNdQBYSB.js";import"./ui-vendor-DY6f5Avx.js";const v={free:"bg-white/10 text-white border-white/10",basic:"bg-cyan-500/15 text-cyan-300 border-cyan-400/20",transformation:"bg-emerald-500/15 text-emerald-300 border-emerald-400/20",elite:"bg-yellow-500/15 text-yellow-300 border-yellow-400/20",admin:"bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20"},N={admin:"bg-emerald-500/15 text-emerald-300 border-emerald-400/20",student:"bg-cyan-500/15 text-cyan-300 border-cyan-400/20",free_user:"bg-white/10 text-slate-200 border-white/10",user:"bg-white/10 text-slate-200 border-white/10"};function se(a){return((a==null?void 0:a.role)||(a==null?void 0:a.user_role)||(a==null?void 0:a.account_role)||"user").toString().toLowerCase()}function ne(a,d){return d==="admin"?"admin":((a==null?void 0:a.plan_key)||(a==null?void 0:a.plan)||(a==null?void 0:a.subscription_tier)||(a==null?void 0:a.tier)||"free").toString().toLowerCase()}function re(a,d){const o=(a==null?void 0:a.trim())||(d==null?void 0:d.trim())||"U",n=o.split(" ").filter(Boolean);return n.length>=2?`${n[0][0]}${n[1][0]}`.toUpperCase():o.slice(0,2).toUpperCase()}function ie(a){if(!a)return"Not available";try{return new Date(a).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}catch{return"Not available"}}function le(){return e.jsx("div",{className:"min-h-screen bg-[#020817] text-white",children:e.jsx("div",{className:"mx-auto flex min-h-screen max-w-md items-center justify-center px-4",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400"}),e.jsx("p",{className:"mt-3 text-sm text-slate-400",children:"Loading account..."})]})})})}function _({icon:a,label:d,children:o,hint:n}){return e.jsxs("div",{className:"rounded-2xl border border-white/10 bg-white/5 p-4",children:[e.jsxs("div",{className:"mb-3 flex items-center gap-2",children:[e.jsx("div",{className:"flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200",children:e.jsx(a,{size:16})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-sm font-semibold text-white",children:d}),n?e.jsx("p",{className:"text-xs text-slate-400",children:n}):null]})]}),o]})}function he(){var R,U;const a=K(),[d,o]=i.useState(!0),[n,z]=i.useState(!1),[l,H]=i.useState(null),[s,E]=i.useState(null),[P,f]=i.useState(""),[y,j]=i.useState(""),[t,L]=i.useState({full_name:"",display_name:"",phone:""}),[S,A]=i.useState({full_name:"",display_name:"",phone:""});i.useEffect(()=>{let r=!0;return(async()=>{var p,w;try{o(!0),f(""),j("");const{data:{user:m},error:I}=await k.auth.getUser();if(I)throw I;if(!m){a("/login",{replace:!0});return}if(!r)return;H(m);const{data:G,error:T}=await k.from("profiles").select("*").eq("id",m.id).maybeSingle();if(T)throw T;if(!r)return;const x=G||{};E(x);const M={full_name:x.full_name||((p=m.user_metadata)==null?void 0:p.full_name)||((w=m.user_metadata)==null?void 0:w.name)||"",display_name:x.display_name||x.nickname||"",phone:x.phone||x.mobile_number||x.contact_number||""};L(M),A(M)}catch(m){console.error("Failed to load account:",m),r&&f("Failed to load account details.")}finally{r&&o(!1)}})(),()=>{r=!1}},[a]);const c=i.useMemo(()=>se(s),[s]),u=i.useMemo(()=>ne(s,c),[s,c]),h=(s==null?void 0:s.email)||(l==null?void 0:l.email)||"",F=(s==null?void 0:s.avatar_url)||"",J=(s==null?void 0:s.created_at)||(l==null?void 0:l.created_at),$=c==="admin"?"Admin":c==="student"?"Student":c==="free_user"?"Free User":"User",D=u==="transformation"?"Transformation":u==="elite"?"Elite":u==="basic"?"Basic":u==="admin"?"Admin":"Free",b=t.full_name!==S.full_name||t.display_name!==S.display_name||t.phone!==S.phone,C=r=>g=>{const p=g.target.value;L(w=>({...w,[r]:p})),y&&j("")},O=async()=>{try{if(!(l!=null&&l.id))return;z(!0),f(""),j("");const r={id:l.id,full_name:t.full_name.trim(),display_name:t.display_name.trim(),phone:t.phone.trim(),updated_at:new Date().toISOString()},{error:g}=await k.from("profiles").upsert(r,{onConflict:"id"});if(g)throw g;const p={...s||{},...r};E(p),A({full_name:t.full_name,display_name:t.display_name,phone:t.phone}),j("Profile updated successfully.")}catch(r){console.error("Failed to save profile:",r),f("Unable to save your changes. Please try again.")}finally{z(!1)}};return d?e.jsx(le,{}):e.jsxs("div",{className:"min-h-screen bg-[#020817] text-white",children:[e.jsxs("div",{className:"mx-auto max-w-md px-4 pb-32 pt-4",children:[e.jsxs("div",{className:"mb-4 flex items-center justify-between",children:[e.jsx("button",{type:"button",onClick:()=>a(-1),className:"btn-icon",children:e.jsx(Q,{size:18})}),e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-xs tracking-[0.3em] text-emerald-300/70",children:"CONTROL CENTER"}),e.jsx("h1",{className:"text-lg font-bold",children:"Edit Profile"})]}),e.jsx("button",{type:"button",onClick:O,disabled:!b||n,className:`save-chip ${!b||n?"cursor-not-allowed border-white/10 bg-white/5 text-slate-500":"border-emerald-400/20 bg-emerald-500/15 text-emerald-300"}`,children:e.jsx(Y,{size:15})})]}),P?e.jsxs("div",{className:"mb-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200",children:[e.jsx(V,{size:16,className:"mt-0.5 shrink-0"}),e.jsx("span",{children:P})]}):null,y?e.jsxs("div",{className:"mb-4 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200",children:[e.jsx(W,{size:16,className:"mt-0.5 shrink-0"}),e.jsx("span",{children:y})]}):null,b&&!y?e.jsx("div",{className:"mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200",children:"You have unsaved changes."}):null,e.jsxs("div",{className:"overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#04111f]",children:[e.jsx("div",{className:"bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9] px-6 py-6",children:e.jsxs("div",{className:"flex gap-4",children:[e.jsxs("div",{className:"relative shrink-0",children:[F?e.jsx("img",{src:F,alt:"Profile",className:"avatar object-cover"}):e.jsx("div",{className:"avatar",children:re(t.full_name||t.display_name,h)}),e.jsx("button",{type:"button",className:"camera-badge",onClick:()=>alert("Avatar upload can be added next once your storage flow is ready."),children:e.jsx(X,{size:14})})]}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("h2",{className:"truncate text-2xl font-bold",children:((R=t.display_name)==null?void 0:R.trim())||((U=t.full_name)==null?void 0:U.trim())||h.split("@")[0]||"User"}),e.jsx("p",{className:"truncate text-sm text-white/75",children:h}),e.jsxs("div",{className:"mt-2 flex flex-wrap gap-2",children:[e.jsx("span",{className:`badge ${N[c]||N.user}`,children:$}),e.jsxs("span",{className:`badge ${v[u]||v.free}`,children:[D," Plan"]})]})]})]})}),e.jsxs("div",{className:"grid grid-cols-1 gap-3 p-4",children:[e.jsxs("div",{className:"info-card",children:[e.jsx(B,{size:16}),e.jsx("span",{className:"truncate",children:h||"No email available"})]}),e.jsxs("div",{className:"info-card",children:[e.jsx(Z,{size:16}),e.jsxs("span",{children:["Joined ",ie(J)]})]})]})]}),e.jsxs("div",{className:"mt-5 space-y-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Personal Information"}),e.jsxs("div",{className:"mt-3 space-y-3",children:[e.jsx(_,{icon:q,label:"Full Name",hint:"Your real name shown on your account",children:e.jsx("input",{type:"text",value:t.full_name,onChange:C("full_name"),placeholder:"Enter your full name",className:"input"})}),e.jsx(_,{icon:q,label:"Display Name",hint:"Optional name shown more casually in the app",children:e.jsx("input",{type:"text",value:t.display_name,onChange:C("display_name"),placeholder:"Enter your display name",className:"input"})}),e.jsx(_,{icon:ee,label:"Phone Number",hint:"Optional contact number",children:e.jsx("input",{type:"tel",value:t.phone,onChange:C("phone"),placeholder:"e.g. 09123456789",className:"input"})}),e.jsx(_,{icon:B,label:"Email Address",hint:"Managed by your login account",children:e.jsx("input",{type:"email",value:h,disabled:!0,className:"input input-disabled"})})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"section-title",children:"Account Identity"}),e.jsxs("div",{className:"mt-3 grid grid-cols-1 gap-3",children:[e.jsxs("div",{className:"identity-card",children:[e.jsxs("div",{className:"identity-label",children:[e.jsx(ae,{size:16}),e.jsx("span",{children:"Role"})]}),e.jsx("span",{className:`badge ${N[c]||N.user}`,children:$})]}),e.jsxs("div",{className:"identity-card",children:[e.jsxs("div",{className:"identity-label",children:[e.jsx(te,{size:16}),e.jsx("span",{children:"Current Plan"})]}),e.jsxs("span",{className:`badge ${v[u]||v.free}`,children:[D," Plan"]})]})]})]})]})]}),e.jsx("div",{className:"sticky-save-wrap",children:e.jsx("div",{className:"mx-auto max-w-md px-4 pb-5",children:e.jsxs("button",{type:"button",onClick:O,disabled:!b||n,className:`save-button ${!b||n?"cursor-not-allowed opacity-60":"hover:brightness-110 active:scale-[0.99]"}`,children:[e.jsx(Y,{size:18}),e.jsx("span",{children:n?"Saving...":"Save Changes"})]})})}),e.jsx("style",{children:`
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
      `})]})}export{he as default};
