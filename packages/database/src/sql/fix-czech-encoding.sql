-- Fix Czech encoding mojibake in company and service names
-- This runs idempotently via apply-sql on every deploy.
-- Uses slug-only matching (unconditional SET) since garbled bytes won't match UTF-8 comparison.

-- Fix company names (always SET correct value by slug — idempotent)
UPDATE companies SET name = 'Salon Krása', description = 'Moderní beauty salon v centru Prahy'
  WHERE slug = 'salon-krasa';

UPDATE companies SET name = 'Pánské holičství U Brouska', description = 'Tradiční pánské holičství'
  WHERE slug = 'panske-holicstvi-u-brouska';

UPDATE companies SET description = 'Moderní fitness centrum s osobním tréninkem'
  WHERE slug = 'fitzone-gym';

-- Fix service names for salon-krasa
DO $$
DECLARE
  v_company_id integer;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE slug = 'salon-krasa';
  IF v_company_id IS NOT NULL THEN
    UPDATE services SET name = 'Střih vlasů', description = 'Střih vlasů - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%vlас%' OR (company_id = v_company_id AND LOWER(name) LIKE '%stri%' AND LOWER(name) LIKE '%vlas%');
    UPDATE services SET name = 'Barvení vlasů', description = 'Barvení vlasů - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%barven%';
    UPDATE services SET name = 'Melírování', description = 'Melírování - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%mel_rov%';
    UPDATE services SET name = 'Manikúra', description = 'Manikúra - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%manik_ra%';
    UPDATE services SET name = 'Pedikúra', description = 'Pedikúra - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%pedik_ra%';
    UPDATE services SET name = 'Masáž obličeje', description = 'Masáž obličeje - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%mas_%obli%';
    UPDATE services SET name = 'Gelové nehty', description = 'Gelové nehty - profesionální služba'
      WHERE company_id = v_company_id AND LOWER(name) LIKE '%gel%neht%';
  END IF;
END $$;
