import { Request, Response } from 'express';
import Project, { ProjectStatus } from '../models/project-model';
import { AuthRequest } from '../middleware/auth-middleware';
import User, { UserRole } from '../models/user-model';

export const getAllProjects = async (req: Request, res: Response) => {
    try {
        const projects = await Project.find()
            .populate('ratings.userId', 'name role')
            .sort({ createdAt: -1 });
        res.status(200).json(projects);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProjectById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate('ratings.userId', 'name role');
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(project);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProjectReviews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate('ratings.userId', 'name role');
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const totalReviews = project.ratings.length;
        const totalScore = project.ratings.reduce((acc, curr) => acc + (curr.score || 0), 0);
        const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0;

        const reviews = project.ratings.map(r => {
            const reviewerUser = r.userId as any;
            return {
                _id: r._id,
                score: r.score,
                feedback: r.feedback || '',
                createdAt: r.createdAt || project.updatedAt || project.createdAt,
                reviewer: {
                    name: reviewerUser?.name || 'Citizen',
                    role: reviewerUser?.role || 'Citizen'
                }
            };
        });

        // Sort reviews by date descending
        reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.status(200).json({
            projectId: project._id,
            title: project.title,
            averageRating,
            totalReviews,
            reviews
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (req.user.role !== UserRole.OFFICER && req.user.role !== UserRole.ADMIN) {
            return res.status(403).json({ message: 'Only officers or administrators can create projects' });
        }

        const project = new Project(req.body);
        await project.save();
        res.status(201).json(project);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProjectStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (req.user.role !== UserRole.OFFICER && req.user.role !== UserRole.ADMIN) {
            return res.status(403).json({ message: 'Forbidden: Only officers and administrators can update project status' });
        }

        if (!status || !Object.values(ProjectStatus).includes(status)) {
            return res.status(400).json({
                message: `Invalid status '${status}'. Supported statuses: ${Object.values(ProjectStatus).join(', ')}`
            });
        }

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Role & Department verification
        if (req.user.role === UserRole.OFFICER) {
            const officer = await User.findById(req.user.id);
            if (!officer || !officer.department) {
                return res.status(403).json({ message: 'Forbidden: Officer department profile not found' });
            }

            const officerDept = officer.department.trim().toLowerCase();
            const projectDept = project.department.trim().toLowerCase();

            if (officerDept !== projectDept) {
                return res.status(403).json({
                    message: `Forbidden: You are an officer of '${officer.department}', but this project is assigned to '${project.department}'. Only officers of '${project.department}' or Admins can update this project.`
                });
            }
        }

        project.status = status;
        await project.save();

        const populatedProject = await Project.findById(id).populate('ratings.userId', 'name role');
        res.status(200).json({
            message: 'Project status updated successfully',
            project: populatedProject
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const rateProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { score, feedback } = req.body;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required to submit feedback' });
        }

        const numericScore = Number(score);
        if (!numericScore || numericScore < 1 || numericScore > 5) {
            return res.status(400).json({ message: 'Rating score must be between 1 and 5' });
        }

        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Remove existing rating from same user if exists
        project.ratings = project.ratings.filter(r => r.userId.toString() !== req.user?.id);

        project.ratings.push({
            userId: req.user.id as any,
            score: numericScore,
            feedback: feedback?.trim() || undefined,
            createdAt: new Date()
        });

        await project.save();
        const populated = await Project.findById(id).populate('ratings.userId', 'name role');
        res.status(200).json(populated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
