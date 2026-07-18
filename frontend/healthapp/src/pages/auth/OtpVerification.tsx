import { useEffect, useState } from "react";
import {
  verifyPatientOTP,
  verifyDoctorOTP,
  verifyHospitalOTP,
} from "../../api/auth.api";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Clock3, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const OtpVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";
  const role = location.state?.role || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] =
  useState(false);
  /* For DOCTOR / HOSPITAL we show an approval-pending confirmation
     screen instead of bouncing straight to login. */
  const [approvalPending, setApprovalPending] = useState(false);

  const needsApproval = role === "DOCTOR" || role === "HOSPITAL";

  useEffect(() => {
    if (!email || !role) {
      navigate("/login");
    }
  }, [email, role, navigate]);

  if (!email || !role) {
    return null;
  }

  const handleVerify = async () => {
  try {
    setLoading(true);

    if (role === "PATIENT") {
      await verifyPatientOTP(
        email,
        otp
      );
    }

    if (role === "DOCTOR") {
      await verifyDoctorOTP(
        email,
        otp
      );
    }

    if (role === "HOSPITAL") {
      await verifyHospitalOTP(
        email,
        otp
      );
    }

    if (needsApproval) {
      toast.success(
        "Email verified! Your account is now pending admin approval.",
        { duration: 6000 }
      );
      setApprovalPending(true);
      return;
    }

    toast.success("Email verified successfully. Please sign in.");
    navigate("/login");
  } catch (error: any) {
    console.error(error);

    toast.error(
      error?.response?.data?.message ||
        "OTP Verification Failed"
    );
  } finally {
    setLoading(false);
  }
};

  if (approvalPending) {
    return (
      <div
        className="min-h-screen bg-cover bg-center relative"
        style={{ backgroundImage: "url('/videos/image.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-blue-900/60 to-cyan-700/50" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-white/15 backdrop-blur-2xl border border-white/20 rounded-[40px] shadow-2xl p-10 text-center">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-400/25 flex items-center justify-center">
              <Clock3 size={48} className="text-amber-200" />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-white">
              Waiting for Admin Approval
            </h1>

            <div className="mt-5 flex items-center justify-center gap-2 text-emerald-200 text-sm">
              <CheckCircle2 size={18} />
              Email verified
            </div>

            <p className="mt-4 text-white/80 leading-relaxed">
              Thanks for registering! Your account has been submitted and is now
              under review by our administrators. You&apos;ll be able to sign in
              once your credentials have been approved — we&apos;ll email you as
              soon as that happens.
            </p>

            <button
              onClick={() => navigate("/login")}
              className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-lg"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{
        backgroundImage: "url('/videos/image.png')",
      }}
    >
      {/* Overlay */}

      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-blue-900/60 to-cyan-700/50" />

      {/* Content */}

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">

        <div
          className="
          w-full
          max-w-md
          bg-white/15
          backdrop-blur-2xl
          border
          border-white/20
          rounded-[40px]
          shadow-2xl
          p-10
        "
        >

          {/* Icon */}

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
              <ShieldCheck
                size={48}
                className="text-white"
              />
            </div>

            <h1 className="mt-6 text-4xl font-bold text-white">
              Verify OTP
            </h1>

            <p className="mt-3 text-white/80">
              Enter the verification code sent to
            </p>

            <p className="text-cyan-300 mt-2">
              {email}
            </p>

          </div>

          {/* Input */}

          <div className="mt-10">

            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value)
              }
              placeholder="Enter 6 Digit OTP"
              className="
                w-full
                py-4
                text-center
                text-2xl
                tracking-[10px]
                rounded-2xl
                bg-white/10
                border
                border-white/20
                text-white
                placeholder:text-white/50
                outline-none
              "
            />

          </div>

          {/* Verify Button */}

          <button
  onClick={handleVerify}
  disabled={loading}
  className="
    mt-8
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
    ? "Verifying..."
    : "Verify OTP"}
</button>

          {/* Resend */}

          <button
            className="
              mt-5
              w-full
              text-cyan-300
            "
          >
            Resend OTP
          </button>

          {/* Role */}

          <div className="mt-8 text-center">

            <span
              className="
              bg-white/10
              px-4
              py-2
              rounded-full
              text-white/80
            "
            >
              {role} Verification
            </span>

          </div>

        </div>

      </div>

    </div>
  );
};

export default OtpVerification;