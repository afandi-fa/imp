ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'unpaid'::text;--> statement-breakpoint
DROP TYPE "public"."invoice_status";--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'paid', 'overdue', 'suspended');--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'unpaid'::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE "public"."invoice_status" USING "status"::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "instance_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "plan_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "period_start" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "period_end" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "xendit_invoice_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "xendit_payment_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "xendit_payment_method" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;