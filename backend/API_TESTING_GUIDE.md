# API Testing Guide - HRMS Backend

This guide walks you through the complete flow from creating a new company (tenant) to managing employees and departments.

> [!IMPORTANT]
> Because the database was cleaned, you **MUST start from Step 2 (Registration)** to create a new tenant schema and assign your admin role.

## 🚀 Step 1: Health Check
Verify the server is running correctly.

- **URL**: `http://localhost:3000/health`
- **Method**: `GET`

---

## 🏢 Step 2: Multi-Tenant Onboarding (Registration)
Register a new company. This automatically provisions your database schema and assigns you the `HR_ADMIN` role.

- **URL**: `http://localhost:3000/api/auth/register`
- **Method**: `POST`
- **Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "full_name": "Admin User",
  "tenant_name": "Masirat Tech"
}
```

---

## 🔑 Step 3: Login & Get Token
Authenticate to get your JWT access token.

- **URL**: `http://localhost:3000/api/auth/login`
- **Method**: `POST`
- **Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "tenant_slug": "masirat-tech"
}
```
- **Action**: Copy the `access_token` from the response.

---

## 📂 Step 4: Create a Department (Recommended)
Before creating employees, create a department to get a valid UUID.

- **URL**: `http://localhost:3000/api/v1/departments`
- **Method**: `POST`
- **Headers**: 
  - `Authorization`: `Bearer <TOKEN>`
- **Body**:
```json
{
  "name": "Engineering",
  "code": "ENG"
}
```
- **Action**: Copy the `id` from the response (e.g., `550e8400-e29b-41d4-a716-446655440000`).

---

## 👥 Step 5: Create an Employee
Add a new employee. Use the `id` from Step 4.

- **URL**: `http://localhost:3000/api/v1/employees`
- **Method**: `POST`
- **Headers**: 
  - `Authorization`: `Bearer <TOKEN>`
- **Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email_company": "john.doe@masirat.com",
  "job_title": "Software Engineer",
  "department_id": "PASTE_DEPARTMENT_UUID_HERE",
  "employment_type": "full_time",
  "start_date": "2024-02-07"
}
```

---

## � Step 6: List All Employees
- **URL**: `http://localhost:3000/api/v1/employees`
- **Method**: `GET`
- **Headers**: 
  - `Authorization`: `Bearer <TOKEN>`

---

## 🛠️ Summary of Databases
| Service | Status |
| :--- | :--- |
| **PostgreSQL** | `public` schema for tenants/users; `tenant_...` schema for company data (employees, departments). |
| **MongoDB** | System logs and audit trails. |
| **Redis** | JWT session storage and caching. |
