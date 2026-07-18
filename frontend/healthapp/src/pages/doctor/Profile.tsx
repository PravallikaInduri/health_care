import { useEffect, useRef, useState } from "react";
import { Upload, Stethoscope, Globe, FileText, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import {
  getDoctorProfile,
  updateDoctorProfile,
} from "../../api/doctor.api";
import type { DoctorProfile } from "../../types/doctor";
import { fileToThumbnailDataUrl } from "../../utils/image";
import { formatDoctorName } from "../../utils/doctorName";
import SecuritySettings from "../../components/account/SecuritySettings";

/* ── helpers ── */
const parseLanguages = (value: DoctorProfile["languages"]): string => {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  try {
    const parsed = JSON.parse(value as unknown as string);
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
};

const verificationStyle = (status?: string | null) => {
  const s = String(status ?? "").toUpperCase();
  if (s === "APPROVED") return { bg: "#D1FAE5", color: "#059669" };
  if (s === "REJECTED") return { bg: "#FEE2E2", color: "#DC2626" };
  return { bg: "#FEF3C7", color: "#D97706" };
};

/* ── compact input style ── */
const inputCls =
  "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition disabled:bg-slate-50 disabled:text-slate-500";

/* ================================================================ */

const DoctorProfilePage = () => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [languagesText, setLanguagesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const data = await getDoctorProfile();
      setProfile(data);
      setLanguagesText(parseLanguages(data.languages));
    } catch {
      toast.error("Failed to load profile");
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
      await updateDoctorProfile({
        name: profile.name,
        specialty: profile.specialty,
        bio: profile.bio,
        photo_url: profile.photo_url,
        accepting_new: profile.accepting_new,
        languages: languagesText
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean) as unknown as string[],
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  /* ── loading / error ── */
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
      <div className="text-center py-10 text-sm text-slate-500">
        Failed to load profile.
      </div>
    );
  }

  const displayName = formatDoctorName(profile.name);
  const avatarUrl =
    profile.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0EA5E9&color=fff&size=80`;

  const vStyle = verificationStyle(profile.verification_status);

  /* ── render ── */
  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── Identity card ─────────────────────────────────────────── */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar with upload overlay */}
          <div className="relative flex-shrink-0">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-[80px] h-[80px] rounded-xl object-cover"
              style={{ border: "2px solid #E2E8F0" }}
            />
            <button
              type="button"
              onClick={handleChooseImage}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full text-white flex items-center justify-center shadow transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
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
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 truncate">{displayName}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profile.specialty || "General Practice"}
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={vStyle}
              >
                <UserCheck size={10} />
                {profile.verification_status || "PENDING"}
              </span>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {profile.npi_or_mci && (
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: "#EFF6FF", color: "#0284C7", border: "1px solid #BFDBFE" }}
                >
                  NPI/MCI: {profile.npi_or_mci}
                </span>
              )}
              {profile.accepting_new !== undefined && (
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                  style={
                    profile.accepting_new
                      ? { backgroundColor: "#D1FAE5", color: "#059669" }
                      : { backgroundColor: "#FEE2E2", color: "#DC2626" }
                  }
                >
                  {profile.accepting_new ? "Accepting new patients" : "Not accepting new patients"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit form ─────────────────────────────────────────────── */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
          >
            <Stethoscope size={14} />
          </div>
          <p className="text-sm font-semibold text-slate-800">Professional Information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name + Specialty */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={inputCls}
                placeholder="Dr. Full Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Specialty</label>
              <input
                value={profile.specialty || ""}
                onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                className={inputCls}
                placeholder="e.g. Cardiology"
              />
            </div>
          </div>

          {/* Row 2: NPI/MCI + Languages */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                NPI / MCI Number
              </label>
              <input
                value={profile.npi_or_mci || ""}
                disabled
                className={inputCls}
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Globe size={11} /> Languages (comma separated)
                </span>
              </label>
              <input
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                className={inputCls}
                placeholder="English, Hindi, Telugu"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              <span className="inline-flex items-center gap-1">
                <FileText size={11} /> Bio
              </span>
            </label>
            <textarea
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              className={inputCls}
              style={{ resize: "vertical" }}
              placeholder="Brief professional bio…"
            />
          </div>

          {/* Accepting new patients toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              id="accepting_new"
              type="checkbox"
              checked={!!profile.accepting_new}
              onChange={(e) => setProfile({ ...profile, accepting_new: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
              style={{ accentColor: "#0EA5E9" }}
            />
            <span className="text-sm text-slate-600">Accepting new patients</span>
          </label>

          {/* Save */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
              style={{
                background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
                boxShadow: "0 4px 12px rgba(14,165,233,0.25)",
              }}
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Account security ─────────────────────────────────────── */}
      <SecuritySettings />
    </div>
  );
};

export default DoctorProfilePage;
