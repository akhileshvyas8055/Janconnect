import mongoose, { Document, Schema } from 'mongoose';

export type ClusterSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type ClusterRelationship = 'near-duplicate' | 'related' | 'single';

export interface ICivicCluster extends Document {
    clusterId: string;
    dataset: mongoose.Types.ObjectId;
    datasetId: string;
    title: string;
    summary: string;
    category?: string;
    department?: string;
    complaints: Array<{
        complaintId?: string;
        sourceRow: number;
        relationship: ClusterRelationship;
    }>;
    complaintCount: number;
    centroid?: { latitude: number; longitude: number };
    geographicRadiusMeters?: number;
    severity: ClusterSeverity;
    priorityLevel: ClusterSeverity;
    priorityScore: number;
    confidence: number;
    evidence: {
        descriptionCount: number;
        imageEvidenceCount: number;
        audioEvidenceCount: number;
        locationEvidenceCount: number;
        references: Array<{
            complaintId?: string;
            sourceRow: number;
            type: 'description' | 'image' | 'audio' | 'location';
            value?: string;
        }>;
    };
    relationshipEvidence: Array<{
        sourceRows: [number, number];
        relationshipScore: number;
        lexicalSimilarity: number;
        semanticSimilarity?: number;
        geographicDistanceMeters?: number;
        categorySimilarity: number;
        temporalCompatibility?: number;
        relationship: Exclude<ClusterRelationship, 'single'>;
    }>;
    priorityFactors: {
        severity: number;
        confidence: number;
        evidence: number;
        independentReports: number;
        geographicConcentration: number;
        recency: number;
    };
    explanation: string;
    analysisMethod: 'deterministic' | 'gemini-assisted';
    createdAt: Date;
    updatedAt: Date;
}

const ComplaintReferenceSchema = new Schema({
    complaintId: { type: String },
    sourceRow: { type: Number, required: true },
    relationship: { type: String, enum: ['near-duplicate', 'related', 'single'], required: true },
}, { _id: false });

const EvidenceReferenceSchema = new Schema({
    complaintId: { type: String },
    sourceRow: { type: Number, required: true },
    type: { type: String, enum: ['description', 'image', 'audio', 'location'], required: true },
    value: { type: String },
}, { _id: false });

const RelationshipEvidenceSchema = new Schema({
    sourceRows: { type: [Number], required: true },
    relationshipScore: { type: Number, required: true },
    lexicalSimilarity: { type: Number, required: true },
    semanticSimilarity: { type: Number },
    geographicDistanceMeters: { type: Number },
    categorySimilarity: { type: Number, required: true },
    temporalCompatibility: { type: Number },
    relationship: { type: String, enum: ['near-duplicate', 'related'], required: true },
}, { _id: false });

const CivicClusterSchema = new Schema({
    clusterId: { type: String, required: true, unique: true },
    dataset: { type: Schema.Types.ObjectId, ref: 'CivicDataset', required: true, index: true },
    datasetId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    category: { type: String },
    department: { type: String },
    complaints: [ComplaintReferenceSchema],
    complaintCount: { type: Number, required: true },
    centroid: {
        latitude: { type: Number },
        longitude: { type: Number },
    },
    geographicRadiusMeters: { type: Number },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
    priorityLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
    priorityScore: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    evidence: {
        descriptionCount: { type: Number, required: true },
        imageEvidenceCount: { type: Number, required: true },
        audioEvidenceCount: { type: Number, required: true },
        locationEvidenceCount: { type: Number, required: true },
        references: [EvidenceReferenceSchema],
    },
    relationshipEvidence: [RelationshipEvidenceSchema],
    priorityFactors: {
        severity: { type: Number, required: true },
        confidence: { type: Number, required: true },
        evidence: { type: Number, required: true },
        independentReports: { type: Number, required: true },
        geographicConcentration: { type: Number, required: true },
        recency: { type: Number, required: true },
    },
    explanation: { type: String, required: true },
    analysisMethod: { type: String, enum: ['deterministic', 'gemini-assisted'], required: true },
}, { timestamps: true });

CivicClusterSchema.index({ datasetId: 1, clusterId: 1 });

export default mongoose.model<ICivicCluster>('CivicCluster', CivicClusterSchema);
