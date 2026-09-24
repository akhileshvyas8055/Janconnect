import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    HardHat,
    Star,
    MapPin,
    IndianRupee,
    Briefcase,
    Eye,
    MessageSquare,
    X,
    ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from './StatusBadge';
import type { Project, ProjectReviewsResponse } from '../types';
import { useAuth } from '../context/AuthContext';

const PublicWorksPanel = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
    const [selectedProjectForReviews, setSelectedProjectForReviews] = useState<Project | null>(null);

    // Reviews State
    const [reviewsData, setReviewsData] = useState<ProjectReviewsResponse | null>(null);
    const [loadingReviews, setLoadingReviews] = useState(false);

    // Citizen rating submit in panel
    const [citizenScore, setCitizenScore] = useState<number>(5);
    const [citizenFeedback, setCitizenFeedback] = useState<string>('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

    const loadProjects = () => {
        setLoading(true);
        api.get('/projects')
            .then(res => setProjects(res.data))
            .catch(err => console.error('Failed to load projects', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleOpenReviews = async (project: Project) => {
        setSelectedProjectForReviews(project);
        setLoadingReviews(true);
        setReviewSuccess(null);

        // Pre-fill user review if available
        const myRating = project.ratings?.find(r => {
            if (typeof r.userId === 'object' && r.userId !== null) {
                return (r.userId as any)._id === user?.id;
            }
            return r.userId === user?.id;
        });
        if (myRating) {
            setCitizenScore(myRating.score || 5);
            setCitizenFeedback(myRating.feedback || '');
        } else {
            setCitizenScore(5);
            setCitizenFeedback('');
        }

        try {
            const res = await api.get(`/projects/${project._id}/reviews`);
            setReviewsData(res.data);
        } catch {
            const total = project.ratings?.length || 0;
            const avg = total > 0 ? Number((project.ratings.reduce((a, b) => a + (b.score || 0), 0) / total).toFixed(1)) : 0;
            setReviewsData({
                projectId: project._id,
                title: project.title,
                averageRating: avg,
                totalReviews: total,
                reviews: (project.ratings || []).map(r => ({
                    _id: r._id,
                    score: r.score,
                    feedback: r.feedback || '',
                    createdAt: r.createdAt || project.updatedAt || '',
                    reviewer: {
                        name: typeof r.userId === 'object' && r.userId !== null ? (r.userId as any).name || 'Citizen' : 'Citizen',
                        role: typeof r.userId === 'object' && r.userId !== null ? (r.userId as any).role || 'Citizen' : 'Citizen'
                    }
                }))
            });
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleCitizenReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectForReviews) return;

        setSubmittingReview(true);
        try {
            await api.patch(`/projects/${selectedProjectForReviews._id}/rate`, {
                score: citizenScore,
                feedback: citizenFeedback
            });
            setReviewSuccess('Review saved successfully.');
            const res = await api.get(`/projects/${selectedProjectForReviews._id}/reviews`);
            setReviewsData(res.data);
            loadProjects();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <HardHat className="text-blue-600 dark:text-blue-400" />
                        Public Infrastructure Works
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="saas-card p-6 border animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                            <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-full" />
                            <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <HardHat className="text-blue-600 dark:text-blue-400" />
                        Public Infrastructure Works
                    </h2>
                </div>
                <div className="saas-card p-10 border border-dashed border-slate-200 dark:border-white/5 text-center space-y-2">
                    <p className="text-slate-500 font-medium text-sm">No municipal projects registered yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <HardHat className="text-blue-600 dark:text-blue-400" />
                        Public Infrastructure Works
                        <span className="ml-2 text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded-full">
                            {projects.length} Active
                        </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Track progress, inspect expenditure, and submit reviews for development projects in your area.
                    </p>
                </div>

                <Link
                    to="/projects"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    <span>View All Projects</span>
                    <ArrowRight size={13} />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => {
                    const ratingsCount = project.ratings?.length || 0;
                    const avgRating = ratingsCount
                        ? (project.ratings.reduce((a, b) => a + (b.score || 0), 0) / ratingsCount).toFixed(1)
                        : null;

                    return (
                        <div
                            key={project._id}
                            className="saas-card p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-4"
                        >
                            <div className="space-y-3">
                                {/* Header */}
                                <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                            {project.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                            <Briefcase size={11} />
                                            <span>{project.department}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={project.status} size="sm" />
                                </div>

                                {/* Description */}
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                    {project.description}
                                </p>

                                {/* Meta */}
                                <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-slate-100 dark:border-white/5 text-xs">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Budget</span>
                                        <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                                            <IndianRupee size={12} className="text-emerald-600" />
                                            <span>{project.budget}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Ward / Area</span>
                                        <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white truncate">
                                            <MapPin size={12} className="text-rose-600 shrink-0" />
                                            <span className="truncate">{project.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Rating */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                size={13}
                                                className={
                                                    Number(avgRating) >= star
                                                        ? 'text-amber-500 fill-amber-500'
                                                        : 'text-slate-300 dark:text-slate-700'
                                                }
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                        {ratingsCount ? `${avgRating} (${ratingsCount} ${ratingsCount === 1 ? 'review' : 'reviews'})` : 'No reviews'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedProjectForDetails(project)}
                                    className="btn-secondary text-[11px] py-1.5 px-3 flex-1 flex items-center justify-center gap-1"
                                >
                                    <Eye size={12} />
                                    <span>Details</span>
                                </button>
                                <button
                                    onClick={() => handleOpenReviews(project)}
                                    className="btn-secondary text-[11px] py-1.5 px-3 flex-1 flex items-center justify-center gap-1"
                                >
                                    <MessageSquare size={12} />
                                    <span>Reviews ({ratingsCount})</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Details Modal */}
            {selectedProjectForDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="saas-card max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={selectedProjectForDetails.status} size="sm" />
                                    <span className="text-xs text-slate-500">{selectedProjectForDetails.department}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                                    {selectedProjectForDetails.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedProjectForDetails(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-white/[0.02] p-3 rounded-lg border border-slate-200 dark:border-white/5">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Budget</span>
                                <p className="font-bold text-slate-900 dark:text-white">{selectedProjectForDetails.budget}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Location</span>
                                <p className="font-bold text-slate-900 dark:text-white truncate">{selectedProjectForDetails.location}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                Scope & Objectives
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] p-3 rounded-lg border border-slate-200 dark:border-white/5">
                                {selectedProjectForDetails.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => {
                                    const p = selectedProjectForDetails;
                                    setSelectedProjectForDetails(null);
                                    handleOpenReviews(p);
                                }}
                                className="btn-primary text-xs flex items-center gap-1.5"
                            >
                                <MessageSquare size={13} />
                                <span>Read Reviews ({selectedProjectForDetails.ratings?.length || 0})</span>
                            </button>
                            <Link
                                to="/projects"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                <span>Open in Projects Page</span>
                                <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews Modal */}
            {selectedProjectForReviews && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="saas-card max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                            <div>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                                    Citizen Reviews & Ratings
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                    {selectedProjectForReviews.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedProjectForReviews(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Summary Score */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5 text-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                    {reviewsData?.averageRating?.toFixed(1) || '0.0'}
                                </span>
                                <div>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star
                                                key={s}
                                                size={14}
                                                className={(reviewsData?.averageRating || 0) >= s ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                        Based on {reviewsData?.totalReviews || 0} reviews
                                    </span>
                                </div>
                            </div>
                            <StatusBadge status={selectedProjectForReviews.status} size="sm" />
                        </div>

                        {/* Reviews list */}
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {loadingReviews ? (
                                <p className="text-xs text-slate-500 text-center py-4">Loading feedback...</p>
                            ) : !reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-6">No citizen reviews yet.</p>
                            ) : (
                                reviewsData.reviews.map((r, i) => (
                                    <div key={r._id || i} className="p-3 bg-white dark:bg-[#0f172a] rounded-lg border border-slate-200 dark:border-white/5 space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {r.reviewer?.name || 'Citizen'}
                                            </span>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        size={11}
                                                        className={star <= r.score ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {r.feedback && (
                                            <p className="text-slate-600 dark:text-slate-300 italic">
                                                "{r.feedback}"
                                            </p>
                                        )}
                                        {r.createdAt && (
                                            <p className="text-[10px] text-slate-400 text-right">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Citizen feedback input */}
                        {user?.role === 'Citizen' && (
                            <form onSubmit={handleCitizenReviewSubmit} className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Rate this project:</span>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                size={16}
                                                className={`cursor-pointer ${citizenScore >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
                                                onClick={() => setCitizenScore(star)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    rows={2}
                                    placeholder="Write your review or comment..."
                                    value={citizenFeedback}
                                    onChange={(e) => setCitizenFeedback(e.target.value)}
                                    className="saas-input text-xs"
                                />
                                {reviewSuccess && (
                                    <p className="text-xs text-emerald-600">{reviewSuccess}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="btn-primary text-xs w-full py-1.5"
                                >
                                    {submittingReview ? 'Submitting...' : 'Submit Citizen Review'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicWorksPanel;
