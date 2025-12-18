import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";
import fs from "fs";
import path from "path";

type InsuranceCompany = {
  naic_code: string;
  group_code: string | null;
  statement_type: string | null;
  status: string | null;
  name: string;
};

export async function GET(req: NextRequest) {
  try {
    await requireAuth("attorney");
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Unauthorized" },
      { status: e.status || 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Load insurance companies from JSON file
    const jsonPath = path.join(process.cwd(), "insurance_companies.json");
    
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ companies: [] });
    }

    const fileContent = fs.readFileSync(jsonPath, "utf-8");
    const companies: InsuranceCompany[] = JSON.parse(fileContent);

    // Filter companies based on search query
    let filtered = companies;
    if (query) {
      const queryLower = query.toLowerCase();
      filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(queryLower) ||
          company.naic_code.includes(query)
      );
    }

    // Limit results
    const results = filtered.slice(0, limit);

    return NextResponse.json({
      companies: results.map((c) => ({
        naicCode: c.naic_code,
        groupCode: c.group_code,
        name: c.name,
        statementType: c.statement_type,
        status: c.status,
      })),
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("Error searching insurance companies:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search companies" },
      { status: 500 }
    );
  }
}

