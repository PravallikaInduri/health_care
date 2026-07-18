import { useEffect, useRef, useState } from "react";
import { Upload, Copy, Check, User } from "lucide-react";
import toast from "react-hot-toast";
import {
  getPatientProfile,
  updatePatientProfile,
} from "../../api/patient.api";
import { fileToThumbnailDataUrl } from "../../utils/image";
import SecuritySettings from "../../components/account/SecuritySettings";

interface PatientProfile {
  id: string;
  user_id: string;
  mrn: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  photo_url: string;
}

/* ── shared input style ── */
const inputCls =
  "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition disabled:bg-slate-50 disabled:text-slate-500";

const Profile = () => {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mrnCopied, setMrnCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyMrn = async () => {
    if (!profile?.mrn) return;
    try {
      await navigator.clipboard.writeText(profile.mrn);
      setMrnCopied(true);
      toast.success("MRN copied");
      setTimeout(() => setMrnCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  };

  const handleChooseImage = () => fileInputRef.current?.click();

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5 MB)");
      return;
    }
    try {
      const dataUrl = await fileToThumbnailDataUrl(file);
      setProfile({ ...profile, photo_url: dataUrl });
      toast.success("Image ready — click Save to apply");
    } catch (err: any) {
      toast.error(err.message || "Could not read image");
    }
  };

  const loadProfile = async () => {
    try {
      const res = await getPatientProfile();
      setProfile(res.data.data);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      await updatePatientProfile({
        phone: profile.phone,
        email: profile.email,
        photo_url: profile.photo_url,
      });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div
          className="w-9 h-9 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: "#BFDBFE", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="max-w-md mx-auto bg-white rounded-2xl p-8 text-center"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <p className="text-sm font-semibold text-slate-700">Profile unavailable</p>
        <p className="text-xs text-slate-400 mt-1">{errorMessage || "Failed to load profile"}</p>
        <button
          onClick={() => { window.location.href = "/login"; }}
          className="mt-5 px-5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
        >
          Sign in
        </button>
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const avatarUrl =
    profile.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0EA5E9&color=fff&size=80`;

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── Compact identity card ───────────────────────────────── */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-16 h-16 rounded-xl object-cover"
              style={{ border: "2px solid #E2E8F0" }}
            />
            <button
              type="button"
              onClick={handleChooseImage}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700 transition shadow"
              title="Change photo"
            >
              <Upload size={11} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelected}
            />
          </div>

          {/* Identity info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-base font-bold text-slate-900">{fullName}</h1>
                <p className="text-xs text-slate-400 mt-0.5">Patient Profile</p>
              </div>
              {profile.mrn && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}
                >
                  <span className="text-[9px] uppercase tracking-wider font-bold text-sky-500">MRN</span>
                  <span className="font-mono">{profile.mrn}</span>
                  <button
                    type="button"
                    onClick={handleCopyMrn}
                    className="ml-0.5 text-sky-500 hover:text-sky-700 transition"
                    title="Copy MRN"
                  >
                    {mrnCopied ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              )}
            </div>

            {/* Quick contact chips */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {profile.email && (
                <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit form ───────────────────────────────────────────── */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
          >
            <User size={14} />
          </div>
          <p className="text-sm font-semibold text-slate-800">Personal Information</p>
        </div>

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          {/* First name (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">First Name</label>
            <input value={profile.first_name} disabled className={inputCls} />
          </div>

          {/* Last name (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Name</label>
            <input value={profile.last_name} disabled className={inputCls} />
          </div>

          {/* Email (editable) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Address</label>
            <input
              type="email"
              autoComplete="email"
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Phone (editable) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone Number</label>
            <input
              type="tel"
              autoComplete="tel"
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Save */}
          <div className="sm:col-span-2 flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
              style={{
                background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
                boxShadow: "0 4px 12px rgba(14,165,233,0.25)",
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* ── MRN info note ───────────────────────────────────────── */}
      {profile.mrn && (
        <div
          className="rounded-xl px-4 py-3 text-xs text-sky-700"
          style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD" }}
        >
          <span className="font-semibold">Your Medical Record Number (MRN): </span>
          Doctors and staff use this to confirm your identity before issuing prescriptions,
          lab orders, or bills. Share it when asked by healthcare staff, but keep it private otherwise.
        </div>
      )}

      {/* ── Account security ─────────────────────────────────────── */}
      <SecuritySettings />
    </div>
  );
};

export default Profile;
