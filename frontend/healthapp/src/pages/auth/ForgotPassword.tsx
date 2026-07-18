import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../../api/auth.api";

type Step = "EMAIL" | "OTP" | "RESET" | "DONE";

const StepDot = ({
  active,
  done,
}: {
  active: boolean;
  done: boolean;
}) => (
  <span
    className={`w-2.5 h-2.5 rounded-full ${
      done
        ? "bg-cyan-300"
        : active
          ? "bg-white"
          : "bg-white/30"
    }`}
  />
);

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }
    try {
      setLoading(true);
      await forgotPassword(email.trim());
      toast.success(
        "If an account exists, a verification code has been sent."
      );
      setStep("OTP");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to send verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 4) {
      toast.error("Enter the verification code");
      return;
    }
    try {
      setLoading(true);
      await verifyResetOtp(email, otp.trim());
      toast.success("Code verified");
      setStep("RESET");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Invalid or expired code"
      );
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      setStep("DONE");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative bg-cover bg-center"
      style={{ backgroundImage: "url('/videos/image.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/60 via-blue-900/50 to-cyan-700/40" />

      <div className="relative z-20 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white/15 backdrop-blur-2xl border border-white/20 rounded-[40px] shadow-2xl p-10">
          {step !== "DONE" && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <StepDot
                active={step === "EMAIL"}
                done={["OTP", "RESET"].includes(step)}
              />
              <StepDot
                active={step === "OTP"}
                done={step === "RESET"}
              />
              <StepDot active={step === "RESET"} done={false} />
            </div>
          )}

          {step === "EMAIL" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white/20 flex items-center justify-center">
                  <Mail size={40} className="text-white" />
                </div>
                <h1 className="mt-6 text-3xl font-bold text-white">
                  Forgot Password
                </h1>
                <p className="mt-3 text-white/80">
                  Enter your email to receive a reset code
                </p>
              </div>
              <form
                onSubmit={submitEmail}
                className="mt-8 space-y-5"
              >
                <div className="relative">
                  <Mail
                    size={20}
                    className="absolute left-4 top-5 text-white/70"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 backdrop-blur-md outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-lg disabled:opacity-70"
                >
                  {loading
                    ? "Sending..."
                    : "Send Verification Code"}
                </button>
              </form>
            </>
          )}

          {step === "OTP" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white/20 flex items-center justify-center">
                  <ShieldCheck
                    size={40}
                    className="text-white"
                  />
                </div>
                <h1 className="mt-6 text-3xl font-bold text-white">
                  Enter Code
                </h1>
                <p className="mt-3 text-white/80">
                  We sent a 6-digit code to
                </p>
                <p className="text-cyan-300 mt-1">
                  {email}
                </p>
              </div>
              <form
                onSubmit={submitOtp}
                className="mt-8 space-y-5"
              >
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(/[^0-9]/g, "")
                    )
                  }
                  placeholder="Enter 6 Digit OTP"
                  className="w-full py-4 text-center text-2xl tracking-[10px] rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-lg disabled:opacity-70"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("EMAIL")}
                  className="w-full text-cyan-300 text-sm flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Use a different
                  email
                </button>
              </form>
            </>
          )}

          {step === "RESET" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white/20 flex items-center justify-center">
                  <Lock size={40} className="text-white" />
                </div>
                <h1 className="mt-6 text-3xl font-bold text-white">
                  New Password
                </h1>
                <p className="mt-3 text-white/80">
                  Choose a strong password — at least 8 characters
                </p>
              </div>
              <form
                onSubmit={submitReset}
                className="mt-8 space-y-5"
              >
                <div className="relative">
                  <Lock
                    size={20}
                    className="absolute left-4 top-5 text-white/70"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    required
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-4 top-4 text-white/70"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={20}
                    className="absolute left-4 top-5 text-white/70"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-lg disabled:opacity-70"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}

          {step === "DONE" && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2
                  size={48}
                  className="text-emerald-300"
                />
              </div>
              <h1 className="mt-6 text-3xl font-bold text-white">
                Password Reset
              </h1>
              <p className="mt-3 text-white/80">
                Your password has been updated successfully.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-lg"
              >
                Continue to Login
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="text-cyan-300 text-sm"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
