
# Fix Duplicate Filter Card & Complete CSV Template

This plan addresses two issues: removing the duplicate filter section in the Reports page and updating the CSV template to include all workforce groups.

---

## Issue 1: Duplicate Filter Card in Reports Page

### Current Problem

The `ReportsPage.tsx` has **two identical filter Card components**:

| Lines | Content |
|-------|---------|
| 552-593 | Filter card with Search, Workforce Group dropdown, AND Year dropdown |
| 595-623 | Duplicate filter card with Search and Workforce Group dropdown (NO Year filter) |

This creates a confusing UI where the same search/filter controls appear twice on the page.

### Solution

Delete the duplicate filter section at **lines 595-623**. Keep only the first filter card (lines 552-593) which includes all three filters:
- Search input
- Workforce Group dropdown
- Year dropdown

---

## Issue 2: CSV Template Missing Workforce Groups

### Current Problem

The CSV template button generates a file with only 2 example workforce roles:

```csv
email,first_name,last_name,workforce_role
john.doe@company.com,John,Doe,clinical
jane.smith@company.com,Jane,Smith,administrative
```

Users don't know about `all_staff`, `management`, or `it` options.

### Solution

Update the template to include examples for all 5 workforce groups:

```csv
email,first_name,last_name,workforce_role
john.doe@company.com,John,Doe,all_staff
jane.nurse@company.com,Jane,Nurse,clinical
mike.admin@company.com,Mike,Admin,administrative
sarah.director@company.com,Sarah,Director,management
tom.tech@company.com,Tom,Tech,it
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/ReportsPage.tsx` | Remove duplicate filter Card component (lines 595-623) |
| `src/pages/admin/UsersPage.tsx` | Update CSV template to include all 5 workforce groups |

---

## Implementation Details

### ReportsPage.tsx Changes

Remove this entire duplicate section:

```text
// Lines 595-623 - DELETE THIS BLOCK
{/* Filters */}
<Card>
  <CardContent className="pt-6">
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative flex-1">
        <Search .../>
        <Input placeholder="Search by name, email, or content..." .../>
      </div>
      <Select value={filterGroup} ...>
        ...All Workforce Groups...
      </Select>
    </div>
  </CardContent>
</Card>
```

### UsersPage.tsx Changes

Update the CSV template generation (around line 424-425):

**Before:**
```javascript
const csv = "email,first_name,last_name,workforce_role\njohn.doe@company.com,John,Doe,clinical\njane.smith@company.com,Jane,Smith,administrative";
```

**After:**
```javascript
const csv = "email,first_name,last_name,workforce_role\njohn.doe@company.com,John,Doe,all_staff\njane.nurse@company.com,Jane,Nurse,clinical\nmike.admin@company.com,Mike,Admin,administrative\nsarah.director@company.com,Sarah,Director,management\ntom.tech@company.com,Tom,Tech,it";
```

---

## Result

After these changes:
1. Reports page will show only one filter section with all 3 filter options
2. CSV template will include all 5 workforce groups with clear examples
