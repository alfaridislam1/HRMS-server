import mongoose, { Schema, Document } from 'mongoose';

/**
 * Appraisal Form Model
 * Stores performance appraisal forms with dynamic fields per organization
 */

export interface AppraisalQuestion extends Document {
    questionId: string;
    type: 'text' | 'rating' | 'multiple_choice' | 'boolean';
    text: string;
    weight?: number;
    maxRating?: number;
    options?: string[];
    required: boolean;
    order: number;
}

export interface AppraisalResponse extends Document {
    questionId: string;
    answer: string | number | boolean;
    comments?: string;
}

export interface AppraisalForm extends Document {
    tenantId: string;
    employeeId: string;
    appraiserId: string;
    appraisalPeriod: {
        startDate: Date;
        endDate: Date;
    };
    template: {
        templateId: string;
        templateName: string;
        version: number;
    };
    responses: AppraisalResponse[];
    overallRating?: number;
    strengths?: string[];
    areasForImprovement?: string[];
    recommendedActions?: string[];
    status: 'draft' | 'submitted' | 'reviewed' | 'approved';
    submittedAt?: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
    comments: Array<{
        userId: string;
        text: string;
        createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const AppraisalResponseSchema = new Schema({
    questionId: {
        type: String,
        required: true,
    },
    answer: Schema.Types.Mixed,
    comments: String,
});

const AppraisalFormSchema = new Schema<AppraisalForm>(
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
        appraiserId: {
            type: String,
            required: true,
            index: true,
        },
        appraisalPeriod: {
            startDate: {
                type: Date,
                required: true,
            },
            endDate: {
                type: Date,
                required: true,
            },
        },
        template: {
            templateId: {
                type: String,
                required: true,
            },
            templateName: {
                type: String,
                required: true,
            },
            version: {
                type: Number,
                default: 1,
            },
        },
        responses: [AppraisalResponseSchema],
        overallRating: {
            type: Number,
            min: 0,
            max: 5,
        },
        strengths: [String],
        areasForImprovement: [String],
        recommendedActions: [String],
        status: {
            type: String,
            enum: ['draft', 'submitted', 'reviewed', 'approved'],
            default: 'draft',
            index: true,
        },
        submittedAt: Date,
        reviewedBy: String,
        reviewedAt: Date,
        approvedBy: String,
        approvedAt: Date,
        comments: [
            {
                userId: String,
                text: String,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true },
);

// Indexes for common queries
AppraisalFormSchema.index({ tenantId: 1, employeeId: 1 });
AppraisalFormSchema.index({ tenantId: 1, status: 1 });
AppraisalFormSchema.index({ tenantId: 1, appraisalPeriod: 1 });

export const AppraisalForm = mongoose.model<AppraisalForm>('AppraisalForm', AppraisalFormSchema);
export default AppraisalForm;
