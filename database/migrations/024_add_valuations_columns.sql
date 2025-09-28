-- Migration: Add new columns to valuations table
-- Add: total_amount_net, total_amount_gross, settlement_type, contract_type

-- Add new columns
ALTER TABLE valuations 
ADD COLUMN IF NOT EXISTS total_amount_net DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_amount_gross DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS settlement_type TEXT DEFAULT 'przelew' CHECK (settlement_type IN ('przelew', 'faktura_vat', 'inne')),
ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'umowa_prywatna' CHECK (contract_type IN ('umowa_prywatna', 'umowa_zlecenie', 'bez_umowy', 'inne'));

-- Update existing records to have net = total_amount and gross = total_amount * 1.23 (23% VAT)
UPDATE valuations 
SET 
  total_amount_net = total_amount,
  total_amount_gross = ROUND(total_amount * 1.23, 2)
WHERE total_amount_net IS NULL;

-- Make net and gross NOT NULL after data migration
ALTER TABLE valuations 
ALTER COLUMN total_amount_net SET NOT NULL,
ALTER COLUMN total_amount_gross SET NOT NULL;
