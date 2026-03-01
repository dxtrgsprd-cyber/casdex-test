-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "title" TEXT,
    "isGlobalAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oppNumber" TEXT NOT NULL,
    "projectNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "projectName" TEXT NOT NULL,
    "systemName" TEXT,
    "installAddress" TEXT,
    "installCity" TEXT,
    "installState" TEXT,
    "installZip" TEXT,
    "territory" TEXT,
    "projectDescription" TEXT,
    "notes" TEXT,
    "riskScore" DOUBLE PRECISION,
    "poNumber" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opp_team_members" (
    "id" TEXT NOT NULL,
    "oppId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "opp_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opp_status_history" (
    "id" TEXT NOT NULL,
    "oppId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opp_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "oppId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oppId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "location" TEXT,
    "notes" TEXT,
    "fieldData" JSONB NOT NULL DEFAULT '{}',
    "offlineId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_photos" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "location" TEXT,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oppId" TEXT,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "canvasData" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placed_devices" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "area" TEXT,
    "floor" TEXT,
    "room" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fovAngle" DOUBLE PRECISION,
    "fovDistance" DOUBLE PRECISION,
    "cameraHeight" DOUBLE PRECISION,
    "tilt" DOUBLE PRECISION,
    "notes" TEXT,
    "installDetails" TEXT,

    CONSTRAINT "placed_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oppId" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "projectManagerId" TEXT NOT NULL,
    "ikomDate" TIMESTAMP(3),
    "ikomNotes" TEXT,
    "ckomDate" TIMESTAMP(3),
    "ckomNotes" TEXT,
    "startDate" TIMESTAMP(3),
    "estimatedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "notes" TEXT,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_orders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "trackingNumber" TEXT,
    "vendor" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_orders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "coNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "identifiedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "customerSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DOUBLE PRECISION,
    "tasksCompleted" TEXT,
    "issues" TEXT,
    "notes" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "offlineId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_checks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "overallPass" BOOLEAN,
    "inspectedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oppId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "oppId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "assessedBy" TEXT NOT NULL,
    "cctvScore" DOUBLE PRECISION,
    "acsScore" DOUBLE PRECISION,
    "equipmentScore" DOUBLE PRECISION,
    "installScore" DOUBLE PRECISION,
    "scheduleScore" DOUBLE PRECISION,
    "resourceScore" DOUBLE PRECISION,
    "siteScore" DOUBLE PRECISION,
    "customerScore" DOUBLE PRECISION,
    "technicalScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "contingencyPct" DOUBLE PRECISION NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "isSharedWithCustomer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "primaryContact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "trades" JSONB NOT NULL DEFAULT '[]',
    "territories" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "insuranceExpiry" TIMESTAMP(3),
    "licenseNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT,
    "resolution" TEXT,
    "formFactor" TEXT,
    "indoor" BOOLEAN,
    "outdoor" BOOLEAN,
    "vandal" BOOLEAN,
    "hfov" DOUBLE PRECISION,
    "maxDistance" DOUBLE PRECISION,
    "focalLength" TEXT,
    "imager" TEXT,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "mountOptions" JSONB NOT NULL DEFAULT '[]',
    "msrp" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_devices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "costPrice" DOUBLE PRECISION,
    "sellPrice" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "tenant_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoredById" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "user_tenants_tenantId_idx" ON "user_tenants"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_userId_tenantId_key" ON "user_tenants"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_module_action_key" ON "role_permissions"("roleId", "module", "action");

-- CreateIndex
CREATE INDEX "opportunities_tenantId_status_idx" ON "opportunities"("tenantId", "status");

-- CreateIndex
CREATE INDEX "opportunities_tenantId_territory_idx" ON "opportunities"("tenantId", "territory");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_tenantId_oppNumber_key" ON "opportunities"("tenantId", "oppNumber");

-- CreateIndex
CREATE UNIQUE INDEX "opp_team_members_oppId_userId_role_key" ON "opp_team_members"("oppId", "userId", "role");

-- CreateIndex
CREATE INDEX "opp_status_history_oppId_idx" ON "opp_status_history"("oppId");

-- CreateIndex
CREATE INDEX "approvals_oppId_idx" ON "approvals"("oppId");

-- CreateIndex
CREATE INDEX "surveys_tenantId_assigneeId_idx" ON "surveys"("tenantId", "assigneeId");

-- CreateIndex
CREATE INDEX "surveys_tenantId_oppId_idx" ON "surveys"("tenantId", "oppId");

-- CreateIndex
CREATE INDEX "designs_tenantId_createdById_idx" ON "designs"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "designs_tenantId_oppId_idx" ON "designs"("tenantId", "oppId");

-- CreateIndex
CREATE INDEX "placed_devices_designId_idx" ON "placed_devices"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_oppId_key" ON "projects"("oppId");

-- CreateIndex
CREATE INDEX "projects_tenantId_status_idx" ON "projects"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenantId_projectNumber_key" ON "projects"("tenantId", "projectNumber");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_projectId_userId_key" ON "project_assignments"("projectId", "userId");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_status_idx" ON "project_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "material_orders_projectId_idx" ON "material_orders"("projectId");

-- CreateIndex
CREATE INDEX "change_orders_projectId_idx" ON "change_orders"("projectId");

-- CreateIndex
CREATE INDEX "daily_reports_projectId_reportDate_idx" ON "daily_reports"("projectId", "reportDate");

-- CreateIndex
CREATE INDEX "qc_checks_projectId_idx" ON "qc_checks"("projectId");

-- CreateIndex
CREATE INDEX "documents_tenantId_oppId_idx" ON "documents"("tenantId", "oppId");

-- CreateIndex
CREATE INDEX "documents_tenantId_type_idx" ON "documents"("tenantId", "type");

-- CreateIndex
CREATE INDEX "risk_assessments_oppId_idx" ON "risk_assessments"("oppId");

-- CreateIndex
CREATE INDEX "vendors_tenantId_idx" ON "vendors"("tenantId");

-- CreateIndex
CREATE INDEX "subcontractors_tenantId_idx" ON "subcontractors"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_partNumber_key" ON "devices"("partNumber");

-- CreateIndex
CREATE INDEX "devices_manufacturer_category_idx" ON "devices"("manufacturer", "category");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_devices_tenantId_deviceId_key" ON "tenant_devices"("tenantId", "deviceId");

-- CreateIndex
CREATE INDEX "performance_scores_userId_category_idx" ON "performance_scores"("userId", "category");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_entity_createdAt_idx" ON "audit_logs"("tenantId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opp_team_members" ADD CONSTRAINT "opp_team_members_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opp_team_members" ADD CONSTRAINT "opp_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opp_status_history" ADD CONSTRAINT "opp_status_history_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_photos" ADD CONSTRAINT "survey_photos_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placed_devices" ADD CONSTRAINT "placed_devices_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_orders" ADD CONSTRAINT "material_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_checks" ADD CONSTRAINT "qc_checks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_oppId_fkey" FOREIGN KEY ("oppId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_devices" ADD CONSTRAINT "tenant_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_devices" ADD CONSTRAINT "tenant_devices_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_scores" ADD CONSTRAINT "performance_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_scores" ADD CONSTRAINT "performance_scores_scoredById_fkey" FOREIGN KEY ("scoredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

