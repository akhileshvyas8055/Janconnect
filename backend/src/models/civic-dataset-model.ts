import mongoose, { Schema, Document } from 'mongoose';

// Processing status for the uploaded CSV dataset
export enum DatasetStatus {
    UPLOADED = 'Uploaded',       // CSV received and parsed
    VALIDATED = 'Validated',     // All rows validated
    READY = 'Ready',             // Normalized records ready for Step 3 analysis
    ANALYZING = 'Analyzing',     // Step 3 analysis is in progress
    ANALYZED = 'Analyzed',       // Derived CivicCluster records are available
    FAILED = 'Failed',           // Parse or validation failure
}

// A single normalized complaint record extracted from a CSV row.
// Used internally between ingestion (Step 2) and clustering (Step 3).
// Does NOT modify or reference existing Complaint documents.
export interface INormalizedRecord {
    complaintId?: string;
    title?: string;
    description: string;        // required minimum — at least description must be present
    category?: string;
    department?: string;
    severity?: 'Low' | 'Medium' | 'High' | 'Critical';
    priority?: string;
    status?: string;
    latitude?: number;
    longitude?: number;
    createdAt?: Date;
    imageUrl?: string;
    audioUrl?: string;
    sourceRow: number;          // 1-based CSV row index for traceability
}

// Metadata document that persists after a CSV upload.
// Stores the dataset summary + all normalized records for Step 3.
export interface ICivicDataset extends Document {
    datasetId: string;                          // UUID for this upload session
    filename: string;                           // Original CSV filename
    recordCount: number;                        // Total rows in CSV (excluding header)
    validRecordCount: number;                   // Rows that passed validation
    invalidRecordCount: number;                 // Rows that failed validation
    duplicateInputCount: number;                // Duplicate complaintId rows in CSV
    uploadedBy: mongoose.Types.ObjectId;        // Ref to User who uploaded
    uploadedAt: Date;                           // When uploaded
    source: string;                             // e.g. "User Uploaded Dataset"
    processingStatus: DatasetStatus;
    analysisError?: string;
    records: INormalizedRecord[];               // Normalized records, ready for Step 3
    validationErrors: Array<{
        row: number;
        field: string;
        message: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const NormalizedRecordSchema = new Schema({
    complaintId: { type: String },
    title: { type: String },
    description: { type: String, required: true },
    category: { type: String },
    department: { type: String },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    priority: { type: String },
    status: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    createdAt: { type: Date },
    imageUrl: { type: String },
    audioUrl: { type: String },
    sourceRow: { type: Number, required: true },
}, { _id: false });

const ValidationErrorSchema = new Schema({
    row: { type: Number, required: true },
    field: { type: String, required: true },
    message: { type: String, required: true },
}, { _id: false });

const CivicDatasetSchema: Schema = new Schema({
    datasetId: { type: String, required: true, unique: true },
    filename: { type: String, required: true },
    recordCount: { type: Number, required: true },
    validRecordCount: { type: Number, required: true },
    invalidRecordCount: { type: Number, required: true },
    duplicateInputCount: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, required: true },
    source: { type: String, default: 'User Uploaded Dataset' },
    processingStatus: {
        type: String,
        enum: Object.values(DatasetStatus),
        default: DatasetStatus.UPLOADED,
    },
    analysisError: { type: String },
    records: [NormalizedRecordSchema],
    validationErrors: [ValidationErrorSchema],
}, { timestamps: true });

export default mongoose.model<ICivicDataset>('CivicDataset', CivicDatasetSchema);
