import BillingForm from "./BillingForm";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>HeirVault – Life Insurance Registry</h1>
      <p style={{ marginTop: 8 }}>
        One-time engagement to organize and register all life insurance policies into a secure registry.
      </p>
      <div style={{ marginTop: 24 }}>
        <BillingForm />
      </div>
    </div>
  );
}
