import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Stethoscope,
  IndianRupee,
  Pencil,
  X,
  Video,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getHospitalDoctors,
  updateHospitalDoctorFee,
  type HospitalDoctor,
} from "../../api/hospital.api";

const Doctors = () => {
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<HospitalDoctor | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [videoFeeInput, setVideoFeeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await getHospitalDoctors();
      setDoctors(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (d: HospitalDoctor) => {
    setEditing(d);
    setFeeInput(
      d.consultation_fee != null ? String(Number(d.consultation_fee)) : ""
    );
    setVideoFeeInput(
      d.video_consultation_fee != null
        ? String(Number(d.video_consultation_fee))
        : ""
    );
  };

  const saveFee = async () => {
    if (!editing) return;
    const fee = Number(feeInput);
    const videoFee = Number(videoFeeInput);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Enter a valid in-person fee");
      return;
    }
    if (!Number.isFinite(videoFee) || videoFee < 0) {
      toast.error("Enter a valid video fee");
      return;
    }
    try {
      setSaving(true);
      await updateHospitalDoctorFee(editing.id, {
        consultation_fee: fee,
        video_consultation_fee: videoFee,
      });
      toast.success("Consultation fees updated");
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === editing.id
            ? {
                ...d,
                consultation_fee: fee,
                video_consultation_fee: videoFee,
              }
            : d
        )
      );
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update fees");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter(
      (d) =>
        d.name?.toLowerCase().includes(term) ||
        d.specialty?.toLowerCase().includes(term) ||
        d.email?.toLowerCase().includes(term)
    );
  }, [doctors, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Doctors</h1>
        <p className="text-slate-500 mt-1">
          Doctors practising at your hospital. Set each doctor's
          consultation fee shown to patients during booking.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-3 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search doctors..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-slate-400">
          No doctors found for your hospital.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Stethoscope size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{d.name}</h3>
                  <p className="text-sm text-slate-500 truncate">
                    {d.specialty || "General"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3 truncate">
                {d.email}
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <User size={13} /> In-person
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-0.5">
                    <IndianRupee size={13} />
                    {Number(d.consultation_fee ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Video size={13} /> Video
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-0.5">
                    <IndianRupee size={13} />
                    {Number(
                      d.video_consultation_fee ?? d.consultation_fee ?? 0
                    ).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => openEdit(d)}
                  className="mt-1 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  <Pencil size={14} />
                  Edit Fees
                </button>
              </div>

              {d.verification_status && (
                <span
                  className={`inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full ${
                    d.verification_status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {d.verification_status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                Consultation Fee
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="font-medium text-slate-800">{editing.name}</p>
                <p className="text-sm text-slate-500">
                  {editing.specialty || "General"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                  <User size={14} /> In-person fee (₹)
                </label>
                <div className="relative">
                  <IndianRupee
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                  <Video size={14} /> Video consultation fee (₹)
                </label>
                <div className="relative">
                  <IndianRupee
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={videoFeeInput}
                    onChange={(e) => setVideoFeeInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Patients are shown the fee for the consultation type they
                  pick, and charged that amount at payment.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFee}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Fee"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
