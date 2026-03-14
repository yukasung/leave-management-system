-- Delete in FK-safe order, keep User and Employee intact

-- 1. audit / log tables
DELETE FROM "leave_audit_logs";
DELETE FROM "AuditLog";

-- 2. approvals
DELETE FROM "Approval";

-- 3. leave requests & balances
DELETE FROM "LeaveRequest";
DELETE FROM "LeaveBalance";

-- 4. leave types & categories
DELETE FROM "LeaveType";
DELETE FROM "LeaveCategoryConfig";

-- 5. holidays
DELETE FROM "company_holidays";

-- 6. unlink Employee FKs to Position/Department, then delete them
UPDATE "Employee" SET "positionId" = NULL;
UPDATE "Employee" SET "departmentId" = NULL;
DELETE FROM "Position";
DELETE FROM "Department";
