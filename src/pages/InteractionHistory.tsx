import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  X,
  Save,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  deleteInteraction,
  updateInteraction,
  setFilterHCPId,
  setFilterStatus,
} from '../store/slices/interactionSlice';
import { showToast } from '../store/slices/uiSlice';
import type { Interaction } from '../types';

export default function InteractionHistory() {
  const dispatch = useAppDispatch();
  const { interactions, filterHCPId, filterStatus } = useAppSelector((s) => s.interaction);
  const hcps = useAppSelector((s) => s.hcp.hcps);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Interaction>>({});

  const filtered = interactions.filter((i) => {
    const matchesHCP = !filterHCPId || i.hcpId === filterHCPId;
    const matchesStatus = !filterStatus || i.status === filterStatus;
    return matchesHCP && matchesStatus;
  });

  const startEdit = (int: Interaction) => {
    setEditingId(int.id);
    setEditForm({
      summary: int.summary,
      sentiment: int.sentiment,
      priority: int.priority,
      status: int.status,
      channel: int.channel,
      type: int.type,
    });
  };

  const saveEdit = () => {
    if (editingId) {
      dispatch(updateInteraction({ id: editingId, updates: editForm }));
      dispatch(showToast({ message: 'Interaction updated', type: 'success' }));
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleDelete = (id: string, hcpName: string) => {
    dispatch(deleteInteraction(id));
    dispatch(showToast({ message: `Deleted interaction for ${hcpName}`, type: 'info' }));
  };

  const sentimentBadge = (s: string) => {
    if (s === 'Positive') return 'badge-positive';
    if (s === 'Negative') return 'badge-negative';
    return 'badge-neutral';
  };

  const statusBadge = (s: string) => {
    if (s === 'Completed') return 'badge-completed';
    if (s === 'Planned') return 'badge-planned';
    return 'badge-cancelled';
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filterHCPId || ''}
            onChange={(e) => dispatch(setFilterHCPId(e.target.value || null))}
            className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All HCPs</option>
            {hcps.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <select
            value={filterStatus || ''}
            onChange={(e) => dispatch(setFilterStatus(e.target.value || null))}
            className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Planned">Planned</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div className="flex items-center gap-1 text-xs text-slate-500 px-3 py-2 bg-slate-100 rounded-xl">
            <Filter className="w-3.5 h-3.5" />
            {filtered.length} interactions
          </div>
        </div>

        {/* Interaction Timeline */}
        <div className="space-y-4">
          {filtered.map((int) => (
            <div
              key={int.id}
              className="glass-card p-5 hover:shadow-md transition-all duration-200 animate-fade-in"
            >
              {editingId === int.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Editing {int.id}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditForm({}); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Channel</label>
                      <select
                        value={editForm.channel}
                        onChange={(e) => setEditForm({ ...editForm, channel: e.target.value as Interaction['channel'] })}
                        className="input-field"
                      >
                        {['In-Person', 'Phone', 'Video', 'Email', 'Conference'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as Interaction['type'] })}
                        className="input-field"
                      >
                        {['Product Discussion', 'Scientific Exchange', 'Follow-up', 'Product Demo', 'Adverse Event Report', 'General'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Sentiment</label>
                      <select
                        value={editForm.sentiment}
                        onChange={(e) => setEditForm({ ...editForm, sentiment: e.target.value as Interaction['sentiment'] })}
                        className="input-field"
                      >
                        <option value="Positive">Positive</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Negative">Negative</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Interaction['priority'] })}
                        className="input-field"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Summary</label>
                    <textarea
                      value={editForm.summary}
                      onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{int.hcpName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge ${statusBadge(int.status)}`}>{int.status}</span>
                          <span className={`badge ${sentimentBadge(int.sentiment)}`}>{int.sentiment}</span>
                          <span className="badge bg-slate-100 text-slate-600">{int.priority}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(int)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(int.id, int.hcpName)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {int.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {int.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {int.location}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>{int.channel}</span>
                    <span className="text-slate-400">•</span>
                    <span>{int.type}</span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{int.summary}</p>

                  {int.products.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {int.products.map((p) => (
                        <span
                          key={p.name}
                          className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
                        >
                          {p.name}
                          {p.samplesDropped > 0 && ` (${p.samplesDropped} samples)`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {int.keyOutcomes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1.5">Key Outcomes</p>
                        <ul className="space-y-1">
                          {int.keyOutcomes.map((o, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                              {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {int.followUpActions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1.5">Follow-up Actions</p>
                        <ul className="space-y-1">
                          {int.followUpActions.map((f, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">No interactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
