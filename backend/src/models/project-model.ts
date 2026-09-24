import mongoose, { Schema, Document } from 'mongoose';

export enum ProjectStatus {
    STARTED = 'Started',
    ONGOING = 'Ongoing',
    COMPLETED = 'Completed',
    DELAYED = 'Delayed',
    CANCELLED = 'Cancelled'
}

export interface IProject extends Document {
    title: string;
    description: string;
    budget: string;
    status: ProjectStatus;
    location: string;
    department: string;
    ratings: Array<{
        _id?: mongoose.Types.ObjectId;
        userId: mongoose.Types.ObjectId;
        score: number;
        feedback?: string;
        createdAt?: Date;
    }>;
    proofImages: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: String, required: true },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.STARTED },
    location: { type: String, required: true },
    department: { type: String, required: true },
    ratings: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 1, max: 5 },
        feedback: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    proofImages: [{ type: String }]
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
