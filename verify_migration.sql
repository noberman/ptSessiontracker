-- Check profiles created
SELECT 
  cp.id,
  cp.name,
  o.name as org_name,
  cp."calculationMethod",
  COUNT(DISTINCT ct.id) as tier_count,
  COUNT(DISTINCT u.id) as trainer_count
FROM commission_profiles cp
JOIN organizations o ON cp."organizationId" = o.id
LEFT JOIN commission_tiers_v2 ct ON ct."profileId" = cp.id
LEFT JOIN users u ON u."commissionProfileId" = cp.id
GROUP BY cp.id, cp.name, o.name, cp."calculationMethod";