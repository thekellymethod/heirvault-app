import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Attorney Login</h1>
      <div style={{ marginTop: 16 }}>
        <SignIn />
      </div>
    </main>
  );
}
