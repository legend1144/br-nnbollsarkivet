import type { ReactNode } from "react";

type SectionPanelProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function SectionPanel({ title, subtitle, children, className }: SectionPanelProps) {
  return (
    <section className={`panel section-panel ${className ?? ""}`.trim()}>
      {title ? <h2 className="section-panel__title">{title}</h2> : null}
      {subtitle ? <p className="section-panel__subtitle">{subtitle}</p> : null}
      {children ? <div className="section-panel__content">{children}</div> : null}
    </section>
  );
}
