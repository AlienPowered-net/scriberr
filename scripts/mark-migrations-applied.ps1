# Mark all migrations except the new one as applied
$migrations = @(
  "20250820031657_init",
  "20250820045216_add_session_table",
  "20250820055356_extend_session_table",
  "20250820072550_multi_tenant_shop_fk",
  "20250826021507_add_content_to_notes",
  "20250826072610_fix_note_schema",
  "20250826172421_add_tags_to_notes",
  "20250904234933_add_folder_icon",
  "20250905041056_add_folder_icon_color",
  "20250905050203_add_folder_position",
  "20250911072345_add_pinned_at_field",
  "20250920060228_rename_session_table_to_lowercase",
  "20250920060557_cleanup_failed_migration",
  "20251107000100_add_plan_subscription",
  "20250102000000_add_custom_mentions",
  "20250102100000_add_save_type_free_visible",
  "20250121000000_add_address_and_notes"
)

foreach ($migration in $migrations) {
  Write-Host "Marking $migration as applied..." -ForegroundColor Cyan
  npx -y prisma migrate resolve --applied $migration
}

Write-Host "All existing migrations marked as applied." -ForegroundColor Green

