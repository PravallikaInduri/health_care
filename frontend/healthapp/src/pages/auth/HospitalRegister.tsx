import {
  Building2,
  Mail,
  Phone,
  Lock,
  MapPin,
  FileText,
  Upload,
  HeartPulse,
  FlaskConical,
  Pill,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerHospital } from "../../api/auth.api";

const inputClass = `
  w-full pl-12 py-4 rounded-2xl bg-white/10
  border border-white/20 text-white placeholder:text-white/60
`;

const HospitalRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [proofDocument, setProofDocument] =
    useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    about: "",
    password: "",
    confirmPassword: "",
    hasLab: false,
    hasPharmacy: false,
  });

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      if (!proofDocument) {
        alert("Please upload a verification document (PDF)");
        return;
      }

      setLoading(true);

      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("phone", formData.phone);
      data.append("address", formData.address);
      data.append("city", formData.city);
      data.append("about", formData.about);
      data.append("has_lab", String(formData.hasLab));
      data.append("has_pharmacy", String(formData.hasPharmacy));
      data.append("proofDocument", proofDocument);

      await registerHospital(data);

      navigate("/verify-otp", {
        state: {
          email: formData.email,
          role: "HOSPITAL",
        },
      });
    } catch (error: any) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          "Hospital Registration Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{
        backgroundImage: "url('/videos/image.png')",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-blue-900/60 to-cyan-700/50" />

      <div className="relative z-10 py-10 px-6">
        <div
          className="
          max-w-4xl mx-auto bg-white/15 backdrop-blur-2xl
          border border-white/20 rounded-[40px] shadow-2xl p-10
        "
        >
          {/* Header */}
          <div className="text-center">
            <div
              className="
              w-24 h-24 mx-auto rounded-3xl bg-white/20
              flex items-center justify-center
            "
            >
              <HeartPulse size={48} className="text-white" />
            </div>

            <h1 className="text-5xl font-bold text-white mt-6">
              Hospital Registration
            </h1>

            <p className="mt-4 text-white/80">
              Register your hospital, get verified, then manage your
              labs, pharmacies and staff.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {/* Hospital name */}
            <div className="relative">
              <Building2
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="text"
                placeholder="Hospital Name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="email"
                placeholder="Official Email Address"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* Address */}
            <div className="relative">
              <MapPin
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* City */}
            <div className="relative">
              <MapPin
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* About */}
            <textarea
              rows={4}
              placeholder="About the hospital"
              value={formData.about}
              onChange={(e) =>
                setFormData({ ...formData, about: e.target.value })
              }
              className="
              w-full p-4 rounded-2xl bg-white/10 border
              border-white/20 text-white placeholder:text-white/60
            "
            />

            {/* Capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  formData.hasLab
                    ? "bg-cyan-500/20 border-cyan-300/50"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-cyan-500"
                  checked={formData.hasLab}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasLab: e.target.checked,
                    })
                  }
                />
                <FlaskConical size={20} className="text-white" />
                <span className="text-white">
                  This hospital has a Laboratory
                </span>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  formData.hasPharmacy
                    ? "bg-cyan-500/20 border-cyan-300/50"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-cyan-500"
                  checked={formData.hasPharmacy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasPharmacy: e.target.checked,
                    })
                  }
                />
                <Pill size={20} className="text-white" />
                <span className="text-white">
                  This hospital has a Pharmacy
                </span>
              </label>
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* Confirm password */}
            <div className="relative">
              <Lock
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                className={inputClass}
              />
            </div>

            {/* Proof document */}
            <div
              className="
              border-2 border-dashed border-white/30 rounded-2xl
              p-6 text-center text-white
            "
            >
              <Upload className="mx-auto mb-3" />
              <p className="flex items-center justify-center gap-2">
                <FileText size={18} />
                Upload Registration / License Proof (PDF or image)
              </p>
              {proofDocument && (
                <p className="mt-2 text-cyan-300 text-sm">
                  {proofDocument.name}
                </p>
              )}
              <input
                type="file"
                required
                accept="image/*,.pdf"
                className="mt-3 text-white/80"
                onChange={(e) =>
                  setProofDocument(e.target.files?.[0] || null)
                }
              />
            </div>

            <div
              className="
              bg-yellow-500/20 border border-yellow-300/30
              rounded-2xl p-4 text-yellow-100
            "
            >
              Your hospital will remain under review until an admin
              verifies your documents. You can log in only after approval.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-4 rounded-2xl bg-gradient-to-r
                from-blue-600 to-cyan-500 text-white font-semibold text-lg
              "
            >
              {loading ? "Submitting..." : "Submit For Verification"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HospitalRegister;
