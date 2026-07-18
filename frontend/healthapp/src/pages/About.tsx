const About = () => {
  return (
    <div className="bg-slate-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-cyan-50 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">

          <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
            About Us
          </span>

          <h1 className="text-5xl font-bold mt-6">
            Transforming Healthcare Through Technology
          </h1>

          <p className="mt-6 text-slate-600 max-w-3xl mx-auto">
            Our Healthcare Patient Portal bridges the gap between
            patients and providers through secure, accessible,
            and modern digital healthcare solutions.
          </p>

        </div>
      </section>

      {/* Mission Vision */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">

          <div className="grid md:grid-cols-2 gap-8">

            <div className="bg-white p-10 rounded-3xl shadow">
              <h2 className="text-3xl font-bold mb-4">
                Our Mission
              </h2>

              <p className="text-slate-600">
                To simplify healthcare management through
                secure digital solutions that improve
                patient engagement and provider efficiency.
              </p>
            </div>

            <div className="bg-white p-10 rounded-3xl shadow">
              <h2 className="text-3xl font-bold mb-4">
                Our Vision
              </h2>

              <p className="text-slate-600">
                A future where healthcare services are
                accessible anywhere, anytime through
                technology-driven innovation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Values */}
      <section className="pb-24">

        <div className="max-w-7xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center">
            Core Values
          </h2>

          <div className="grid md:grid-cols-4 gap-6 mt-16">

            {[
              "Security",
              "Accessibility",
              "Innovation",
              "Reliability",
            ].map((item) => (
              <div
                key={item}
                className="bg-white p-8 rounded-2xl shadow text-center"
              >
                <h3 className="font-semibold text-xl">
                  {item}
                </h3>
              </div>
            ))}

          </div>

        </div>

      </section>

    </div>
  );
};

export default About;