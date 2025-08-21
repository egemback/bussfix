import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const Root: React.FC = () => {
  return (
    <>
      <div style={{ width: "100%", textAlign: "left", padding: 20 }}>
        <img
          src="/assets/logo-header-full-sf.png"
          alt="Bussfix Logo"
          style={{ maxWidth: 720, width: "100%" }}
        />
      </div>
      <App />
    </>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
