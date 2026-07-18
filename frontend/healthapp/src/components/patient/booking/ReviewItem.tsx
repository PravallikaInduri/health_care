import { Star } from "lucide-react";
import type { DoctorReview } from "../../../api/booking.api";

const ReviewItem = ({ review }: { review: DoctorReview }) => {
  const fullName =
    [review.first_name, review.last_name]
      .filter(Boolean)
      .join(" ") || "Anonymous";

  const date = (() => {
    try {
      return new Date(review.created_at).toLocaleDateString();
    } catch {
      return "";
    }
  })();

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-900">
          {fullName}
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              className={
                i < review.rating
                  ? "text-amber-500 fill-amber-500"
                  : "text-slate-300"
              }
            />
          ))}
        </div>
      </div>
      {review.review && (
        <p className="text-slate-700 text-sm mt-2 leading-relaxed">
          {review.review}
        </p>
      )}
      <div className="text-xs text-slate-400 mt-2">{date}</div>
    </div>
  );
};

export default ReviewItem;
