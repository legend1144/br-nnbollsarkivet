import Link from "next/link";

export type TabNavItem = {
  key: string;
  label: string;
  href: string;
  disabled?: boolean;
};

type TabNavProps = {
  items: TabNavItem[];
  activeKey: string;
};

export function TabNav({ items, activeKey }: TabNavProps) {
  return (
    <nav className="tab-bar archive-tab-bar" aria-label="Tabbar">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`tab-chip ${active ? "tab-chip--active" : ""} ${item.disabled ? "tab-chip--disabled" : ""}`.trim()}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
