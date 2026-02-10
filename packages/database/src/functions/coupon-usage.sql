-- Increment coupon usage count
-- Automatically increments coupons.current_uses when a coupon is used

CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons SET current_uses = current_uses + 1 WHERE id = NEW.coupon_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coupon_usage_increment
AFTER INSERT ON coupon_usage
FOR EACH ROW EXECUTE FUNCTION increment_coupon_usage();
