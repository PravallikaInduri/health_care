import {
  Clock3,
  FileCheck,
  ShieldCheck,
} from "lucide-react";

const VerificationPending = () => {
  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{
        backgroundImage: "url('/videos/image.png')",
      }}
    >
      {/* Overlay */}

      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-blue-900/60 to-cyan-700/50" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">

        <div
          className="
          max-w-2xl
          w-full
          bg-white/15
          backdrop-blur-2xl
          border
          border-white/20
          rounded-[40px]
          p-10
          text-center
        "
        >

          <div
            className="
            w-28
            h-28
            mx-auto
            rounded-full
            bg-yellow-500/20
            flex
            items-center
            justify-center
          "
          >
            <Clock3
              size={60}
              className="text-yellow-300"
            />
          </div>

          <h1 className="text-5xl font-bold text-white mt-8">
            Verification Pending
          </h1>

          <p className="mt-6 text-white/80 text-lg">
            Your documents have been submitted
            successfully and are currently under review.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-10">

            <div
              className="
              bg-white/10
              rounded-3xl
              p-5
              border
              border-white/20
            "
            >
              <FileCheck
                className="mx-auto text-cyan-300"
              />

              <h3 className="mt-3 text-white font-semibold">
                Documents Submitted
              </h3>
            </div>

            <div
              className="
              bg-white/10
              rounded-3xl
              p-5
              border
              border-white/20
            "
            >
              <ShieldCheck
                className="mx-auto text-cyan-300"
              />

              <h3 className="mt-3 text-white font-semibold">
                Admin Review
              </h3>
            </div>

          </div>

          <div
            className="
            mt-10
            bg-yellow-500/20
            border
            border-yellow-300/30
            rounded-2xl
            p-5
            text-yellow-100
          "
          >
            Estimated review time:
            <strong> 24-48 Hours</strong>
          </div>

        </div>

      </div>

    </div>
  );
};

export default VerificationPending;