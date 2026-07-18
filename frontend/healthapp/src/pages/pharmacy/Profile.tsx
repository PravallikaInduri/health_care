import { useEffect, useState } from "react";
import { Mail, ShieldCheck, User } from "lucide-react";
import toast from "react-hot-toast";

import {
  getPharmacyMe,
  type PharmacyMe,
} from "../../api/pharmacy.api";
import SecuritySettings from "../../components/account/SecuritySettings";

const PharmacyProfile = () => {
  const [me, setMe] = useState<PharmacyMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getPharmacyMe();
        if (alive) setMe(res.data.data);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message ||
            "Failed to load profile"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-rose-500">
        Profile unavailable.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-400" />
        <div className="px-8 pb-10 -mt-12">
          <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center text-blue-600">
            <User size={40} />
          </div>
          <h1 className="text-2xl font-bold mt-4">
            Pharmacy Account
          </h1>
          <p className="text-slate-500">
            Internal staff account.
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-slate-400" />
              <div>
                <dt className="text-slate-400 text-xs uppercase">
                  Email
                </dt>
                <dd className="font-medium text-slate-800">
                  {me.email}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={18}
                className="text-emerald-500"
              />
              <div>
                <dt className="text-slate-400 text-xs uppercase">
                  Role
                </dt>
                <dd className="font-medium text-slate-800">
                  {me.role}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={18}
                className="text-blue-500"
              />
              <div>
                <dt className="text-slate-400 text-xs uppercase">
                  Status
                </dt>
                <dd className="font-medium text-slate-800">
                  {me.is_active ? "Active" : "Inactive"} ·{" "}
                  {me.approval_status || "—"}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Account security ─────────────────────────────────────── */}
      <SecuritySettings />
    </div>
  );
};

export default PharmacyProfile;
