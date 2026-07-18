import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, Trash2, Building2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  createFacility,
  updateFacility,
  type AdminFacility,
  type FacilityType,
} from "../../api/admin.api";
import { fileToThumbnailDataUrl } from "../../utils/image";

const TYPES: FacilityType[] = ["HOSPITAL", "CLINIC", "LAB"];

interface Props {
  open: boolean;
  facility?: AdminFacility | null;
  onClose: () => void;
  onSaved: () => void;
}

const FacilityFormModal = ({
  open,
  facility,
  onClose,
  onSaved,
}: Props) => {
  const isEdit = !!facility;

  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("HOSPITAL");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(facility?.name ?? "");
    setType((facility?.type as FacilityType) ?? "HOSPITAL");
    setAddress(facility?.address ?? "");
    setPhone(facility?.phone ?? "");
    setLogoUrl(facility?.logo_url ?? null);
  }, [open, facility]);

  if (!open) return null;

  const handleChooseImage = () => fileInputRef.current?.click();

  const handleImageSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5 MB)");
      return;
    }

    try {
      const dataUrl = await fileToThumbnailDataUrl(file);
      setLogoUrl(dataUrl);
      toast.success("Image ready — click Save to apply");
    } catch (err: any) {
      toast.error(err.message || "Could not read image");
    }
  };

  const removeImage = () => setLogoUrl(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Facility name is required");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        type,
        address: address.trim() || null,
        phone: phone.trim() || null,
        /* Always send logo_url so the backend knows whether to set / clear it. */
        logo_url: logoUrl,
      };

      if (isEdit && facility) {
        await updateFacility(facility.id, payload);
        toast.success("Facility updated");
      } else {
        await createFacility(payload);
        toast.success("Facility created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to save facility"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-800">
            {isEdit ? "Edit Facility" : "Add Facility"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* ---------- Logo ---------- */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Facility Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Facility logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2
                    size={32}
                    className="text-slate-300"
                  />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={handleChooseImage}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700"
                >
                  <ImagePlus size={16} />
                  {logoUrl ? "Change Image" : "Choose Image"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-sm font-medium text-rose-600"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
                <p className="text-xs text-slate-400">
                  PNG, JPG up to 5 MB. Auto-resized to 256×256.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelected}
                className="hidden"
              />
            </div>
          </div>

          {/* ---------- Basics ---------- */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Facility Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Apollo Hospital"
              maxLength={255}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Facility Type
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as FacilityType)
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street, City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="9876543210"
              maxLength={20}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacilityFormModal;
