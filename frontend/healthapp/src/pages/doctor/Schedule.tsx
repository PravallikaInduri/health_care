import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trash2, Plus } from "lucide-react";
import {
  getSchedules,
  createSchedule,
  deleteSchedule,
  getOverrides,
  createOverride,
  deleteOverride,
} from "../../api/doctor.api";
import type {
  ScheduleTemplate,
  ScheduleOverride,
  ScheduleBlock,
  OverrideType,
} from "../../types/doctor";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const emptyBlock: ScheduleBlock = {
  weekday: 1,
  start_time: "09:00",
  end_time: "17:00",
};

const Schedule = () => {
  const [templates, setTemplates] = useState<
    ScheduleTemplate[]
  >([]);
  const [overrides, setOverrides] = useState<
    ScheduleOverride[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [templateForm, setTemplateForm] = useState({
    template_name: "",
    effective_start_date: "",
    appointment_duration: 30,
    buffer_time: 0,
    allow_in_person: true,
    allow_video: true,
  });

  const [blocks, setBlocks] = useState<ScheduleBlock[]>([
    { ...emptyBlock },
  ]);

  const [overrideForm, setOverrideForm] = useState<{
    override_type: OverrideType;
    start_datetime: string;
    end_datetime: string;
    reason: string;
  }>({
    override_type: "UNAVAILABLE",
    start_datetime: "",
    end_datetime: "",
    reason: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const [t, o] = await Promise.all([
        getSchedules(),
        getOverrides(),
      ]);
      setTemplates(t);
      setOverrides(o);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addBlock = () =>
    setBlocks((prev) => [...prev, { ...emptyBlock }]);

  const removeBlock = (idx: number) =>
    setBlocks((prev) =>
      prev.filter((_, i) => i !== idx)
    );

  const updateBlock = (
    idx: number,
    field: keyof ScheduleBlock,
    value: string | number
  ) =>
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === idx ? { ...b, [field]: value } : b
      )
    );

  const handleCreateTemplate = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !templateForm.template_name ||
      !templateForm.effective_start_date
    ) {
      toast.error("Name and start date are required");
      return;
    }

    try {
      await createSchedule({
        ...templateForm,
        effective_end_date: null,
        run_indefinitely: true,
        blocks,
      });
      toast.success("Schedule template created");
      setTemplateForm({
        template_name: "",
        effective_start_date: "",
        appointment_duration: 30,
        buffer_time: 0,
        allow_in_person: true,
        allow_video: true,
      });
      setBlocks([{ ...emptyBlock }]);
      load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to create template"
      );
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteSchedule(id);
      toast.success("Template deleted");
      setTemplates((prev) =>
        prev.filter((t) => t.id !== id)
      );
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleCreateOverride = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !overrideForm.start_datetime ||
      !overrideForm.end_datetime
    ) {
      toast.error("Start and end are required");
      return;
    }

    try {
      await createOverride({
        override_type: overrideForm.override_type,
        start_datetime: overrideForm.start_datetime,
        end_datetime: overrideForm.end_datetime,
        reason: overrideForm.reason,
        action_for_existing: "AUTO_CANCEL",
      });
      toast.success("Override added");
      setOverrideForm({
        override_type: "UNAVAILABLE",
        start_datetime: "",
        end_datetime: "",
        reason: "",
      });
      load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to add override"
      );
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await deleteOverride(id);
      toast.success("Override removed");
      setOverrides((prev) =>
        prev.filter((o) => o.id !== id)
      );
    } catch {
      toast.error("Failed to remove override");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">
        Schedule Management
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create template */}
        <form
          onSubmit={handleCreateTemplate}
          className="bg-white rounded-3xl shadow-md p-6 space-y-4"
        >
          <h3 className="font-semibold text-lg">
            New Weekly Template
          </h3>

          <input
            placeholder="Template name (e.g. Weekday Clinic)"
            value={templateForm.template_name}
            onChange={(e) =>
              setTemplateForm({
                ...templateForm,
                template_name: e.target.value,
              })
            }
            className="w-full p-3 rounded-xl border"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-500">
                Start date
              </label>
              <input
                type="date"
                value={
                  templateForm.effective_start_date
                }
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    effective_start_date:
                      e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Slot duration (min)
              </label>
              <input
                type="number"
                value={
                  templateForm.appointment_duration
                }
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    appointment_duration: Number(
                      e.target.value
                    ),
                  })
                }
                className="w-full p-3 rounded-xl border"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={templateForm.allow_in_person}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    allow_in_person:
                      e.target.checked,
                  })
                }
              />
              In-person
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={templateForm.allow_video}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    allow_video: e.target.checked,
                  })
                }
              />
              Video
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Weekly blocks
              </span>
              <button
                type="button"
                onClick={addBlock}
                className="flex items-center gap-1 text-blue-600 text-sm"
              >
                <Plus size={16} /> Add block
              </button>
            </div>

            {blocks.map((block, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center"
              >
                <select
                  value={block.weekday}
                  onChange={(e) =>
                    updateBlock(
                      idx,
                      "weekday",
                      Number(e.target.value)
                    )
                  }
                  className="col-span-5 p-2 rounded-lg border"
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>

                <input
                  type="time"
                  value={block.start_time}
                  onChange={(e) =>
                    updateBlock(
                      idx,
                      "start_time",
                      e.target.value
                    )
                  }
                  className="col-span-3 p-2 rounded-lg border"
                />

                <input
                  type="time"
                  value={block.end_time}
                  onChange={(e) =>
                    updateBlock(
                      idx,
                      "end_time",
                      e.target.value
                    )
                  }
                  className="col-span-3 p-2 rounded-lg border"
                />

                <button
                  type="button"
                  onClick={() => removeBlock(idx)}
                  className="col-span-1 text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Create Template
          </button>
        </form>

        {/* Add override */}
        <form
          onSubmit={handleCreateOverride}
          className="bg-white rounded-3xl shadow-md p-6 space-y-4 h-fit"
        >
          <h3 className="font-semibold text-lg">
            Add Override
          </h3>

          <select
            value={overrideForm.override_type}
            onChange={(e) =>
              setOverrideForm({
                ...overrideForm,
                override_type: e.target
                  .value as OverrideType,
              })
            }
            className="w-full p-3 rounded-xl border"
          >
            <option value="UNAVAILABLE">
              Unavailable
            </option>
            <option value="EXTRA_HOURS">
              Extra Hours
            </option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-500">
                From
              </label>
              <input
                type="datetime-local"
                value={overrideForm.start_datetime}
                onChange={(e) =>
                  setOverrideForm({
                    ...overrideForm,
                    start_datetime: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                To
              </label>
              <input
                type="datetime-local"
                value={overrideForm.end_datetime}
                onChange={(e) =>
                  setOverrideForm({
                    ...overrideForm,
                    end_datetime: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border"
              />
            </div>
          </div>

          <textarea
            placeholder="Reason (optional)"
            value={overrideForm.reason}
            onChange={(e) =>
              setOverrideForm({
                ...overrideForm,
                reason: e.target.value,
              })
            }
            className="w-full p-3 rounded-xl border"
            rows={2}
          />

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Add Override
          </button>
        </form>
      </div>

      {/* Existing templates */}
      <div className="bg-white rounded-3xl shadow-md p-6">
        <h3 className="font-semibold text-lg mb-4">
          Active Templates
        </h3>

        {templates.length === 0 ? (
          <p className="text-slate-400">
            No templates yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => (
              <li
                key={t.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {t.template_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {t.appointment_duration} min slots ·
                    from{" "}
                    {new Date(
                      t.effective_start_date
                    ).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleDeleteTemplate(t.id)
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Existing overrides */}
      <div className="bg-white rounded-3xl shadow-md p-6">
        <h3 className="font-semibold text-lg mb-4">
          Overrides
        </h3>

        {overrides.length === 0 ? (
          <p className="text-slate-400">
            No overrides yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {o.override_type === "UNAVAILABLE"
                      ? "Unavailable"
                      : "Extra Hours"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(
                      o.start_datetime
                    ).toLocaleString()}{" "}
                    →{" "}
                    {new Date(
                      o.end_datetime
                    ).toLocaleString()}
                  </p>
                  {o.reason && (
                    <p className="text-sm text-slate-400">
                      {o.reason}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    handleDeleteOverride(o.id)
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Schedule;
