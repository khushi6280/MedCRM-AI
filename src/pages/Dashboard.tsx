import {
  Users,
  MessageSquarePlus,
  TrendingUp,
  Smile,
  ArrowUpRight,
  Calendar,
  Activity,
  Star,
} from 'lucide-react';
import { useAppSelector } from '../store';

export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const hcps = useAppSelector((s) => s.hcp.hcps);
  const interactions = useAppSelector((s) => s.interaction.interactions);

  const totalHCPs = hcps.length;
  const totalInteractions = interactions.length;
  const kolCount = hcps.filter((h) => h.tier === 'KOL').length;
  const positiveInteractions = interactions.filter((i) => i.sentiment === 'Positive').length;
  const positiveRate = totalInteractions > 0
    ? Math.round((positiveInteractions / totalInteractions) * 100)
    : 0;

  const recentInteractions = interactions.slice(0, 4);
  const topHCPs = [...hcps].sort((a, b) => b.totalInteractions - a.totalInteractions).slice(0, 5);

  // Channel distribution
  const channelCounts = interactions.reduce((acc, i) => {
    acc[i.channel] = (acc[i.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxChannel = Math.max(...Object.values(channelCounts), 1);

  // Sentiment distribution
  const sentimentCounts = {
    Positive: interactions.filter((i) => i.sentiment === 'Positive').length,
    Neutral: interactions.filter((i) => i.sentiment === 'Neutral').length,
    Negative: interactions.filter((i) => i.sentiment === 'Negative').length,
  };

  const stats = [
    {
      label: 'Total HCPs',
      value: totalHCPs,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      sublabel: `${kolCount} KOLs`,
    },
    {
      label: 'Interactions Logged',
      value: totalInteractions,
      icon: MessageSquarePlus,
      color: 'from-emerald-500 to-teal-500',
      sublabel: 'This period',
    },
    {
      label: 'Positive Sentiment',
      value: `${positiveRate}%`,
      icon: Smile,
      color: 'from-amber-500 to-orange-500',
      sublabel: `${positiveInteractions} interactions`,
    },
    {
      label: 'Active Engagement',
      value: `${hcps.filter((h) => h.lastInteractionDate).length}/${totalHCPs}`,
      icon: TrendingUp,
      color: 'from-rose-500 to-pink-500',
      sublabel: 'HCPs engaged',
    },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card p-5 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-slate-400">{stat.sublabel}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Interactions */}
          <div className="lg:col-span-2 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-800">Recent Interactions</h3>
              </div>
              <button
                onClick={() => onNavigate('interactions')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {recentInteractions.map((int) => (
                <div
                  key={int.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-2 h-12 rounded-full ${
                    int.sentiment === 'Positive' ? 'bg-emerald-400'
                    : int.sentiment === 'Negative' ? 'bg-rose-400'
                    : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{int.hcpName}</p>
                    <p className="text-xs text-slate-500 truncate">{int.type} • {int.channel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{int.summary.substring(0, 60)}...</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">{int.date}</p>
                    <span className={`badge ${
                      int.sentiment === 'Positive' ? 'badge-positive'
                      : int.sentiment === 'Negative' ? 'badge-negative'
                      : 'badge-neutral'
                    } mt-1`}>{int.sentiment}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top HCPs */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-800">Most Engaged HCPs</h3>
            </div>
            <div className="space-y-3">
              {topHCPs.map((hcp, idx) => (
                <div key={hcp.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${hcp.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {hcp.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{hcp.name}</p>
                    <p className="text-xs text-slate-400">{hcp.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">{hcp.totalInteractions}</p>
                    <p className="text-xs text-slate-400">interactions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Distribution */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquarePlus className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-800">Interaction Channels</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(channelCounts).map(([channel, count]) => (
                <div key={channel}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{channel}</span>
                    <span className="text-xs text-slate-400">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxChannel) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smile className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-800">Sentiment Breakdown</h3>
            </div>
            <div className="flex items-center justify-around py-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                  <span className="text-xl font-bold text-emerald-600">{sentimentCounts.Positive}</span>
                </div>
                <p className="text-xs font-medium text-slate-600">Positive</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <span className="text-xl font-bold text-slate-500">{sentimentCounts.Neutral}</span>
                </div>
                <p className="text-xs font-medium text-slate-600">Neutral</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-2">
                  <span className="text-xl font-bold text-rose-600">{sentimentCounts.Negative}</span>
                </div>
                <p className="text-xs font-medium text-slate-600">Negative</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('log-interaction')}
              className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <MessageSquarePlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Log Interaction</p>
                <p className="text-xs text-slate-500">Form or AI chat</p>
              </div>
            </button>
            <button
              onClick={() => onNavigate('hcps')}
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Browse HCPs</p>
                <p className="text-xs text-slate-500">View directory</p>
              </div>
            </button>
            <button
              onClick={() => onNavigate('interactions')}
              className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">History</p>
                <p className="text-xs text-slate-500">Past interactions</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
