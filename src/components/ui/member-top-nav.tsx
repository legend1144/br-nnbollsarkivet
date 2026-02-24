"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

type NavItem = {
  href: string;
  label: string;
};

type MemberTopNavProps = {
  items: NavItem[];
  adminItems?: NavItem[];
  accountLabel: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberTopNav({ items, adminItems = [], accountLabel }: MemberTopNavProps) {
  const pathname = usePathname() || "";
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuPanelId = "member-mobile-menu-panel";
  const hasAdminAccess = adminItems.length > 0;
  const showAdminItems = hasAdminAccess && inAdmin;
  const isMobileMenuOpen = mobileMenuPath === pathname;

  return (
    <div className="app-topnav stack-sm">
      <div className="app-nav-mobile">
        <button
          type="button"
          className="app-nav-mobile__toggle"
          aria-label={isMobileMenuOpen ? "Stang meny" : "Oppna meny"}
          aria-expanded={isMobileMenuOpen}
          aria-controls={mobileMenuPanelId}
          onClick={() => setMobileMenuPath((current) => (current === pathname ? null : pathname))}
        >
          {isMobileMenuOpen ? "Stang meny" : "Meny"}
        </button>

        {isMobileMenuOpen ? (
          <div id={mobileMenuPanelId} className="app-nav-mobile__panel" aria-label="Mobilnavigation">
            <section className="app-nav-mobile__section">
              <p className="app-nav-mobile__title">Meny</p>
              <div className="app-nav-mobile__links">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`app-nav__link app-nav-mobile__link ${active ? "app-nav__link--active" : ""}`.trim()}
                      onClick={() => setMobileMenuPath(null)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>

            {showAdminItems ? (
              <section className="app-nav-mobile__section">
                <p className="app-nav-mobile__title">Admin</p>
                <div className="app-nav-mobile__links">
                  {adminItems.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`app-subnav__link app-nav-mobile__link ${active ? "app-subnav__link--active" : ""}`.trim()}
                        onClick={() => setMobileMenuPath(null)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="app-nav-mobile__account">
              <p className="app-nav-mobile__title">Konto</p>
              <p className="app-nav-mobile__account-label text-body">{accountLabel}</p>
              <div className="app-nav-mobile__account-actions">
                {hasAdminAccess ? (
                  <Link href="/admin" className="btn-secondary app-nav-mobile__action" onClick={() => setMobileMenuPath(null)}>
                    Admin
                  </Link>
                ) : null}
                <LogoutButton />
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <div className="app-topnav__desktop">
        <div className="panel-tabs-shell app-topnav__desktop-shell app-topnav__desktop-shell--main">
          <nav className="app-nav app-nav--desktop app-topnav__desktop-main panel-tabs" aria-label="Huvudnavigation">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`app-nav__link panel-tab ${active ? "app-nav__link--active panel-tab--active" : ""}`.trim()}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {showAdminItems ? (
          <div className="panel-tabs-shell app-topnav__desktop-shell app-topnav__desktop-shell--admin">
            <nav className="app-subnav app-subnav--desktop app-topnav__desktop-admin panel-tabs" aria-label="Adminnavigation">
              {adminItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`app-subnav__link panel-tab ${active ? "app-subnav__link--active panel-tab--active" : ""}`.trim()}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </div>
    </div>
  );
}
