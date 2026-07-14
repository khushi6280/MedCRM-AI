import {
  Search,
  MapPin,
  Mail,
  Phone,
  MessageSquarePlus,
  Filter,
  Star,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setSearchQuery, setFilterSpecialty, setFilterTier } from '../store/slices/hcpSlice';
import { setSelectedHCPForLogging, setViewMode, showToast } from '../store/slices/uiSlice';
import type { HCP } from '../types';

export default function HCPDirectory({ onNavigate }: { onNavigate: (page: string) => void }) {
  const dispatch = useAppDispatch();
  const { hcps, searchQuery, filterSpecialty, filterTier } = useAppSelector((s) => s.hcp);

  const specialties = [...new Set(hcps.map((h) => h.specialty))];
  const tiers = ['KOL', 'High-Volume', 'Standard'];

  const filtered = hcps.filter((h) => {
    const matchesSearch =
      !searchQuery ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = !filterSpecialty || h.specialty === filterSpecialty;
    const matchesTier = !filterTier || h.tier === filterTier;
    return matchesSearch && matchesSpecialty && matchesTier;
  });

  const handleLogInteraction = (hcp: HCP) => {
    dispatch(setSelectedHCPForLogging(hcp.id));
    dispatch(setViewMode('form'));
    onNavigate('log-interaction');
    dispatch(showToast({ message: `Selected ${hcp.name} for logging`, type: 'info' }));
  };

  const tierBadge = (tier: HCP['tier']) => {
    if (tier === 'KOL') return 'badge-kol';
    if (tier === 'High-Volume') return 'badge-high-volume';
    return 'badge-standard';
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              placeholder="Search by name, organization, or specialty..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={filterSpecialty || ''}
            onChange={(e) => dispatch(setFilterSpecialty(e.target.value || null))}
            className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All Specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterTier || ''}
            onChange={(e) => dispatch(setFilterTier(e.target.value || null))}
            className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All Tiers</option>
            {tiers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-xs text-slate-500 px-3 py-2 bg-slate-100 rounded-xl">
            <Filter className="w-3.5 h-3.5" />
            {filtered.length} of {hcps.length}
          </div>
        </div>

        {/* HCP Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((hcp) => {
            return (
              <div
                key={hcp.id}
                className="glass-card p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${hcp.avatarColor} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
                  >
                    {hcp.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{hcp.name}</h3>
                    <p className="text-xs text-slate-500">{hcp.specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`badge ${tierBadge(hcp.tier)}`}>{hcp.tier}</span>
                      {hcp.tier === 'KOL' && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <p className="text-xs text-slate-600 truncate">{hcp.organization}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" /> {hcp.city}, {hcp.state}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Mail className="w-3 h-3" /> {hcp.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="w-3 h-3" /> {hcp.phone}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Interactions</p>
                    <p className="text-lg font-bold text-slate-800">{hcp.totalInteractions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Last Visit</p>
                    <p className="text-sm font-medium text-slate-700">
                      {hcp.lastInteractionDate || '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLogInteraction(hcp)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-medium transition-all duration-200"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" /> Log
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">No HCPs found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
