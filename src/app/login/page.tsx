import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <section className="shell shell--public login-shell" aria-label="Inloggning">
      <div className="login-shell__grid">
        <section className="panel panel--elevated login-shell__intro reveal-up">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Inloggning</p>
          <h1 className="login-shell__title">Verifiering med engangskod</h1>
          <p className="login-shell__description text-body">Ange e-post och verifiera kod for att komma till medlemsytan.</p>
          <div id="hjalp" className="login-shell__help">
            <p className="login-shell__help-title">Behover du hjalp?</p>
            <p className="text-body">Kontakta en ansvarig i laget om du saknar atkomst eller inte far nagon verifieringskod.</p>
          </div>
        </section>
        <LoginForm />
      </div>
    </section>
  );
}
