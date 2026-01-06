import OutreachConsole from "./ui";

export const dynamic = "force-dynamic";

export default function AdminOutreachPage() {
  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin – Attorney Outreach</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        Send a single invite or bulk-send personalized outreach emails via Resend.
      </p>

      <div style={{ marginTop: 18 }}>
        <OutreachConsole />
      </div>

      <div style={{ marginTop: 22, fontSize: 12, opacity: 0.75 }}>
        Tip: Bulk format supports CSV with headers: <b>firm, attorney, email</b>
      </div>
    </div>
  );
}
