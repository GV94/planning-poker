import { useServerStatus, type ServerStatus } from '../../contexts/server-status.jsx';

function getIndicatorConfig(status: ServerStatus) {
  switch (status) {
    case 'online':
      return { color: 'bg-emerald-400', text: 'Server online', pulse: true };
    case 'checking':
      return { color: 'bg-amber-400', text: 'Server sleeping...', pulse: true };
    case 'waking':
      return { color: 'bg-amber-400', text: 'Waking up...', pulse: true };
    case 'disconnected':
      return { color: 'bg-amber-400', text: 'Reconnecting...', pulse: true };
  }
}

export function ServerStatusIndicator() {
  const { status } = useServerStatus();
  const config = getIndicatorConfig(status);

  return (
    <div className="fixed top-3 right-3 z-30 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm border border-slate-800/60">
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.color}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.color}`}
        />
      </span>
      {config.text}
    </div>
  );
}
