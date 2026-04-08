-- Fix Czech encoding mojibake in company and service names
-- This runs idempotently via apply-sql on every deploy.
-- Only updates rows where the name doesn't match expected UTF-8 text.

-- Fix company names
UPDATE companies SET name = 'Salon Krása'
  WHERE slug = 'salon-krasa' AND name != 'Salon Krása';

UPDATE companies SET description = 'Moderní beauty salon v centru Prahy'
  WHERE slug = 'salon-krasa' AND (description IS NULL OR description != 'Moderní beauty salon v centru Prahy');

UPDATE companies SET name = 'Pánské holičství U Brouska'
  WHERE slug = 'panske-holicstvi-u-brouska' AND name != 'Pánské holičství U Brouska';

UPDATE companies SET description = 'Tradiční pánské holičství'
  WHERE slug = 'panske-holicstvi-u-brouska' AND (description IS NULL OR description != 'Tradiční pánské holičství');

UPDATE companies SET description = 'Moderní fitness centrum s osobním tréninkem'
  WHERE slug = 'fitzone-gym' AND (description IS NULL OR description != 'Moderní fitness centrum s osobním tréninkem');

-- Fix service names that may have encoding issues
-- Use a generic approach: try to fix common Czech characters
-- á=\xC3\xA1 é=\xC3\xA9 í=\xC3\xAD ó=\xC3\xB3 ú=\xC3\xBA ý=\xC3\xBD
-- ě=\xC4\x9B š=\xC5\xA1 č=\xC4\x8D ř=\xC5\x99 ž=\xC5\xBE ů=\xC5\xAF ň=\xC5\x88 ť=\xC5\xA5 ď=\xC4\x8F

-- Fix known service names for salon-krasa (company_id from slug lookup)
DO $$
DECLARE
  v_company_id integer;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE slug = 'salon-krasa';
  IF v_company_id IS NOT NULL THEN
    UPDATE services SET name = 'Střih vlasů', description = 'Střih vlasů - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%vlasů%' AND name LIKE '%Stř%' AND name != 'Střih vlasů';
    UPDATE services SET name = 'Barvení vlasů', description = 'Barvení vlasů - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%Barven%' AND name != 'Barvení vlasů';
    UPDATE services SET name = 'Melírování', description = 'Melírování - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%Mel%rov%' AND name != 'Melírování';
    UPDATE services SET name = 'Manikúra', description = 'Manikúra - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%Manik%ra%' AND name != 'Manikúra';
    UPDATE services SET name = 'Pedikúra', description = 'Pedikúra - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%Pedik%ra%' AND name != 'Pedikúra';
    UPDATE services SET name = 'Masáž obličeje', description = 'Masáž obličeje - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%Mas%ob%' AND name != 'Masáž obličeje';
    UPDATE services SET name = 'Gelové nehty', description = 'Gelové nehty - profesionální služba'
      WHERE company_id = v_company_id AND name LIKE '%Gel%neht%' AND name != 'Gelové nehty';
  END IF;
END $$;
