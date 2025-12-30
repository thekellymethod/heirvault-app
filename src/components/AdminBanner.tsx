// src/components/AdminBanner.tsx
"use client";

import { useAdminStatus } from "@/hooks/useAdminStatus";

export default function AdminBanner() {
  const { loading, isAdmin } = useAdminStatus();

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="border-b bg-red-950 border-red-900">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center">
        <div className="text-sm text-red-100 font-medium">
          ⚠️ Admin Mode Active
        </div>
      </div>
    </div>
  );
}
