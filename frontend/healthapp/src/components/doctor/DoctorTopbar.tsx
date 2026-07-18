import NotificationsBell from "../common/NotificationsBell";

const DoctorTopbar = () => {
  return (
    <header className="bg-white px-8 py-5 shadow-sm border-b flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Doctor Portal
        </h2>
        <p className="text-slate-500">
          Manage your appointments, schedule and patient care
        </p>
      </div>
      <NotificationsBell variant="light" />
    </header>
  );
};

export default DoctorTopbar;
