const Contact = () => {
  const faqs = [
    {
      question: "How can I access my medical records?",
      answer:
        "Patients can securely log in and access their records anytime through the portal.",
    },
    {
      question: "Can I book appointments online?",
      answer:
        "Yes, appointments can be scheduled, rescheduled, or cancelled directly from the platform.",
    },
    {
      question: "Is my health information secure?",
      answer:
        "All patient data is encrypted and protected using industry-standard security practices.",
    },
  ];

  return (
    <div className="bg-slate-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">

          <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
            Contact Us
          </span>

          <h1 className="text-5xl lg:text-6xl font-bold mt-6 text-slate-900">
            We're Here To Help
          </h1>

          <p className="max-w-3xl mx-auto mt-6 text-lg text-slate-600">
            Have questions about appointments, medical records,
            prescriptions, billing, or support? Our team is ready
            to assist you.
          </p>

        </div>
      </section>

      {/* Contact Methods */}

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition">
              <div className="text-4xl">📧</div>

              <h3 className="text-xl font-semibold mt-4">
                Email Support
              </h3>

              <p className="mt-3 text-slate-600">
                support@healthportal.com
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition">
              <div className="text-4xl">📞</div>

              <h3 className="text-xl font-semibold mt-4">
                Call Us
              </h3>

              <p className="mt-3 text-slate-600">
                +91 98765 43210
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition">
              <div className="text-4xl">💬</div>

              <h3 className="text-xl font-semibold mt-4">
                Live Support
              </h3>

              <p className="mt-3 text-slate-600">
                Available 24/7
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Form + Office */}

      <section className="pb-24">

        <div className="max-w-7xl mx-auto px-6">

          <div className="grid lg:grid-cols-2 gap-12">

            {/* Form */}

            <div className="bg-white rounded-3xl shadow-lg p-10">

              <h2 className="text-3xl font-bold mb-8">
                Send Us A Message
              </h2>

              <div className="space-y-5">

                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="text"
                  placeholder="Subject"
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <textarea
                  rows={5}
                  placeholder="How can we help you?"
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold">
                  Send Message
                </button>

              </div>

            </div>

            {/* Office Info */}

            <div className="space-y-6">

              <div className="bg-white p-8 rounded-3xl shadow">
                <h3 className="text-2xl font-bold">
                  Headquarters
                </h3>

                <p className="mt-4 text-slate-600">
                  Healthcare Patient Portal
                </p>

                <p className="text-slate-600">
                  Technology & Innovation Center
                </p>

                <p className="text-slate-600">
                  Hyderabad, India
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow">
                <h3 className="text-2xl font-bold">
                  Support Hours
                </h3>

                <div className="mt-4 space-y-2 text-slate-600">
                  <p>Monday - Friday: 9:00 AM - 8:00 PM</p>
                  <p>Saturday: 9:00 AM - 5:00 PM</p>
                  <p>Emergency Support: 24/7</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-8 rounded-3xl">
                <h3 className="text-2xl font-bold">
                  Need Immediate Assistance?
                </h3>

                <p className="mt-3">
                  Contact our healthcare support team for urgent
                  assistance regarding appointments and records.
                </p>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* FAQ */}

      <section className="bg-white py-24">

        <div className="max-w-5xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center">
            Frequently Asked Questions
          </h2>

          <div className="mt-16 space-y-6">

            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="border border-slate-200 rounded-2xl p-6"
              >
                <h3 className="font-semibold text-lg">
                  {faq.question}
                </h3>

                <p className="mt-3 text-slate-600">
                  {faq.answer}
                </p>
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* Emergency Banner */}

      <section className="py-20">

        <div className="max-w-7xl mx-auto px-6">

          <div className="bg-red-50 border border-red-200 rounded-3xl p-10 text-center">

            <h2 className="text-3xl font-bold text-red-600">
              Medical Emergency?
            </h2>

            <p className="mt-4 text-slate-600">
              For life-threatening emergencies, please contact
              your local emergency services immediately.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
};

export default Contact;