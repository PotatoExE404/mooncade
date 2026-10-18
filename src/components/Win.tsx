import type { ReactNode } from "react";

export function Win({ title, icon, tone, children, className = "", bodyClass = "p-4", id }: { title: ReactNode; icon?: ReactNode; tone?: "ink" | "gold"; children: ReactNode; className?: string; bodyClass?: string; id?: string }) {
  return (
    <section className={`win ${className}`} aria-labelledby={id}>
      <div className="win-title" data-tone={tone}>
        {icon}
        <h2 id={id} className="truncate text-base leading-none">{title}</h2>
        <span className="win-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
