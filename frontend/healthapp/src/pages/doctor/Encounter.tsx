import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getDoctorAppointments,
  createEncounter,
  createDiagnosis,
  createPrescription,
  createLabOrder,
  listPharmacyFacilities,
} from "../../api/doctor.api";
import MedicationSelect from "../../components/doctor/MedicationSelect";
import type {
  DoctorAppointment,
  PharmacyFacilityOption,
} from "../../types/doctor";

const isToday = (value: string) =>
  new Date(value).toDateString() === new Date().toDateString();

const Encounter = () => {
  const [appointments, setAppointments] = useState<
    DoctorAppointment[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState("");
  const [encounterId, setEncounterId] = useState<
    string | null
  >(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    chief_complaint: "",
    bp: "",
    temperature: "",
    pulse: "",
    soap_note: "",
    billing_codes: "",
  });

  const [diagnosis, setDiagnosis] = useState({
    icd10_code: "",
    description: "",
    is_chronic: false,
  });

  const [prescription, setPrescription] = useState({
    medication_id: "",
    dose: "",
    frequency: "",
    duration_days: 7,
    refills_allowed: 0,
    instructions: "",
    pharmacy_facility_id: "",
  });

  const [pharmacies, setPharmacies] = useState<
    PharmacyFacilityOption[]
  >([]);

  const [labTests, setLabTests] = useState<
    { test_name: string; instructions: string }[]
  >([{ test_name: "", instructions: "" }]);
  const [labSaving, setLabSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [data, pharms] = await Promise.all([
          getDoctorAppointments(),
          listPharmacyFacilities().catch(() => []),
        ]);
        setAppointments(data);
        setPharmacies(pharms);
        /* Pre-select first pharmacy so the form is usable immediately. */
        if (pharms.length > 0) {
          setPrescription((prev) =>
            prev.pharmacy_facility_id
              ? prev
              : { ...prev, pharmacy_facility_id: pharms[0].id }
          );
        }
      } catch {
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* Doctors run encounters only for the patients booked for today —
     past and future bookings are intentionally hidden here. */
  const todaysAppointments = appointments.filter((a) =>
    isToday(a.scheduled_at)
  );

  const selected = appointments.find(
    (a) => a.id === selectedId
  );

  const handleCreateEncounter = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selected) {
      toast.error("Select an appointment first");
      return;
    }

    try {
      setSaving(true);
      const res = await createEncounter({
        appointment_id: selected.id,
        provider_id: selected.provider_id,
        patient_id: selected.patient_id,
        chief_complaint: form.chief_complaint,
        vitals: {
          bp: form.bp,
          temperature: form.temperature,
          pulse: form.pulse,
        },
        soap_note: form.soap_note,
        billing_codes: form.billing_codes
          ? form.billing_codes
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : undefined,
      });

      setEncounterId(res.encounterId);
      toast.success("Encounter started");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to start encounter"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddDiagnosis = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    if (!encounterId) return;

    try {
      await createDiagnosis({
        encounter_id: encounterId,
        icd10_code: diagnosis.icd10_code,
        description: diagnosis.description,
        is_chronic: diagnosis.is_chronic,
      });
      toast.success("Diagnosis added");
      setDiagnosis({
        icd10_code: "",
        description: "",
        is_chronic: false,
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to add diagnosis"
      );
    }
  };

  const handleAddPrescription = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    if (!encounterId || !selected) return;

    if (!prescription.medication_id) {
      toast.error("Please select a medication");
      return;
    }

    if (!prescription.pharmacy_facility_id) {
      toast.error("Please choose a pharmacy to route this prescription");
      return;
    }

    try {
      await createPrescription({
        encounter_id: encounterId,
        patient_id: selected.patient_id,
        medication_id: prescription.medication_id,
        dose: prescription.dose,
        frequency: prescription.frequency,
        duration_days: prescription.duration_days,
        refills_allowed: prescription.refills_allowed,
        instructions: prescription.instructions,
        pharmacy_facility_id: prescription.pharmacy_facility_id,
      });
      toast.success("Prescription created");
      setPrescription({
        medication_id: "",
        dose: "",
        frequency: "",
        duration_days: 7,
        refills_allowed: 0,
        instructions: "",
        /* Keep the chosen pharmacy so multiple rx in one encounter route the same way. */
        pharmacy_facility_id: prescription.pharmacy_facility_id,
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to create prescription"
      );
    }
  };

  const updateLabTest = (
    index: number,
    field: "test_name" | "instructions",
    value: string
  ) => {
    setLabTests((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      )
    );
  };

  const addLabTestRow = () =>
    setLabTests((prev) => [
      ...prev,
      { test_name: "", instructions: "" },
    ]);

  const removeLabTestRow = (index: number) =>
    setLabTests((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((_, i) => i !== index)
    );

  const handleAddLabOrder = async () => {
    if (!encounterId || !selected) return;

    const tests = labTests
      .map((t) => ({
        test_name: t.test_name.trim(),
        instructions: t.instructions.trim() || undefined,
      }))
      .filter((t) => t.test_name.length > 0);

    if (tests.length === 0) {
      toast.error("Add at least one test for the lab order");
      return;
    }

    try {
      setLabSaving(true);
      await createLabOrder({
        encounter_id: encounterId,
        patient_id: selected.patient_id,
        tests,
      });
      toast.success("Lab order created");
      setLabTests([{ test_name: "", instructions: "" }]);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to create lab order"
      );
    } finally {
      setLabSaving(false);
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
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-3xl font-bold">
        Clinical Encounter
      </h1>

      {/* Encounter form */}
      <form
        onSubmit={handleCreateEncounter}
        className="bg-white rounded-3xl shadow-md p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">
          1. Start Encounter
        </h3>

        <select
          value={selectedId}
          onChange={(e) =>
            setSelectedId(e.target.value)
          }
          disabled={!!encounterId}
          className="w-full p-3 rounded-xl border"
        >
          <option value="">
            {todaysAppointments.length === 0
              ? "No patients scheduled for today"
              : "Select today's patient…"}
          </option>
          {todaysAppointments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.first_name} {a.last_name}
              {a.mrn ? ` · MRN ${a.mrn}` : ""}
              {a.dob
                ? ` · DOB ${new Date(a.dob).toLocaleDateString()}`
                : ""}
              {" — "}
              {new Date(a.scheduled_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 -mt-2">
          Only patients with an appointment today are shown.
        </p>

        {selected && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/60">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-semibold shrink-0">
              {(selected.first_name?.[0] || "?").toUpperCase()}
              {(selected.last_name?.[0] || "").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">
                {selected.first_name} {selected.last_name}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>
                  <span className="text-slate-400">MRN:</span>{" "}
                  <span className="font-mono font-semibold text-slate-800">
                    {selected.mrn || "—"}
                  </span>
                </span>
                {selected.dob && (
                  <span>
                    <span className="text-slate-400">DOB:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {new Date(selected.dob).toLocaleDateString()}
                    </span>
                  </span>
                )}
                {selected.sex && (
                  <span>
                    <span className="text-slate-400">Sex:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {selected.sex}
                    </span>
                  </span>
                )}
                <span>
                  <span className="text-slate-400">Appt:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {new Date(selected.scheduled_at).toLocaleString()}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-blue-700 mt-2">
                Verify the patient before adding any
                prescription, diagnosis or lab order.
              </p>
            </div>
          </div>
        )}

        <input
          placeholder="Chief complaint"
          value={form.chief_complaint}
          onChange={(e) =>
            setForm({
              ...form,
              chief_complaint: e.target.value,
            })
          }
          disabled={!!encounterId}
          className="w-full p-3 rounded-xl border"
        />

        <div className="grid grid-cols-3 gap-3">
          <input
            placeholder="BP (120/80)"
            value={form.bp}
            onChange={(e) =>
              setForm({ ...form, bp: e.target.value })
            }
            disabled={!!encounterId}
            className="w-full p-3 rounded-xl border"
          />
          <input
            placeholder="Temp (99F)"
            value={form.temperature}
            onChange={(e) =>
              setForm({
                ...form,
                temperature: e.target.value,
              })
            }
            disabled={!!encounterId}
            className="w-full p-3 rounded-xl border"
          />
          <input
            placeholder="Pulse (80)"
            value={form.pulse}
            onChange={(e) =>
              setForm({
                ...form,
                pulse: e.target.value,
              })
            }
            disabled={!!encounterId}
            className="w-full p-3 rounded-xl border"
          />
        </div>

        <textarea
          placeholder="SOAP note"
          value={form.soap_note}
          onChange={(e) =>
            setForm({
              ...form,
              soap_note: e.target.value,
            })
          }
          disabled={!!encounterId}
          rows={4}
          className="w-full p-3 rounded-xl border"
        />

        <input
          placeholder="Billing codes (comma separated, e.g. 99213)"
          value={form.billing_codes}
          onChange={(e) =>
            setForm({
              ...form,
              billing_codes: e.target.value,
            })
          }
          disabled={!!encounterId}
          className="w-full p-3 rounded-xl border"
        />

        {!encounterId && (
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Start Encounter"}
          </button>
        )}

        {encounterId && (
          <p className="text-green-600 text-sm font-medium">
            Encounter active. You can now add diagnoses,
            prescriptions and lab orders below.
          </p>
        )}
      </form>

      {encounterId && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Diagnosis */}
          <form
            onSubmit={handleAddDiagnosis}
            className="bg-white rounded-3xl shadow-md p-6 space-y-4"
          >
            <h3 className="font-semibold text-lg">
              2. Add Diagnosis
            </h3>

            <input
              placeholder="ICD-10 code"
              value={diagnosis.icd10_code}
              onChange={(e) =>
                setDiagnosis({
                  ...diagnosis,
                  icd10_code: e.target.value,
                })
              }
              className="w-full p-3 rounded-xl border"
            />

            <textarea
              placeholder="Description"
              value={diagnosis.description}
              onChange={(e) =>
                setDiagnosis({
                  ...diagnosis,
                  description: e.target.value,
                })
              }
              rows={2}
              className="w-full p-3 rounded-xl border"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={diagnosis.is_chronic}
                onChange={(e) =>
                  setDiagnosis({
                    ...diagnosis,
                    is_chronic: e.target.checked,
                  })
                }
              />
              Chronic condition
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Add Diagnosis
            </button>
          </form>

          {/* Prescription */}
          <form
            onSubmit={handleAddPrescription}
            className="bg-white rounded-3xl shadow-md p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h3 className="font-semibold text-lg">
                3. Add Prescription
              </h3>
              {selected && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-medium ring-1 ring-blue-200">
                  For: {selected.first_name} {selected.last_name}
                  {selected.mrn && (
                    <span className="font-mono text-blue-900">
                      · MRN {selected.mrn}
                    </span>
                  )}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Route to pharmacy
              </label>
              <select
                value={prescription.pharmacy_facility_id}
                onChange={(e) =>
                  setPrescription({
                    ...prescription,
                    pharmacy_facility_id: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border bg-white"
              >
                <option value="">
                  {pharmacies.length === 0
                    ? "No pharmacies configured"
                    : "Select pharmacy…"}
                </option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.address ? ` — ${p.address}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Only this pharmacy will see the prescription in their
                queue.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Medication
              </label>
              <MedicationSelect
                value={prescription.medication_id}
                onChange={(id) =>
                  setPrescription({
                    ...prescription,
                    medication_id: id,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Dose (500mg)"
                value={prescription.dose}
                onChange={(e) =>
                  setPrescription({
                    ...prescription,
                    dose: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border"
              />
              <input
                placeholder="Frequency (BID)"
                value={prescription.frequency}
                onChange={(e) =>
                  setPrescription({
                    ...prescription,
                    frequency: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  placeholder="Duration (days)"
                  value={prescription.duration_days}
                  onChange={(e) =>
                    setPrescription({
                      ...prescription,
                      duration_days: Number(
                        e.target.value
                      ),
                    })
                  }
                  className="w-full p-3 rounded-xl border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Refills allowed
                </label>
                <input
                  type="number"
                  placeholder="e.g. 3"
                  min={0}
                  value={prescription.refills_allowed}
                  onChange={(e) =>
                    setPrescription({
                      ...prescription,
                      refills_allowed: Math.max(
                        0,
                        Number(e.target.value)
                      ),
                    })
                  }
                  className="w-full p-3 rounded-xl border"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  How many times the patient can request a refill.
                </p>
              </div>
            </div>

            <textarea
              placeholder="Instructions"
              value={prescription.instructions}
              onChange={(e) =>
                setPrescription({
                  ...prescription,
                  instructions: e.target.value,
                })
              }
              rows={2}
              className="w-full p-3 rounded-xl border"
            />

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Add Prescription
            </button>
          </form>

          {/* Lab order */}
          <div className="bg-white rounded-3xl shadow-md p-6 space-y-4 lg:col-span-2">
            <h3 className="font-semibold text-lg">
              4. Lab Order
            </h3>
            <p className="text-sm text-slate-500">
              List the tests this patient needs to take. The
              patient will see them in their portal and upload
              the results back to you.
            </p>

            <div className="space-y-3">
              {labTests.map((t, idx) => (
                <div
                  key={idx}
                  className="grid md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-5">
                    <input
                      value={t.test_name}
                      onChange={(e) =>
                        updateLabTest(
                          idx,
                          "test_name",
                          e.target.value
                        )
                      }
                      placeholder="Test name (e.g. CBC, Lipid Profile)"
                      className="w-full p-3 rounded-xl border"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <input
                      value={t.instructions}
                      onChange={(e) =>
                        updateLabTest(
                          idx,
                          "instructions",
                          e.target.value
                        )
                      }
                      placeholder="Instructions (optional, e.g. fasting)"
                      className="w-full p-3 rounded-xl border"
                    />
                  </div>
                  <div className="md:col-span-1 flex md:justify-center">
                    <button
                      type="button"
                      onClick={() => removeLabTestRow(idx)}
                      disabled={labTests.length === 1}
                      className="px-3 py-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40"
                      title="Remove test"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addLabTestRow}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
              >
                + Add another test
              </button>
              <button
                type="button"
                onClick={handleAddLabOrder}
                disabled={labSaving}
                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              >
                {labSaving ? "Creating…" : "Create Lab Order"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Encounter;
