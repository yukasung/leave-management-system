-- CreateTable
CREATE TABLE "leave_audit_logs" (
    "id" TEXT NOT NULL,
    "leaveId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_audit_logs_leaveId_idx" ON "leave_audit_logs"("leaveId");

-- CreateIndex
CREATE INDEX "leave_audit_logs_changedBy_idx" ON "leave_audit_logs"("changedBy");

-- AddForeignKey
ALTER TABLE "leave_audit_logs" ADD CONSTRAINT "leave_audit_logs_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "LeaveRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_audit_logs" ADD CONSTRAINT "leave_audit_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
