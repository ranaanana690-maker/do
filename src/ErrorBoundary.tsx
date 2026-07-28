import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/admin';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">عذراً، حدث خطأ تقني</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              لقد واجهنا مشكلة تقنية بسيطة. يمكنك إعادة تحميل الصفحة أو العودة إلى لوحة التحكم الرئيسية.
            </p>

            {this.state.error?.message && (
              <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs font-mono text-left dir-ltr overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={18} />
                إعادة تحميل
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-slate-200"
              >
                <Home size={18} />
                الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
