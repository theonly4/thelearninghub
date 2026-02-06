

# Fix: Email MFA Domain Verification Error

## Problem Identified

The `mfa-email-ops` Edge Function is failing because it's trying to send emails from an **unverified domain**:

| Current (Broken) | Required (Verified) |
|------------------|---------------------|
| `noreply@thelearninghub.lovable.app` | `support@learninghub.zone` |

The Resend API returns a 403 error because `thelearninghub.lovable.app` is not verified in the Resend workspace.

---

## Root Cause

From the edge function logs:
```
Email send error: {
  statusCode: 403,
  message: "The thelearninghub.lovable.app domain is not verified..."
}
```

The verified sending domain is `learninghub.zone` (as used by other edge functions like `send-welcome-email`).

---

## Fix Required

### File: `supabase/functions/mfa-email-ops/index.ts`

**Line 136 - Change:**

```typescript
// BEFORE (broken)
from: "The Learning Hub <noreply@thelearninghub.lovable.app>",

// AFTER (fixed)
from: "The Learning Hub <support@learninghub.zone>",
```

This matches the verified domain used by all other email-sending edge functions in the project.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/mfa-email-ops/index.ts` | Update `from` address from `noreply@thelearninghub.lovable.app` to `support@learninghub.zone` |

---

## Verification Steps

After deployment:
1. Navigate to `/mfa-enroll?method=email`
2. Click "Send Code"
3. Confirm email arrives successfully
4. Enter code to complete verification

---

## Technical Notes

- **Single line change** - minimal risk
- **Consistent with other functions** - `send-welcome-email`, `send-learning-request`, etc. all use `support@learninghub.zone`
- **No database changes required**
- **No frontend changes required**

