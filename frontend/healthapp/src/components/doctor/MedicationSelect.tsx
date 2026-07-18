import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Pill, Plus, ChevronDown, Check } from "lucide-react";
import toast from "react-hot-toast";

import {
  listMedications,
  createMedication,
  type Medication,
} from "../../api/medications.api";

interface Props {
  value: string;
  onChange: (id: string, name: string) => void;
}

/**
 * Searchable medication picker. Loads the catalogue once, filters locally as
 * the doctor types, and lets them add a brand-new medication inline when no
 * match exists.
 */
const MedicationSelect = ({ value, onChange }: Props) => {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = () => {
    listMedications()
      .then((res) => setMeds(res.data.data || []))
      .catch(() => toast.error("Failed to load medications"));
  };

  useEffect(load, []);

  /* Close the dropdown when clicking outside */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = meds.find((m) => m.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meds;
    return meds.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.generic_name || "").toLowerCase().includes(q)
    );
  }, [meds, query]);

  const exactMatch = meds.some(
    (m) => m.name.toLowerCase() === query.trim().toLowerCase()
  );

  const stocked = filtered.filter((m) => m.in_pharmacy);
  const others = filtered.filter((m) => !m.in_pharmacy);

  const money = (n: number | null | undefined) =>
    `₹${Number(n ?? 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleSelect = (m: Medication) => {
    onChange(m.id, m.name);
    setOpen(false);
    setQuery("");
  };

  const handleAddNew = async () => {
    const name = query.trim();
    if (!name) return;
    try {
      setAdding(true);
      const res = await createMedication({ name });
      const med = res.data.data;
      setMeds((prev) =>
        prev.some((m) => m.id === med.id) ? prev : [...prev, med]
      );
      handleSelect(med);
      toast.success(`"${med.name}" added`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to add medication"
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border bg-white text-left"
      >
        <span
          className={`flex items-center gap-2 truncate ${
            selected ? "text-slate-800" : "text-slate-400"
          }`}
        >
          <Pill size={16} className="text-blue-500 shrink-0" />
          {selected ? selected.name : "Select medication…"}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg">
          {/* Search bar */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medicines…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {stocked.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                Available at pharmacy
              </li>
            )}
            {stocked.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(m)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800 truncate">
                      {m.name}
                    </span>
                    {m.generic_name && (
                      <span className="block text-xs text-slate-400 truncate">
                        {m.generic_name}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {m.pharmacy_price != null && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {money(m.pharmacy_price)}
                      </span>
                    )}
                    {m.id === value && (
                      <Check size={16} className="text-blue-600" />
                    )}
                  </span>
                </button>
              </li>
            ))}

            {stocked.length > 0 && others.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-t border-slate-100 mt-1">
                Other medications
              </li>
            )}
            {others.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(m)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800 truncate">
                      {m.name}
                    </span>
                    {m.generic_name && (
                      <span className="block text-xs text-slate-400 truncate">
                        {m.generic_name}
                      </span>
                    )}
                  </span>
                  {m.id === value && (
                    <Check size={16} className="text-blue-600 shrink-0" />
                  )}
                </button>
              </li>
            ))}

            {filtered.length === 0 && !query.trim() && (
              <li className="px-3 py-4 text-center text-sm text-slate-400">
                No medications in the catalogue yet.
              </li>
            )}

            {query.trim() && !exactMatch && (
              <li className="border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={adding}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  <Plus size={16} />
                  {adding
                    ? "Adding…"
                    : `Add "${query.trim()}" as a new medicine`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MedicationSelect;
