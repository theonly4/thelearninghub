
# Implementation Plan: UI/Text Fixes + Features

This plan implements terminology updates, employee management enhancements, Learning Library features, and Reports page improvements while maintaining zero schema changes.

---

## Priority 1: Global Text Replacements

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/TrainingLibraryPage.tsx` | "Training Library" to "Learning Library", "Assign Training" to "Assign Learning", "Training Materials" to "Learning Materials", "Quiz Packages" to "Quizzes" |
| `src/pages/admin/ReportsPage.tsx` | "Training Reports" to "Completion Reports", "Training Completions" to "Learning Completions" |
| `src/components/DashboardLayout.tsx` | Update navigation labels |
| `src/pages/admin/HelpGuidePage.tsx` | Replace all "training" with "learning" |
| `src/components/admin/TrainingAssignmentDialog.tsx` | Update all training references |
| `src/components/admin/SingleEmployeeAssignmentDialog.tsx` | Update dialog titles and text |

### Dynamic Year Logic

The system will display quiz years relative to the current year:
- First annual release per workforce group = Current Year - 1 (e.g., "2025" in February 2026)
- Second annual release = Current Year - 2 (e.g., "2024")

This will be computed from the `training_year` field in `package_releases` and displayed as a simple label.

---

## Priority 2: Admin Add Employee Page

### File: `src/pages/admin/UsersPage.tsx`

**Change 1: Update popup description text**

Current:
```
You'll receive their temporary password to share with them.
```

New:
```
They'll receive their temporary password via automated email.
```

**Change 2: Remove temp password display from credentials popup**

The credentials dialog will be simplified to:
- Show success message with green checkmark
- Confirm email was sent automatically
- Remove the backup password display section

**Change 3: Add CSV Template Download**

Add a "Download CSV Template" button that triggers a popup explaining:
- Required columns: `email, first_name, last_name, workforce_role`
- Downloads a sample CSV file with headers

Implementation:
```
┌─────────────────────────────────────────────────────┐
│ 📄 CSV Import Template                              │
├─────────────────────────────────────────────────────┤
│ Your CSV file must include these columns:           │
│                                                     │
│ • email - Employee's work email                     │
│ • first_name - First name                           │
│ • last_name - Last name                             │
│ • workforce_role - One of: all_staff, clinical,    │
│   administrative, management, it                    │
│                                                     │
│ [Download Template CSV]                             │
└─────────────────────────────────────────────────────┘
```

---

## Priority 3: Learning Library Page

### File: `src/pages/admin/TrainingLibraryPage.tsx`

**Change 1: "Request Learning" Button**

Replace "Assign Training" with "Request Learning" button that opens a dialog with workforce group checkboxes:

```
┌─────────────────────────────────────────────────────┐
│ Request Learning Content                            │
├─────────────────────────────────────────────────────┤
│ Select the workforce groups you need content for:   │
│                                                     │
│ ☐ All Staff                                         │
│ ☐ Clinical Staff                                    │
│ ☐ Administrative Staff                              │
│ ☐ Management & Leadership                           │
│ ☐ IT/Security Personnel                             │
│                                                     │
│ [Cancel] [Send Request]                             │
└─────────────────────────────────────────────────────┘
```

On submit, sends email to `yiplawcenter@protonmail.com` via new edge function:
```
Subject: Learning Content Request from [ORG NAME]

Organization [ORG NAME] has requested learning content for:
- Clinical Staff
- Administrative Staff

Requested by: [ADMIN NAME] ([ADMIN EMAIL])
Date: [CURRENT DATE]
```

**Change 2: Remove Stats Boxes**

Remove these 4 stat cards entirely:
- Training Completion
- Quiz Attempts  
- Passed Quizzes
- Failed Quizzes

Keep only:
- Learning Materials count
- Quizzes count
- Total Duration
- Workforce Groups

**Change 3: Visual Archive Section**

Add a collapsible "Archived (YYYY)" section at the bottom that groups completed items older than 6 months. This is UI-only filtering - no database changes.

```
┌─────────────────────────────────────────────────────┐
│ ▶ Archived (2025)                                   │
│   Items completed more than 6 months ago            │
└─────────────────────────────────────────────────────┘
```

---

## Priority 4: Reports Page

### File: `src/pages/admin/ReportsPage.tsx`

**Change 1: PDF Export Filename**

Current: `training_report_2026-02-04.pdf`

New: `[ORG_NAME]_Completions-Report_04-Feb-2026.pdf`

**Change 2: PDF Header Format**

```
[ORG NAME] | Completion Report | Generated February 04, 2026
```

**Change 3: PDF Footer**

```
The Learning Hub | learninghub.zone
```

**Change 4: Updated Columns**

| Employee Name | Learning Material | Quiz (YYYY-1/YYYY-2) | Score | Date Completed | Attempts |
|---------------|-------------------|----------------------|-------|----------------|----------|
| John Doe      | HIPAA Basics      | 2025 Annual          | 92%   | Feb 04, 2026   | 1        |

**Change 5: Remove Print Button**

Remove the "Print" button entirely. Keep only "Export" dropdown with:
- Export as PDF (standard report)
- Export as CSV
- Export Full Details (new - includes quiz questions/answers/rationales)

**Change 6: Add Year Filter**

Add a "Year" dropdown to the filters:
- Options: 2026, 2025, 2024 (dynamically generated from data)
- Filters completions by completion date year

**Change 7: Export Full Details Option**

New "Export Full Details" option generates a comprehensive PDF including:
- All completion data
- Quiz questions with all options
- Correct answers highlighted
- Rationales for each question

This will be a separate, larger export.

---

## Priority 5: Other Changes

### File: `src/components/DashboardLayout.tsx`

**Hide "How To Guide" for org_admin**

Remove the "How To Guide" nav item from `adminNavItems` array. Platform owner layout is unaffected.

### Files: Various

**Enhanced Search**

The Reports page search already supports name/email/content. Add Year dropdown filter as specified above.

---

## New Edge Function Required

### File: `supabase/functions/send-learning-request/index.ts`

Creates a new edge function to send learning content request emails:
- Validates user is org_admin
- Fetches organization name
- Sends email to hardcoded recipient: yiplawcenter@protonmail.com
- Includes selected workforce groups, org name, requester info

---

## Implementation Summary

| Priority | Task | Files Changed |
|----------|------|---------------|
| 1 | Text replacements (training to learning) | 6 files |
| 1 | Quiz packages to Quizzes | 3 files |
| 1 | Dynamic year display | 2 files |
| 2 | Add Employee popup text | 1 file |
| 2 | Remove temp password display | 1 file |
| 2 | CSV template download | 1 file |
| 3 | Request Learning dialog + email | 2 files + 1 edge function |
| 3 | Remove stats boxes | 1 file |
| 3 | Visual archive section | 1 file |
| 4 | PDF filename, header, footer | 1 file |
| 4 | Updated report columns | 1 file |
| 4 | Remove Print button | 1 file |
| 4 | Add Year filter | 1 file |
| 4 | Export Full Details option | 1 file |
| 5 | Hide How To Guide | 1 file |

**Total: ~10 files modified, 1 new edge function created**

---

## Technical Notes

- **Zero Schema Changes**: All changes use existing database tables and columns
- **Dynamic Year Calculation**: Uses `new Date().getFullYear()` for current year reference
- **Archive Logic**: Filter by `completed_at < 6 months ago` in frontend
- **Quiz Year Display**: Format `training_year` as "YYYY-1" or "YYYY-2" based on sequence
- **PDF Generation**: Uses existing jsPDF library with updated formatting
- **Email**: Uses existing Resend integration with RESEND_API_KEY secret

