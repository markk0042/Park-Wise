-- ============================================
-- Diagnostic Query: Check Permit Colors Status
-- ============================================
-- Run this to see the current state of your vehicles

-- 1. Check all vehicles with permit numbers >= 602
SELECT 
  id,
  registration_plate,
  permit_number,
  parking_type,
  CASE 
    WHEN CAST(permit_number AS INTEGER) >= 602 THEN 'Should be Yellow'
    ELSE 'Should be Green'
  END as expected_type,
  CASE 
    WHEN parking_type = 'Yellow' AND CAST(permit_number AS INTEGER) >= 602 THEN '✓ Correct'
    WHEN parking_type = 'Green' AND CAST(permit_number AS INTEGER) >= 602 THEN '✗ Needs Update'
    WHEN parking_type = 'Green' AND CAST(permit_number AS INTEGER) < 602 THEN '✓ Correct'
    ELSE 'Check manually'
  END as status
FROM vehicles
WHERE permit_number IS NOT NULL 
  AND permit_number != ''
  AND permit_number ~ '^[0-9]+$'
ORDER BY CAST(permit_number AS INTEGER);

-- 2. Count summary
SELECT 
  parking_type,
  COUNT(*) as count,
  CASE 
    WHEN parking_type = 'Yellow' THEN 'Permits >= 602 should be Yellow'
    WHEN parking_type = 'Green' THEN 'Permits < 602 should be Green'
    ELSE 'Other'
  END as note
FROM vehicles
WHERE permit_number IS NOT NULL 
  AND permit_number != ''
  AND permit_number ~ '^[0-9]+$'
  AND CAST(permit_number AS INTEGER) >= 602
GROUP BY parking_type;

-- 3. Check if there are any vehicles with permit >= 602 that are still Green
SELECT 
  COUNT(*) as vehicles_needing_update,
  'Vehicles with permit >= 602 that are still Green' as description
FROM vehicles
WHERE permit_number IS NOT NULL 
  AND permit_number != ''
  AND permit_number ~ '^[0-9]+$'
  AND CAST(permit_number AS INTEGER) >= 602
  AND parking_type = 'Green';

