import { Bell } from "lucide-react";
import type { DoctorAppointment } from "../../types/doctor";

type Props = {
  appointments: DoctorAppointment[];
};

const NotificationsPanel = ({ appointments }: Props) => {
  const requests = appointments.filter(
    (a) => a.status === "REQUESTED"
  );

  const todayVideo = appointments.filter((a) => {
    const isToday =
      new Date(a.scheduled_at).toDateString() ===
      new Date().toDateString();

    return isToday && a.type === "VIDEO";
  });

  const notifications = [
    ...requests.map((a) => ({
      id: `req-${a.id}`,
      text: `New appointment request from ${a.first_name} ${a.last_name}`,
    })),
    ...todayVideo.map((a) => ({
      id: `vid-${a.id}`,
      text: `Video consult today with ${a.first_name} ${a.last_name}`,
    })),
  ];

  return (
    <div className="bg-white rounded-3xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="text-blue-600" size={22} />

        <h3 className="font-semibold text-lg">Notifications</h3>
      </div>

      {notifications.length === 0 ? (
        <p className="text-slate-400">You're all caught up.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="
                text-sm
                text-slate-700
                bg-slate-50
                rounded-xl
                px-4
                py-3
              "
            >
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPanel;
