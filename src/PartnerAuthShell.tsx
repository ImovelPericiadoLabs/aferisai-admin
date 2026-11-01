import type { ReactNode } from "react";
import "./partner-portal.css";

export function PartnerAuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="pp-auth">
      <div className="pp-auth-brand">
        <img src="/logo-dark.svg" alt="AferisAI" />
        <span>Integrações</span>
      </div>
      <div className="pp-auth-card card">{children}</div>
    </main>
  );
}
