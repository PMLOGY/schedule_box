-- Update customer metrics after booking change
-- Recalculates: total_bookings, no_show_count, total_spent, last_visit_at

CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers SET
        total_bookings = (SELECT COUNT(*) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)),
        no_show_count = (SELECT COUNT(*) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'no_show'),
        total_spent = COALESCE((SELECT SUM(price - discount_amount) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'completed'), 0),
        last_visit_at = (SELECT MAX(end_time) FROM bookings WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'completed')
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_customer_metrics
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_customer_metrics();
