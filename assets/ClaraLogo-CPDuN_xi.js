import{j as a}from"./react-vendor-DTXHlMoD.js";const n="/clara-app-test/assets/icon-C9K8GZDU.png";function c({variant:o="full",theme:s="dark",className:e=""}){const t=s==="dark",r=t?"text-white":"text-[#182028]",l=t?"drop-shadow-[0_0_14px_rgba(45,212,191,0.28)]":"drop-shadow-[0_0_12px_rgba(20,184,166,0.22)]";return a.jsxs("div",{className:`flex items-center gap-3 ${e}`,style:{animation:"claraLogoFadeIn 1200ms ease-out both"},children:[a.jsx("div",{className:"h-20 w-20 overflow-hidden rounded-full bg-[#071018]/75 shadow-[0_0_24px_rgba(45,212,191,0.34)]",children:a.jsx("img",{src:n,alt:"CLARA Logo",className:"h-full w-full object-cover"})}),o==="full"&&a.jsx("p",{className:`font-heading text-xl font-bold leading-tight tracking-wide transition duration-500 ${r} ${l}`,children:"CLARA"}),a.jsx("style",{children:`
        @keyframes claraLogoFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.94);
            filter: blur(6px);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
            filter: blur(0);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
      `})]})}export{c as C};
