interface Props {
  slots: string[];
  selected: string | null;
  onSelect: (slot: string) => void;
  loading?: boolean;
}

const fmtTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const date = new Date();
  date.setHours(h, m || 0, 0, 0);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const SlotGrid = ({ slots, selected, onSelect, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-slate-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
        <p className="text-slate-500">
          No slots available on this date. Please pick another date.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
      {slots.map((s) => {
        const isSel = selected === s;
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition ${
              isSel
                ? "bg-blue-600 border-blue-600 text-white shadow"
                : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700"
            }`}
          >
            {fmtTime(s)}
          </button>
        );
      })}
    </div>
  );
};

export default SlotGrid;
