import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./form-system.css";

createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.DEV)
  void import("./alignment-audit").then((module) => {
    (window as unknown as Record<string, unknown>).__auditAlignment =
      module.auditAlignment;
  });
