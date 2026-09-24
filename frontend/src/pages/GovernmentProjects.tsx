import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    MapPin,
    IndianRupee,
    Clock,
    Star,
    CheckCircle2,
    Construction,
    Briefcase,
    Search,
    X,
    Building2
} from 'lucide-react';
import AppLayout from '../components/AppLayout';

const GovernmentProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        status: 'Started',
        location: '',
        department: 'Public Works'
    });

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/projects', formData);
            setShowForm(false);
            setFormData({
                title: '',
                description: '',
                budget: '',
                status: 'Started',
                location: '',
                department: 'Public Works'
            });
            fetchProjects();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRate = async (id: string, score: number) => {
        try {
            const feedback = prompt('Share your feedback (optional):');
            await api.patch(`/projects/${id}/rate`, { score, feedback });
            fetchProjects();
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        <CheckCircle2 size={12} /> Completed
                    </span>
                );
            case 'Ongoing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                        <Construction size={12} /> Ongoing
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                        <Clock size={12} /> Planned / Started
                    </span>
                );
        }
    };

    const filteredProjects = projects.filter(p => {
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              p.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <AppLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            <span>Civic Works</span>
                            <span>/</span>
                            <span className="text-blue-600 dark:text-blue-400">Development Projects</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            Public Infrastructure Projects
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            Track government civil works, expenditure transparency, and citizen ratings.
                        </p>
                    </div>

                    {user?.role === 'Officer' && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
                        >
                            <Plus size={16} />
                            <span>Launch New Project</span>
                        </button>
                    )}
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search projects, locations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="saas-input pl-9 pr-3 py-1.5 text-xs w-64"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="saas-input py-1.5 px-3 text-xs w-36 cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Started">Started</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>

                    <span className="text-xs text-slate-500">
                        Showing {filteredProjects.length} of {projects.length} public initiatives
                    </span>
                </div>

                {/* Project Creation Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="saas-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Register New Public Project
                                </h3>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Project Title
                                    </label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Ring Road Drainage Overhaul"
                                        className="saas-input"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Description & Objectives
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Outline scope, contractor information, and target impact..."
                                        className="saas-input"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Budget Allocated
                                        </label>
                                        <input
                                            required
                                            value={formData.budget}
                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            placeholder="e.g. ₹45,00,000"
                                            className="saas-input"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Location / Ward
                                        </label>
                                        <input
                                            required
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="e.g. Ward 12, Sector 4"
                                            className="saas-input"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Department
                                    </label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="saas-input cursor-pointer"
                                    >
                                        <option value="Public Works">Public Works</option>
                                        <option value="Health">Health</option>
                                        <option value="Education">Education</option>
                                        <option value="Sanitation">Sanitation</option>
                                        <option value="Water Authority">Water Authority</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="submit" className="flex-1 btn-primary text-xs">
                                        Submit for Public Record
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="btn-secondary text-xs"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Projects Grid */}
                {loading ? (
                    <div className="saas-card p-12 text-center text-slate-500">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm font-medium mt-3">Loading infrastructure initiatives...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="saas-card p-12 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                        <Construction className="w-10 h-10 text-slate-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No projects found.
                        </p>
                        <p className="text-xs text-slate-500">
                            No ongoing municipal initiatives match the current filter criteria.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map(project => {
                            const avgRating = project.ratings?.length
                                ? (project.ratings.reduce((a: any, b: any) => a + b.score, 0) / project.ratings.length).toFixed(1)
                                : null;

                            return (
                                <div
                                    key={project._id}
                                    className="saas-card p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                                                    {project.title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                    <Briefcase size={12} />
                                                    <span>{project.department}</span>
                                                </div>
                                            </div>
                                            {getStatusBadge(project.status)}
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                                            {project.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-white/5 text-xs">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    Budget
                                                </p>
                                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                                                    <IndianRupee size={12} className="text-emerald-600" />
                                                    <span>{project.budget}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    Ward / Area
                                                </p>
                                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white truncate">
                                                    <MapPin size={12} className="text-rose-600 shrink-0" />
                                                    <span className="truncate">{project.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sentiment & Ratings */}
                                    <div className="flex items-center justify-between pt-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star
                                                    key={star}
                                                    size={14}
                                                    className={`cursor-pointer transition-colors ${
                                                        Number(avgRating) >= star
                                                            ? 'text-amber-500 fill-amber-500'
                                                            : 'text-slate-300 dark:text-slate-700'
                                                    }`}
                                                    onClick={() => handleRate(project._id, star)}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            {project.ratings?.length ? `${avgRating} (${project.ratings.length} reviews)` : 'No ratings yet'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default GovernmentProjects;
