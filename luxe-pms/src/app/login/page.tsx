"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle,
  Mail, Lock, BarChart3, Users, User,
} from "lucide-react";
import { login, getToken } from "@/lib/api";
import { Logo } from "@/components/logo";
import { setRole, isRole, ROLE_HOME, type Role } from "@/lib/auth";

// All demo roles share the one demo account for the API token; the selected
// access level is a client-side overlay that decides nav + landing page.
const DEMO_EMAIL = "admin@hotel.com";
const DEMO_PASSWORD = "password123";

const ROLE_TABS: { role: Role; label: string; Icon: React.ElementType }[] = [
  { role: "manager", label: "Manager", Icon: BarChart3 },
  { role: "staff", label: "Staff", Icon: Users },
  { role: "guest", label: "Guest", Icon: User },
];

// Shared palette for the luxury resort treatment (independent of app theme).
const GOLD = "#E6B84B";
const C = {
  surface: "rgba(8,18,35,.92)",
  sunken: "rgba(5,13,26,.85)",
  border: "rgba(220,225,235,.18)",
  borderStrong: "rgba(220,225,235,.32)",
  text: "#F4F1EA",
  muted: "#C2CBDA",
  subtle: "#8C99AE",
};

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = React.useState(false);
  const [email, setEmail] = React.useState(DEMO_EMAIL);
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [needCode, setNeedCode] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [role, setSelRole] = React.useState<Role>("manager");
  const [greeting, setGreeting] = React.useState("Welcome back");

  const bokehRef = React.useRef<HTMLCanvasElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Sign in as a role using the shared demo account, then route to its home.
  const loginAs = React.useCallback(async (r: Role) => {
    setError(null);
    setLoading(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      setRole(r);
      router.replace(ROLE_HOME[r]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }, [router]);

  // On open: `?as=role` (from a scanned QR / shared link) auto-signs in as that
  // role. Otherwise an existing session skips the form.
  React.useEffect(() => {
    const as = new URLSearchParams(window.location.search).get("as");
    if (isRole(as)) { loginAs(as); return; }
    if (getToken()) router.replace("/dashboard");
  }, [router, loginAs]);

  // Time-aware concierge greeting (client-only to avoid hydration mismatch).
  React.useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

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
      setRole(role); // chosen access level decides nav + landing page
      router.replace(ROLE_HOME[role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  // ---------- golden light bokeh (warm hotel ambiance) ----------
  React.useEffect(() => {
    const cv = bokehRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0;
    type Mote = { x: number; y: number; r: number; sp: number; drift: number; a: number; ph: number };
    let motes: Mote[] = [];
    const spawn = (init: boolean): Mote => ({
      x: Math.random() * W,
      y: init ? Math.random() * H : H + 20,
      r: Math.random() * 26 + 6,
      sp: Math.random() * 0.5 + 0.15,
      drift: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.35 + 0.08,
      ph: Math.random() * Math.PI * 2,
    });
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: Math.min(46, Math.floor(W / 30)) }, () => spawn(true));
    };
    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const m of motes) {
        if (!reduce) { m.y -= m.sp; m.x += m.drift; }
        if (m.y + m.r < 0) Object.assign(m, spawn(false));
        const tw = 0.6 + 0.4 * Math.sin(t * 0.001 + m.ph);
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        g.addColorStop(0, `rgba(245,220,150,${m.a * tw})`);
        g.addColorStop(0.4, `rgba(230,184,75,${m.a * tw * 0.5})`);
        g.addColorStop(1, "rgba(230,184,75,0)");
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fillStyle = g; ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    window.addEventListener("resize", size);
    size();
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); };
  }, []);

  // ---------- card 3D parallax tilt ----------
  React.useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, rx = 0, ry = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      ry += (tx * 6 - ry) * 0.08;
      rx += (-ty * 5 - rx) * 0.08;
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, []);

  const tz = (z: number): React.CSSProperties => ({ transform: `translateZ(${z}px)` });

  return (
    <div className="relative min-h-svh overflow-hidden font-sans" style={{ background: "#04101F", color: C.text }}>
      {/* resort backdrop with slow cinematic zoom */}
      <div
        className="login-kenburns absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/login-bg.jpg)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(4,12,26,.82) 0%, rgba(4,12,26,.55) 42%, transparent 70%), linear-gradient(0deg, rgba(4,12,26,.82), transparent 55%)",
        }}
      />
      <canvas ref={bokehRef} className="pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex min-h-svh flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between px-6 py-6 sm:px-11">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl shadow-lg">
              <Logo />
            </span>
            <div>
              <div className="text-[18px] font-extrabold tracking-[0.06em]">
                MY<span className="font-semibold" style={{ color: GOLD }}>HOTEL</span>
              </div>
              <div className="mt-px text-[9.5px] uppercase tracking-[0.28em]" style={{ color: "#B9C2D2" }}>
                Hospitality OS
              </div>
            </div>
          </div>
        </div>

        {/* main split */}
        <div
          className="mx-auto grid w-full max-w-[1340px] flex-1 items-center gap-10 px-6 pb-11 sm:px-14 lg:grid-cols-[1.1fr_.9fr]"
          style={{ perspective: 1500 }}
        >
          {/* hero (hidden on small screens) */}
          <section className="hidden lg:block">
            <div
              className="mb-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur"
              style={{ border: `1px solid ${C.border}`, background: "rgba(10,22,42,.4)", color: GOLD }}
            >
              <span className="h-[7px] w-[7px] rounded-full bg-[#43d17f]" style={{ boxShadow: "0 0 0 4px rgba(67,209,127,.18)" }} />
              Now serving · The Pearl Marina
            </div>
            <h1
              className="font-display max-w-[14ch] text-[60px] font-medium leading-[1.04] tracking-[-0.02em]"
              style={{ color: "#F8F5EF", textShadow: "0 2px 30px rgba(0,0,0,.4)" }}
            >
              Run your property like a <em className="italic" style={{ color: GOLD }}>flagship resort</em>.
            </h1>
            <p className="mt-5 max-w-[42ch] text-[16px] leading-[1.65]" style={{ color: "#D5DCE8" }}>
              Reservations, front desk, housekeeping and payments — orchestrated in real time, so every guest feels like the only guest.
            </p>
            <div className="mt-10 flex">
              {[
                { v: <>&lt; <b style={{ color: GOLD }}>30</b>s</>, k: "Check-in" },
                { v: <><b style={{ color: GOLD }}>24</b>/7</>, k: "Night audit" },
                { v: <><b style={{ color: GOLD }}>12</b>+</>, k: "Properties" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="pr-[34px] mr-[34px] last:mr-0 last:border-0 last:pr-0"
                  style={{ borderRight: `1px solid ${C.border}` }}
                >
                  <div className="text-[30px] font-extrabold tracking-[-0.02em]" style={{ color: "#F8F5EF" }}>{s.v}</div>
                  <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "#A9B4C6" }}>{s.k}</div>
                </div>
              ))}
            </div>
          </section>

          {/* card */}
          <div className="login-rise w-full max-w-[440px] justify-self-center lg:justify-self-end">
            <section
              ref={cardRef}
              className="relative rounded-[26px] px-[34px] pb-[30px] pt-[34px] backdrop-blur-2xl"
              style={{
                border: `1px solid ${C.borderStrong}`,
                background: C.surface,
                boxShadow: "0 1px 0 rgba(255,255,255,.12) inset, 0 50px 100px -40px rgba(0,0,0,.85)",
                transformStyle: "preserve-3d",
              }}
            >
              {/* gold gradient hairline frame */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[26px]"
                style={{
                  padding: 1,
                  background:
                    "linear-gradient(140deg, rgba(230,184,75,.7), rgba(230,184,75,0) 38%, rgba(230,184,75,0) 70%, rgba(230,184,75,.35))",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />

              {/* property crest */}
              <div className="login-fade mb-5 flex items-center gap-3" style={{ ...tz(20), animationDelay: ".12s" }}>
                <div className="grid h-[46px] w-[46px] place-items-center overflow-hidden rounded-[13px]" style={{ border: "1px solid rgba(230,184,75,.4)" }}>
                  <Logo />
                </div>
                <div className="leading-tight">
                  <div className="text-[14px] font-bold" style={{ color: C.text }}>The Pearl Marina</div>
                  <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: C.muted }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#43d17f]" style={{ boxShadow: "0 0 0 3px rgba(67,209,127,.2)" }} />
                    Front desk · online
                  </div>
                </div>
              </div>

              <h2 className="login-fade text-[26px] font-bold tracking-[-0.02em]" style={{ ...tz(46), animationDelay: ".18s", color: C.text }}>
                {greeting}
              </h2>
              <p className="login-fade mt-1.5 mb-6 text-[13.5px]" style={{ animationDelay: ".24s", color: C.muted }}>
                Sign in to continue to <b style={{ color: C.text }}>The Pearl Marina</b>.
              </p>

              <form onSubmit={onSubmit}>
                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ border: "1px solid rgba(225,29,72,.4)", background: "rgba(225,29,72,.12)", color: "#fda4b4" }}>
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* access level tabs */}
                <div className="login-fade" style={{ ...tz(40), animationDelay: ".28s" }}>
                  <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.subtle }}>
                    Access level
                  </div>
                  <div className="mb-[22px] grid grid-cols-3 gap-1 rounded-[13px] p-1" style={{ border: `1px solid ${C.border}`, background: C.sunken }}>
                    {ROLE_TABS.map(({ role: r, label, Icon }) => {
                      const active = r === role;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelRole(r)}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-semibold transition"
                          style={
                            active
                              ? { background: "linear-gradient(135deg,#F0CB67,#C38A1E)", color: "#07142A", boxShadow: "0 8px 20px -8px rgba(195,138,30,.6), inset 0 1px 0 rgba(255,255,255,.4)" }
                              : { background: "transparent", color: C.muted }
                          }
                        >
                          <Icon className="h-[15px] w-[15px]" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* email */}
                <div className="login-fade mb-4" style={{ ...tz(26), animationDelay: ".34s" }}>
                  <label htmlFor="email" className="mb-2 block text-[13px] font-semibold" style={{ color: C.text }}>Email or username</label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors group-focus-within:text-[#E6B84B]" style={{ color: C.subtle }} />
                    <input
                      id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required
                      className="h-[52px] w-full rounded-[14px] px-11 text-[14.5px] outline-none transition"
                      style={{ border: `1px solid ${C.border}`, background: C.sunken, color: C.text, boxShadow: "inset 0 1px 2px rgba(0,0,0,.18)" }}
                    />
                  </div>
                </div>

                {/* password */}
                <div className="login-fade mb-4" style={{ ...tz(26), animationDelay: ".40s" }}>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="mb-2 block text-[13px] font-semibold" style={{ color: C.text }}>Password</label>
                    <Link href="#" className="text-[12.5px] font-semibold hover:underline" style={{ color: GOLD }}>Forgot password?</Link>
                  </div>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors group-focus-within:text-[#E6B84B]" style={{ color: C.subtle }} />
                    <input
                      id="password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required
                      placeholder="••••••••••"
                      className="h-[52px] w-full rounded-[14px] px-11 text-[14.5px] outline-none transition"
                      style={{ border: `1px solid ${C.border}`, background: C.sunken, color: C.text, boxShadow: "inset 0 1px 2px rgba(0,0,0,.18)" }}
                    />
                    <button
                      type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 grid h-[34px] w-[34px] -translate-y-1/2 place-items-center rounded-[9px] hover:bg-white/10"
                      style={{ color: C.muted }}
                    >
                      {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                {/* 2FA code (only when required) */}
                {needCode && (
                  <div className="mb-4">
                    <label htmlFor="twofa" className="mb-2 block text-[13px] font-semibold" style={{ color: C.text }}>Authenticator code</label>
                    <input
                      id="twofa" inputMode="numeric" value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000" autoFocus
                      className="h-[52px] w-full rounded-[14px] text-center font-mono text-lg tracking-[0.3em] outline-none transition"
                      style={{ border: `1px solid ${C.border}`, background: C.sunken, color: C.text }}
                    />
                    <p className="mt-1.5 text-[11px]" style={{ color: C.subtle }}>Enter the 6-digit code from your authenticator app.</p>
                  </div>
                )}

                {/* remember */}
                <div className="login-fade my-[18px] flex items-center text-[13px]" style={{ animationDelay: ".46s" }}>
                  <label className="flex cursor-pointer items-center gap-2.5" style={{ color: C.muted }}>
                    <input type="checkbox" defaultChecked className="h-4 w-4" style={{ accentColor: GOLD }} />
                    Remember this device
                  </label>
                </div>

                {/* sign in */}
                <button
                  type="submit"
                  disabled={loading || (needCode && code.length !== 6)}
                  className="login-fade login-sheen relative inline-flex h-[52px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[14px] text-[15px] font-bold text-[#07142A] transition disabled:opacity-60"
                  style={{ ...tz(52), animationDelay: ".52s", background: "linear-gradient(135deg,#F0CB67,#C38A1E)", boxShadow: "0 16px 34px -12px rgba(195,138,30,.7)" }}
                >
                  {loading ? "Signing in…" : needCode ? "Verify & sign in" : "Sign in"}
                  {!loading && <ArrowRight className="h-[18px] w-[18px]" />}
                </button>

                <p className="login-fade mt-4 text-center text-[11.5px]" style={{ animationDelay: ".58s", color: C.muted }}>
                  Demo — <code className="rounded-md px-1.5 py-0.5 font-mono" style={{ background: C.sunken, color: C.text }}>admin@hotel.com</code> / <code className="rounded-md px-1.5 py-0.5 font-mono" style={{ background: C.sunken, color: C.text }}>password123</code>
                </p>

                {/* enterprise trust footer */}
                <div className="mt-[22px] flex flex-wrap items-center justify-center gap-3.5 border-t pt-[18px] text-[10.5px] tracking-[0.04em]" style={{ borderColor: C.border, color: C.subtle }}>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 opacity-80" /> Encrypted at rest</span>
                  <span className="h-[3px] w-[3px] rounded-full bg-current opacity-50" />
                  <span>SOC 2</span>
                  <span className="h-[3px] w-[3px] rounded-full bg-current opacity-50" />
                  <span>ISO 27001 ready</span>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
