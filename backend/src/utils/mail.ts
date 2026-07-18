import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const BRAND_NAME = "HealthCare Portal";

/*
Reusable formal email layout.
Table-based with inline styles for maximum email-client
compatibility. The branded header acts as the portal logo.
*/
const emailLayout = (opts: {
  title: string;
  body: string;
}) => `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(15,23,42,0.08);">

            <!-- Logo / header -->
            <tr>
              <td style="background:linear-gradient(135deg,#2563eb,#06b6d4);padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <span style="display:inline-block;width:46px;height:46px;line-height:46px;text-align:center;background:rgba(255,255,255,0.18);border-radius:14px;color:#ffffff;font-size:24px;">&#10084;</span>
                    </td>
                    <td style="vertical-align:middle;padding-left:14px;">
                      <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">${BRAND_NAME}</span><br/>
                      <span style="color:#e0f2fe;font-size:12px;">Your health, our priority</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding:32px 32px 0;">
                <h1 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">${opts.title}</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:16px 32px 32px;color:#334155;font-size:15px;line-height:1.7;">
                ${opts.body}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;color:#94a3b8;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 4px;">This is an automated message from ${BRAND_NAME}. Please do not reply to this email.</p>
                <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const formatDateTime = (
  value: string | Date
) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short"
  });

export const sendOTPEmail = async (
  email: string,
  otp: string
) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Email Verification Code`,
    html: emailLayout({
      title: "Verify Your Email Address",
      body: `
        <p>Dear User,</p>
        <p>
          Thank you for registering with ${BRAND_NAME}.
          Please use the verification code below to complete
          your registration.
        </p>
        <div style="margin:24px 0;text-align:center;">
          <span style="display:inline-block;padding:14px 28px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#2563eb;font-size:30px;font-weight:bold;letter-spacing:6px;">
            ${otp}
          </span>
        </div>
        <p>
          This code is valid for <strong>10 minutes</strong>.
          For your security, please do not share it with anyone.
        </p>
        <p>If you did not request this, you may safely ignore this email.</p>
      `
    })
  });

};

export const sendPasswordResetEmail = async (
  email: string,
  otp: string
) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Password Reset Code`,
    html: emailLayout({
      title: "Reset Your Password",
      body: `
        <p>Dear User,</p>
        <p>
          We received a request to reset the password for your
          ${BRAND_NAME} account. Use the verification code below to
          continue.
        </p>
        <div style="margin:24px 0;text-align:center;">
          <span style="display:inline-block;padding:14px 28px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;color:#c2410c;font-size:30px;font-weight:bold;letter-spacing:6px;">
            ${otp}
          </span>
        </div>
        <p>
          This code is valid for <strong>10 minutes</strong>. If you
          did not request a password reset, please ignore this email
          and your password will remain unchanged.
        </p>
      `
    })
  });

};

export const sendTwoFactorCodeEmail = async (
  email: string,
  otp: string
) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Your Security Code`,
    html: emailLayout({
      title: "Two-Factor Authentication Code",
      body: `
        <p>Dear User,</p>
        <p>
          Use the security code below to complete your request on
          ${BRAND_NAME}.
        </p>
        <div style="margin:24px 0;text-align:center;">
          <span style="display:inline-block;padding:14px 28px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;color:#4338ca;font-size:30px;font-weight:bold;letter-spacing:6px;">
            ${otp}
          </span>
        </div>
        <p>
          This code is valid for <strong>10 minutes</strong>.
          For your security, please do not share it with anyone.
        </p>
        <p>If you did not request this, please secure your account immediately.</p>
      `
    })
  });

};

export const sendDoctorApprovalEmail =
async (email: string) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Your Account Has Been Approved`,
    html: emailLayout({
      title: "Your Doctor Account Has Been Approved",
      body: `
        <p>Dear Doctor,</p>
        <p>
          We are pleased to inform you that your account on
          ${BRAND_NAME} has been reviewed and
          <strong>approved</strong> by our administration team.
        </p>
        <p>
          You may now sign in to your account and begin managing
          your profile, schedule, and patient appointments.
        </p>
        <p>Welcome aboard, and thank you for joining ${BRAND_NAME}.</p>
        <p>Warm regards,<br/>The ${BRAND_NAME} Team</p>
      `
    })
  });

};

export const sendDoctorRejectEmail =
async (
  email: string,
  reason: string
) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Update on Your Application`,
    html: emailLayout({
      title: "Update on Your Doctor Application",
      body: `
        <p>Dear Applicant,</p>
        <p>
          Thank you for your interest in joining ${BRAND_NAME}.
          After careful review, we regret to inform you that your
          application could not be approved at this time.
        </p>
        <div style="margin:20px 0;padding:14px 18px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#991b1b;">
          <strong>Reason:</strong> ${reason}
        </div>
        <p>
          If you believe this decision was made in error or wish to
          reapply with updated information, please contact our support team.
        </p>
        <p>Sincerely,<br/>The ${BRAND_NAME} Team</p>
      `
    })
  });

};

export const sendHospitalApprovalEmail =
async (email: string, hospitalName: string) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Your Hospital Has Been Approved`,
    html: emailLayout({
      title: "Your Hospital Has Been Approved",
      body: `
        <p>Hello,</p>
        <p>
          We are pleased to inform you that <strong>${hospitalName}</strong>
          has been reviewed and <strong>approved</strong> by our administration
          team on ${BRAND_NAME}.
        </p>
        <p>
          You may now sign in to your hospital portal to add your labs,
          pharmacies, and the staff who work in them.
        </p>
        <p>Welcome aboard,<br/>The ${BRAND_NAME} Team</p>
      `
    })
  });

};

export const sendHospitalRejectEmail =
async (
  email: string,
  hospitalName: string,
  reason: string
) => {

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${BRAND_NAME} — Update on Your Hospital Application`,
    html: emailLayout({
      title: "Update on Your Hospital Application",
      body: `
        <p>Hello,</p>
        <p>
          Thank you for registering <strong>${hospitalName}</strong> on
          ${BRAND_NAME}. After careful review, we regret to inform you that
          your application could not be approved at this time.
        </p>
        <div style="margin:20px 0;padding:14px 18px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#991b1b;">
          <strong>Reason:</strong> ${reason}
        </div>
        <p>
          If you believe this was in error or wish to reapply with updated
          documents, please contact our support team.
        </p>
        <p>Sincerely,<br/>The ${BRAND_NAME} Team</p>
      `
    })
  });

};

/* ----------------------------------------------------------------
   STAFF CREDENTIALS — sent when a hospital admin creates a lab-tech
   or pharmacist account so they can sign in to their portal.
-----------------------------------------------------------------*/
export const sendStaffCredentialsEmail = async (params: {
  email: string;
  name?: string | null;
  password: string;
  roleLabel: string;
  unitName: string;
  hospitalName: string;
  loginUrl?: string;
}) => {
  const loginUrl = params.loginUrl || "http://localhost:5173/login";

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;width:140px;">${label}</td>
      <td style="padding:6px 0;color:#0f172a;font-weight:600;">${value}</td>
    </tr>
  `;

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: params.email,
    subject: `${BRAND_NAME} — Your ${params.roleLabel} Account`,
    html: emailLayout({
      title: `Welcome to ${params.hospitalName}`,
      body: `
        <p>Dear ${params.name || "Team Member"},</p>
        <p>
          An account has been created for you on ${BRAND_NAME} as a
          <strong>${params.roleLabel}</strong> for
          <strong>${params.unitName}</strong> at
          <strong>${params.hospitalName}</strong>.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;font-size:14px;border:1px solid #e2e8f0;border-radius:12px;padding:8px 16px;">
          ${detailRow("Login Email", params.email)}
          ${detailRow("Temporary Password", params.password)}
        </table>
        <p style="margin-top:24px;">
          <a href="${loginUrl}"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
            Sign in to your portal
          </a>
        </p>
        <p>
          For your security, please change your password after your first
          sign-in. Do not share these credentials with anyone.
        </p>
        <p>Welcome aboard,<br/>The ${BRAND_NAME} Team</p>
      `,
    }),
  });
};

export const sendAppointmentConfirmedEmail =
async (params: {
  email: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string | Date;
  type?: string;
  facilityName?: string | null;
  meetingLink?: string | null;
}) => {

  const detailRow = (
    label: string,
    value: string
  ) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;width:140px;">${label}</td>
      <td style="padding:6px 0;color:#0f172a;font-weight:600;">${value}</td>
    </tr>
  `;

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: params.email,
    subject: `${BRAND_NAME} — Appointment Confirmed`,
    html: emailLayout({
      title: "Your Appointment Is Confirmed",
      body: `
        <p>Dear ${params.patientName},</p>
        <p>
          We are pleased to confirm your upcoming appointment with
          <strong>Dr. ${params.doctorName}</strong>. The details are
          provided below.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;font-size:14px;border:1px solid #e2e8f0;border-radius:12px;padding:8px 16px;">
          ${detailRow("Date & Time", formatDateTime(params.scheduledAt))}
          ${detailRow("Consultation", params.type || "IN_PERSON")}
          ${
            params.facilityName
              ? detailRow("Facility", params.facilityName)
              : ""
          }
          ${
            params.meetingLink
              ? detailRow(
                  "Video Link",
                  `<a href="${params.meetingLink}" style="color:#2563eb;">Join consultation</a>`
                )
              : ""
          }
        </table>
        <p>
          Kindly arrive a few minutes early. If you need to cancel or
          reschedule, please do so through your patient portal.
        </p>
        <p>Wishing you good health,<br/>The ${BRAND_NAME} Team</p>
      `
    })
  });

};

export const sendAppointmentCancelledEmail =
async (params: {
  email: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string | Date;
  cancelledBy?: "PATIENT" | "PROVIDER";
}) => {

  const byText =
    params.cancelledBy === "PROVIDER"
      ? "by the doctor's office"
      : params.cancelledBy === "PATIENT"
      ? "at your request"
      : "";

  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: params.email,
    subject: `${BRAND_NAME} — Appointment Cancelled`,
    html: emailLayout({
      title: "Your Appointment Has Been Cancelled",
      body: `
        <p>Dear ${params.patientName},</p>
        <p>
          We are writing to inform you that your appointment with
          <strong>Dr. ${params.doctorName}</strong>, scheduled for
          <strong>${formatDateTime(params.scheduledAt)}</strong>,
          has been cancelled ${byText}.
        </p>
        <p>
          If this was not intended, or if you would like to book a new
          appointment, please visit your patient portal at your convenience.
        </p>
        <p>We apologise for the inconvenience caused.</p>
        <p>Kind regards,<br/>The ${BRAND_NAME} Team</p>
      `
    })
  });

};

/* ----------------------------------------------------------------
   PROVIDER UNAVAILABLE — sent when an admin marks a doctor unavailable
   for a window that contains the patient's existing appointment.
-----------------------------------------------------------------*/
export const sendProviderUnavailableEmail =
async (params: {
  email: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string | Date;
  reason?: string | null;
  alternativesUrl?: string | null;
}) => {
  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: params.email,
    subject: `${BRAND_NAME} — Action Needed: Doctor Unavailable`,
    html: emailLayout({
      title: "Action Needed for Your Appointment",
      body: `
        <p>Dear ${params.patientName},</p>
        <p>
          We regret to inform you that <strong>Dr. ${params.doctorName}</strong>
          will not be available for your appointment on
          <strong>${formatDateTime(params.scheduledAt)}</strong>.
        </p>
        ${
          params.reason
            ? `<p style="color:#475569;"><em>Reason: ${params.reason}</em></p>`
            : ""
        }
        <p>
          Please log in to your patient portal to choose one of the following:
        </p>
        <ul style="color:#334155;line-height:1.8;">
          <li>Pick a different time with the same doctor</li>
          <li>Choose another available doctor in the same department</li>
          <li>Cancel and request a refund</li>
        </ul>
        ${
          params.alternativesUrl
            ? `<p style="margin-top:24px;">
                 <a href="${params.alternativesUrl}"
                    style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
                   View Alternatives
                 </a>
               </p>`
            : ""
        }
        <p>
          Your existing payment will be carried over automatically when you
          re-book, or refunded if you choose to cancel.
        </p>
        <p>We apologise for the inconvenience and appreciate your understanding.</p>
        <p>Kind regards,<br/>The ${BRAND_NAME} Team</p>
      `,
    }),
  });
};

export const sendLabReportReadyEmail = async (params: {
  email: string;
  patientName: string;
  testName: string;
  reportDate: string;
}) => {
  await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: params.email,
    subject: "Your Lab Report is Ready",
    html: emailLayout({
      title: "Your Lab Report is Ready",
      body: `
        <p>Dear ${params.patientName},</p>
        <p>
          Your laboratory report for <strong>${params.testName}</strong>
          has been uploaded and is now available.
        </p>
        <p><strong>Report Date:</strong> ${params.reportDate}</p>
        <p>You can view or download your report from your Patient Dashboard.</p>
        <p>Thank you,<br/>Healthcare Portal Team</p>
      `,
    }),
  });
};

export default transporter;
