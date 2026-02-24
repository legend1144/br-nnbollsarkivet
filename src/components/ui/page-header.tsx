import type { ReactNode } from "react";
import type { HeaderKpi } from "@/lib/ui-types";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  kpis?: HeaderKpi[];
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, kpis, className }: PageHeaderProps) {
  return (
    <section className={`panel panel--elevated page-header ${className ?? ""}`.trim()}>
      <div className="page-header__copy">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? <p className="page-header__description text-body">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
      {kpis?.length ? (
        <dl className="page-header__kpis">
          {kpis.map((kpi) => (
            <div key={`${kpi.label}-${kpi.value}`} className="page-header__kpi">
              <dt>{kpi.label}</dt>
              <dd>{kpi.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
