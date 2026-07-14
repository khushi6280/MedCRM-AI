import { useState } from 'react';
import { ClipboardList, MessageSquare } from 'lucide-react';
import { useAppSelector } from '../store';
import StructuredForm from '../components/LogInteraction/StructuredForm';
import ChatInterface from '../components/LogInteraction/ChatInterface';

export default function LogInteraction() {
  const [mode, setMode] = useState<'form' | 'chat'>('form');
  const selectedHCPForLogging = useAppSelector((s) => s.ui.selectedHCPForLogging);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Log HCP Interaction</h1>
            <p className="text-sm text-slate-500 mt-1">
              Record interactions via structured form or AI-powered conversational interface
            </p>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode('form')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === 'form'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Structured Form
            </button>
            <button
              onClick={() => setMode('chat')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === 'chat'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              AI Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'form' ? (
          <StructuredForm preselectedHCPId={selectedHCPForLogging} />
        ) : (
          <ChatInterface />
        )}
      </div>
    </div>
  );
}
