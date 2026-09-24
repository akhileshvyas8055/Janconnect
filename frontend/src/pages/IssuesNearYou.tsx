import NearbyIssuesPanel from '../components/NearbyIssuesPanel';
import { MapPin } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const IssuesNearYou = () => {
    return (
        <AppLayout>
            <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
                {/* Header Context */}
                <div className="border-b border-slate-200 dark:border-white/10 pb-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Community</span>
                        <span>/</span>
                        <span className="text-blue-600 dark:text-blue-400">Hyper-Local Issues</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-rose-600" />
                        Issues Near Your Location
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                        Detects nearby civic grievances within your area. Upvote to elevate priority for municipal action.
                    </p>
                </div>

                <div className="saas-card p-6">
                    <NearbyIssuesPanel radiusKm={5} />
                </div>
            </div>
        </AppLayout>
    );
};

export default IssuesNearYou;
