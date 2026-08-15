import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <main role="alert" className="grid min-h-screen place-items-center bg-[#08111d] p-6"><section className="w-full max-w-xl rounded-3xl border border-amber-300/15 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_34%),rgba(15,23,42,0.82)] p-7 shadow-2xl shadow-black/30 sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10"><AlertTriangle className="h-5 w-5 text-amber-200" /></div><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Workspace recovery</p><h1 className="mt-2 font-display text-2xl font-semibold text-white">A workspace view did not load</h1><p className="mt-3 text-sm leading-6 text-slate-300">Try opening the view again. Your stored experiments, datasets, model configurations, and run records were not changed by this display error.</p><div className="mt-5 flex items-start gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />Internal error details are retained outside the researcher interface to avoid exposing sensitive implementation data.</div><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button onClick={this.retry} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><RotateCcw className="mr-2 h-4 w-4" />Try again</Button><Button variant="outline" onClick={() => window.location.reload()} className="border-white/10 text-slate-200 hover:bg-white/5 hover:text-white">Reload workspace</Button></div></section></main>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
