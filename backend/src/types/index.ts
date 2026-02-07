export interface JWTPayload {
    user_id: string;
    tenant_id: string;
    email: string;
    roles: string[];
    permissions: string[];
    iat: number;
    exp: number;
}

export interface AuthenticatedRequest {
    userId?: string;
    tenantId?: string;
    user?: any;
    roles?: string[];
    permissions?: string[];
}

export interface PaginationQuery {
    page: number;
    limit: number;
    offset: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface Department {
    id: string;
    name: string;
    code?: string;
    parent_department_id?: string;
    budget?: string;
    created_at: string;
    updated_at: string;
}

export interface Employee {
    id: string;
    tenant_id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    email_company: string;
    email_personal?: string;
    phone_company?: string;
    phone_personal?: string;
    date_of_birth?: string;
    job_title: string;
    department_id: string;
    manager_id?: string;
    employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
    employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    start_date: string;
    end_date?: string;
    work_location?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface LeaveRequest {
    id: string;
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    reason: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
    approved_by?: string;
    approval_comment?: string;
    approved_at?: string;
    created_at: string;
    updated_at: string;
}

export interface PayrollPeriod {
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    salary_due_date: string;
    status: 'draft' | 'locked' | 'processed' | 'paid';
    total_employees: number;
    total_salary: number;
    created_at: string;
}

export interface SalarySlip {
    id: string;
    employee_id: string;
    payroll_period_id: string;
    base_salary: number;
    allowances: number;
    deductions: number;
    net_salary: number;
    paid_status: 'pending' | 'paid' | 'failed';
    paid_at?: string;
    payment_reference?: string;
    created_at: string;
}

export interface AuditLog {
    id: string;
    tenant_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    old_values?: any;
    new_values?: any;
    performed_by: string;
    ip_address: string;
    created_at: string;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
    };
}
