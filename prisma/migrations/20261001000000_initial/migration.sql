-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'ADMIN', 'EXPERT');

-- CreateEnum
CREATE TYPE "DossierType" AS ENUM ('INCENDIE_HABITATION', 'INCENDIE_COMMERCE', 'EXPERTISE_PREALABLE', 'AUTRE_INCENDIE');

-- CreateEnum
CREATE TYPE "DossierStatus" AS ENUM ('NOUVEAU', 'A_VERIFIER', 'DOCUMENTS_REQUIS', 'DOSSIER_COMPLET', 'ANALYSE_EN_COURS', 'RDV_A_PLANIFIER', 'EXPERTISE_PLANIFIEE', 'EXPERTISE_EN_COURS', 'RAPPORT_EN_PREPARATION', 'TERMINE', 'ANNULE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NOUVEAU', 'CONTACTE', 'EN_COURS', 'CONVERTI', 'FERME');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "submissionKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DossierType" NOT NULL,
    "status" "DossierStatus" NOT NULL DEFAULT 'NOUVEAU',
    "city" TEXT NOT NULL,
    "businessName" TEXT,
    "assignedTo" TEXT,
    "formData" JSONB NOT NULL,
    "reviewFlags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_status_history" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "oldStatus" "DossierStatus",
    "newStatus" "DossierStatus" NOT NULL,
    "authorId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_messages" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_documents" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_notes" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NOUVEAU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "dossierId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_sequence_key" ON "dossiers"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_reference_key" ON "dossiers"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_submissionKey_key" ON "dossiers"("submissionKey");

-- CreateIndex
CREATE INDEX "dossiers_userId_idx" ON "dossiers"("userId");

-- CreateIndex
CREATE INDEX "dossiers_status_idx" ON "dossiers"("status");

-- CreateIndex
CREATE INDEX "dossiers_type_idx" ON "dossiers"("type");

-- CreateIndex
CREATE INDEX "dossiers_city_idx" ON "dossiers"("city");

-- CreateIndex
CREATE INDEX "dossiers_createdAt_idx" ON "dossiers"("createdAt");

-- CreateIndex
CREATE INDEX "dossiers_assignedTo_idx" ON "dossiers"("assignedTo");

-- CreateIndex
CREATE INDEX "dossier_status_history_dossierId_createdAt_idx" ON "dossier_status_history"("dossierId", "createdAt");

-- CreateIndex
CREATE INDEX "dossier_messages_dossierId_createdAt_idx" ON "dossier_messages"("dossierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_documents_storageKey_key" ON "dossier_documents"("storageKey");

-- CreateIndex
CREATE INDEX "dossier_documents_dossierId_idx" ON "dossier_documents"("dossierId");

-- CreateIndex
CREATE INDEX "document_requests_dossierId_idx" ON "document_requests"("dossierId");

-- CreateIndex
CREATE INDEX "dossier_notes_dossierId_idx" ON "dossier_notes"("dossierId");

-- CreateIndex
CREATE INDEX "contact_requests_status_createdAt_idx" ON "contact_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_dossierId_createdAt_idx" ON "audit_logs"("dossierId", "createdAt");

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_tokenHash_key" ON "password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "password_resets_phone_idx" ON "password_resets"("phone");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_status_history" ADD CONSTRAINT "dossier_status_history_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_status_history" ADD CONSTRAINT "dossier_status_history_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_messages" ADD CONSTRAINT "dossier_messages_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_messages" ADD CONSTRAINT "dossier_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_documents" ADD CONSTRAINT "dossier_documents_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_documents" ADD CONSTRAINT "dossier_documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_notes" ADD CONSTRAINT "dossier_notes_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_notes" ADD CONSTRAINT "dossier_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

