import {
  CalendarDays,
  FileText,
  ShieldCheck,
  MessageCircle,
  HeartPulse,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const features = [
    {
      icon: <FileText size={28} />,
      title: "Medical Records",
      desc: "Access reports, diagnoses and health history securely.",
    },
    {
      icon: <CalendarDays size={28} />,
      title: "Appointments",
      desc: "Book and manage appointments online.",
    },
    {
      icon: <HeartPulse size={28} />,
      title: "Telehealth",
      desc: "Connect with healthcare providers remotely.",
    },
    {
      icon: <CreditCard size={28} />,
      title: "Billing",
      desc: "Track invoices, insurance and payments.",
    },
    {
      icon: <MessageCircle size={28} />,
      title: "Messaging",
      desc: "Communicate securely with providers.",
    },
    {
      icon: <ShieldCheck size={28} />,
      title: "Security",
      desc: "Enterprise-grade healthcare security.",
    },
  ];

  return (
    <div className="bg-white text-slate-800">
      {/* ============================ HERO ============================ */}
      <section className="relative h-screen w-full overflow-hidden">
        <video
          src="/videos/healthcare-hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        />

        {/* Soft teal gradient overlay — keeps the hero readable on a light theme */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/55 via-brand-700/35 to-white/10 z-10" />

        <div className="relative z-20 h-full max-w-7xl mx-auto px-6 flex items-center">
          <div className="max-w-3xl">
            <span className="bg-white/85 backdrop-blur-md border border-white text-brand-700 px-5 py-2 rounded-full text-sm font-semibold shadow-sm">
              Healthcare Patient Portal
            </span>

            <h1 className="mt-8 text-white font-bold text-5xl md:text-7xl leading-tight drop-shadow-md">
              Transforming Healthcare
              <br />
              For Patients &
              <span className="text-brand-300"> Providers</span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-white/90 max-w-2xl drop-shadow">
              Access medical records, schedule appointments, manage
              prescriptions and communicate securely with healthcare
              providers.
            </p>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => navigate("/register")}
                className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/about")}
                className="bg-white/95 backdrop-blur border border-white text-brand-700 px-8 py-4 rounded-2xl font-semibold hover:bg-white transition"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ STATS =========================== */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              ["10K+", "Patients"],
              ["500+", "Doctors"],
              ["50+", "Hospitals"],
              ["99.9%", "Uptime"],
            ].map((item) => (
              <div
                key={item[1]}
                className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm hover:shadow-lg hover:border-brand-300 hover:-translate-y-1 transition-all duration-300"
              >
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  {item[0]}
                </h2>
                <p className="mt-3 text-slate-500 text-lg">{item[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== FEATURES ========================= */}
      <section className="bg-white py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="px-5 py-2 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold">
              Core Features
            </span>

            <h2 className="mt-6 text-4xl md:text-6xl font-bold text-slate-900">
              Everything In One Platform
            </h2>

            <p className="mt-6 text-slate-500 text-lg">
              Manage appointments, medical records, billing and
              communication from one secure healthcare ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:border-brand-300 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition">
                  {feature.icon}
                </div>

                <h3 className="text-xl font-semibold mt-5 text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 text-slate-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ SHOWCASE ======================== */}
      <section className="bg-slate-50 py-28">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="px-5 py-2 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold">
              Modern Healthcare
            </span>

            <h2 className="mt-6 text-4xl md:text-5xl font-bold text-slate-900">
              Better Care Through Technology
            </h2>

            <p className="mt-6 text-slate-500 text-lg leading-relaxed">
              Connect patients, doctors and hospitals through one
              centralized platform with secure medical records,
              telehealth consultations and appointment management.
            </p>

            <button className="mt-8 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-md shadow-brand-600/25 transition hover:-translate-y-0.5">
              Learn More
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-2xl">
            <img
              src="/images/dashboard.png"
              alt="Healthcare Dashboard"
              className="rounded-2xl w-full"
            />
          </div>
        </div>
      </section>

      {/* ============================ SECURITY ======================== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-r from-brand-600 to-brand-400 rounded-[40px] p-12 md:p-16 text-white shadow-xl">
            <h2 className="text-4xl md:text-5xl font-bold">
              Security & Privacy First
            </h2>
            <p className="mt-6 text-lg md:text-xl text-white/90 max-w-3xl">
              Built with enterprise-grade security, encrypted medical
              records and role-based access control.
            </p>
          </div>
        </div>
      </section>

      {/* ============================== CTA =========================== */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-6xl font-bold text-slate-900">
            Start Your Healthcare Journey
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-500">
            Join thousands of patients and providers using our platform.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="mt-10 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-md shadow-brand-600/25 transition hover:-translate-y-0.5"
          >
            Create Account
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
