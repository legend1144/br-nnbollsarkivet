import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <section className="shell shell--public landing-shell" aria-label="Startsida">
      <article className="panel panel--elevated landing-hero reveal-up">
        <div className="landing-hero__info">
          <div className="landing-hero__brand">
            <span className="landing-hero__logo-wrap">
              <Image src="/logo.png" alt="Brannbollsarkivet logotyp" width={132} height={132} className="landing-hero__logo" priority />
            </span>
            <p className="landing-hero__eyebrow text-cyan-200">Brannbollsarkivet</p>
          </div>
          <h1 className="landing-hero__title">Guiden till vinsten</h1>
          <p className="landing-hero__description text-body">Allt vi behover for att dominera Brannbollsturneringen 2026 finns har.</p>
        </div>

        <div className="landing-hero__divider" aria-hidden="true">
          <span className="landing-hero__divider-mark" />
        </div>

        <div className="landing-hero__cta">
          <Link href="/login" className="btn-primary">
            Logga in
          </Link>
          <Link href="/login#hjalp" className="landing-hero__secondary text-body">
            Behover du hjalp?
          </Link>
        </div>
      </article>
    </section>
  );
}
