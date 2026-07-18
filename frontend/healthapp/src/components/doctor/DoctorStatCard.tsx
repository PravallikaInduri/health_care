import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  accent?: string;
};

const DoctorStatCard = ({
  title,
  value,
  icon: Icon,
  accent = "text-blue-600",
}: Props) => {
  return (
    <div
      className="
      bg-white
      rounded-3xl
      p-6
      shadow-md
      hover:shadow-xl
      transition
      flex
      items-center
      justify-between
    "
    >
      <div>
        <p className="text-slate-500">{title}</p>

        <h2 className="text-4xl font-bold mt-2">{value}</h2>
      </div>

      <Icon className={accent} size={40} />
    </div>
  );
};

export default DoctorStatCard;
