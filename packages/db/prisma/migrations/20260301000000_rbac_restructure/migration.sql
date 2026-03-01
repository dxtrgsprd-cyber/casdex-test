-- RBAC Restructure: Two-level role system
-- Global level: global_admin, global_manager (stored on users.globalRole)
-- Org level: org_admin, org_manager, sales, presales, project_manager, installer, subcontractor, customer

-- Step 1: Add globalRole column to users table
ALTER TABLE "users" ADD COLUMN "globalRole" TEXT;

-- Step 2: Migrate existing isGlobalAdmin boolean to globalRole string
UPDATE "users" SET "globalRole" = 'global_admin' WHERE "isGlobalAdmin" = true;

-- Step 3: Drop the old isGlobalAdmin column
ALTER TABLE "users" DROP COLUMN "isGlobalAdmin";

-- Step 4: Rename default org roles
-- admin -> org_admin
UPDATE "roles" SET "name" = 'org_admin' WHERE "name" = 'admin' AND "isDefault" = true;

-- manager -> org_manager
UPDATE "roles" SET "name" = 'org_manager' WHERE "name" = 'manager' AND "isDefault" = true;

-- field_technician -> installer
UPDATE "roles" SET "name" = 'installer', "displayName" = 'Installer' WHERE "name" = 'field_technician' AND "isDefault" = true;
