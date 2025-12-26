import { BillingPlan } from "./db";
import type { BillingPlan as BillingPlanType } from "@prisma/client";

export function getClientLimitForPlan(plan: BillingPlanType): number | null {
  switch (plan) {
    case "FREE":
      return 3;
    case "SOLO":
      return 100;
    case "SMALL_FIRM":
      return 500;
    case "ENTERPRISE":
      return null; // unlimited / contract based
    default:
      return 3;
  }
}

