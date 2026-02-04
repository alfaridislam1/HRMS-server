import { Request, Response, NextFunction } from 'express';

export type ValidationRule = {
    type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'date' | 'array';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string; // Returns true if valid, error message if invalid
};

export type ValidationSchema = {
    [key: string]: ValidationRule;
};

/**
 * Validation error result
 */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Input validator utility
 */
export class InputValidator {
    /**
     * Validate data against schema
     */
    static validate(data: any, schema: ValidationSchema): ValidationError[] {
        const errors: ValidationError[] = [];

        Object.keys(schema).forEach(field => {
            const rule = schema[field];
            const value = data[field];

            // Check required
            if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field,
                    message: `${field} is required`
                });
                return;
            }

            // Skip validation if not required and not provided
            if (!rule.required && (value === undefined || value === null)) {
                return;
            }

            // Validate type
            if (!this.validateType(value, rule.type)) {
                errors.push({
                    field,
                    message: `${field} must be of type ${rule.type}`
                });
                return;
            }

            // Validate string rules
            if (typeof value === 'string') {
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push({
                        field,
                        message: `${field} must be at least ${rule.minLength} characters long`
                    });
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push({
                        field,
                        message: `${field} must not exceed ${rule.maxLength} characters`
                    });
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push({
                        field,
                        message: `${field} format is invalid`
                    });
                }
            }

            // Validate number rules
            if (typeof value === 'number') {
                if (rule.min !== undefined && value < rule.min) {
                    errors.push({
                        field,
                        message: `${field} must be at least ${rule.min}`
                    });
                }
                if (rule.max !== undefined && value > rule.max) {
                    errors.push({
                        field,
                        message: `${field} must not exceed ${rule.max}`
                    });
                }
            }

            // Validate enum
            if (rule.enum && !rule.enum.includes(value)) {
                errors.push({
                    field,
                    message: `${field} must be one of: ${rule.enum.join(', ')}`
                });
            }

            // Validate custom
            if (rule.custom) {
                const customResult = rule.custom(value);
                if (customResult !== true) {
                    errors.push({
                        field,
                        message: typeof customResult === 'string' ? customResult : `${field} is invalid`
                    });
                }
            }
        });

        return errors;
    }

    private static validateType(value: any, type: string): boolean {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'uuid':
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
            case 'date':
                return !isNaN(Date.parse(value));
            case 'array':
                return Array.isArray(value);
            default:
                return true;
        }
    }
}

/**
 * Express middleware for input validation
 */
export function validateInput(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
        const errors = InputValidator.validate(data, schema);

        if (errors.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Input validation failed',
                    details: errors
                }
            });
        }

        next();
    };
}

/**
 * Common validation schemas for HRMS
 */
export const ValidationSchemas = {
    // Employee validation
    createEmployee: {
        email: {
            type: 'email',
            required: true
        },
        firstName: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 100
        },
        lastName: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 100
        },
        departmentId: {
            type: 'uuid',
            required: true
        },
        designationId: {
            type: 'uuid',
            required: true
        },
        dateOfJoining: {
            type: 'date',
            required: true
        },
        phone: {
            type: 'string',
            required: false,
            pattern: /^\+?[1-9]\d{1,14}$/
        },
        pan: {
            type: 'string',
            required: false,
            pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
            custom: (value) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value) || 'Invalid PAN format'
        }
    } as ValidationSchema,

    // Leave request validation
    requestLeave: {
        leaveTypeId: {
            type: 'uuid',
            required: true
        },
        startDate: {
            type: 'date',
            required: true
        },
        endDate: {
            type: 'date',
            required: true
        },
        reason: {
            type: 'string',
            required: true,
            minLength: 5,
            maxLength: 500
        },
        custom: (value) => {
            // Custom validation: endDate must be >= startDate
            return true;
        }
    } as ValidationSchema,

    // Payroll validation
    createPayroll: {
        employeeId: {
            type: 'uuid',
            required: true
        },
        month: {
            type: 'string',
            required: true,
            pattern: /^\d{4}-\d{2}$/,
            custom: (value) => /^\d{4}-\d{2}$/.test(value) || 'Month must be in YYYY-MM format'
        },
        baseSalary: {
            type: 'number',
            required: true,
            min: 0
        },
        daysWorked: {
            type: 'number',
            required: true,
            min: 0,
            max: 31
        }
    } as ValidationSchema,

    // User update validation
    updateUser: {
        email: {
            type: 'email',
            required: false
        },
        firstName: {
            type: 'string',
            required: false,
            maxLength: 100
        },
        lastName: {
            type: 'string',
            required: false,
            maxLength: 100
        }
    } as ValidationSchema,

    // Department validation
    createDepartment: {
        name: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 100
        },
        description: {
            type: 'string',
            required: false,
            maxLength: 500
        },
        managerId: {
            type: 'uuid',
            required: false
        }
    } as ValidationSchema,

    // Pagination validation
    pagination: {
        page: {
            type: 'number',
            required: false,
            min: 1
        },
        limit: {
            type: 'number',
            required: false,
            min: 1,
            max: 100
        },
        sortBy: {
            type: 'string',
            required: false
        },
        order: {
            type: 'string',
            required: false,
            enum: ['asc', 'desc']
        }
    } as ValidationSchema
};

/**
 * Sanitize input - remove potentially dangerous characters
 */
export function sanitizeInput(input: any): any {
    if (typeof input === 'string') {
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .trim();
    }
    if (typeof input === 'object' && input !== null) {
        const sanitized: any = {};
        Object.keys(input).forEach(key => {
            sanitized[key] = sanitizeInput(input[key]);
        });
        return sanitized;
    }
    return input;
}

/**
 * Middleware to sanitize request data
 */
export function sanitizeRequestData() {
    return (req: Request, res: Response, next: NextFunction) => {
        req.body = sanitizeInput(req.body);
        req.query = sanitizeInput(req.query);
        req.params = sanitizeInput(req.params);
        next();
    };
}
