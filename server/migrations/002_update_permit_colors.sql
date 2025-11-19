-- ============================================
-- Update Permit Colors: 00602+ to Yellow
-- ============================================
-- This script updates all vehicles with permit numbers >= 602 (00602) to Yellow
-- Run this in Supabase SQL Editor to update existing vehicles immediately

-- Step 1: Preview what will be updated (optional - you can run this first to see)
SELECT 
  id, 
  registration_plate, 
  permit_number, 
  parking_type as current_type,
  'Yellow' as will_become
FROM vehicles
WHERE permit_number IS NOT NULL 
  AND permit_number != ''
  AND permit_number ~ '^[0-9]+$'  -- Only numeric permit numbers
  AND CAST(permit_number AS INTEGER) >= 602
  AND parking_type != 'Yellow'
ORDER BY CAST(permit_number AS INTEGER);

-- Step 2: Update all vehicles with permit >= 602 to Yellow
UPDATE vehicles
SET parking_type = 'Yellow',
    updated_at = NOW()
WHERE permit_number IS NOT NULL 
  AND permit_number != ''
  AND permit_number ~ '^[0-9]+$'  -- Only numeric permit numbers
  AND CAST(permit_number AS INTEGER) >= 602
  AND parking_type != 'Yellow';  -- Only update if not already Yellow

-- Step 3: Verify the update (shows count of Yellow permits >= 602)
SELECT 
  COUNT(*) as total_yellow_permits_602_plus,
  'Vehicles with permit >= 00602 now set to Yellow' as description
FROM vehicles
WHERE permit_number IS NOT NULL 
  AND permit_number != ''
  AND permit_number ~ '^[0-9]+$'
  AND CAST(permit_number AS INTEGER) >= 602
  AND parking_type = 'Yellow';

