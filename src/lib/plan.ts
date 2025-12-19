import { BillingPlan } from "./db";

export function getClientLimitForPlan(plan: BillingPlan): number | null {
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

