import { cn } from './Input';

/**
 * StatCard - Dashboard summary card component.
 */
export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    variant = 'default',
    loading = false,
    className,
}) {
    const variants = {
        default: {
            card: 'glass-panel',
            icon: 'bg-forest-800/80 text-forest-400 border-forest-700/50',
        },
        critical: {
            card: 'bg-alert-950/30 border border-alert-800/50 backdrop-blur-md',
            icon: 'bg-alert-900/60 text-alert-400 border-alert-700/50 animate-pulse',
        },
        warning: {
            card: 'bg-amber-950/30 border border-amber-800/50 backdrop-blur-md',
            icon: 'bg-amber-900/60 text-amber-400 border-amber-700/50',
        },
        info: {
            card: 'bg-info-950/30 border border-info-800/50 backdrop-blur-md',
            icon: 'bg-info-900/60 text-info-400 border-info-700/50',
        },
    };

    const { card, icon } = variants[variant] || variants.default;

    return (
        <div className={cn('stat-card rounded-xl overflow-hidden', card, className)}>
            <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl border shrink-0', icon)}>
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-forest-400 truncate">{title}</p>
                    {loading ? (
                        <div className="mt-2 h-8 w-16 skeleton rounded" />
                    ) : (
                        <p className={cn(
                            'mt-1 text-3xl font-bold tracking-tight',
                            variant === 'critical' ? 'text-alert-400' :
                                variant === 'warning' ? 'text-amber-400' :
                                    variant === 'info' ? 'text-info-400' : 'text-slate-100'
                        )}>
                            {value ?? '—'}
                        </p>
                    )}
                    {trend && (
                        <p className="text-xs text-forest-400 mt-1">{trend}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
