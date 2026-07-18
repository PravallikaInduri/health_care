import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  HeartPulse,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import { loginUser, verifyLogin2FA } from "../../api/auth.api";
import { setAuth } from "../../utils/auth";

const Login = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  /* Two-factor step state */
  const [twoFA, setTwoFA] = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState("");
  const [code, setCode] = useState("");

  const goToPortal = (role: string) => {
    if (role === "ADMIN") return navigate("/admin");
    if (role === "PROVIDER") return navigate("/doctor/dashboard");
    if (role === "PHARMACY") return navigate("/pharmacy/dashboard");
    if (role === "HOSPITAL_ADMIN") return navigate("/hospital/dashboard");
    if (role === "LAB_TECH" || role === "LAB_ADMIN") return navigate("/lab/dashboard");
    return navigate("/patient/dashboard");
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await loginUser({
        email: formData.email,
        password: formData.password,
      });

      /* Server paused the login for a one-time email code. */
      if (response.data?.requires2FA) {
        setTwoFAEmail(response.data.email || formData.email);
        setTwoFA(true);
        toast.success("We emailed you a verification code.");
        return;
      }

      const { accessToken, refreshToken, role } = response.data;

      setAuth({
        token: accessToken,
        role,
        refreshToken,
      });

      goToPortal(role);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Invalid credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      await loginUser({
        email: formData.email,
        password: formData.password,
      });
      setCode("");
      toast.success("A new code has been sent to your email.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Couldn't resend the code"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await verifyLogin2FA(twoFAEmail, code);
      const { accessToken, refreshToken, role } = response.data;

      setAuth({
        token: accessToken,
        role,
        refreshToken,
      });

      goToPortal(role);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Invalid code"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ backgroundColor: "#EFF6FF" }}
    >
      {/* ── Healthcare SVG background pattern ────────────────────────
          Subtle medical-themed decorative layer.
          Opacity is intentionally very low so the card stays dominant.
      ─────────────────────────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.045 }}
      >
        <defs>
          {/* medical cross tile */}
          <pattern id="hc-cross" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* vertical bar */}
            <rect x="35" y="24" width="10" height="32" rx="3" fill="#0284C7" />
            {/* horizontal bar */}
            <rect x="24" y="35" width="32" height="10" rx="3" fill="#0284C7" />
          </pattern>
          {/* circle dots */}
          <pattern id="hc-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="#0EA5E9" />
          </pattern>
        </defs>
        {/* cross grid covers the whole viewport */}
        <rect width="100%" height="100%" fill="url(#hc-cross)" />
        {/* dot overlay — offset so crosses and dots interleave */}
        <rect x="40" y="40" width="100%" height="100%" fill="url(#hc-dots)" />
      </svg>

      {/* ── Soft radial glow behind the card ─────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(224,242,254,0.95) 0%, rgba(239,246,255,0.70) 55%, transparent 100%)",
        }}
      />

      {/* ── Decorative corner blobs ───────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(2,132,199,0.10) 0%, transparent 70%)",
        }}
      />
      {/* top-right accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-10 w-48 h-48 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── Heartbeat SVG line — bottom decorative strip ─────────── */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{ opacity: 0.12, height: "60px" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          points="0,30 180,30 210,10 240,50 270,20 300,40 330,30 520,30 550,5 575,55 600,25 625,45 650,30 840,30 870,12 900,48 930,18 960,42 990,30 1200,30 1230,8 1260,52 1290,22 1320,38 1350,30 1440,30"
          fill="none"
          stroke="#0284C7"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* ── The login card (unchanged) ───────────────────────────── */}
      <div className="w-full max-w-[460px] relative z-10">
        {/* =========================================================
            Brand mark — small healthcare illustration above the card
            ========================================================= */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="
              relative w-14 h-14 rounded-2xl
              flex items-center justify-center
              shadow-lg
            "
            style={{
              background:
                "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
              boxShadow: "0 10px 25px rgba(14, 165, 233, 0.25)",
            }}
          >
            <HeartPulse size={26} className="text-white" />
          </div>
          <p
            className="mt-3 text-[11px] tracking-[0.32em] font-semibold"
            style={{ color: "#0F172A" }}
          >
            MEDICONNECT
          </p>
        </div>

        {/* =========================================================
            Login card
            ========================================================= */}
        <div
          className="rounded-3xl p-8 sm:p-10"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 50px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div className="mb-7">
            <h1
              className="text-[26px] sm:text-[28px] font-semibold tracking-tight leading-tight"
              style={{ color: "#0F172A" }}
            >
              {twoFA ? "Verify it's you" : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {twoFA
                ? `Enter the 6-digit code we sent to ${twoFAEmail}.`
                : "Access your healthcare portal securely."}
            </p>
          </div>

          {twoFA && (
            <form onSubmit={handleVerify2FA} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="code"
                  className="block text-[13px] font-medium mb-1.5"
                  style={{ color: "#0F172A" }}
                >
                  Verification code
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="------"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, ""))
                  }
                  required
                  className="auth-input w-full px-3 py-3 rounded-xl text-center text-lg tracking-[0.5em] bg-white text-slate-900 placeholder:text-slate-300 outline-none transition"
                  style={{ border: "1px solid #E2E8F0" }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="group w-full mt-1 py-2.5 px-4 rounded-xl text-white font-semibold text-[14px] inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#0EA5E9",
                  boxShadow: "0 6px 16px rgba(14, 165, 233, 0.25)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify &amp; sign in
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTwoFA(false);
                    setCode("");
                  }}
                  className="text-[12.5px] font-medium text-slate-500 hover:text-slate-700 transition"
                >
                  Back to sign in
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-[12.5px] font-semibold transition disabled:opacity-50"
                  style={{ color: "#0284C7" }}
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {!twoFA && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  required
                  className="
                    auth-input
                    w-full pl-10 pr-3 py-2.5 rounded-xl
                    text-sm
                    bg-white text-slate-900 placeholder:text-slate-400
                    outline-none transition
                  "
                  style={{ border: "1px solid #E2E8F0" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  required
                  className="
                    auth-input
                    w-full pl-10 pr-10 py-2.5 rounded-xl
                    text-sm
                    bg-white text-slate-900 placeholder:text-slate-400
                    outline-none transition
                  "
                  style={{ border: "1px solid #E2E8F0" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-[12.5px] font-medium transition"
                  style={{ color: "#0284C7" }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Remember me */}
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
                style={{ accentColor: "#0EA5E9" }}
              />
              Remember me for 30 days
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                group w-full mt-3 py-2.5 px-4 rounded-xl
                text-white font-semibold text-[14px]
                inline-flex items-center justify-center gap-2
                transition-colors duration-200
                disabled:opacity-70 disabled:cursor-not-allowed
              "
              style={{
                backgroundColor: "#0EA5E9",
                boxShadow: "0 6px 16px rgba(14, 165, 233, 0.25)",
              }}
              onMouseEnter={(e) =>
                !loading &&
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#0284C7")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#0EA5E9")
              }
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </>
              )}
            </button>
          </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span
                className="w-full"
                style={{ borderTop: "1px solid #E2E8F0" }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-[11px] uppercase tracking-[0.2em] font-semibold"
                style={{ backgroundColor: "#FFFFFF", color: "#94A3B8" }}
              >
                or
              </span>
            </div>
          </div>

          {/* Create account */}
          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold hover:underline"
              style={{ color: "#0284C7" }}
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[11.5px] text-slate-400 mt-6 leading-relaxed">
          By signing in you agree to our{" "}
          <a
            href="#"
            className="hover:underline"
            style={{ color: "#0F172A" }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="hover:underline"
            style={{ color: "#0F172A" }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* Scoped styles — focus ring on auth inputs matches the spec */}
      <style>{`
        .auth-input:focus {
          border-color: #0EA5E9 !important;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.15);
        }
      `}</style>
    </div>
  );
};

export default Login;
