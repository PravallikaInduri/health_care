import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Pill,
  ArrowRight,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import { registerPharmacyAccount } from "../../api/pharmacy.api";

const PharmacyRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await registerPharmacyAccount({
        email: form.email,
        password: form.password,
        name: form.name || undefined,
      });
      toast.success("Pharmacy account created — please log in");
      navigate("/login");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to register pharmacy account"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 flex justify-center items-center">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Pill />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Pharmacy Registration
            </h1>
            <p className="text-sm text-slate-500">
              Create an internal pharmacy staff account.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">
              Pharmacy / Staff Name (optional)
            </label>
            <div className="mt-1 relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g. City Hospital Pharmacy"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">
              Email
            </label>
            <div className="mt-1 relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="pharmacy@example.com"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">
              Password
            </label>
            <div className="mt-1 relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">
              Confirm Password
            </label>
            <div className="mt-1 relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.confirm}
                onChange={(e) =>
                  setForm({ ...form, confirm: e.target.value })
                }
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-600 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PharmacyRegister;
