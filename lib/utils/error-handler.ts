interface SecureErrorLog {
  message: string;
  timestamp: string;
  context: string;
}

export function logSecureError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
    if (metadata) {
      console.error(`[${context}] Metadata:`, metadata);
    }
    if (error instanceof Error && error.stack) {
      console.error(`[${context}] Stack:`, error.stack);
    }
  } else {
    // Production: metadata is NOT included
    const sanitizedError: SecureErrorLog = {
      message: error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Unknown error'),
      timestamp,
      context,
    };

    console.error(JSON.stringify(sanitizedError));
  }
}
