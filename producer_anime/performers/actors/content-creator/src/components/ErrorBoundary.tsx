/**
 * Error Boundary Component
 * React Error Boundaryコンポーネント
 * 予期しないエラーをキャッチして表示
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorType, classifyError, getUserFriendlyMessage } from '@/utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // エラーをログに記録
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // カスタムエラーハンドラーを呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const appError = this.state.error
        ? classifyError(this.state.error)
        : {
            type: ErrorType.UNKNOWN,
            message: getUserFriendlyMessage(ErrorType.UNKNOWN),
          };

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                  エラーが発生しました
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  {appError.message}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4">
                    <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer mb-2">
                      詳細情報（開発モード）
                    </summary>
                    <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto max-h-40">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack && (
                        <>
                          {'\n\nComponent Stack:'}
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </details>
                )}
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  再試行
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

