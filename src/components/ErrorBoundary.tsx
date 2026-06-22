import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

// Catches any uncaught error during rendering anywhere in the app and shows a
// recoverable screen instead of leaving the user on a blank/broken page. This does
// NOT catch errors inside event handlers or async code (e.g. a failed fetch) — those
// are handled individually at the call site via try/catch. This is specifically for
// render-phase crashes, which previously had zero recovery path anywhere in the app.
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("BizKhata crashed:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Something went wrong</h2>
              <p className="text-xs text-slate-500 mt-1.5">
                BizKhata hit an unexpected error and couldn't continue. Your data is safe —
                nothing here is lost. Reloading usually fixes this.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
            >
              Reload BizKhata
            </button>
            {this.state.error && (
              <details className="text-left">
                <summary className="text-[10px] text-slate-400 cursor-pointer">Technical details</summary>
                <pre className="text-[9px] text-slate-400 mt-1.5 whitespace-pre-wrap break-words bg-slate-50 p-2 rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
