/**
 * Error Handling Utilities
 * 統一されたエラーハンドリングユーティリティ
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * エラーを分類してAppErrorに変換
 */
export function classifyError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // ネットワークエラー
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('failed to fetch')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: getUserFriendlyMessage(ErrorType.NETWORK, error.message),
        originalError: error,
      };
    }

    // バリデーションエラー
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('must be')
    ) {
      return {
        type: ErrorType.VALIDATION,
        message: getUserFriendlyMessage(ErrorType.VALIDATION, error.message),
        originalError: error,
      };
    }

    // データベースエラー
    if (
      message.includes('database') ||
      message.includes('sql') ||
      message.includes('constraint') ||
      message.includes('duplicate key') ||
      message.includes('foreign key')
    ) {
      return {
        type: ErrorType.DATABASE,
        message: getUserFriendlyMessage(ErrorType.DATABASE, error.message),
        originalError: error,
      };
    }

    // 認証エラー
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('token') ||
      message.includes('login')
    ) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: getUserFriendlyMessage(ErrorType.AUTHENTICATION, error.message),
        originalError: error,
      };
    }

    // 権限エラー
    if (
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('access denied')
    ) {
      return {
        type: ErrorType.PERMISSION,
        message: getUserFriendlyMessage(ErrorType.PERMISSION, error.message),
        originalError: error,
      };
    }

    // 見つからないエラー
    if (
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('does not exist')
    ) {
      return {
        type: ErrorType.NOT_FOUND,
        message: getUserFriendlyMessage(ErrorType.NOT_FOUND, error.message),
        originalError: error,
      };
    }
  }

  // 未知のエラー
  return {
    type: ErrorType.UNKNOWN,
    message: getUserFriendlyMessage(
      ErrorType.UNKNOWN,
      error instanceof Error ? error.message : String(error)
    ),
    originalError: error,
  };
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 */
export function getUserFriendlyMessage(type: ErrorType, originalMessage?: string): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]:
      'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    [ErrorType.VALIDATION]: '入力データに問題があります。内容を確認してください。',
    [ErrorType.DATABASE]:
      'データベースエラーが発生しました。しばらく待ってから再度お試しください。',
    [ErrorType.AUTHENTICATION]: '認証に失敗しました。再度ログインしてください。',
    [ErrorType.PERMISSION]: 'この操作を実行する権限がありません。',
    [ErrorType.NOT_FOUND]: 'リソースが見つかりませんでした。',
    [ErrorType.UNKNOWN]: '予期しないエラーが発生しました。',
  };

  const baseMessage = messages[type];

  // 元のメッセージに有用な情報が含まれている場合は追加
  if (originalMessage && type === ErrorType.VALIDATION) {
    // バリデーションエラーの場合は詳細を表示
    return `${baseMessage}\n詳細: ${originalMessage}`;
  }

  return baseMessage;
}

/**
 * エラーをログに記録
 */
export function logError(error: AppError, context?: string): void {
  const logContext = context ? `[${context}]` : '';
  console.error(`${logContext} Error:`, {
    type: error.type,
    message: error.message,
    code: error.code,
    details: error.details,
    originalError: error.originalError,
  });
}

/**
 * エラーハンドリングヘルパー関数
 */
export async function handleAsyncError<T>(
  promise: Promise<T>,
  context?: string
): Promise<[T | null, AppError | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    const appError = classifyError(error);
    logError(appError, context);
    return [null, appError];
  }
}

/**
 * エラーをユーザーに表示するための形式に変換
 */
export function formatErrorForDisplay(error: AppError): string {
  return error.message;
}

