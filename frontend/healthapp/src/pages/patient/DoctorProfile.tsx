import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Languages,
  Star,
  IndianRupee,
  CheckCircle2,
  ChevronRight,
  Building2,
} from "lucide-react";
import {
  getDoctorProfile,
  listDoctorReviews,
  createDoctorReview,
  type DoctorPublicProfile,
  type DoctorReview,
  type PaginationMeta,
} from "../../api/booking.api";
import { getMyAppointments } from "../../api/patient.api";
import ReviewItem from "../../components/patient/booking/ReviewItem";
import toast from "react-hot-toast";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const DoctorProfile = () => {
  const { id = "", providerId = "" } = useParams();
  const [doctor, setDoctor] = useState<DoctorPublicProfile | null>(null);
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  /* Review form state */
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Is the logged-in patient allowed to review this doctor?
     Gate the form on at least one COMPLETED appointment with this provider. */
  const [canReview, setCanReview] = useState(false);

  const loadReviews = async (p = 1) => {
    const r = await listDoctorReviews(providerId, {
      page: p,
      limit: 5,
    });
    setReviews(r.data.data);
    setPagination(r.data.pagination);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getDoctorProfile(providerId),
      listDoctorReviews(providerId, { page: 1, limit: 5 }),
      getMyAppointments().catch(() => ({ data: { data: [] } })),
    ])
      .then(([d, r, mine]) => {
        if (cancelled) return;
        setDoctor(d.data.data);
        setReviews(r.data.data);
        setPagination(r.data.pagination);

        const list: any[] = (mine as any)?.data?.data ?? [];
        const eligible = list.some(
          (a) =>
            String(a.provider_id) === String(providerId) &&
            String(a.status).toUpperCase() === "COMPLETED"
        );
        setCanReview(eligible);
      })
      .catch(() => {
        if (cancelled) return;
        setDoctor(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const submitReview = async () => {
    try {
      setSubmitting(true);
      await createDoctorReview(
        providerId,
        rating,
        reviewText.trim() || null
      );
      toast.success("Thanks for your review!");
      setReviewText("");
      setPage(1);
      await loadReviews(1);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Could not submit review"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center">
        <p className="text-rose-600 font-medium">Doctor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {id && (
        <div className="flex items-center text-sm text-slate-500">
          <Link to="/patient/hospitals" className="hover:text-blue-600">
            Hospitals
          </Link>
          <ChevronRight size={14} className="mx-1" />
          <Link
            to={`/patient/hospitals/${id}`}
            className="hover:text-blue-600"
          >
            Hospital
          </Link>
          <ChevronRight size={14} className="mx-1" />
          <span className="text-slate-900 font-semibold">
            {doctor.name}
          </span>
        </div>
      )}

      {id && (
        <Link
          to={`/patient/hospitals/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Back
        </Link>
      )}

      {/* Header card — compact */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-start gap-4">
        {doctor.photo_url ? (
          <img
            src={doctor.photo_url}
            alt={doctor.name}
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover ring-2 ring-brand-100 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-semibold text-2xl flex-shrink-0">
            {initials(doctor.name || "Dr")}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 truncate">
                {doctor.name}
              </h1>
              <p className="text-brand-700 font-medium text-sm">
                {doctor.specialty || "—"}
              </p>
            </div>

            <Link
              to={
                id
                  ? `/patient/hospitals/${id}/doctors/${doctor.id}/book`
                  : doctor.facilities[0]
                    ? `/patient/hospitals/${doctor.facilities[0].id}/doctors/${doctor.id}/book`
                    : "#"
              }
              className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition"
            >
              Book Appointment
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs md:text-sm text-slate-600">
            {doctor.experience_years != null && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2
                  size={13}
                  className="text-emerald-600"
                />
                {doctor.experience_years} yrs
              </span>
            )}
            {doctor.qualifications && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap size={13} /> {doctor.qualifications}
              </span>
            )}
            {doctor.languages && (
              <span className="inline-flex items-center gap-1">
                <Languages size={13} /> {doctor.languages}
              </span>
            )}
            {doctor.consultation_fee != null && (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <IndianRupee size={13} />
                {Number(doctor.consultation_fee).toFixed(0)}
              </span>
            )}
            {doctor.avg_rating != null && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <Star
                  size={13}
                  className="text-amber-500 fill-amber-500"
                />
                {Number(doctor.avg_rating).toFixed(1)} (
                {doctor.review_count})
              </span>
            )}
          </div>

          {doctor.bio && (
            <p className="text-slate-500 text-xs md:text-sm mt-2 leading-relaxed line-clamp-2">
              {doctor.bio}
            </p>
          )}
        </div>
      </div>

      {/* Departments and facilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">
            Departments
          </h3>
          {doctor.departments.length === 0 ? (
            <p className="text-sm text-slate-500">—</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {doctor.departments.map((d) => (
                <span
                  key={d.id}
                  className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold"
                >
                  {d.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">
            Practices at
          </h3>
          {doctor.facilities.length === 0 ? (
            <p className="text-sm text-slate-500">—</p>
          ) : (
            <div className="space-y-2">
              {doctor.facilities.map((f) => (
                <Link
                  key={f.id}
                  to={`/patient/hospitals/${f.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {f.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {f.address || f.city || ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Reviews */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Patient Reviews
          </h3>
          {doctor.avg_rating != null && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
              <Star
                size={14}
                className="text-amber-500 fill-amber-500"
              />
              <span className="text-sm font-semibold text-amber-700">
                {Number(doctor.avg_rating).toFixed(1)} /
                5
              </span>
            </div>
          )}
        </div>

        {canReview ? (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5">
            <h4 className="font-semibold text-sm text-slate-800 mb-2">
              Leave a review
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              You completed an appointment with this doctor — share how it went.
            </p>
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  aria-label={`${i + 1} stars`}
                >
                  <Star
                    size={22}
                    className={
                      i < rating
                        ? "text-amber-500 fill-amber-500"
                        : "text-slate-300"
                    }
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-300 text-sm bg-white"
            />
            <div className="text-right mt-2">
              <button
                onClick={submitReview}
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-sm text-slate-600 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <span>
              You can leave a review for this doctor only after completing
              an appointment with them.
            </span>
          </div>
        )}

        {/* Previous patient reviews — always visible */}
        <h4 className="font-semibold text-sm text-slate-800 mb-3">
          Previous reviews
        </h4>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    const np = Math.max(1, page - 1);
                    setPage(np);
                    loadReviews(np);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => {
                    const np = page + 1;
                    setPage(np);
                    loadReviews(np);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default DoctorProfile;
