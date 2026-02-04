import mongoose, { Schema, Document } from 'mongoose';

/**
 * Document Metadata Model
 * Tracks employee documents: certifications, agreements, policies, etc.
 */

export interface DocumentMetadata extends Document {
    tenantId: string;
    employeeId: string;
    documentType: string; // 'offer_letter', 'nda', 'certification', 'policy', 'agreement'
    fileName: string;
    fileSize: number;
    mimeType: string;
    s3Key: string; // S3 storage path
    s3Url?: string; // Signed S3 URL
    documentNumber?: string;
    issueDate?: Date;
    expiryDate?: Date;
    issuedBy?: string;
    status: 'active' | 'expired' | 'revoked' | 'archived';
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verifiedBy?: string;
    verifiedAt?: Date;
    tags: string[];
    description?: string;
    uploadedBy: string;
    uploadedAt: Date;
    lastAccessedAt?: Date;
    accessLog: Array<{
        userId: string;
        timestamp: Date;
    }>;
    retentionPolicy?: {
        deleteAfter?: Date;
        archiveAfter?: Date;
        requiresApprovalForDeletion: boolean;
    };
    metadata: Record<string, any>; // Dynamic metadata
    createdAt: Date;
    updatedAt: Date;
}

const DocumentMetadataSchema = new Schema<DocumentMetadata>(
    {
        tenantId: {
            type: String,
            required: true,
            index: true,
        },
        employeeId: {
            type: String,
            required: true,
            index: true,
        },
        documentType: {
            type: String,
            required: true,
            enum: ['offer_letter', 'nda', 'certification', 'policy', 'agreement', 'other'],
            index: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        s3Key: {
            type: String,
            required: true,
            unique: true,
        },
        s3Url: String,
        documentNumber: String,
        issueDate: Date,
        expiryDate: Date,
        issuedBy: String,
        status: {
            type: String,
            enum: ['active', 'expired', 'revoked', 'archived'],
            default: 'active',
            index: true,
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending',
        },
        verifiedBy: String,
        verifiedAt: Date,
        tags: [String],
        description: String,
        uploadedBy: {
            type: String,
            required: true,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
        lastAccessedAt: Date,
        accessLog: [
            {
                userId: String,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        retentionPolicy: {
            deleteAfter: Date,
            archiveAfter: Date,
            requiresApprovalForDeletion: {
                type: Boolean,
                default: false,
            },
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true },
);

// Indexes for common queries
DocumentMetadataSchema.index({ tenantId: 1, employeeId: 1 });
DocumentMetadataSchema.index({ tenantId: 1, documentType: 1 });
DocumentMetadataSchema.index({ tenantId: 1, status: 1 });
DocumentMetadataSchema.index({ s3Key: 1 });

// TTL Index for auto-deletion based on retention policy
DocumentMetadataSchema.index({ 'retentionPolicy.deleteAfter': 1 }, { expireAfterSeconds: 0 });

export const DocumentMetadata = mongoose.model<DocumentMetadata>(
    'DocumentMetadata',
    DocumentMetadataSchema,
);

export default DocumentMetadata;
