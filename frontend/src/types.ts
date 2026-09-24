export type UserRole = 'Citizen' | 'Officer' | 'Admin' | 'Higher Authority';

export const UserRole = {
    CITIZEN: 'Citizen' as UserRole,
    OFFICER: 'Officer' as UserRole,
    ADMIN: 'Admin' as UserRole,
    HIGHER_AUTHORITY: 'Higher Authority' as UserRole,
};

export type ComplaintStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Reopened' | 'Escalated';

export const ComplaintStatus = {
    SUBMITTED: 'Submitted' as ComplaintStatus,
    UNDER_REVIEW: 'Under Review' as ComplaintStatus,
    ASSIGNED: 'Assigned' as ComplaintStatus,
    IN_PROGRESS: 'In Progress' as ComplaintStatus,
    RESOLVED: 'Resolved' as ComplaintStatus,
    REOPENED: 'Reopened' as ComplaintStatus,
    ESCALATED: 'Escalated' as ComplaintStatus,
};

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
}

export interface Complaint {
    _id: string;
    complaintId: string;
    userId: string | { name: string, email: string };
    title: string;
    description: string;
    category: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    department: string;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    imageUrl?: string;
    voiceUrl?: string;
    status: ComplaintStatus;
    priorityScore: number;
    priorityLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    slaDeadline: string;
    assignedOfficerId?: { _id: string, name: string };
    assignedOfficerName?: string;
    duplicateCount: number;
    upvotes: number;
    upvotedBy: string[];
    history: Array<{
        status: string;
        updatedAt: string;
        note?: string;
    }>;
    createdAt: string;
}

export type ProjectStatus = 'Started' | 'Ongoing' | 'Completed' | 'Delayed' | 'Cancelled';

export const ProjectStatus = {
    STARTED: 'Started' as ProjectStatus,
    ONGOING: 'Ongoing' as ProjectStatus,
    COMPLETED: 'Completed' as ProjectStatus,
    DELAYED: 'Delayed' as ProjectStatus,
    CANCELLED: 'Cancelled' as ProjectStatus,
};

export interface ProjectRating {
    _id?: string;
    userId: string | { _id: string; name: string; role?: string };
    score: number;
    feedback?: string;
    createdAt?: string;
}

export interface ProjectReviewItem {
    _id?: string;
    score: number;
    feedback: string;
    createdAt: string;
    reviewer: {
        name: string;
        role: string;
    };
}

export interface ProjectReviewsResponse {
    projectId: string;
    title: string;
    averageRating: number;
    totalReviews: number;
    reviews: ProjectReviewItem[];
}

export interface Project {
    _id: string;
    title: string;
    description: string;
    budget: string;
    status: ProjectStatus;
    location: string;
    department: string;
    ratings: ProjectRating[];
    proofImages?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export type CivicPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CivicDatasetSummary {
    id: string;
    filename: string;
    recordCount: number;
    validRecords: number;
    invalidRecords: number;
    duplicateInputCount: number;
    source: string;
    uploadedAt: string;
    processingStatus: 'Uploaded' | 'Validated' | 'Ready' | 'Analyzing' | 'Analyzed' | 'Failed';
    analysisError?: string;
}

export interface CivicRecord {
    complaintId?: string;
    title?: string;
    description: string;
    category?: string;
    department?: string;
    severity?: CivicPriority;
    priority?: string;
    status?: string;
    latitude?: number;
    longitude?: number;
    createdAt?: string;
    imageUrl?: string;
    audioUrl?: string;
    sourceRow: number;
}

export interface CivicValidationError {
    row: number;
    field: string;
    message: string;
}

export interface CivicCluster {
    _id: string;
    clusterId: string;
    datasetId: string;
    title: string;
    summary: string;
    category?: string;
    department?: string;
    complaints: Array<{ complaintId?: string; sourceRow: number; relationship: 'near-duplicate' | 'related' | 'single' }>;
    complaintCount: number;
    centroid?: { latitude: number; longitude: number };
    geographicRadiusMeters?: number;
    severity: CivicPriority;
    priorityLevel: CivicPriority;
    priorityScore: number;
    confidence: number;
    evidence: {
        descriptionCount: number;
        imageEvidenceCount: number;
        audioEvidenceCount: number;
        locationEvidenceCount: number;
        references: Array<{ complaintId?: string; sourceRow: number; type: 'description' | 'image' | 'audio' | 'location'; value?: string }>;
    };
    priorityFactors: { severity: number; confidence: number; evidence: number; independentReports: number; geographicConcentration: number; recency: number };
    explanation: string;
    analysisMethod: 'deterministic' | 'gemini-assisted';
}
