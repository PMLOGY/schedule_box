-- Deferred foreign key constraints for bookings table
-- These FKs link bookings to Wave 2 tables (coupons, gift_cards, video_meetings)
-- ON DELETE SET NULL allows deletion of referenced records without cascading
-- Idempotent: only adds constraints if they don't already exist

-- Link bookings to coupons (optional, nullable)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_coupon') THEN
        ALTER TABLE bookings
            ADD CONSTRAINT fk_bookings_coupon
            FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- Link bookings to gift cards (optional, nullable)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_gift_card') THEN
        ALTER TABLE bookings
            ADD CONSTRAINT fk_bookings_gift_card
            FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- Link bookings to video meetings (optional, nullable)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_video_meeting') THEN
        ALTER TABLE bookings
            ADD CONSTRAINT fk_bookings_video_meeting
            FOREIGN KEY (video_meeting_id) REFERENCES video_meetings(id) ON DELETE SET NULL;
    END IF;
END;
$$;
