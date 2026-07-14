import { useState } from 'react';
import {
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { addInteraction } from '../../store/slices/interactionSlice';
import { updateHCPInteractionCount } from '../../store/slices/hcpSlice';
import { showToast } from '../../store/slices/uiSlice';
import type {
  Interaction,
  InteractionChannel,
  InteractionType,
  Priority,
} from '../../types';
import {
  productCatalog,
  interactionTypes,
  interactionChannels,
} from '../../data/mockData';

const emptyForm = {
  hcpId: '',
  date: new Date().toISOString().split('T')[0],
  channel: 'In-Person' as InteractionChannel,
  type: 'Product Discussion' as InteractionType,
  priority: 'Medium' as Priority,
  summary: '',
  keyOutcomes: [''],
  followUpActions: [''],
  durationMinutes: 30,
  location: '',
  sentiment: 'Neutral' as Interaction['sentiment'],
  products: [] as { name: string; discussed: boolean; samplesDropped: number }[],
};

export default function StructuredForm({
  preselectedHCPId,
}: {
  preselectedHCPId?: string | null;
}) {
  const dispatch = useAppDispatch();
  const hcps = useAppSelector((s) => s.hcp.hcps);
  const [form, setForm] = useState({
    ...emptyForm,
    hcpId: preselectedHCPId || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedHCP = hcps.find((h) => h.id === form.hcpId);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.hcpId) e.hcpId = 'Please select an HCP';
    if (!form.summary.trim()) e.summary = 'Summary is required';
    if (!form.location.trim()) e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      dispatch(showToast({ message: 'Please fix the errors before submitting', type: 'error' }));
      return;
    }

    const hcp = hcps.find((h) => h.id === form.hcpId);
    const newInteraction: Interaction = {
      id: `int-${Date.now()}`,
      hcpId: form.hcpId,
      hcpName: hcp?.name || 'Unknown',
      date: form.date,
      channel: form.channel,
      type: form.type,
      status: 'Completed',
      priority: form.priority,
      products: form.products,
      summary: form.summary,
      keyOutcomes: form.keyOutcomes.filter((k) => k.trim()),
      followUpActions: form.followUpActions.filter((f) => f.trim()),
      sentiment: form.sentiment,
      durationMinutes: form.durationMinutes,
      location: form.location,
      repName: 'Alex Morgan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addInteraction(newInteraction));
    dispatch(updateHCPInteractionCount({ hcpId: form.hcpId, date: form.date }));
    dispatch(showToast({ message: `Interaction logged for ${hcp?.name}`, type: 'success' }));

    setForm({ ...emptyForm, hcpId: '' });
    setErrors({});
  };

  const toggleProduct = (productName: string) => {
    const existing = form.products.find((p) => p.name === productName);
    if (existing) {
      setForm({
        ...form,
        products: form.products.filter((p) => p.name !== productName),
      });
    } else {
      setForm({
        ...form,
        products: [...form.products, { name: productName, discussed: true, samplesDropped: 0 }],
      });
    }
  };

  const updateSamples = (productName: string, samples: number) => {
    setForm({
      ...form,
      products: form.products.map((p) =>
        p.name === productName ? { ...p, samplesDropped: samples } : p,
      ),
    });
  };

  return (
    <div className="h-full overflow-y-auto px-6 pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HCP Selection */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
            Select Healthcare Professional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">HCP *</label>
              <select
                value={form.hcpId}
                onChange={(e) => setForm({ ...form, hcpId: e.target.value })}
                className="input-field"
              >
                <option value="">Select an HCP...</option>
                {hcps.map((hcp) => (
                  <option key={hcp.id} value={hcp.id}>
                    {hcp.name} - {hcp.specialty} ({hcp.organization})
                  </option>
                ))}
              </select>
              {errors.hcpId && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.hcpId}
                </p>
              )}
            </div>
            {selectedHCP && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl animate-fade-in">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${selectedHCP.avatarColor} flex items-center justify-center text-white font-semibold`}>
                  {selectedHCP.name.split(' ').slice(-1)[0][0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedHCP.name}</p>
                  <p className="text-xs text-slate-500">{selectedHCP.specialty} | {selectedHCP.tier}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interaction Details */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
            Interaction Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as InteractionChannel })}
                className="input-field"
              >
                {interactionChannels.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as InteractionType })}
                className="input-field"
              >
                {interactionTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="input-field"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Sentiment</label>
              <select
                value={form.sentiment}
                onChange={(e) => setForm({ ...form, sentiment: e.target.value as Interaction['sentiment'] })}
                className="input-field"
              >
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Location *</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Massachusetts General Hospital - Cardiology Wing"
                className="input-field"
              />
              {errors.location && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Products Discussed */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
            Products Discussed
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {productCatalog.map((product) => {
              const selected = form.products.find((p) => p.name === product);
              return (
                <button
                  key={product}
                  onClick={() => toggleProduct(product)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 ${
                    selected
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {selected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                  {product}
                </button>
              );
            })}
          </div>
          {form.products.length > 0 && (
            <div className="space-y-2 animate-fade-in">
              {form.products.map((p) => (
                <div key={p.name} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 flex-1">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Samples:</label>
                    <input
                      type="number"
                      min="0"
                      value={p.samplesDropped}
                      onChange={(e) => updateSamples(p.name, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary & Outcomes */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
            Summary & Outcomes
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Interaction Summary *</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={4}
                placeholder="Provide a detailed summary of the interaction..."
                className="input-field resize-none"
              />
              {errors.summary && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.summary}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Key Outcomes</label>
              {form.keyOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => {
                      const updated = [...form.keyOutcomes];
                      updated[idx] = e.target.value;
                      setForm({ ...form, keyOutcomes: updated });
                    }}
                    placeholder={`Outcome ${idx + 1}`}
                    className="input-field"
                  />
                  {form.keyOutcomes.length > 1 && (
                    <button
                      onClick={() => setForm({ ...form, keyOutcomes: form.keyOutcomes.filter((_, i) => i !== idx) })}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, keyOutcomes: [...form.keyOutcomes, ''] })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add outcome
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Follow-up Actions</label>
              {form.followUpActions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={action}
                    onChange={(e) => {
                      const updated = [...form.followUpActions];
                      updated[idx] = e.target.value;
                      setForm({ ...form, followUpActions: updated });
                    }}
                    placeholder={`Action ${idx + 1}`}
                    className="input-field"
                  />
                  {form.followUpActions.length > 1 && (
                    <button
                      onClick={() => setForm({ ...form, followUpActions: form.followUpActions.filter((_, i) => i !== idx) })}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, followUpActions: [...form.followUpActions, ''] })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add action
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            onClick={() => { setForm({ ...emptyForm }); setErrors({}); }}
            className="btn-secondary flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Clear
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Log Interaction
          </button>
        </div>
      </div>
    </div>
  );
}
