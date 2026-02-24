import type { ReactNode } from "react";

type CardGridProps = {
  children: ReactNode;
  className?: string;
};

export function CardGrid({ children, className }: CardGridProps) {
  return <div className={`card-grid ${className ?? ""}`.trim()}>{children}</div>;
}
