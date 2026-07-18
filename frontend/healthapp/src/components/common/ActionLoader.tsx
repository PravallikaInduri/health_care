import { useEffect, useState } from "react";
import { subscribeActions } from "../../utils/actionLoader";

/**
 * Global overlay shown while any mutating action (POST/PUT/PATCH/DELETE) is in
 * flight. Renders a spinning ring with a small stethoscope emoji in the centre
 * so every action across the app gets consistent loading feedback.
 */
const ActionLoader = () => {
  const [pending, setPending] = useState(0);

  useEffect(() => subscribeActions(setPending), []);

  if (pending <= 0) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Working"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-8 py-6 shadow-2xl">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-xl">
            🩺
          </span>
        </div>
        <p className="text-sm font-medium text-slate-600">
          Please wait…
        </p>
      </div>
    </div>
  );
};

export default ActionLoader;
