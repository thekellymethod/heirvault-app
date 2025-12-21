export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>HeirVault</h1>
      <p>
        Secure registry for life insurance policy records. Intake is designed to be simple; attorney access is controlled.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <a href="/intake">Submit a Policy (Intake)</a>
        <a href="/login">Attorney Login</a>
      </div>
    </main>
  );
}
