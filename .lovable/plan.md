
# MFA Selection Screen Implementation

This plan adds an MFA method selection screen allowing users to choose between an Authenticator App (TOTP) or Email-based one-time codes. The implementation prioritizes security with rate limiting, short code expiry, and proper error handling.

---

## Overview

When a new user first logs in after receiving their welcome email, they will see a selection screen offering two MFA options:

```text
┌─────────────────────────────────────────────────────┐
│        Choose Your Security Method                  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  📱 Authenticator   │  │  📧 Email Code      │  │
│  │       App           │  │                     │  │
│  │                     │  │                     │  │
│  │ Use Google Auth,    │  │ Receive a code at   │  │
│  │ Authy, or similar   │  │ your work email     │  │
│  │                     │  │                     │  │
│  │ [Most Secure]       │  │ [Convenient]        │  │
│  └─────────────────────┘  └─────────────────────┘  │
│                                                     │
│  Select your preferred method to continue.          │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### New Table: `mfa_email_codes`

Stores temporary verification codes for email-based MFA:

```sql
CREATE TABLE public.mfa_email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_mfa_email_codes_user_id ON public.mfa_email_codes(user_id);

-- Auto-cleanup expired codes
CREATE INDEX idx_mfa_email_codes_expires ON public.mfa_email_codes(expires_at);
```

### New Table: `mfa_email_sessions`

Tracks which sessions have completed email MFA (since Supabase doesn't natively support email as aal2):

```sql
CREATE TABLE public.mfa_email_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, session_id)
);

-- Index for fast session lookups
CREATE INDEX idx_mfa_email_sessions_lookup ON public.mfa_email_sessions(user_id, session_id);
```

### Modify `profiles` Table

Add column to track preferred MFA method:

```sql
ALTER TABLE public.profiles 
ADD COLUMN mfa_method TEXT CHECK (mfa_method IN ('totp', 'email')) DEFAULT NULL;
```

### RLS Policies

```sql
-- mfa_email_codes: Only accessible via service role (edge functions)
ALTER TABLE public.mfa_email_codes ENABLE ROW LEVEL SECURITY;
-- No direct user access - all operations through edge functions

-- mfa_email_sessions: Users can only read their own sessions
ALTER TABLE public.mfa_email_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own sessions" ON public.mfa_email_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

---

## New Edge Function: `mfa-email-ops`

Handles all email MFA operations with security controls:

### Endpoints

| Action | Description |
|--------|-------------|
| `send-code` | Generate 6-digit code, hash it, store with 10-min expiry, email to user |
| `verify-code` | Validate code, enforce rate limits, create session entry |
| `check-session` | Verify if current session has completed email MFA |

### Security Features

- **Rate Limiting**: Max 3 code requests per 10 minutes per user
- **Attempt Limiting**: Max 5 verification attempts per code
- **Short Expiry**: Codes expire after 10 minutes
- **Hashed Storage**: Codes stored as SHA-256 hashes
- **Session Binding**: Email MFA valid for current session only (8-hour expiry)

### Implementation

```typescript
// supabase/functions/mfa-email-ops/index.ts

// Actions:
// POST { action: 'send-code' } - Send verification code to user's email
// POST { action: 'verify-code', code: '123456' } - Verify submitted code
// POST { action: 'check-session' } - Check if session is verified

// Rate limiting: Max 3 codes in 10 minutes
// Code expiry: 10 minutes
// Max attempts per code: 5
// Session validity: 8 hours
```

---

## Frontend Changes

### 1. New MFA Selection Page

**File: `src/pages/MfaSelectPage.tsx`**

New page shown to users who have not yet enrolled in MFA:

- Two card options: Authenticator App vs Email Code
- Clear labels explaining each option
- "Authenticator App" marked as "Recommended" / "Most Secure"
- "Email Code" marked as "Convenient"
- On selection, redirects to appropriate flow

### 2. Modified MFA Enroll Page

**File: `src/pages/MfaEnrollPage.tsx`**

Changes:
- Accept `?method=totp` or `?method=email` query parameter
- For TOTP: Keep existing QR code flow
- For Email: Show "Send Code" button, then OTP input
- Fallback link: "Having trouble? Try email verification instead"

### 3. Modified MFA Verify Page

**File: `src/pages/MfaVerifyPage.tsx`**

Changes:
- Check user's `mfa_method` from profile
- If `totp`: Show existing authenticator flow
- If `email`: Show "Send Code" button + OTP input
- Add "Resend Code" with countdown timer (60 seconds)
- Error handling for expired/invalid codes

### 4. Updated MFA Guard

**File: `src/components/MfaGuard.tsx`**

Changes:
- Check both Supabase AAL2 (TOTP) AND `mfa_email_sessions` table
- User is authorized if either:
  - `aal === 'aal2'` (TOTP verified)
  - Valid entry exists in `mfa_email_sessions` for current session
- Redirect to `/mfa-select` for enrollment if no method set

### 5. Updated App Routes

**File: `src/App.tsx`**

Add new route:
```tsx
<Route path="/mfa-select" element={<MfaSelectPage />} />
```

---

## User Flow Diagrams

### First-Time User (Enrollment)

```text
Login → Check MFA Status
           ↓
    No factors enrolled?
           ↓
    /mfa-select (Choose Method)
           ↓
    ┌──────┴──────┐
    ↓             ↓
  TOTP         Email
    ↓             ↓
  QR Code    Send Code
  Scan        to Email
    ↓             ↓
  Enter        Enter
  6-digit      6-digit
    ↓             ↓
  Verify       Verify
    ↓             ↓
    └──────┬──────┘
           ↓
    Dashboard Access
```

### Returning User (Verification)

```text
Login → Check Profile mfa_method
              ↓
       ┌──────┴──────┐
       ↓             ↓
     TOTP          Email
       ↓             ↓
   /mfa-verify   /mfa-verify
   (App Code)    (Send Email)
       ↓             ↓
   Enter Code    Enter Code
       ↓             ↓
   Supabase      Edge Function
   aal2          session entry
       ↓             ↓
       └──────┬──────┘
              ↓
       Dashboard Access
```

---

## Email Template

The verification code email will use consistent branding:

```text
Subject: Your Verification Code - The Learning Hub

┌─────────────────────────────────────────────────────┐
│           Your Verification Code                    │
│                                                     │
│  Hello [Name],                                      │
│                                                     │
│  Your one-time verification code is:                │
│                                                     │
│         ┌───────────────────────┐                   │
│         │      1 2 3 4 5 6      │                   │
│         └───────────────────────┘                   │
│                                                     │
│  This code expires in 10 minutes.                   │
│                                                     │
│  If you didn't request this code, you can safely    │
│  ignore this email.                                 │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  The Learning Hub | Compliance Learning Platform    │
└─────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_mfa_email_tables.sql` | Create | Add email MFA tables |
| `supabase/functions/mfa-email-ops/index.ts` | Create | Email OTP logic |
| `src/pages/MfaSelectPage.tsx` | Create | Method selection UI |
| `src/pages/MfaEnrollPage.tsx` | Modify | Support both methods |
| `src/pages/MfaVerifyPage.tsx` | Modify | Support both methods |
| `src/components/MfaGuard.tsx` | Modify | Check email sessions |
| `src/App.tsx` | Modify | Add /mfa-select route |

---

## Security Considerations

1. **No SMS**: Email-only for OTP (no phone numbers collected)
2. **Hashed Codes**: Never store plaintext verification codes
3. **Short Expiry**: 10-minute code validity window
4. **Rate Limiting**: Prevent brute force attacks
5. **Attempt Limiting**: Lock out after 5 failed attempts
6. **Session Binding**: Email MFA tied to specific session
7. **Fallback**: Users can switch to email if TOTP setup fails
8. **Audit Trail**: All MFA events logged via existing audit system

---

## Error Handling

| Error | User Message |
|-------|--------------|
| Code expired | "This code has expired. Please request a new one." |
| Invalid code | "Incorrect code. Please check and try again." |
| Too many attempts | "Too many failed attempts. Please request a new code." |
| Rate limited | "Please wait before requesting another code." |
| Email send failure | "Unable to send code. Please try again or use authenticator app." |

---

## Testing Checklist

- [ ] New user can select Authenticator App and complete TOTP enrollment
- [ ] New user can select Email Code and receive/verify code
- [ ] Returning TOTP user can verify with authenticator app
- [ ] Returning Email user receives code and can verify
- [ ] Code expires after 10 minutes
- [ ] Rate limiting prevents code spam
- [ ] Invalid codes show proper error
- [ ] User can switch to email if TOTP fails
- [ ] Session properly tracked for email MFA
- [ ] Guard correctly checks both MFA types
