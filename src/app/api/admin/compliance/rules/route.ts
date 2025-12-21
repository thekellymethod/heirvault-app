import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/errors";

// In-memory storage for compliance rules (TODO: Replace with database)
// In production, this should be stored in a database table
const complianceRules: Array<{
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  lastUpdated: string;
}> = [
  {
    id: "1",
    name: "Data Retention Policy",
    description: "Client data must be retained for a minimum of 7 years as required by state bar regulations.",
    status: "active",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Access Control",
    description: "Only verified attorneys with active bar numbers may access client data.",
    status: "active",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Audit Trail",
    description: "All data access and modifications must be logged for compliance purposes.",
    status: "active",
    lastUpdated: new Date().toISOString(),
  },
];

/**
 * Get compliance rules
 * Admin-only endpoint
 */
export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({ rules: complianceRules });
  } catch (error: unknown) {
    console.error("Error fetching compliance rules:", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch compliance rules" },
      { status: 500 }
    );
  }
}

/**
 * Create or update compliance rule
 * Admin-only endpoint
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, name, description, status } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing rule
      const index = complianceRules.findIndex((r) => r.id === id);
      if (index !== -1) {
        complianceRules[index] = {
          id,
          name,
          description,
          status: status || "active",
          lastUpdated: new Date().toISOString(),
        };
        return NextResponse.json({ success: true, rule: complianceRules[index] });
      } else {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }
    } else {
      // Create new rule
      const newRule = {
        id: Date.now().toString(),
        name,
        description,
        status: status || "active",
        lastUpdated: new Date().toISOString(),
      };
      complianceRules.push(newRule);
      return NextResponse.json({ success: true, rule: newRule });
    }
  } catch (error: unknown) {
    console.error("Error saving compliance rule:", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage || "Failed to save compliance rule" },
      { status: 500 }
    );
  }
}

