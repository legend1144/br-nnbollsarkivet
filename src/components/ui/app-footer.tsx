import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Sidfot">
      <div className="site-footer__inner shell shell--member">
        <p className="site-footer__meta">
          <strong>Brannbollsarkivet</strong>
          <span>{year}</span>
        </p>
        <span className="site-footer__ornament" aria-hidden="true" />
        <div className="site-footer__actions">
          <ThemeToggle compact />
        </div>
      </div>
    </footer>
  );
}
