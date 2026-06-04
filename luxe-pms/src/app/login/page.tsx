"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { login, getToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = React.useState(false);
  const [email, setEmail] = React.useState("admin@hotel.com");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [needCode, setNeedCode] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Already signed in? Skip the form.
  React.useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password, needCode ? code : undefined);
      if (result.twoFactorRequired) {
        setNeedCode(true);
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh grid lg:grid-cols-2 bg-background">
      {/* Left — branding panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-linear-to-br from-brand-soft via-surface to-accent-soft">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-md bg-brand text-brand-foreground flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">MYHOTEL</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Hospitality OS</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl font-display leading-tight tracking-tight">
            The reception desk has a new home.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            One screen for every guest, every room, every payment.
            Built for properties that treat hospitality as craft.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: "Check-in time", value: "< 30s" },
              { label: "Night audit", value: "Automated" },
              { label: "Properties", value: "Unlimited" },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border bg-surface/60 backdrop-blur p-3">
                <p className="text-[10px] uppercase tracking-wider text-subtle-foreground font-medium">{s.label}</p>
                <p className="text-base font-semibold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Encrypted at rest · SOC 2 · ISO 27001 ready
        </p>
      </div>

      {/* Right — form */}
      <div className="flex flex-col">
        <div className="flex justify-end p-4 lg:p-6">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <span className="h-9 w-9 rounded-md bg-brand text-brand-foreground flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <span className="font-semibold text-lg">MYHOTEL</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue to <span className="font-medium text-foreground">The Pearl Marina</span>.
            </p>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft/40 px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email or username</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-xs text-brand hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <Input id="password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="pr-10" required />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {needCode && (
                <div className="space-y-1.5">
                  <Label htmlFor="twofa">Authenticator code</Label>
                  <Input
                    id="twofa"
                    inputMode="numeric"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    className="h-11 text-lg tabular font-mono tracking-[0.3em] text-center"
                  />
                  <p className="text-[11px] text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <input type="checkbox" id="remember" defaultChecked className="h-4 w-4 rounded border-border text-brand focus:ring-ring" />
                <Label htmlFor="remember" className="text-muted-foreground font-normal">Remember this device for 30 days</Label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading || (needCode && code.length !== 6)}>
                {loading ? "Signing in…" : needCode ? "Verify & sign in" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Demo login — <span className="font-mono text-foreground">admin@hotel.com</span> / <span className="font-mono text-foreground">password123</span>
              </p>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-subtle-foreground uppercase tracking-wider">or</span></div>
              </div>

              <Button type="button" variant="outline" size="lg" className="w-full">
                Sign in with SSO
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Need an account? <Link href="#" className="text-brand hover:underline">Talk to your administrator</Link>
              </p>
            </form>
          </div>
        </div>

        <footer className="p-6 text-center text-[11px] text-subtle-foreground border-t border-border">
          © 2026 MYHOTEL · v0.1 · <Link href="#" className="hover:text-foreground">Privacy</Link> · <Link href="#" className="hover:text-foreground">Terms</Link>
        </footer>
      </div>
    </div>
  );
}
