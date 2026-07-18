const services = [
  {
    title: "Medical Records",
    desc: "Secure access to patient health history and reports."
  },
  {
    title: "Appointments",
    desc: "Book and manage healthcare appointments online."
  },
  {
    title: "Prescriptions",
    desc: "Track medications and request refills."
  },
  {
    title: "Billing & Payments",
    desc: "Manage invoices and payment records."
  },
  {
    title: "Secure Messaging",
    desc: "Communicate with healthcare providers safely."
  },
  {
    title: "Telehealth",
    desc: "Attend virtual consultations remotely."
  }
];

const Services = () => {
  return (
    <div className="bg-slate-50">

      <section className="bg-gradient-to-br from-blue-50 to-cyan-50 py-24">

        <div className="max-w-7xl mx-auto px-6 text-center">

          <h1 className="text-5xl font-bold">
            Healthcare Services
          </h1>

          <p className="mt-6 text-slate-600">
            Everything you need for modern healthcare management.
          </p>

        </div>

      </section>

      <section className="py-24">

        <div className="max-w-7xl mx-auto px-6">

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {services.map((service) => (
              <div
                key={service.title}
                className="bg-white p-8 rounded-3xl shadow hover:shadow-xl transition"
              >
                <h3 className="text-2xl font-semibold mb-4">
                  {service.title}
                </h3>

                <p className="text-slate-600">
                  {service.desc}
                </p>
              </div>
            ))}

          </div>

        </div>

      </section>

    </div>
  );
};

export default Services;