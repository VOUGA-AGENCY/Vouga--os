import type { ReactNode } from "react";

type SystemStateProps = {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  tone?: "neutral" | "error" | "success";
};

export function SystemState({
  action,
  description,
  eyebrow,
  title,
  tone = "neutral",
}: SystemStateProps) {
  return (
    <section
      className={`system-state system-state-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display">{title}</h1>
      <p>{description}</p>
      {action && <div className="system-state-action">{action}</div>}
    </section>
  );
}
