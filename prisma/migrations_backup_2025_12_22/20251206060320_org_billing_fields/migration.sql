-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "billing_plan" "BillingPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "billing_status" TEXT,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;
