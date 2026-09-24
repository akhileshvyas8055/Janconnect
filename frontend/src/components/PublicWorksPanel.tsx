import { useEffect, useState } from 'react';
import { HardHat, Star, Construction, CheckCircle2, Clock, MapPin, IndianRupee, Briefcase } from 'lucide-react';
import api from '../services/api';

interface Project {
    _id: string;
    title: string;
    description: string;
    budget: string;
    status: string;
    location: string;
    department: string;
    ratings: { score: number }[];
}

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'Completed': return { color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20', icon: <CheckCircle2 size={14} /> };
        case 'Ongoing': return { color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20', icon: <Construction size={14} /> };
        default: return { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20', icon: <Clock size={14} /> };
    }
};

const PublicWorksPanel = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/projects')
            .then(res => setProjects(res.data))
            .catch(err => console.error('Failed to load projects', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <HardHat className="text-orange-500 dark:text-orange-400" />
                    Public Government Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card p-6 border border-white/5 animate-pulse space-y-3">
                            <div className="h-4 bg-white/10 rounded w-3/4" />
                            <div className="h-3 bg-white/5 rounded w-full" />
                            <div className="h-3 bg-white/5 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <HardHat className="text-orange-500 dark:text-orange-400" />
                    Public Government Works
                </h2>
                <div className="glass-card p-10 border border-slate-200 dark:border-white/5 text-center space-y-2">
                    <Construction size={36} className="text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-slate-500 dark:text-slate-500 font-medium text-sm">No government projects posted yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <HardHat className="text-orange-500 dark:text-orange-400" />
                    Public Government Works
                    <span className="ml-2 text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                        {projects.length} Active
                    </span>
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => {
                    const { color, icon } = getStatusStyle(project.status);
                    const avgRating = project.ratings?.length
                        ? (project.ratings.reduce((a, b) => a + b.score, 0) / project.ratings.length).toFixed(1)
                        : null;

                    return (
                        <div key={project._id} className="glass-card p-6 border border-slate-200 dark:border-white/5 hover:border-orange-500/20 transition-all flex flex-col gap-4 group">
                            {/* Header */}
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <h3 className="font-black text-slate-950 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight truncate tracking-tight">
                                        {project.title}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-widest">
                                        <Briefcase size={10} />
                                        {project.department}
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-xl border whitespace-nowrap flex-shrink-0 shadow-sm ${color}`}>
                                    {icon} {project.status}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 flex-1 font-medium italic">
                                "{project.description}"
                            </p>

                            {/* Meta */}
                            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-white/5 text-[11px]">
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                                    <IndianRupee size={12} className="text-emerald-600 dark:text-emerald-500" />
                                    {project.budget || '—'}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold truncate">
                                    <MapPin size={12} className="text-rose-600 dark:text-rose-500 flex-shrink-0" />
                                    <span className="truncate">{project.location || '—'}</span>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            size={14}
                                            className={Number(avgRating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">
                                    {project.ratings?.length ? `${avgRating} · ${project.ratings.length} ratings` : 'No ratings yet'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PublicWorksPanel;
