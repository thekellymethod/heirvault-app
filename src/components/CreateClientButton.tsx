// src/components/CreateClientButton.tsx
"use client";

import Link from "next/link";
import { useRegistryGate } from "@/hooks/useRegistryGate";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export function CreateClientButton() {
  const { ready, active, gate } = useRegistryGate();

  if (!ready) {
    return (
      <Button className="btn-primary flex items-center gap-2" disabled>
        <User className="h-4 w-4" />
        New Client
      </Button>
    );
  }

  if (!active) {
    return (
      <Link href="/dashboard/billing?blocked=1">
        <Button
          variant="outline"
          className="flex items-center gap-2 opacity-70"
          title="Activate billing to register new clients"
        >
          <User className="h-4 w-4" />
          Activate to Register Clients
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/dashboard/clients/new">
      <Button className="btn-primary flex items-center gap-2">
        <User className="h-4 w-4" />
        New Client
      </Button>
    </Link>
  );
}

