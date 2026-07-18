import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  CalendarClock,
  Stethoscope,
  CreditCard,
  Hourglass,
  XCircle,
} from "lucide-react";
import {
  getAppointmentDetail,
  payForAppointment,
  cancelAppointment,
  type AppointmentDetail,
} from "../../api/booking.api";
import toast from "react-hot-toast";

const TAX_RATE = 0.18;

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

const AppointmentReview = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAppointmentDetail(id);
      setAppt(r.data.data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to load appointment"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handlePay = async () => {
    if (!appt) return;
    try {
      setPaying(true);
      await payForAppointment(appt.id, {
        gateway: "MOCK",
      });
      toast.success("Payment successful — appointment confirmed!");
      navigate(`/patient/appointments`);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Payment failed"
      );
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!appt) return;
    if (
      !confirm(
        "Cancel this appointment? You will lose the held slot and will need to book again."
      )
    )
      return;
    try {
      await cancelAppointment(appt.id, "Cancelled before payment");
      toast.success("Appointment cancelled");
      navigate("/patient/appointments");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Cancel failed"
      );
    }
  };

  if (loading || !appt) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const fee = Number(appt.consultation_fee ?? appt.provider_fee ?? 0);
  const tax = Math.round(fee * TAX_RATE * 100) / 100;
  const total = fee + tax;
  const alreadyPaid = appt.payment_status === "PAID";

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        to="/patient/appointments"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={16} /> My appointments
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Review & Pay
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {alreadyPaid
            ? "This appointment is confirmed."
            : "Confirm the details below and complete payment to confirm your appointment."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-4">
              {appt.provider_photo ? (
                <img
                  src={appt.provider_photo}
                  alt={appt.provider_name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-xl">
                  {appt.provider_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold text-slate-900">
                  {appt.provider_name}
                </div>
                <div className="text-blue-600 text-sm font-medium">
                  {appt.provider_specialty}
                </div>
                {appt.provider_qualifications && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {appt.provider_qualifications}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-sm">
              <div className="flex items-start gap-2">
                <CalendarClock size={16} className="text-blue-500 mt-0.5" />
                <div>
                  <div className="text-slate-500 text-xs">Date & Time</div>
                  <div className="font-semibold text-slate-900">
                    {fmtDateTime(appt.scheduled_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Stethoscope size={16} className="text-blue-500 mt-0.5" />
                <div>
                  <div className="text-slate-500 text-xs">Visit Type</div>
                  <div className="font-semibold text-slate-900">
                    {appt.type === "VIDEO" ? "Video Consultation" : "In-Person"}
                  </div>
                </div>
              </div>
              {appt.facility_name && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Building2 size={16} className="text-blue-500 mt-0.5" />
                  <div>
                    <div className="text-slate-500 text-xs">Hospital</div>
                    <div className="font-semibold text-slate-900">
                      {appt.facility_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {appt.facility_address}
                    </div>
                  </div>
                </div>
              )}
              {appt.reason && (
                <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                  <div className="text-slate-500 text-xs mb-1">Reason</div>
                  <div className="text-slate-700 text-sm">
                    {appt.reason}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-900">
              Your slot is held until payment is completed. Free cancellation
              up to 2 hours before your appointment time.
            </div>
          </div>
        </div>

        {/* Right: payment summary */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <CreditCard size={18} /> Payment Summary
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Consultation Fee</dt>
                <dd className="font-medium">₹{fee.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Taxes (GST 18%)</dt>
                <dd className="font-medium">₹{tax.toFixed(2)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-bold text-blue-700">
                  ₹{total.toFixed(2)}
                </dd>
              </div>
            </dl>

            {alreadyPaid ? (
              <div className="mt-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-sm font-semibold">
                <CheckCircle2 size={18} /> Paid
              </div>
            ) : (
              <button
                onClick={handlePay}
                disabled={paying}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-60 transition"
              >
                {paying ? (
                  <>
                    <Hourglass size={18} className="animate-pulse" />
                    Processing payment…
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Pay ₹{total.toFixed(2)}
                  </>
                )}
              </button>
            )}

            {!alreadyPaid && (
              <button
                onClick={handleCancel}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium"
              >
                <XCircle size={16} /> Cancel
              </button>
            )}

            <p className="text-xs text-slate-400 mt-3 text-center">
              This is a demo gateway. No real card is charged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentReview;
