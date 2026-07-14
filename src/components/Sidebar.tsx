import {
  LayoutDashboard,
  Users,
  MessageSquarePlus,
  History,
  Stethoscope,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleSidebar } from '../store/slices/uiSlice';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log-interaction', label: 'Log Interaction', icon: MessageSquarePlus },
  { id: 'hcps', label: 'HCP Directory', icon: Users },
  { id: 'interactions', label: 'Interaction History', icon: History },
];

export default function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } h-screen bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 flex-shrink-0`}
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-white font-bold text-sm leading-tight">MedCRM AI</h1>
            <p className="text-xs text-slate-500">HCP Module</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="m-3 p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-300">AI Agent Active</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            LangGraph + gemma2-9b-it powering conversational CRM logging.
          </p>
        </div>
      )}

      <button
        onClick={() => dispatch(toggleSidebar())}
        className="flex items-center justify-center py-3 border-t border-slate-800 text-slate-500 hover:text-white transition-colors"
      >
        <ChevronLeft
          className={`w-5 h-5 transition-transform duration-300 ${
            collapsed ? 'rotate-180' : ''
          }`}
        />
      </button>
    </aside>
  );
}
