CREATE TYPE "public"."node_status" AS ENUM('online', 'offline', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('compute', 'storage', 'gpu');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('vps', 'lxc', 'k8s_node', 'dedicated');--> statement-breakpoint
CREATE TYPE "public"."instance_status" AS ENUM('pending', 'provisioning', 'running', 'stopped', 'terminated', 'error');--> statement-breakpoint
CREATE TYPE "public"."os_image" AS ENUM('ubuntu-22.04', 'ubuntu-24.04', 'debian-12', 'alpine-3.19');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ip_address" text NOT NULL,
	"region" text NOT NULL,
	"type" "node_type" DEFAULT 'compute' NOT NULL,
	"status" "node_status" DEFAULT 'online' NOT NULL,
	"total_ram_gb" integer NOT NULL,
	"total_cpu_cores" integer NOT NULL,
	"total_storage_gb" integer NOT NULL,
	"used_ram_gb" integer DEFAULT 0 NOT NULL,
	"used_cpu_cores" integer DEFAULT 0 NOT NULL,
	"used_storage_gb" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "plan_type" NOT NULL,
	"ram_gb" integer NOT NULL,
	"cpu_cores" integer NOT NULL,
	"storage_gb" integer NOT NULL,
	"bandwidth_gb" integer NOT NULL,
	"price_monthly" numeric(10, 2) NOT NULL,
	"stock_limit" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"node_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "instance_status" DEFAULT 'pending' NOT NULL,
	"os_image" "os_image" NOT NULL,
	"ip_address" text,
	"ssh_port" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"terminated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instance_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"due_date" date NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");