import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ShieldCheck,
  Users,
  Phone,
  UserCircle,
} from "lucide-react";

import {
  getPatientFullProfile,
  type AdminPatientFullProfile,
} from "../../api/admin.api";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const SectionCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <section className="bg-white rounded-3xl shadow-sm p-6">
    <div className="flex items-center gap-3 mb-4">
      <Icon size={20} className="text-blue-600" />
      <h2 className="text-xl font-semibold text-slate-800">
        {title}
      </h2>
    </div>
    {children}
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <p className="text-slate-400 text-sm">{text}</p>
);

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] =
    useState<AdminPatientFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;
    setLoading(true);
    setError(null);

    getPatientFullProfile(id)
      .then((res) => {
        if (!active) return;
        setData(res.data.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load patient"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p className="text-slate-400">Loading patient…</p>;
  }

  if (error) {
    return <p className="text-rose-500">{error}</p>;
  }

  if (!data) {
    return (
      <p className="text-slate-500">Patient not found.</p>
    );
  }

  const { profile, appointments, insurance, dependents, emergencyContacts } =
    data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/patients"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back to patients
      </Link>

      {/* Profile */}
      <SectionCard title="Profile" icon={UserCircle}>
        <div className="flex items-center gap-6">
          <img
            src={
              profile.photo_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                `${profile.first_name} ${profile.last_name}`
              )}&background=2563eb&color=fff&size=128`
            }
            alt={`${profile.first_name} ${profile.last_name}`}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-slate-500 mt-1">
              MRN: <span className="font-mono">{profile.mrn}</span>
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Field label="Date of birth" value={fmtDate(profile.dob)} />
          <Field label="Sex" value={profile.sex || "—"} />
          <Field label="Phone" value={profile.phone || "—"} />
          <Field label="Email" value={profile.email || "—"} />
          <Field
            label="Account email"
            value={profile.account_email || "—"}
          />
          <Field
            label="Created"
            value={fmtDate(profile.created_at)}
          />
        </div>
      </SectionCard>

      {/* Appointments */}
      <SectionCard title="Appointments" icon={CalendarDays}>
        {appointments.length === 0 ? (
          <Empty text="No appointments on record." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Scheduled at</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Specialty</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Facility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3">
                      {fmtDateTime(a.scheduled_at)}
                    </td>
                    <td className="py-3">
                      {a.provider_name || "—"}
                    </td>
                    <td className="py-3 text-slate-500">
                      {a.provider_specialty || "—"}
                    </td>
                    <td className="py-3 text-slate-500">
                      {a.type || a.appointment_mode}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {a.facility_name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Insurance */}
      <SectionCard title="Insurance" icon={ShieldCheck}>
        {insurance.length === 0 ? (
          <Empty text="No insurance records." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {insurance.map((ins) => (
              <div
                key={ins.id}
                className="border border-slate-200 rounded-2xl p-4"
              >
                <p className="font-semibold text-slate-800">
                  {ins.payer}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Member: {ins.member_id}
                  {ins.group_no ? ` · Group ${ins.group_no}` : ""}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Valid {fmtDate(ins.valid_from)} →{" "}
                  {fmtDate(ins.valid_to)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Dependents */}
      <SectionCard title="Dependents" icon={Users}>
        {dependents.length === 0 ? (
          <Empty text="No dependents on file." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {dependents.map((d) => (
              <div
                key={d.id}
                className="border border-slate-200 rounded-2xl p-4"
              >
                <p className="font-semibold text-slate-800">
                  {d.first_name} {d.last_name}
                </p>
                <p className="text-sm text-slate-500">
                  {d.relationship} · DOB {fmtDate(d.dob)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Proxy consent:{" "}
                  {d.proxy_consent ? "Yes" : "No"}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Emergency Contacts */}
      <SectionCard title="Emergency Contacts" icon={Phone}>
        {emergencyContacts.length === 0 ? (
          <Empty text="No emergency contacts on file." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {emergencyContacts.map((c, idx) => (
              <div
                key={c.id ?? idx}
                className="border border-slate-200 rounded-2xl p-4"
              >
                <p className="font-semibold text-slate-800">
                  {c.name}
                </p>
                <p className="text-sm text-slate-500">
                  {c.relationship}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {c.phone}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const Field = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-slate-800">{value}</p>
  </div>
);

export default PatientDetail;
