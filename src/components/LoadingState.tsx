import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-3 border-navy-100 border-t-orange-400 rounded-full animate-spin" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-status-critico/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-status-critico" />
      </div>
      <p className="text-navy-600 font-medium mb-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      )}
    </div>
  );
}
