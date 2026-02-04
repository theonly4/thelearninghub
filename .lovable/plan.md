
# Per-Customer Quiz Configuration for Platform Owner

This plan adds the ability for Platform Owners to set a custom **passing percentage** and **maximum number of attempts** for each organization when releasing quiz packages.

---

## Current State

| Feature | Status | Location |
|---------|--------|----------|
| Passing Score | Global only (80% default) | `quizzes.passing_score` column |
| Max Attempts | Not implemented | No column exists |
| Per-Customer Config | Not available | No override mechanism |

When releasing a package, the Platform Owner can only select:
- Organization(s)
- Workforce group
- Training year
- Notes

---

## Solution Overview

Add two new columns to the `package_releases` table that allow per-organization configuration:

```text
package_releases table
├── passing_score_override (integer, nullable, range 50-100)
└── max_attempts (integer, nullable, range 1-10)
```

When these values are set:
- **passing_score_override**: Overrides the default 80% for this organization
- **max_attempts**: Limits how many times employees can retake a failed quiz

---

## Technical Implementation

### Database Changes

**Add two columns to `package_releases`:**

```text
ALTER TABLE public.package_releases 
ADD COLUMN passing_score_override INTEGER CHECK (passing_score_override >= 50 AND passing_score_override <= 100),
ADD COLUMN max_attempts INTEGER CHECK (max_attempts >= 1 AND max_attempts <= 10);
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/platform/ContentReleasesPage.tsx` | Add input fields for passing score and max attempts in the release form |
| `supabase/functions/submit-quiz/index.ts` | Check max attempts before allowing submission; use org-specific passing score |
| `supabase/functions/get-quiz-questions/index.ts` | Return max attempts and passing score to the frontend |
| `src/pages/employee/TakeQuizPage.tsx` | Display remaining attempts; block quiz if limit reached |
| `src/pages/admin/TrainingLibraryPage.tsx` | Display the configured settings for each package |

---

## User Experience

### Platform Owner View (Content Releases Page)

When releasing a package, new fields appear:

```text
┌─────────────────────────────────────────────────────┐
│ Quiz Settings (Optional - per organization)        │
├─────────────────────────────────────────────────────┤
│ Passing Score: [___80___] %  (50-100, default 80)  │
│ Max Attempts:  [___3____]    (1-10, blank=unlimited)│
└─────────────────────────────────────────────────────┘
```

### Employee View (Take Quiz Page)

If max attempts is configured:

```text
┌──────────────────────────────────────────┐
│ Passing Score: 85%                       │
│ Attempts: 1 of 3 remaining               │
└──────────────────────────────────────────┘
```

If all attempts are used:

```text
┌──────────────────────────────────────────┐
│ ⚠️ Maximum attempts reached              │
│ Contact your administrator for help.    │
└──────────────────────────────────────────┘
```

### Customer Admin View (Training Library Page)

Shows the configured settings for released packages:

```text
┌─────────────────────────────────────────────────────┐
│ Administrative Staff - Set 1                        │
│ Passing: 85%  •  Max Attempts: 3  •  25 questions  │
└─────────────────────────────────────────────────────┘
```

---

## Backend Logic

### Submit Quiz Function Changes

```text
1. Fetch package_release for user's organization
2. Get passing_score_override and max_attempts from release
3. If max_attempts is set:
   - Count existing attempts for this user + package
   - If count >= max_attempts → reject with "Maximum attempts reached"
4. Use passing_score_override if set, otherwise use default 80%
5. Score the quiz and return result
```

### Get Quiz Questions Function Changes

```text
1. Fetch package_release for user's organization
2. Include in response:
   - passing_score (override or default)
   - max_attempts (if set)
   - attempts_used (count of existing attempts)
3. Frontend uses this to show attempt count and passing requirement
```

---

## Implementation Steps

1. **Database Migration**
   - Add `passing_score_override` and `max_attempts` columns to `package_releases`

2. **Update Content Releases Form** (`ContentReleasesPage.tsx`)
   - Add number inputs for passing score and max attempts
   - Include values in the insert payload
   - Show current settings when viewing existing releases

3. **Update Submit Quiz Function** (`submit-quiz/index.ts`)
   - Fetch package release settings for the user's organization
   - Enforce max attempts limit before processing
   - Use organization-specific passing score for grading

4. **Update Get Quiz Questions Function** (`get-quiz-questions/index.ts`)
   - Return passing score and max attempts info
   - Include count of previous attempts

5. **Update Take Quiz Page** (`TakeQuizPage.tsx`)
   - Display passing score requirement
   - Show attempts remaining (if limited)
   - Block quiz access if max attempts reached

6. **Update Training Library Page** (`TrainingLibraryPage.tsx`)
   - Display passing score and max attempts for each package

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No override set | Uses default 80% passing, unlimited attempts |
| Score set, attempts blank | Custom passing score, unlimited attempts |
| Attempts set, score blank | Default 80%, limited attempts |
| User passed on attempt 1 | No more attempts needed (show certificate) |
| User failed all attempts | Cannot retake, must contact admin |
| Admin changes settings after release | Existing attempts still count |

---

## Security Considerations

- Only Platform Owners can set these values (enforced by RLS on `package_releases`)
- Backend validates attempt count server-side (cannot be bypassed)
- Passing score validation happens in the backend function, not frontend
