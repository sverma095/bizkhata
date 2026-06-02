import { useState, useEffect } from 'react';
import { Mail, RefreshCw, Inbox, Trash2, Key, Users, Building2, Fingerprint } from 'lucide-react';

interface TesterPanelProps {
  onQuickLogin: (email: string) => void;
  onNavigateToReset?: (email: string, code: string) => void;
  onNavigateToActivate?: (email: string, code: string) => void;
}

export default function TesterPanel(props: TesterPanelProps) {
  const { onQuickLogin, onNavigateToReset, onNavigateToActivate } = props;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearNotifs = async () => {
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 4000);
    return () => clearInterval(interval);
  }, []);

  const getQuickLogins = () => [
    { name: "Super Admin (Global Platform)", email: "superadmin@bizkhata.com", role: "Super Admin", org: "None" },
    { name: "Apex Admin (Company A)", email: "admin@apex.com", role: "Admin", org: "Apex Industries" },
    { name: "Apex Manager (Company A)", email: "manager@apex.com", role: "Manager", org: "Apex Industries" },
    { name: "Apex Accountant (Company A)", email: "accountant@apex.com", role: "Accountant", org: "Apex Industries" },
    { name: "Vertex Admin (Company B)", email: "admin@vertex.com", role: "Admin", org: "Vertex Solutions" },
    { name: "Vertex Viewer (Company B)", email: "viewer@vertex.com", role: "Viewer", org: "Vertex Solutions" }
  ];

  return (
    <div id="tester-panel" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 mt-auto transition-all duration-300">
      <div className="flex items-center justify-between px-6 py-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse" id="panel-status-indicator"></div>
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-700 dark:text-slate-300">
            BIZKHATA TESTER CONSOLE & EMAIL GATEWAY
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            id="btn-refresh-notifs"
            onClick={fetchNotifs}
            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded transition"
            title="Refresh Notification Gateway"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            id="toggle-tester-collapse"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            {isOpen ? 'Minimize Console' : 'Show Console'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-h-[380px] overflow-y-auto font-sans">
          
          {/* Quick Demo Logins Section */}
          <div className="lg:col-span-5" id="sandbox-roles-panel">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-500" />
              Impersonate Demo Personas
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Instantly toggle between different tenants and role clearances to verify real-time data separation and dynamic RBAC layout adjustments.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {getQuickLogins().map((p) => (
                <button
                  key={p.email}
                  id={`quick-login-${p.email.replace('@', '-')}`}
                  onClick={() => onQuickLogin(p.email)}
                  className="group text-left p-2.5 bg-white dark:bg-slate-950 hover:bg-sky-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 rounded-lg shadow-xs transition duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                      {p.role}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                      {p.org === 'None' ? 'Global' : p.org.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{p.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-1">
                    {p.email} / <span className="italic">Password@123</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Email Inbox Gateway Section */}
          <div className="lg:col-span-7 flex flex-col h-full border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 lg:pl-6" id="sandbox-inbox-panel">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-sky-500" />
                Live Notification Gateway ({notifications.length})
              </h4>
              {notifications.length > 0 && (
                <button
                  id="btn-clear-inbox"
                  onClick={clearNotifs}
                  className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Inbox
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-slate-950 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                  <Mail className="w-8 h-8 mb-2 stroke-[1.5]" />
                  <span className="text-xs font-medium">Gateway is empty</span>
                  <span className="text-[10px] text-slate-400 text-center px-4 mt-1">
                    Sign up, request password reset, or add new staff members to capture emails and temporary credentials here.
                  </span>
                </div>
              ) : (
                notifications.map((notif) => {
                  const hasResetCode = !!notif.code && notif.subject.toLowerCase().includes('reset');
                  const hasActivationCode = !!notif.code && notif.subject.toLowerCase().includes('welcome');
                  
                  return (
                    <div 
                      key={notif.id}
                      className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs hover:shadow-sm transition"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {notif.subject}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-sky-900 text-sky-600 dark:text-sky-400 font-bold ml-1 shrink-0">
                          {notif.type}
                        </span>
                      </div>
                      
                      <div className="flex gap-1 items-center text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">To:</span> 
                        <span>{notif.to}</span>
                        <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
                        <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-900 leading-snug font-mono text-[11px]">
                        {notif.body}
                      </p>

                      {/* Helper Quick Action Link Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                        {notif.code && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Extracted Credentials:</span>
                            <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded shadow-2xs select-all">
                              {notif.code}
                            </span>
                          </div>
                        )}
                        
                        {hasResetCode && onNavigateToReset && (
                          <button
                            onClick={() => onNavigateToReset(notif.to, notif.code)}
                            className="ml-auto text-[10px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 dark:bg-slate-900 px-2 py-1 rounded border border-sky-200 dark:border-slate-800 transition"
                          >
                            Open Password Reset Page →
                          </button>
                        )}
                        
                        {hasActivationCode && onNavigateToActivate && (
                          <button
                            onClick={() => onNavigateToActivate(notif.to, notif.code)}
                            className="ml-auto text-[10px] font-bold text-teal-600 hover:text-teal-850 bg-teal-50 dark:bg-slate-900 px-2 py-1 rounded border border-teal-200 dark:border-slate-800 transition"
                          >
                            Open Account Activation Page →
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
