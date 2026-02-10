-- Deferred foreign key constraints for bookings table
-- These FKs link bookings to Wave 2 tables (coupons, gift_cards, video_meetings)
-- ON DELETE SET NULL allows deletion of referenced records without cascading

-- Link bookings to coupons (optional, nullable)
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- Link bookings to gift cards (optional, nullable)
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_gift_card
    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;

-- Link bookings to video meetings (optional, nullable)
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_video_meeting
    FOREIGN KEY (video_meeting_id) REFERENCES video_meetings(id) ON DELETE SET NULL;
