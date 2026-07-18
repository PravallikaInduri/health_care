import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
} from "../../api/admin.api";
import toast from "react-hot-toast";

const PendingDoctors = () => {
  const [doctors, setDoctors] =
    useState<any[]>([]);

  const loadDoctors =
    async () => {
      try {
        const response =
          await getPendingDoctors();

        setDoctors(
          response.data.data
        );
      } catch {
        toast.error("Failed to load pending doctors");
      }
    };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleApprove =
    async (id: string) => {
      try {
        await approveDoctor(id);

        alert(
          "Doctor Approved"
        );

        loadDoctors();
      } catch {
        toast.error("Failed to approve doctor");
      }
    };

  const handleReject =
    async (id: string) => {
      const reason =
        prompt(
          "Enter rejection reason"
        );

      if (!reason) return;

      try {
        await rejectDoctor(
          id,
          reason
        );

        alert(
          "Doctor Rejected"
        );

        loadDoctors();
      } catch {
        toast.error("Failed to reject doctor");
      }
    };

  return (
    <div className="space-y-4">

        {doctors.map(
          (doctor) => (
            <div
              key={doctor.id}
              className="
              bg-white
              shadow
              rounded-xl
              p-6
              flex
              justify-between
              items-center
            "
            >
              <div>

                <Link
  to={`/admin/doctors/${doctor.id}`}
>
  <h2 className="font-bold text-xl text-blue-600">
    {doctor.name}
  </h2>
</Link>

                <p>
                  {doctor.email}
                </p>

              </div>

              <div className="flex gap-3">

                <button
                  onClick={() =>
                    handleApprove(
                      doctor.id
                    )
                  }
                  className="
                  px-4
                  py-2
                  bg-green-600
                  text-white
                  rounded-lg
                "
                >
                  Approve
                </button>

                <button
                  onClick={() =>
                    handleReject(
                      doctor.id
                    )
                  }
                  className="
                  px-4
                  py-2
                  bg-red-600
                  text-white
                  rounded-lg
                "
                >
                  Reject
                </button>

              </div>

            </div>
          )
        )}

    </div>
  );
};

export default PendingDoctors;