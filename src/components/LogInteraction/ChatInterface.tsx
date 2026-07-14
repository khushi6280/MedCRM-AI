import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Bot,
  User,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  addMessage,
  setProcessing,
  addToolCall,
  clearChat,
} from '../../store/slices/chatSlice';
import { addInteraction } from '../../store/slices/interactionSlice';
import { updateInteraction } from '../../store/slices/interactionSlice';
import { updateHCPInteractionCount } from '../../store/slices/hcpSlice';
import { showToast } from '../../store/slices/uiSlice';
import { processAgentMessage, createChatMessage } from '../../services/agentService';

const suggestedPrompts = [
  'Log a meeting with Dr. Sarah Mitchell where we discussed Cardiozen, she was very interested and requested 5 samples',
  'Show me the profile of Dr. James Chen',
  'Get interaction history for Dr. Emily Rodriguez',
  'Schedule a follow-up with Dr. Michael Thompson',
  'Analyze sentiment for Dr. Priya Patel',
  'Edit interaction int-001 and change sentiment to Positive',
];

export default function ChatInterface() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.chat.messages);
  const isProcessing = useAppSelector((s) => s.chat.isProcessing);
  const interactions = useAppSelector((s) => s.interaction.interactions);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      dispatch(
        addMessage(
          createChatMessage(
            'assistant',
            "Welcome to the AI-powered CRM assistant. I'm powered by **LangGraph** and **gemma2-9b-it** via Groq.\n\nI can help you log interactions, edit records, retrieve HCP profiles, view interaction history, schedule follow-ups, analyze sentiment, and look up product information — all through natural conversation.\n\nTry one of the suggested prompts below to get started!",
          ),
        ),
      );
    }
  }, [messages.length, dispatch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const message = (text || input).trim();
    if (!message || isProcessing) return;

    const userMsg = createChatMessage('user', message);
    dispatch(addMessage(userMsg));
    setInput('');
    dispatch(setProcessing(true));

    setTimeout(() => {
      const response = processAgentMessage(message, interactions);

      response.toolCalls.forEach((tc) => {
        dispatch(addToolCall(tc));
      });

      if (response.newInteraction) {
        dispatch(addInteraction(response.newInteraction));
        dispatch(
          updateHCPInteractionCount({
            hcpId: response.newInteraction.hcpId,
            date: response.newInteraction.date,
          }),
        );
        dispatch(
          showToast({
            message: `Logged: ${response.newInteraction.hcpName} - ${response.newInteraction.type}`,
            type: 'success',
          }),
        );
      }

      if (response.updatedInteraction) {
        dispatch(
          updateInteraction({
            id: response.updatedInteraction.id,
            updates: response.updatedInteraction,
          }),
        );
        dispatch(showToast({ message: 'Interaction updated', type: 'success' }));
      }

      const assistantMsg = createChatMessage(
        'assistant',
        response.message,
        response.toolCalls,
      );
      dispatch(addMessage(assistantMsg));
      dispatch(setProcessing(false));
    }, 800 + Math.random() * 600);
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-bold text-slate-900 mt-2 mb-1">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('• ') || line.startsWith(`${parseInt(line)}. `)) {
        return (
          <p key={i} className="pl-4 text-slate-600 text-sm">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('•')) {
        return (
          <p key={i} className="pl-4 text-slate-600 text-sm">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      return (
        <p key={i} className="text-slate-600 text-sm leading-relaxed">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  return (
    <div className="flex h-full px-6 pb-6 gap-4">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col glass-card overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/60 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">LangGraph AI Agent</p>
              <p className="text-xs text-slate-500">gemma2-9b-it via Groq</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(clearChat())}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fade-in ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-slate-700'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-400'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                }`}
              >
                <div className={msg.role === 'user' ? 'text-sm' : ''}>
                  {formatMessage(msg.content)}
                </div>

                {/* Tool Call Display */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Tool Calls
                    </p>
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg"
                      >
                        {tc.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : tc.status === 'error' ? (
                          <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-semibold text-blue-600">
                            {tc.toolName}()
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 break-words">
                            {tc.result}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-soft" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-soft" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-soft" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 1 && (
          <div className="px-5 py-3 border-t border-slate-200/60 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-400 mb-2">Suggested prompts:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
                >
                  {prompt.substring(0, 50)}...
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-200/60 bg-white/50">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe the interaction in natural language..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Tool History Sidebar */}
      <div className="w-72 hidden lg:flex flex-col glass-card overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200/60 bg-white/50">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-800">Tool Activity</p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">LangGraph agent tool calls</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {useAppSelector((s) => s.chat.toolHistory).length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No tool calls yet</p>
              <p className="text-xs text-slate-400">Send a message to see the agent in action</p>
            </div>
          ) : (
            useAppSelector((s) => s.chat.toolHistory).map((tc, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-slate-200 animate-slide-in"
              >
                <div className="flex items-center gap-2 mb-1">
                  {tc.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : tc.status === 'error' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  )}
                  <p className="text-xs font-mono font-semibold text-blue-600">
                    {tc.toolName}
                  </p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tc.result.substring(0, 80)}
                  {tc.result.length > 80 ? '...' : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
