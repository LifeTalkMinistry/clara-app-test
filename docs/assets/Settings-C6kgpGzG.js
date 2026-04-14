import{r as n,j as e}from"./react-vendor-DVG3ZxCM.js";import{s as w}from"./index-C3HEuMRJ.js";import{a as Y,c as $}from"./router-vendor-DmN0Vx7J.js";import{a9 as R,aa as W,a1 as q,ab as G,ac as H}from"./shared-vendor-L2fK3L32.js";import"./query-vendor-CD6bgd32.js";import"./supabase-vendor-FNdQBYSB.js";import"./ui-vendor-DY6f5Avx.js";const D={free:"bg-white/10 text-white border-white/10",basic:"bg-cyan-500/15 text-cyan-300 border-cyan-400/20",transformation:"bg-emerald-500/15 text-emerald-300 border-emerald-400/20",elite:"bg-yellow-500/15 text-yellow-300 border-yellow-400/20",admin:"bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20"},A={admin:"bg-emerald-500/15 text-emerald-300 border-emerald-400/20",student:"bg-cyan-500/15 text-cyan-300 border-cyan-400/20",free_user:"bg-white/10 text-slate-200 border-white/10",user:"bg-white/10 text-slate-200 border-white/10"};function J(a){return((a==null?void 0:a.role)||(a==null?void 0:a.user_role)||(a==null?void 0:a.account_role)||"user").toString().toLowerCase()}function K(a,r){return r==="admin"?"admin":((a==null?void 0:a.plan_key)||(a==null?void 0:a.plan)||(a==null?void 0:a.subscription_tier)||(a==null?void 0:a.tier)||"free").toString().toLowerCase()}function se(){var F;const a=Y(),{section:r}=$(),[I,S]=n.useState(!0),[m,_]=n.useState(!1),[k,U]=n.useState(null),[b,P]=n.useState(null),[o,O]=n.useState(null),[i,y]=n.useState({full_name:"",phone:"",email:""}),[E,C]=n.useState({full_name:"",phone:"",email:""}),[j,v]=n.useState(""),[N,x]=n.useState("");n.useEffect(()=>{let s=!0;return(async()=>{var c,h;try{S(!0),x(""),v("");const{data:{user:t},error:f}=await w.auth.getUser();if(f)throw f;if(!t){a("/login");return}if(!s)return;U(t.id),O(t);const{data:T,error:M}=await w.from("profiles").select("*").eq("id",t.id).maybeSingle();if(M)throw M;const u=T||{};if(!s)return;P(u);const B={full_name:u.full_name||((c=t.user_metadata)==null?void 0:c.full_name)||((h=t.user_metadata)==null?void 0:h.name)||"",phone:u.phone||u.mobile_number||u.contact_number||"",email:u.email||t.email||""};y(B),C(B)}catch(t){console.error("Settings load error:",t),s&&x("Failed to load account details.")}finally{s&&S(!1)}})(),()=>{s=!1}},[a]);const d=n.useMemo(()=>J(b),[b]),g=n.useMemo(()=>K(b,d),[b,d]),p=i.full_name!==E.full_name||i.phone!==E.phone,L=(s,l)=>{y(c=>({...c,[s]:l})),j&&v(""),N&&x("")},z=async()=>{var s;if(k)try{_(!0),x(""),v("");const l={id:k,full_name:i.full_name.trim(),phone:i.phone.trim(),email:i.email,updated_at:new Date().toISOString()},{data:c,error:h}=await w.from("profiles").upsert(l,{onConflict:"id"}).select().single();if(h)throw h;const t={...b||{},...c||l};P(t);const f={full_name:t.full_name||"",phone:t.phone||t.mobile_number||t.contact_number||"",email:t.email||(o==null?void 0:o.email)||""};y(f),C(f),v("Profile updated successfully.")}catch(l){console.error("Save error:",l),x((s=l==null?void 0:l.message)!=null&&s.includes("row-level security")?"Save blocked by Supabase policy. Your profiles table needs an UPDATE policy.":"Failed to save changes.")}finally{_(!1)}};return I?e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-[#020817] text-white",children:"Loading..."}):e.jsxs("div",{className:"min-h-screen bg-[#020817] text-white px-4 pt-4 pb-32",children:[e.jsxs("div",{className:"flex items-center justify-between mb-5",children:[e.jsx("button",{onClick:()=>a(-1),className:"btn",children:e.jsx(R,{size:18})}),e.jsx("h1",{className:"font-bold text-lg",children:r==="account"?"Edit Profile":r||"Settings"}),e.jsx("button",{onClick:z,disabled:!p||m||r!=="account",className:`saveBtn ${!p||m||r!=="account"?"saveBtnDisabled":""}`,children:e.jsx(W,{size:16})})]}),N?e.jsx("div",{className:"alert error",children:N}):null,j?e.jsx("div",{className:"alert success",children:j}):null,e.jsxs("div",{className:"profileCard",children:[e.jsx("h2",{className:"text-xl font-bold",children:i.full_name||((F=o==null?void 0:o.email)==null?void 0:F.split("@")[0])||"User"}),e.jsx("p",{className:"text-sm text-white/70",children:i.email}),e.jsxs("div",{className:"flex gap-2 mt-2 flex-wrap",children:[e.jsx("span",{className:`badge ${A[d]||A.user}`,children:d==="admin"?"Admin":d==="student"?"Student":d==="free_user"?"Free User":"User"}),e.jsx("span",{className:`badge ${D[g]||D.free}`,children:g==="admin"?"Admin Plan":g==="transformation"?"Transformation Plan":g==="elite"?"Elite Plan":g==="basic"?"Basic Plan":"Free Plan"})]})]}),r==="account"&&e.jsxs("div",{className:"space-y-4 mt-5",children:[e.jsxs("div",{className:"field",children:[e.jsx(q,{size:16,className:"icon"}),e.jsx("input",{className:"input",value:i.full_name,onChange:s=>L("full_name",s.target.value),placeholder:"Full Name"})]}),e.jsxs("div",{className:"field",children:[e.jsx(G,{size:16,className:"icon"}),e.jsx("input",{className:"input",value:i.phone,onChange:s=>L("phone",s.target.value),placeholder:"Phone Number (optional)"})]}),e.jsxs("div",{className:"field",children:[e.jsx(H,{size:16,className:"icon"}),e.jsx("input",{className:"input opacity-60",value:i.email,readOnly:!0})]}),p?e.jsx("p",{className:"text-yellow-400 text-sm",children:"You have unsaved changes"}):null]}),r==="privacy"&&e.jsx("div",{className:"mt-5",children:e.jsx("button",{className:"dangerBtn",onClick:async()=>{await w.auth.signOut(),a("/login")},children:"Logout"})}),e.jsx("div",{className:"saveWrap",children:e.jsx("button",{onClick:z,disabled:!p||m||r!=="account",className:`saveMain ${!p||m||r!=="account"?"saveMainDisabled":""}`,children:m?"Saving...":"Save Changes"})}),e.jsx("style",{children:`
        .btn {
          height: 44px;
          width: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saveBtn {
          height: 44px;
          width: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
        }

        .saveBtnDisabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .profileCard {
          padding: 20px;
          border-radius: 20px;
          background: linear-gradient(135deg,#0f8f5a,#06b6d4);
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid;
          white-space: nowrap;
        }

        .field {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .icon {
          color: rgba(255,255,255,0.75);
          flex-shrink: 0;
        }

        .input {
          flex: 1;
          background: transparent;
          outline: none;
          color: white;
          min-width: 0;
        }

        .input::placeholder {
          color: rgba(255,255,255,0.45);
        }

        .alert {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
        }

        .alert.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.22);
          color: #fca5a5;
        }

        .alert.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.22);
          color: #86efac;
        }

        .dangerBtn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: rgba(255,0,0,0.1);
          border: 1px solid rgba(255,0,0,0.2);
          color: #ff6b6b;
        }

        .saveWrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 16px;
          background: linear-gradient(to top,#020817,transparent);
        }

        .saveMain {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          font-weight: bold;
          color: white;
          border: none;
        }

        .saveMainDisabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `})]})}export{se as default};
