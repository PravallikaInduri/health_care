import { useState } from "react";
import { KeyRound, ShieldCheck, Loader2, Lock } from "lucide-react";
import toast from "react-hot-toast";

import { changePassword } from "../../api/auth.api";

/**
 * Reusable account-security panel shared by every portal profile
 * (patient, doctor, pharmacy, lab). Provides:
 *   1. Change password (requires current password)
 *   2. Two-factor authentication status — always on, an emailed code is
 *      required on every sign-in (mandatory, no opt-out).
 */
const SecuritySettings = () => {
  const [pwd, setPwd] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPwd, setSavingPwd] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwd.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      setSavingPwd(true);
      await changePassword({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      toast.success("Password updated successfully");
      setPwd({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to change password"
      );
    } finally {
      setSavingPwd(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* ── Change password ── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Change password
            </h3>
            <p className="text-xs text-slate-500">
              Use a strong password you don&apos;t reuse elsewhere.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={pwd.currentPassword}
            onChange={(e) =>
              setPwd({ ...pwd, currentPassword: e.target.value })
            }
            required
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 8 characters)"
            value={pwd.newPassword}
            onChange={(e) =>
              setPwd({ ...pwd, newPassword: e.target.value })
            }
            required
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={pwd.confirmPassword}
            onChange={(e) =>
              setPwd({ ...pwd, confirmPassword: e.target.value })
            }
            required
            className={inputClass}
          />
          <button
            type="submit"
            disabled={savingPwd}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            {savingPwd ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Updating…
              </>
            ) : (
              <>
                <Lock size={15} /> Update password
              </>
            )}
          </button>
        </form>
      </section>

      {/* ── Two-factor authentication (always on) ── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Two-factor authentication
            </h3>
            <p className="text-xs text-slate-500">
              Protects every sign-in with an emailed code.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Always on
        </div>

        <p className="mt-4 text-sm text-slate-500 leading-relaxed">
          For your security, two-factor authentication is required for every
          account. Each time you sign in, we email a one-time 6-digit code to{" "}
          your registered address — you&apos;ll need to enter it to finish
          logging in. This cannot be turned off.
        </p>
      </section>
    </div>
  );
};

export default SecuritySettings;
