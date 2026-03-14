-- Reset leave history for fresh testing
-- Order respects FK constraints

-- 1. Leave audit trail (FK → LeaveRequest, User)
DELETE FROM leave_audit_logs;

-- 2. Approvals (FK → LeaveRequest, User)
DELETE FROM "Approval";

-- 3. All leave requests (FK → User, LeaveType)
DELETE FROM "LeaveRequest";

-- 4. Reset used days on all leave balances back to 0
UPDATE "LeaveBalance" SET "usedDays" = 0;

-- 5. General audit log (FK → User)
DELETE FROM "AuditLog";
