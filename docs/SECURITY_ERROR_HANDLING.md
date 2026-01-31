# Secure Error Handling

## Overview

The application uses secure error logging to prevent sensitive data disclosure in production logs.

## Error Handler Utility

Location: `lib/utils/error-handler.ts`

Function: `logSecureError(context: string, error: unknown)`

## Behavior

### Development Mode
- Full error details logged (message + stack trace + context)
- Context label prefixes all logs for easy filtering
- Stack traces included for debugging

### Production Mode
- Sanitized JSON logs only
- Fields: `message`, `timestamp`, `context`
- No stack traces, file paths, or database internals

## Usage

```typescript
import { logSecureError } from '@/lib/utils/error-handler';

try {
  // Operation that may fail
} catch (error) {
  logSecureError('operation-name', error);
  return { success: false, error: 'Generic error message' };
}
```

## Best Practices

1. **Use context labels:** Identify the operation (e.g., 'login', 'session-create')
2. **Keep user messages generic:** Never expose internal details to users
3. **Log all errors:** Even if errors are handled, log for observability
4. **Test both modes:** Verify development and production logging behavior
