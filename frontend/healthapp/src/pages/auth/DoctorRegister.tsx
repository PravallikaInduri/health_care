import {
  User,
  Mail,
  Phone,
  Lock,
  Stethoscope,
  Languages,
  FileText,
  Upload,
  HeartPulse,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerDoctor } from "../../api/auth.api";

const DoctorRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] =
  useState(false);

const [doctorIdCard, setDoctorIdCard] =
  useState<File | null>(null);

const [formData, setFormData] =
  useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    npi_or_mci: "",
    languages: "",
    bio: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

  try {
    if (
      formData.password !==
      formData.confirmPassword
    ) {
      alert("Passwords do not match");
      return;
    }

    if (!doctorIdCard) {
      alert(
        "Please upload Doctor ID Card"
      );
      return;
    }

    setLoading(true);

    const data = new FormData();

    data.append(
      "name",
      formData.name
    );

    data.append(
      "email",
      formData.email
    );

    data.append(
      "password",
      formData.password
    );

    data.append(
      "specialty",
      formData.specialty
    );

    data.append(
      "npi_or_mci",
      formData.npi_or_mci
    );

    data.append(
      "bio",
      formData.bio
    );

    data.append(
      "languages",
      formData.languages
    );

    data.append(
      "doctorIdCard",
      doctorIdCard
    );

    await registerDoctor(data);

    navigate("/verify-otp", {
      state: {
        email: formData.email,
        role: "DOCTOR",
      },
    });
  } catch (error: any) {
    console.error(error);

    alert(
      error?.response?.data?.message ||
        "Doctor Registration Failed"
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
      {/* Overlay */}

      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-blue-900/60 to-cyan-700/50" />

      <div className="relative z-10 py-10 px-6">

        <div
          className="
          max-w-4xl
          mx-auto
          bg-white/15
          backdrop-blur-2xl
          border
          border-white/20
          rounded-[40px]
          shadow-2xl
          p-10
        "
        >
          {/* Header */}

          <div className="text-center">

            <div
              className="
              w-24
              h-24
              mx-auto
              rounded-3xl
              bg-white/20
              flex
              items-center
              justify-center
            "
            >
              <HeartPulse
                size={48}
                className="text-white"
              />
            </div>

            <h1 className="text-5xl font-bold text-white mt-6">
              Doctor Registration
            </h1>

            <p className="mt-4 text-white/80">
              Join our healthcare network and connect
              with patients securely.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-5"
          >
            <div className="relative">

              <User
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
  type="text"
  placeholder="Full Name"
  required
  value={formData.name}
  onChange={(e) =>
    setFormData({
      ...formData,
      name: e.target.value,
    })
  }
/>

            </div>

            <div className="relative">

              <Mail
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
                type="email"
                placeholder="Email Address"
                required
               value={formData.email}
onChange={(e) =>
  setFormData({
    ...formData,
    email: e.target.value,
  })
}
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            <div className="relative">

              <Phone
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                required
                value={formData.phone}
onChange={(e) =>
  setFormData({
    ...formData,
    phone: e.target.value,
  })
}
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            <div className="relative">

              <Stethoscope
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
                type="text"
                placeholder="Specialization"
                required
                value={formData.specialty}
onChange={(e) =>
  setFormData({
    ...formData,
    specialty: e.target.value,
  })
}
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            <div className="relative">

              <FileText
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
                type="text"
                placeholder="Medical Registration Number"
                required
                value={formData.npi_or_mci}
onChange={(e) =>
  setFormData({
    ...formData,
    npi_or_mci: e.target.value,
  })
}
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            <div className="relative">

              <Languages
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
                type="text"
                placeholder="Languages Known"
                value={formData.languages}
onChange={(e) =>
  setFormData({
    ...formData,
    languages: e.target.value,
  })
}
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            <textarea
              rows={4}
              placeholder="Professional Bio"
              value={formData.bio}
onChange={(e) =>
  setFormData({
    ...formData,
    bio: e.target.value,
  })
}
              className="
              w-full
              p-4
              rounded-2xl
              bg-white/10
              border
              border-white/20
              text-white
              placeholder:text-white/60
            "
            />

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
  setFormData({
    ...formData,
    password: e.target.value,
  })
}
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            <div className="relative">

              <Lock
                size={20}
                className="absolute left-4 top-5 text-white/70"
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
onChange={(e) =>
  setFormData({
    ...formData,
    confirmPassword: e.target.value,
  })
}
                required
                className="
                w-full
                pl-12
                py-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/60
              "
              />

            </div>

            {/* Medical License */}

            <div
              className="
              border-2
              border-dashed
              border-white/30
              rounded-2xl
              p-6
              text-center
              text-white
            "
            >
              <Upload className="mx-auto mb-3" />

              <p>Upload Medical License</p>

              <input
  type="file"
  required
  accept="application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png"
  onChange={(e) =>
    setDoctorIdCard(
      e.target.files?.[0] || null
    )
  }
/>
            </div>

            {/* Degree */}

            <div
              className="
              border-2
              border-dashed
              border-white/30
              rounded-2xl
              p-6
              text-center
              text-white
            "
            >
              <Upload className="mx-auto mb-3" />

              <p>Upload Degree Certificate</p>

              <input
  type="file"
  required
  accept="application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png"
  onChange={(e) =>
    setDoctorIdCard(
      e.target.files?.[0] || null
    )
  }
/>
            </div>

            <div
              className="
              bg-yellow-500/20
              border
              border-yellow-300/30
              rounded-2xl
              p-4
              text-yellow-100
            "
            >
              Your account will remain under review
              until your credentials have been verified.
            </div>

            <button
  type="submit"
  disabled={loading}
  className="
    w-full
    py-4
    rounded-2xl
    bg-gradient-to-r
    from-blue-600
    to-cyan-500
    text-white
    font-semibold
    text-lg
  "
>
  {loading
    ? "Submitting..."
    : "Submit For Verification"}
</button>
          </form>

        </div>

      </div>

    </div>
  );
};

export default DoctorRegister;