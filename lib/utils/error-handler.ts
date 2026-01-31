interface SecureErrorLog {
  message: string;
  timestamp: string;
  context: string;
}

export function logSecureError(context: string, error: unknown) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
    if (error instanceof Error && error.stack) {
      console.error(`[${context}] Stack:`, error.stack);
    }
  } else {
    const sanitizedError: SecureErrorLog = {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
      context,
    };

    console.error(JSON.stringify(sanitizedError));
  }
}
