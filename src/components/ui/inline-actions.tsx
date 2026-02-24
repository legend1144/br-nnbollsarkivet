import type { ReactNode } from "react";

type InlineActionsProps = {
  children: ReactNode;
  className?: string;
};

export function InlineActions({ children, className }: InlineActionsProps) {
  return <div className={`inline-actions ${className ?? ""}`.trim()}>{children}</div>;
}
