import React from "react";
import ReactDOM from "react-dom/client";
import ClaraOrbPage from "/src/components/community/ClaraOrbPage.jsx";
import { CLARA_ORB_COMMAND_SELECT_EVENT } from "/src/lib/clara-orb-command-ring.js";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "/src/lib/clara-pause-events.js";
import "/src/index.css";

window.__claraOrbHarness = {
  commands: [],
  pauses: [],
};

window.addEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, (event) => {
  window.__claraOrbHarness.commands.push(event.detail);
});

window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, (event) => {
  window.__claraOrbHarness.pauses.push(event.detail);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <div className="flex min-h-screen flex-col bg-[#010217]">
      <ClaraOrbPage />
    </div>
  </React.StrictMode>
);
