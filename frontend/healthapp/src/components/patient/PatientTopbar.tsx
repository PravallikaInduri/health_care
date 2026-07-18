import NotificationsBell from "../common/NotificationsBell";

const PatientTopbar = () => {
  return (
    <header className="bg-white px-8 py-5 shadow-sm border-b flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Patient Dashboard
        </h2>
        <p className="text-slate-500">
          Manage your health records and appointments
        </p>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell variant="light" />
      </div>
    </header>
  );
};

export default PatientTopbar;
