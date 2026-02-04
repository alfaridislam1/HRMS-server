import { Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { ExtendedRequest } from './auth';

/**
 * Attribute-Based Access Control (ABAC) Middleware
 * 
 * ABAC evaluates access based on attributes:
 * - User attributes (role, department, location)
 * - Resource attributes (owner, department, sensitivity)
 * - Environment attributes (time, IP, device)
 * - Action attributes (read, write, delete)
 * 
 * More flexible than RBAC as it can handle complex policies
 */

export interface ABACPolicy {
    name: string;
    description?: string;
    effect: 'allow' | 'deny';
    conditions: ABACCondition[];
}

export interface ABACCondition {
    attribute: string; // e.g., 'user.department', 'resource.owner', 'action.type'
    operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
    value: any;
}

export interface ABACContext {
    user: {
        id: string;
        roles: string[];
        permissions: string[];
        department?: string;
        location?: string;
        tenantId: string;
    };
    resource: {
        id?: string;
        type: string;
        owner?: string;
        department?: string;
        sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
    };
    action: {
        type: string; // 'read', 'write', 'delete', 'approve'
        method: string; // HTTP method
    };
    environment?: {
        time?: Date;
        ip?: string;
        device?: string;
    };
}

/**
 * Evaluate ABAC policy against context
 */
function evaluatePolicy(policy: ABACPolicy, context: ABACContext): boolean {
    // All conditions must be true for policy to match
    const conditionsMet = policy.conditions.every(condition => {
        const attributeValue = getAttributeValue(condition.attribute, context);
        return evaluateCondition(condition, attributeValue);
    });

    return conditionsMet;
}

/**
 * Get attribute value from context
 */
function getAttributeValue(attributePath: string, context: ABACContext): any {
    const parts = attributePath.split('.');
    let value: any = context;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part as keyof typeof value];
        } else {
            return undefined;
        }
    }

    return value;
}

/**
 * Evaluate single condition
 */
function evaluateCondition(condition: ABACCondition, attributeValue: any): boolean {
    const { operator, value } = condition;

    switch (operator) {
        case 'equals':
            return attributeValue === value;
        case 'notEquals':
            return attributeValue !== value;
        case 'in':
            return Array.isArray(value) && value.includes(attributeValue);
        case 'notIn':
            return Array.isArray(value) && !value.includes(attributeValue);
        case 'contains':
            return typeof attributeValue === 'string' && attributeValue.includes(value);
        case 'startsWith':
            return typeof attributeValue === 'string' && attributeValue.startsWith(value);
        case 'endsWith':
            return typeof attributeValue === 'string' && attributeValue.endsWith(value);
        case 'greaterThan':
            return Number(attributeValue) > Number(value);
        case 'lessThan':
            return Number(attributeValue) < Number(value);
        default:
            return false;
    }
}

/**
 * ABAC Middleware Factory
 * 
 * @param policies Array of ABAC policies to evaluate
 * @param getResourceContext Function to extract resource context from request
 */
export function abacMiddleware(
    policies: ABACPolicy[],
    getResourceContext?: (req: ExtendedRequest) => Partial<ABACContext['resource']>
) {
    return (req: ExtendedRequest, res: Response, next: NextFunction) => {
        try {
            // Build ABAC context
            const context: ABACContext = {
                user: {
                    id: req.userId || '',
                    roles: req.roles || [],
                    permissions: req.permissions || [],
                    department: (req.user as any)?.department,
                    location: (req.user as any)?.location,
                    tenantId: req.tenantId || '',
                },
                resource: {
                    type: req.path.split('/')[2] || 'unknown', // Extract resource type from path
                    id: req.params.id,
                    ...(getResourceContext ? getResourceContext(req) : {}),
                },
                action: {
                    type: getActionType(req.method),
                    method: req.method,
                },
                environment: {
                    time: new Date(),
                    ip: req.ip || req.socket.remoteAddress,
                },
            };

            // Evaluate policies (first matching policy wins)
            let allowAccess = false;
            let denyAccess = false;

            for (const policy of policies) {
                if (evaluatePolicy(policy, context)) {
                    if (policy.effect === 'allow') {
                        allowAccess = true;
                    } else if (policy.effect === 'deny') {
                        denyAccess = true;
                        logger.warn(`ABAC policy '${policy.name}' denied access for user ${context.user.id}`);
                        break; // Deny takes precedence
                    }
                }
            }

            // Default deny if no policy matches
            if (denyAccess || (!allowAccess && policies.length > 0)) {
                logger.warn(`ABAC access denied for user ${context.user.id} to ${context.resource.type}`);
                return res.status(403).json({
                    error: {
                        code: 'ACCESS_DENIED',
                        message: 'Access denied by security policy',
                    },
                });
            }

            logger.debug(`ABAC check passed for user ${context.user.id}`);
            next();
        } catch (err) {
            logger.error('ABAC middleware error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Authorization check failed',
                },
            });
        }
    };
}

/**
 * Get action type from HTTP method
 */
function getActionType(method: string): string {
    const methodMap: Record<string, string> = {
        GET: 'read',
        POST: 'write',
        PUT: 'write',
        PATCH: 'write',
        DELETE: 'delete',
    };
    return methodMap[method] || 'read';
}

/**
 * Common ABAC Policies
 */
export const CommonABACPolicies = {
    /**
     * Users can only access resources in their own department
     */
    sameDepartment: (): ABACPolicy => ({
        name: 'same-department',
        effect: 'allow',
        conditions: [
            {
                attribute: 'user.department',
                operator: 'equals',
                value: 'resource.department',
            },
        ],
    }),

    /**
     * Users can only access their own resources
     */
    ownResource: (): ABACPolicy => ({
        name: 'own-resource',
        effect: 'allow',
        conditions: [
            {
                attribute: 'user.id',
                operator: 'equals',
                value: 'resource.owner',
            },
        ],
    }),

    /**
     * Only admins can access restricted resources
     */
    restrictedResource: (): ABACPolicy => ({
        name: 'restricted-resource',
        effect: 'allow',
        conditions: [
            {
                attribute: 'resource.sensitivity',
                operator: 'equals',
                value: 'restricted',
            },
            {
                attribute: 'user.roles',
                operator: 'in',
                value: ['admin', 'super_admin'],
            },
        ],
    }),

    /**
     * Managers can approve in their department
     */
    managerApproval: (): ABACPolicy => ({
        name: 'manager-approval',
        effect: 'allow',
        conditions: [
            {
                attribute: 'action.type',
                operator: 'equals',
                value: 'approve',
            },
            {
                attribute: 'user.roles',
                operator: 'in',
                value: ['manager', 'hr', 'admin'],
            },
            {
                attribute: 'user.department',
                operator: 'equals',
                value: 'resource.department',
            },
        ],
    }),
};

export default abacMiddleware;
