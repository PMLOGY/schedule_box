CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer,
	"role" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_user_company_unique" UNIQUE("organization_id","user_id","company_id"),
	CONSTRAINT "org_member_role_check" CHECK ("organization_members"."role" IN ('franchise_owner', 'location_manager'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"owner_user_id" integer NOT NULL,
	"max_locations" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"comgate_transaction_id" varchar(255),
	"previous_status" varchar(20),
	"new_status" varchar(20),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"subscription_id" integer NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"vat_rate" numeric(5, 2) DEFAULT '21.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"status" varchar(20) DEFAULT 'draft',
	"period" varchar(20) NOT NULL,
	"comgate_transaction_id" varchar(255),
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"pdf_url" varchar(500),
	"seller_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_invoices_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "sub_invoices_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "sub_invoices_status_check" CHECK ("subscription_invoices"."status" IN ('draft', 'issued', 'paid', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"plan" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'trialing' NOT NULL,
	"billing_cycle" varchar(10) DEFAULT 'monthly' NOT NULL,
	"price_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"comgate_init_transaction_id" varchar(255),
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancelled_at" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"dunning_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
	CONSTRAINT "subscriptions_plan_check" CHECK ("subscriptions"."plan" IN ('free', 'essential', 'growth', 'ai_powered'))
);
--> statement-breakpoint
ALTER TABLE "companies" DROP CONSTRAINT "subscription_plan_check";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_org_members_org" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_members_user" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_members_company" ON "organization_members" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_organizations_slug" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_organizations_owner" ON "organizations" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_sub_events_subscription" ON "subscription_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_sub_events_type" ON "subscription_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_sub_events_comgate_tx" ON "subscription_events" USING btree ("comgate_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_sub_invoices_company" ON "subscription_invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_sub_invoices_subscription" ON "subscription_invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_company" ON "subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_period_end" ON "subscriptions" USING btree ("current_period_end");--> statement-breakpoint
CREATE INDEX "idx_companies_organization" ON "companies" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "subscription_plan_check" CHECK ("companies"."subscription_plan" IN ('free', 'essential', 'growth', 'ai_powered'));