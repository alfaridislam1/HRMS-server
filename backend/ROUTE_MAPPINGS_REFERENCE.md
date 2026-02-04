# Complete Route Mappings Reference

## Overview

All obfuscated external URLs mapped to internal API paths for the HRMS backend.

---

## 🔐 Authentication Routes (NOT Obfuscated)

These routes are public and not obfuscated for standard authentication flow.

| Method | External URL    | Internal Path   | Required Role | Description              |
| ------ | --------------- | --------------- | ------------- | ------------------------ |
| POST   | `/auth/login`   | `/auth/login`   | Public        | User login               |
| POST   | `/auth/refresh` | `/auth/refresh` | Public        | Refresh JWT token        |
| POST   | `/auth/logout`  | `/auth/logout`  | Authenticated | User logout              |
| GET    | `/auth/profile` | `/auth/profile` | Authenticated | Get current user profile |

---

## 👥 Employee Management Routes

| External URL                               | Internal Path               | Method | Required Role            | Description          |
| ------------------------------------------ | --------------------------- | ------ | ------------------------ | -------------------- |
| `/yoiusalkasja/ausoiahs1896347ih2ewdkjags` | `/api/employees`            | GET    | `hr`, `admin`, `manager` | List all employees   |
| `/ksoiausdhaksjhd/asukasiudhas13123123123` | `/api/employees/:id`        | GET    | `hr`, `admin`, `manager` | Get employee details |
| `/poiqweuoisajd/129312893jksahjkhd123123`  | `/api/employees`            | POST   | `hr`, `admin`            | Create employee      |
| `/asjhdasd/asjhdalksjd12391283912839128`   | `/api/employees/:id`        | PUT    | `hr`, `admin`            | Update employee      |
| `/qwueyiqwueyq/asjdhasjdhaksjdhaksjdh123`  | `/api/employees/:id`        | DELETE | `hr`, `admin`            | Delete employee      |
| `/mnbvcxzqwer/uiopasdfghjklzxcvbnmasdfg`   | `/api/employees/:id/salary` | GET    | `hr`, `admin`, `self`    | Get employee salary  |

---

## 🏖️ Leave Management Routes

| External URL                             | Internal Path                    | Method | Required Role                        | Description          |
| ---------------------------------------- | -------------------------------- | ------ | ------------------------------------ | -------------------- |
| `/zxcvbnmasdf/1298934798239847298347239` | `/api/leaves`                    | GET    | `hr`, `admin`, `manager`, `employee` | List leaves          |
| `/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl`  | `/api/leaves`                    | POST   | `hr`, `admin`, `employee`            | Request leave        |
| `/qwertyuiop/zxcvbnmasdfghjklqwertyui`   | `/api/leaves/:id/approve`        | POST   | `hr`, `admin`, `manager`             | Approve/reject leave |
| `/dfghjklzxc/qwertyuiopasdfghjklzxcvbn`  | `/api/leave-balance/:employeeId` | GET    | `hr`, `admin`, `manager`, `employee` | Get leave balance    |
| `/poiuytrewq/asdfghjklmnbvcxzasdfghjkl`  | `/api/leaves/:id`                | GET    | `hr`, `admin`, `manager`             | Get leave details    |
| `/asdfghjkle/mnbvcxzasdfghjklmnbvcxzas`  | `/api/leaves/:id`                | DELETE | `hr`, `admin`                        | Cancel leave request |

---

## 💰 Payroll Management Routes

| External URL                            | Internal Path               | Method | Required Role            | Description         |
| --------------------------------------- | --------------------------- | ------ | ------------------------ | ------------------- |
| `/mnbvcxzasdf/sdfghjklmnbvcxzasdfghjkl` | `/api/payroll`              | GET    | `hr`, `admin`, `manager` | List payroll        |
| `/hjklmnbvcx/zxcvbnmasdfghjklmnbvcxzas` | `/api/payroll`              | POST   | `hr`, `admin`            | Create payroll      |
| `/lkjhgfdsaz/xcvbnmasdfghjklmnbvcxzasd` | `/api/payroll/:id/approve`  | POST   | `hr`, `admin`            | Approve payroll     |
| `/xcvbnmasdf/lkjhgfdsaqwertyuiopzxcvbn` | `/api/payroll/:id`          | GET    | `hr`, `admin`, `manager` | Get payroll details |
| `/qwertyasdf/sdfghjklmnbvcxzasdfghjklm` | `/api/payroll/:id`          | PUT    | `hr`, `admin`            | Update payroll      |
| `/asdfghjklo/poiuytrewqzxcvbnmasdfghjk` | `/api/payroll/:id/finalize` | POST   | `admin`                  | Finalize payroll    |

---

## 👤 User Management Routes

| External URL                            | Internal Path                   | Method | Required Role   | Description         |
| --------------------------------------- | ------------------------------- | ------ | --------------- | ------------------- |
| `/asdfghjklm/nbvcxzasdfghjklmnbvcxzasd` | `/api/users`                    | GET    | `admin`         | List users          |
| `/wertyuiopq/wertyuiopasdfghjklzxcvbna` | `/api/users/:id`                | GET    | `admin`, `self` | Get user profile    |
| `/sdfghjklpo/poiuytrewqasdfghjklmnbvc`  | `/api/users/:id`                | PUT    | `admin`, `self` | Update user         |
| `/wqertyuiop/asdfghjklmnbvcxzasdfghjkl` | `/api/users/:id`                | DELETE | `admin`         | Delete user         |
| `/qwertyuiop/asdfghjklzxcvbnmasdfghjkl` | `/api/users/:id/reset-password` | POST   | `admin`         | Reset user password |

---

## 🏢 Department Routes

| External URL                             | Internal Path                    | Method | Required Role            | Description               |
| ---------------------------------------- | -------------------------------- | ------ | ------------------------ | ------------------------- |
| `/uiopasdfgh/cvbnmasdfghjklmnbvcxzasdf`  | `/api/departments`               | GET    | `hr`, `admin`, `manager` | List departments          |
| `/ilopasdfgh/xcvbnmasdfghjklmnbvcxzas`   | `/api/departments/:id`           | GET    | `hr`, `admin`, `manager` | Get department            |
| `/qwertyasdf/sdfghjklmnbvcxzasdfghjklm`  | `/api/departments`               | POST   | `hr`, `admin`            | Create department         |
| `/asdfqwerty/zxcvbnmasdfghjklmnbvcxzas`  | `/api/departments/:id`           | PUT    | `hr`, `admin`            | Update department         |
| `/zxcvbnqwer/tyuiopasdfghjklzxcvbnmasdf` | `/api/departments/:id`           | DELETE | `hr`, `admin`            | Delete department         |
| `/wertyuipoa/sdfghjklmnbvcxzasdfghjklm`  | `/api/departments/:id/employees` | GET    | `hr`, `admin`, `manager` | List department employees |

---

## 📊 Dashboard Routes

| External URL                            | Internal Path                 | Method | Required Role                  | Description         |
| --------------------------------------- | ----------------------------- | ------ | ------------------------------ | ------------------- |
| `/poiuytgfds/sdfghjklmnbvcxzasdfghjkl`  | `/api/dashboard/executive`    | GET    | `admin`, `manager`             | Executive dashboard |
| `/lkjhgfdsal/lkjhgfdsaqwertyuiopzxcvbn` | `/api/dashboard/employee/:id` | GET    | `employee`, `admin`, `manager` | Employee dashboard  |
| `/asdfghjkpo/mnbvcxzasdfghjklmnbvcxzas` | `/api/dashboard/manager/:id`  | GET    | `manager`, `admin`             | Manager dashboard   |
| `/xcvbnmasdf/asdfghjklmnbvcxzasdfghjkl` | `/api/dashboard/analytics`    | GET    | `admin`, `manager`             | Analytics dashboard |

---

## ✅ Approval Routes

| External URL                            | Internal Path                  | Method | Required Role            | Description             |
| --------------------------------------- | ------------------------------ | ------ | ------------------------ | ----------------------- |
| `/njkiuytrfg/xcvbnmasdfghjklmnbvcxzasd` | `/api/approvals`               | GET    | `hr`, `admin`, `manager` | List pending approvals  |
| `/bvcxzasdfg/ghjklmnbvcxzasdfghjklmnbv` | `/api/approvals/:id`           | GET    | `hr`, `admin`, `manager` | Get approval details    |
| `/cvbnmasdfg/hjklmnbvcxzasdfghjklmnbvc` | `/api/approvals/:id/action`    | POST   | `hr`, `admin`, `manager` | Take approval action    |
| `/sdafghjkln/asdfghjklmnbvcxzasdfghjkl` | `/api/approvals/pending/count` | GET    | `hr`, `admin`, `manager` | Count pending approvals |
| `/asdfghjklz/xcvbnmasdfghjklmnbvcxzasd` | `/api/approvals/history`       | GET    | `hr`, `admin`, `manager` | Get approval history    |

---

## 📈 Reports & Analytics Routes

| External URL                            | Internal Path                     | Method | Required Role            | Description            |
| --------------------------------------- | --------------------------------- | ------ | ------------------------ | ---------------------- |
| `/asjhdalksjhdasjdhaksjd/192837461923`  | `/api/analytics/employee-trends`  | GET    | `admin`, `manager`       | Employee trends        |
| `/qweurtyuiop/asdfghjklmnbvcxzasdfghj`  | `/api/analytics/payroll-summary`  | GET    | `admin`, `hr`            | Payroll summary        |
| `/poiuytrewq/cvbnmasdfghjklmnbvcxzasd`  | `/api/analytics/leave-statistics` | GET    | `admin`, `hr`, `manager` | Leave statistics       |
| `/zxcvbnmasdf/asdfghjklmnbvcxzasdfghjk` | `/api/reports/employee-census`    | GET    | `admin`, `hr`            | Employee census report |
| `/asdfghjklo/poiuytrewqasdfghjklzxcvb`  | `/api/reports/attendance`         | GET    | `admin`, `manager`       | Attendance report      |

---

## 🔔 Notification Routes

| External URL                            | Internal Path                    | Method | Required Role   | Description                  |
| --------------------------------------- | -------------------------------- | ------ | --------------- | ---------------------------- |
| `/mnbvcxzwer/tyuiopasdfghjklmnbvcxzas`  | `/api/notifications`             | GET    | `authenticated` | Get notifications            |
| `/asdfghjklp/oiuytrewqzxcvbnmasdfghjk`  | `/api/notifications/:id/read`    | POST   | `authenticated` | Mark as read                 |
| `/poiuytrewa/sdfghjklmnbvcxzasdfghjkl`  | `/api/notifications/preferences` | GET    | `authenticated` | Get notification preferences |
| `/qwertyuiop/asdfghjklmnbvcxzasdfghjkl` | `/api/notifications/preferences` | PUT    | `authenticated` | Update preferences           |

---

## 📁 Document Management Routes

| External URL                            | Internal Path        | Method | Required Role   | Description     |
| --------------------------------------- | -------------------- | ------ | --------------- | --------------- |
| `/asdfghjkle/mnbvcxzasdfghjklmnbvcxza`  | `/api/documents`     | GET    | `authenticated` | List documents  |
| `/poiuytrewq/asdfghjklmnbvcxzasdfghjk`  | `/api/documents`     | POST   | `authenticated` | Upload document |
| `/zxcvbnmasdf/qwertyuiopasdfghjklzxcvb` | `/api/documents/:id` | GET    | `authenticated` | Get document    |
| `/asdfghjklo/poiuytrewqzxcvbnmasdfghjk` | `/api/documents/:id` | DELETE | `authenticated` | Delete document |

---

## 🏥 Health & Status Routes

| External URL     | Internal Path   | Method | Required Role   | Description               |
| ---------------- | --------------- | ------ | --------------- | ------------------------- |
| (Not obfuscated) | `/health`       | GET    | Public          | Health check              |
| (Not obfuscated) | `/health/db`    | GET    | Public          | Database health           |
| (Not obfuscated) | `/health/cache` | GET    | Public          | Cache health              |
| (Not obfuscated) | `/metrics`      | GET    | Public          | Application metrics       |
| (Not obfuscated) | `/api/routes`   | GET    | `authenticated` | View route mappings (dev) |

---

## 🔄 Webhook Management Routes

| External URL                            | Internal Path            | Method | Required Role | Description      |
| --------------------------------------- | ------------------------ | ------ | ------------- | ---------------- |
| `/asdfghjklm/nbvcxzasdfghjklmnbvcxzas`  | `/api/webhooks`          | GET    | `admin`       | List webhooks    |
| `/wertyuiopq/wertyuiopasdfghjklzxcvbn`  | `/api/webhooks`          | POST   | `admin`       | Register webhook |
| `/sdfghjklpo/poiuytrewqasdfghjklmnbvc`  | `/api/webhooks/:id`      | DELETE | `admin`       | Delete webhook   |
| `/qwertyasdf/sdfghjklmnbvcxzasdfghjklm` | `/api/webhooks/:id/test` | POST   | `admin`       | Test webhook     |

---

## 🔑 Permission Levels

### Role Hierarchy

```
admin (100)           -> Full system access
├── manager (50)      -> Team management
├── hr (50)           -> HR operations
└── employee (10)     -> Self-service
guest (0)             -> Limited public access
```

### Common Permission Combinations

**Admin**: `['*']` - All permissions

**HR Manager**:

```
[
  'read_employees',
  'write_employees',
  'read_leaves',
  'write_leaves',
  'approve_leaves',
  'read_payroll',
  'write_payroll',
  'approve_payroll'
]
```

**Department Manager**:

```
[
  'read_employees',
  'read_leaves',
  'approve_leaves',
  'read_payroll'
]
```

**Employee**:

```
[
  'read_self_profile',
  'write_self_profile',
  'read_own_leaves',
  'write_own_leaves',
  'read_own_payroll'
]
```

---

## 📝 Standard Query Parameters

### Pagination

```
?page=1
?limit=20
```

### Filtering

```
?status=active
?departmentId=dept-123
?month=2024-02
```

### Sorting

```
?sortBy=created_at
?order=asc|desc
```

### Examples

```
GET /api/employees?page=1&limit=50&sortBy=firstName&order=asc
GET /api/leaves?status=pending&employeeId=emp-123
GET /api/payroll?month=2024-02
```

---

## 🚫 HTTP Status Codes

| Code | Meaning               | Example                  |
| ---- | --------------------- | ------------------------ |
| 200  | OK                    | Request successful       |
| 201  | Created               | Resource created         |
| 400  | Bad Request           | Invalid input            |
| 401  | Unauthorized          | Missing/invalid token    |
| 403  | Forbidden             | Insufficient permissions |
| 404  | Not Found             | Resource not found       |
| 409  | Conflict              | Duplicate record         |
| 429  | Too Many Requests     | Rate limit exceeded      |
| 500  | Internal Server Error | Server error             |
| 503  | Service Unavailable   | Service down             |

---

## 🔐 Token Usage Examples

### Header Format

```
Authorization: Bearer <JWT_TOKEN>
```

### cURL Example

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://api.example.com/yoiusalkasja/ausoiahs1896347ih2ewdkjags
```

### JavaScript Fetch

```javascript
const response = await fetch('https://api.example.com/api/employees', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## 📌 Important Notes

1. **All routes require JWT authentication** (except `/health`, `/auth/login`, `/auth/refresh`)
2. **Route obfuscation is single-layer** - same external URL always maps to same internal path
3. **Rate limits are per IP + User ID** - tracked independently
4. **Logs include request ID** - useful for debugging
5. **Timestamps are in UTC ISO format** - `2024-02-01T10:30:45.123Z`
6. **Pagination starts at page 1** - not page 0
7. **All IDs are UUIDs** - use UUID v4 format
8. **Tenant isolation is automatic** - users only see own tenant data

---

## 🔄 Migration Guide

**Old URL Format** (if applicable):

```
/api/employees → /yoiusalkasja/ausoiahs1896347ih2ewdkjags
/api/leaves → /tyuiopqwer/asdfghjklzxcvbnmasdfghjkl
```

**How to update frontend:**

1. Get route mappings from `/api/routes`
2. Store in frontend config
3. Use mapped URLs in API calls
4. No code changes needed on backend

---

## 🎯 Common Use Cases

### Scenario 1: Create Employee Workflow

```
1. POST /auth/login              -> Get token
2. POST /api/employees           -> Create employee
3. POST /api/departments/:id     -> Assign department
4. GET /api/employees/:id        -> Verify creation
```

### Scenario 2: Leave Request Approval

```
1. POST /api/leaves              -> Employee requests leave
2. GET /api/approvals            -> Manager checks pending
3. POST /api/approvals/:id/action -> Manager approves
4. GET /api/leave-balance/:id    -> Employee checks balance
```

### Scenario 3: Payroll Processing

```
1. POST /api/payroll             -> Create payroll
2. POST /api/payroll/:id/approve -> HR approves
3. POST /api/payroll/:id/finalize-> Admin finalizes
4. GET /api/payroll/:id          -> Verify processing
```

---

## 📞 Support Matrix

| Component      | Issue        | Solution                            |
| -------------- | ------------ | ----------------------------------- |
| Authentication | 401 errors   | Check JWT secret & token expiration |
| Authorization  | 403 errors   | Verify user role in token payload   |
| Rate Limiting  | 429 errors   | Wait for reset or adjust limits     |
| Validation     | 400 errors   | Check field types against schema    |
| Database       | 500 errors   | Check database connection           |
| Logging        | Missing logs | Verify `logs/` directory exists     |

---

**Version**: 1.0  
**Last Updated**: February 2024  
**Status**: ✅ Production Ready
