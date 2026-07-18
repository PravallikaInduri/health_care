import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import patientRoutes from "./routes/patientRoutes";
import authRoutes from "./routes/authRoutes";
import providerRoutes from "./routes/providerRoutes";
import adminRoutes from "./routes/adminRoutes";
import appointmentRoutes from "./routes/appointmentRoutes";
import pharmacyRoutes from "./routes/pharmacyRoutes";
import hospitalRoutes from "./routes/hospitalRoutes";
import labRoutes from "./routes/labRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import messageRoutes from "./routes/messageRoutes";
import documentRoutes from "./routes/documentRoutes";
import refillRoutes from "./routes/refillRoutes";
import billingRoutes from "./routes/billingRoutes";
import medicationRoutes from "./routes/medicationRoutes";
import labReportRoutes from "./routes/labReportRoutes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "Healthcare API Running"
  });
});

/*
AUTH ROUTES
*/
app.use(
  "/api/auth",
  authRoutes
);

/*
PATIENT ROUTES
*/
app.use(
  "/api/healthcare/patients",
  patientRoutes
);

/*
APPOINTMENT ROUTES
*/
app.use(
  "/api/healthcare/appointments",
  appointmentRoutes
);

/*
PROVIDER ROUTES
*/
app.use(
  "/api/providers",
  providerRoutes
);

/*
ADMIN ROUTES
*/
app.use(
  "/api/admin",
  adminRoutes
);

/*
PHARMACY ROUTES (Sprint 6) — review prescriptions, dispense & refills
*/
app.use(
  "/api/pharmacy",
  pharmacyRoutes
);

/*
HOSPITAL PORTAL ROUTES (Sprint 9) — hospital admin manages doctors,
lab/pharmacy units and their staff.
*/
app.use(
  "/api/hospital",
  hospitalRoutes
);

/*
LAB PORTAL ROUTES (Sprint 9/11) — lab technician works orders routed to
their hospital lab unit.
*/
app.use(
  "/api/lab",
  labRoutes
);

/*
NOTIFICATIONS (Sprint 8) — per-user in-app notifications
*/
app.use(
  "/api/healthcare/notifications",
  notificationRoutes
);

/*
SPRINT 5 — Communication & Billing
*/
app.use(
  "/api/healthcare/messages",
  messageRoutes
);

app.use(
  "/api/healthcare/documents",
  documentRoutes
);

app.use(
  "/api/healthcare/refills",
  refillRoutes
);

app.use(
  "/api/healthcare/billing",
  billingRoutes
);

app.use(
  "/api/healthcare/medications",
  medicationRoutes
);

app.use(
  "/api",
  labReportRoutes
);

export default app;