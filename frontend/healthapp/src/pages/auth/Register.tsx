import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Clock3,
  Users,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const Register = () => {
  const navigate = useNavigate();

  const patientFeatures = [
    "Medical Records",
    "Appointment Scheduling",
    "Digital Prescriptions",
    "Billing & Payments",
  ];

  const doctorFeatures = [
    "Patient Management",
    "Telehealth Services",
    "Appointment Scheduling",
    "e-Prescriptions",
  ];

  const hospitalFeatures = [
    "Manage Your Doctors",
    "Add Labs & Pharmacies",
    "Onboard Lab & Pharmacy Staff",
    "Admin-verified Account",
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden py-16 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-medium text-xs md:text-sm">
              Healthcare Registration
            </span>

            <h1 className="mt-6 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Create Your
              <span className="block mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Healthcare Account
              </span>
            </h1>

            <p className="mt-4 max-w-xl mx-auto text-sm md:text-base text-slate-600 leading-relaxed">
              Access medical records, manage appointments, and communicate with
              healthcare providers in one secure platform.
            </p>
          </div>
        </div>
      </section>

      {/* REGISTRATION OPTIONS */}
      <section className="pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* PATIENT CARD */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-200"
            >
              <div className="h-40 md:h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format&fit=crop"
                  alt="Patient"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-5 md:p-6">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                  Patient Portal
                </span>

                <h2 className="mt-4 text-xl md:text-2xl font-semibold tracking-tight">
                  Patient Registration
                </h2>

                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Create your personal healthcare account and access
                  appointments, prescriptions, and medical records.
                </p>

                <div className="mt-4 space-y-2">
                  {patientFeatures.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:border-blue-300 transition-colors"
                    >
                      <CheckCircle2 size={16} className="text-blue-600" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate("/register/patient")}
                  className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-colors duration-150 shadow-md shadow-blue-600/20"
                >
                  Create Patient Account
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>

            {/* DOCTOR CARD */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-200"
            >
              <div className="h-40 md:h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80&auto=format&fit=crop"
                  alt="Doctor"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-5 md:p-6">
                <span className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 font-medium text-xs">
                  Healthcare Provider
                </span>

                <h2 className="mt-4 text-xl md:text-2xl font-semibold tracking-tight">
                  Doctor Registration
                </h2>

                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Join our network and manage patients, consultations,
                  appointments, and prescriptions securely.
                </p>

                <div className="mt-4 space-y-2">
                  {doctorFeatures.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:border-cyan-300 transition-colors"
                    >
                      <CheckCircle2 size={16} className="text-cyan-600" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate("/register/doctor")}
                  className="w-full mt-5 bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-colors duration-150 shadow-md shadow-cyan-600/20"
                >
                  Create Doctor Account
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>

            {/* HOSPITAL CARD */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200"
            >
              <div className="h-40 md:h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format&fit=crop"
                  alt="Hospital"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-5 md:p-6">
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium text-xs">
                  Hospital Portal
                </span>

                <h2 className="mt-4 text-xl md:text-2xl font-semibold tracking-tight">
                  Hospital Registration
                </h2>

                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Register your hospital with proof of credentials. After admin
                  verification, manage your labs, pharmacies and staff.
                </p>

                <div className="mt-4 space-y-2">
                  {hospitalFeatures.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:border-indigo-300 transition-colors"
                    >
                      <CheckCircle2 size={16} className="text-indigo-600" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate("/register/hospital")}
                  className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-colors duration-150 shadow-md shadow-indigo-600/20"
                >
                  Create Hospital Account
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="pb-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Trusted Healthcare Platform
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-600 max-w-xl mx-auto">
              Built with privacy, security, and reliability at its core.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-8">
            {[
              { icon: <ShieldCheck size={32} />, title: "HIPAA Compliant" },
              { icon: <Clock3 size={32} />, title: "24/7 Access" },
              { icon: <Users size={32} />, title: "Trusted Network" },
              { icon: <HeartPulse size={32} />, title: "Better Care" },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-5 text-center hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-200"
              >
                <div className="flex justify-center text-cyan-600 mb-3">
                  {item.icon}
                </div>
                <h3 className="text-sm md:text-base font-semibold text-slate-800">
                  {item.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;