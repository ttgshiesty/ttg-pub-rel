import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  stack: string | null;
  showStack: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    stack: null,
    showStack: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ stack: info?.componentStack || null });
  }

  reset = () =>
    this.setState({
      hasError: false,
      error: null,
      stack: null,
      showStack: false,
    });
  toggleStack = () => this.setState((s) => ({ showStack: !s.showStack }));

  override render() {
    if (this.state.hasError) {
      const { error, stack, showStack } = this.state;
      const label = this.props.fallbackLabel || 'Page Failed to Render';
      return (
        <div className="max-w-3xl mx-auto px-4 mt-12 pb-20">
          {/* Main error card */}
          <div className="bg-[#1a1120] border border-[#e83a3a]/50">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e83a3a]/20 bg-[#e83a3a]/5">
              <AlertTriangle className="w-6 h-6 text-[#e83a3a] shrink-0" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white leading-none">
                  {label}
                </h2>
                <p className="text-[8px] text-[#e83a3a] uppercase tracking-widest mt-0.5 font-black">
                  Render Error — Section isolated, rest of app is unaffected
                </p>
              </div>
            </div>

            {/* Error message */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-[#0d0d0d] border border-[#2d1f38] px-4 py-3">
                <p className="text-[8px] text-[#8a7a9a] uppercase tracking-widest font-black mb-1">
                  Error Message
                </p>
                <p className="text-[11px] text-[#e83a3a] font-mono leading-relaxed break-all">
                  {error?.message || 'Unknown render error'}
                </p>
              </div>

              {/* Stack trace toggle */}
              {stack && (
                <div>
                  <button
                    onClick={this.toggleStack}
                    className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#8a7a9a] hover:text-white transition-colors"
                  >
                    {showStack ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {showStack ? 'Hide' : 'Show'} Component Stack
                  </button>
                  {showStack && (
                    <pre className="mt-2 text-[8px] text-[#6c6b6a] font-mono bg-[#0d0d0d] border border-[#2d1f38] p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {stack}
                    </pre>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={this.reset}
                  className="flex items-center gap-2 px-5 py-2.5 border text-[9px] font-black uppercase tracking-widest transition-colors"
                  style={{
                    borderColor: '#e83a3a50',
                    color: '#e83a3a',
                    background: '#e83a3a10',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      '#e83a3a20';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      '#e83a3a10';
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 border text-[9px] font-black uppercase tracking-widest transition-colors"
                  style={{ borderColor: '#2d1f38', color: '#8a7a9a' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#8a7a9a';
                  }}
                >
                  Full Reload
                </button>
              </div>
            </div>
          </div>

          {/* Hint */}
          <p className="text-[7px] text-[#2d1f38] uppercase tracking-widest text-center mt-4 font-black">
            If this keeps happening, check the browser console for more details.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
