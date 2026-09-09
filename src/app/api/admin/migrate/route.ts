import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { migrateGroupColumn, migrateUpdatedAt, migrateAdminOptionsId, migrateSchemaTabs, populateCmsSchema, migrateGolfFixedColumns, updateCmsSchemaColumns, migrateAdminOptionsIcon } from "@/lib/google-sheets";

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const groupResult = await migrateGroupColumn();
    const updatedAtResult = await migrateUpdatedAt();
    const optionsIdResult = await migrateAdminOptionsId();
    const schemaTabsResult = await migrateSchemaTabs();
    const schemaDataResult = await populateCmsSchema();
    const golfMigrationResult = await migrateGolfFixedColumns();
    const schemaColumnsResult = await updateCmsSchemaColumns();
    const iconMigrationResult = await migrateAdminOptionsIcon();
    return NextResponse.json({ group: groupResult, updatedAt: updatedAtResult, optionsId: optionsIdResult, schemaTabs: schemaTabsResult, schemaData: schemaDataResult, golfMigration: golfMigrationResult, schemaColumns: schemaColumnsResult, iconMigration: iconMigrationResult });
  } catch {
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
