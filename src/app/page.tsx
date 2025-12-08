"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      {/* ... your hero / marketing copy ... */}

      <div className="mt-8 flex gap-4">
        {/* Start for Attorney */}
        <Button onClick={() => router.push("/dashboard")}>
          Start for attorneys
        </Button>

        {/* If you have a client portal CTA */}
        <Button variant="outline" onClick={() => router.push("/client-portal")}>
          Client login
        </Button>
      </div>
    </main>
  );
}
