You are a senior full-stack engineer.

Build a scalable, production-ready Leave Management System using:

Tech Stack:
- Next.js (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- RESTful API
- Tailwind CSS
- Responsive (mobile-first design)

Architecture Requirements:
- Clean architecture (separate route, service, repository layers)
- Use transactions for critical operations
- Use proper enums
- Add indexes on foreign keys
- Avoid storing files in database
- Scalable folder structure

System Features:

1. Authentication-ready structure (assume user is logged in)
2. User Profile Management
   - View profile
   - Edit basic info
   - Display department
   - Display role (EMPLOYEE, MANAGER, HR, ADMIN)

3. Department support
4. Leave Types (Annual, Sick, Personal, etc.)
5. Leave Reasons (linked to Leave Type)
6. Leave full day, half morning, half afternoon
7. Mixed leave per date range
8. Leave balance per year
9. Multi-level approval workflow
10. File attachments (store only file URL)
11. Leave stored in two layers:
    - LeaveRequest (header)
    - LeaveSegment (daily breakdown)

Database Tables Required:
- users
- departments
- leave_types
- leave_reasons
- leave_requests
- leave_segments
- leave_balances
- leave_attachments
- leave_approvals

API Endpoints Required:

POST   /api/leave
GET    /api/leave
GET    /api/leave/:id
POST   /api/leave/:id/approve
POST   /api/leave/:id/reject

GET    /api/profile
PUT    /api/profile

UI Requirements:

- Fully responsive (mobile, tablet, desktop)
- Mobile-first design
- Use reusable components
- Clean modern dashboard layout
- Sidebar for desktop
- Bottom navigation for mobile
- Leave request form with:
    - Date range picker
    - Auto-generate daily breakdown table
    - Dropdown per date (FULL / MORNING / AFTERNOON)
    - Auto-calculate total leave days
    - File upload support

Validation Rules:
- Check leave balance before submit
- Prevent date conflicts
- Validate required attachment
- Use transaction when creating leave request and segments

Ensure the system is scalable and production-ready.