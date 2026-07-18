import {
  User,
  Mail,
  Phone,
  Lock,
  Calendar,
  HeartPulse,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerPatient } from "../../api/auth.api";

const PatientRegister = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    sex: "",
    phone: "",
    email: "",
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

      setLoading(true);

      await registerPatient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        sex: formData.sex,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
      });

      navigate("/verify-otp", {
        state: {
          email: formData.email,
          role: "PATIENT",
        },
      });
    } catch (error: any) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Registration Failed"
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

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-10">
        <div
          className="
          w-full
          max-w-3xl
          bg-white/15
          backdrop-blur-2xl
          border
          border-white/20
          rounded-[40px]
          shadow-2xl
          p-8
          md:p-12
        "
        >
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

            <h1 className="mt-6 text-4xl font-bold text-white">
              Patient Registration
            </h1>

            <p className="mt-3 text-white/80">
              Create your healthcare account and
              access appointments, records and
              prescriptions.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-4 top-5 text-white/70"
                />

                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firstName: e.target.value,
                    })
                  }
                  className="
                  w-full
                  pl-11
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
                <User
                  size={18}
                  className="absolute left-4 top-5 text-white/70"
                />

                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastName: e.target.value,
                    })
                  }
                  className="
                  w-full
                  pl-11
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
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-4 top-5 text-white/70"
                />

                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dob: e.target.value,
                    })
                  }
                  className="
                  w-full
                  pl-11
                  py-4
                  rounded-2xl
                  bg-white/10
                  border
                  border-white/20
                  text-white
                "
                />
              </div>

              <select
                required
                value={formData.sex}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sex: e.target.value,
                  })
                }
                className="
                w-full
                py-4
                px-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
              "
              >
                <option
                  value=""
                  className="text-black"
                >
                  Gender
                </option>

                <option
                  value="MALE"
                  className="text-black"
                >
                  Male
                </option>

                <option
                  value="FEMALE"
                  className="text-black"
                >
                  Female
                </option>

                <option
                  value="OTHER"
                  className="text-black"
                >
                  Other
                </option>
              </select>
            </div>

            <div className="relative">
              <Phone
                size={18}
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
                pl-11
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
              <Mail
                size={18}
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
                pl-11
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
                size={18}
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
                pl-11
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
                size={18}
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
                    confirmPassword:
                      e.target.value,
                  })
                }
                className="
                w-full
                pl-11
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
                ? "Creating Account..."
                : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientRegister;