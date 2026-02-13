CREATE TABLE "competitor_monitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"competitor_name" varchar(255) NOT NULL,
	"competitor_url" varchar(500) NOT NULL,
	"scrape_frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_scraped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "competitor_monitors_frequency_check" CHECK ("competitor_monitors"."scrape_frequency" IN ('daily', 'weekly', 'monthly'))
);
--> statement-breakpoint
DROP VIEW "public"."v_customer_metrics";--> statement-breakpoint
DROP INDEX "idx_api_keys_hash";--> statement-breakpoint
DROP INDEX "idx_companies_slug";--> statement-breakpoint
DROP INDEX "idx_refresh_tokens_hash";--> statement-breakpoint
DROP INDEX "idx_coupons_company";--> statement-breakpoint
DROP INDEX "idx_coupons_code";--> statement-breakpoint
DROP INDEX "idx_gift_cards_code";--> statement-breakpoint
DROP INDEX "idx_loyalty_programs_company";--> statement-breakpoint
DROP INDEX "idx_whitelabel_company";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "competitor_monitors" ADD CONSTRAINT "competitor_monitors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_competitor_monitors_company" ON "competitor_monitors" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_video_meeting_id_video_meetings_id_fk" FOREIGN KEY ("video_meeting_id") REFERENCES "public"."video_meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."v_customer_metrics" AS (select "id", "company_id", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.deleted_at IS NULL
      ), 0) as "total_bookings", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'completed'
          AND b.deleted_at IS NULL
      ), 0) as "completed_bookings", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'cancelled'
          AND b.deleted_at IS NULL
      ), 0) as "cancelled_bookings", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'no_show'
          AND b.deleted_at IS NULL
      ), 0) as "no_show_count", COALESCE((
        SELECT SUM(b.price - b.discount_amount)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'completed'
          AND b.deleted_at IS NULL
      ), 0) as "total_revenue", (
        SELECT MAX(b.start_time)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.deleted_at IS NULL
      ) as "last_booking_date", CASE
        WHEN (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        ) IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        ))::INTEGER
        ELSE NULL
      END as "days_since_last_booking", "health_score", "clv_predicted", CASE
        WHEN "deleted_at" IS NOT NULL THEN 'deleted'
        WHEN (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        ) IS NULL THEN 'new'
        WHEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        )) > 180 THEN 'dormant'
        WHEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        )) > 90 THEN 'at_risk'
        ELSE 'active'
      END as "status" from "customers");