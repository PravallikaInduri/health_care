import { useEffect, useState } from "react";
import { Building2, Hospital } from "lucide-react";

import NotificationsBell from "../common/NotificationsBell";
import { getPharmacyMe, type PharmacyMe } from "../../api/pharmacy.api";

const PharmacyTopbar = () => {
  const [me, setMe] = useState<PharmacyMe | null>(null);

  useEffect(() => {
    let alive = true;
    getPharmacyMe()
      .then((res) => {
        if (alive) setMe(res.data.data);
      })
      .catch(() => {
        /* topbar identity is best-effort — silent failure is OK */
      });
    return () => {
      alive = false;
    };
  }, []);

  const primary = me?.primaryFacility;
  const extras = me ? me.facilities.length - 1 : 0;

  return (
    <header className="bg-white px-8 py-5 shadow-sm border-b flex items-center justify-between gap-6">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-slate-800">
          Pharmacy Portal
        </h2>
        <p className="text-slate-500">
          Review prescriptions, dispense medications and manage refill
          requests
        </p>
      </div>

      <div className="flex items-center gap-4">
        {primary ? (
          <div className="hidden md:flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-sm font-medium">
              <Building2 size={14} />
              {primary.name}
              {extras > 0 && (
                <span className="text-emerald-600/70">
                  +{extras}
                </span>
              )}
            </span>
            {primary.hospital_name && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-sm">
                <Hospital size={14} />
                {primary.hospital_name}
              </span>
            )}
          </div>
        ) : me ? (
          <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-sm">
            <Building2 size={14} />
            No pharmacy assignment
          </span>
        ) : null}

        <NotificationsBell variant="light" />
      </div>
    </header>
  );
};

export default PharmacyTopbar;
