"use client";

import { type User } from "@/lib/auth";
import { type RegistryRecord } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Clock, CheckCircle, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DashboardViewProps {
  registries: RegistryRecord[];
  user: User;
}

export function DashboardView({ registries }: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter registries by search query
  const filteredRegistries = registries.filter((registry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      registry.decedentName.toLowerCase().includes(query) ||
      registry.status.toLowerCase().includes(query) ||
      registry.id.toLowerCase().includes(query)
    );
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800";
      case "PENDING_VERIFICATION":
        return "bg-yellow-100 text-yellow-800";
      case "DISCREPANCY":
        return "bg-red-100 text-red-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING_VERIFICATION":
        return <Clock className="h-4 w-4" />;
      case "DISCREPANCY":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Attorney Dashboard
          </h1>
          <p className="text-slateui-600">
            Overview of all registry records you have access to
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Total Registries</div>
            <div className="text-2xl font-bold text-ink-900">{registries.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Verified</div>
            <div className="text-2xl font-bold text-green-600">
              {registries.filter((r) => r.status === "VERIFIED").length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {registries.filter((r) => r.status === "PENDING_VERIFICATION").length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Discrepancy</div>
            <div className="text-2xl font-bold text-red-600">
              {registries.filter((r) => r.status === "DISCREPANCY").length}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slateui-400" />
            <Input
              type="text"
              placeholder="Search by decedent name, status, or registry ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Registries Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Decedent Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Versions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slateui-200">
                {filteredRegistries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slateui-500">
                      {searchQuery ? "No registries found matching your search." : "No registries found."}
                    </td>
                  </tr>
                ) : (
                  filteredRegistries.map((registry) => (
                    <tr key={registry.id} className="hover:bg-slateui-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-ink-900">{registry.decedentName}</div>
                        <div className="text-sm text-slateui-500 font-mono">{registry.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(registry.status)}`}
                        >
                          {getStatusIcon(registry.status)}
                          {registry.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        —
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        —
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {new Date(registry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/records/${registry.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

