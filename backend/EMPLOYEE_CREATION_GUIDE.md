# Employee Creation - Quick Reference

## Important: Department ID

When creating an employee, the `department_id` field is **OPTIONAL**. You have two options:

### Option 1: Create Employee WITHOUT Department
Simply **omit** or set `department_id` to `null`:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email_company": "john.doe@company.com",
  "employment_type": "full_time",
  "start_date": "2026-02-01",
  "job_title": "Software Engineer"
}
```

### Option 2: Create Employee WITH Department
If you want to assign a department, you must:
1. **First create a department** and get its UUID
2. **Then use that UUID** in the employee creation

**Example:**

**Step 1 - Create Department:**
```http
POST /api/v1/departments
{
  "name": "Engineering",
  "code": "ENG"
}
```

**Response:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Engineering"
}
```

**Step 2 - Create Employee with Department:**
```http
POST /api/v1/employees
{
  "first_name": "John",
  "last_name": "Doe",
  "email_company": "john.doe@company.com",
  "employment_type": "full_time",
  "start_date": "2026-02-01",
  "job_title": "Software Engineer",
  "department_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## ❌ Common Mistake

**DO NOT** use strings like `"DEPT001"` for `department_id`:
```json
{
  "department_id": "DEPT001"  // ❌ WRONG - This will fail!
}
```

**ONLY** use valid UUIDs or omit the field entirely.
