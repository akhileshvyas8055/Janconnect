import React from 'react';

// Status Chip
export type StatusType = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Reopened' | 'Escalated' | 'Pending';

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const s = status.toLowerCase();
  let colorStyle = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60';
  let dotColor = 'bg-slate-400';

  if (s.includes('resolve') || s.includes('complete') || s.includes('success')) {
    colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    dotColor = 'bg-emerald-500';
  } else if (s.includes('progress') || s.includes('ongoing')) {
    colorStyle = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    dotColor = 'bg-amber-500';
  } else if (s.includes('assign')) {
    colorStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
    dotColor = 'bg-indigo-500';
  } else if (s.includes('escalat') || s.includes('critical') || s.includes('reopen')) {
    colorStyle = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    dotColor = 'bg-rose-500';
  } else if (s.includes('review') || s.includes('submit')) {
    colorStyle = 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    dotColor = 'bg-blue-500';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-md border tracking-wide uppercase ${sizeClasses} ${colorStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
};

// Priority Badge
export const PriorityBadge: React.FC<{ priority?: string; size?: 'sm' | 'md' }> = ({ priority = 'Medium', size = 'md' }) => {
  const p = priority.toLowerCase();
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (p === 'critical') {
    badgeStyle = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40';
  } else if (p === 'high') {
    badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/40';
  } else if (p === 'medium') {
    badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40';
  } else if (p === 'low') {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center font-bold tracking-wider rounded border uppercase ${sizeClasses} ${badgeStyle}`}>
      {priority}
    </span>
  );
};
