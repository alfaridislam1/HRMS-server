import mongoose, { Schema, Document } from 'mongoose';

/**
 * Organization Settings Model
 * Stores dynamic, unstructured settings for each tenant
 * Can be extended without schema changes
 */

export interface TenantSettings extends Document {
    tenantId: string;
    category: string; // 'general', 'payroll', 'leave', 'performance', 'integration'
    settings: Record<string, any>;
    version: number;
    isActive: boolean;
    validFrom?: Date;
    validUntil?: Date;
    metadata?: Record<string, any>;
    approvedBy?: string;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TenantSettingsSchema = new Schema<TenantSettings>(
    {
        tenantId: {
            type: String,
            required: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
            enum: ['general', 'payroll', 'leave', 'performance', 'integration', 'security', 'other'],
            index: true,
        },
        settings: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },
        version: {
            type: Number,
            default: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        validFrom: Date,
        validUntil: Date,
        metadata: Schema.Types.Mixed,
        approvedBy: String,
        approvedAt: Date,
    },
    { timestamps: true },
);

// Compound index for tenant + category
TenantSettingsSchema.index({ tenantId: 1, category: 1 });

// Index for active settings
TenantSettingsSchema.index({ tenantId: 1, isActive: 1, category: 1 });

export const TenantSettings = mongoose.model<TenantSettings>('TenantSettings', TenantSettingsSchema);

/**
 * Feature Flags Model
 * Dynamic feature management per tenant
 */

export interface FeatureFlag extends Document {
    tenantId: string;
    featureName: string;
    enabled: boolean;
    rolloutPercentage: number; // 0-100 for gradual rollout
    config: Record<string, any>;
    validFrom?: Date;
    validUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FeatureFlagSchema = new Schema<FeatureFlag>(
    {
        tenantId: {
            type: String,
            required: true,
            index: true,
        },
        featureName: {
            type: String,
            required: true,
            index: true,
        },
        enabled: {
            type: Boolean,
            default: false,
        },
        rolloutPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        config: {
            type: Schema.Types.Mixed,
            default: {},
        },
        validFrom: Date,
        validUntil: Date,
    },
    { timestamps: true },
);

// Unique index for feature per tenant
FeatureFlagSchema.index({ tenantId: 1, featureName: 1 }, { unique: true });

export const FeatureFlag = mongoose.model<FeatureFlag>('FeatureFlag', FeatureFlagSchema);

/**
 * Audit Settings Model
 * Track configuration changes
 */

export interface SettingsAudit extends Document {
    tenantId: string;
    category: string;
    action: 'create' | 'update' | 'delete';
    changes: {
        before?: Record<string, any>;
        after?: Record<string, any>;
    };
    changedBy: string;
    reason?: string;
    createdAt: Date;
}

const SettingsAuditSchema = new Schema<SettingsAudit>(
    {
        tenantId: {
            type: String,
            required: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: ['create', 'update', 'delete'],
            required: true,
        },
        changes: {
            before: Schema.Types.Mixed,
            after: Schema.Types.Mixed,
        },
        changedBy: {
            type: String,
            required: true,
        },
        reason: String,
    },
    { timestamps: true },
);

SettingsAuditSchema.index({ tenantId: 1, createdAt: -1 });

export const SettingsAudit = mongoose.model<SettingsAudit>('SettingsAudit', SettingsAuditSchema);

export default TenantSettings;
