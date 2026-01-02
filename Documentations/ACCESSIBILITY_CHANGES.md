# Accessibility Improvements – Donor Dashboard Tabs

## Overview
This update improves keyboard accessibility and screen reader support for the Donor Dashboard tabs:
- Active Alerts
- Donation History
- Profile Settings

The changes align the tab interface with WAI-ARIA Authoring Practices without altering existing UI or business logic.

---

## Problem Identified
- Tabs were visually clickable and keyboard-focusable
- Mouse interaction worked correctly
- However:
  - Screen readers did not announce which tab was active
  - Active state was not clearly exposed via ARIA
  - Keyboard users could navigate but lacked context

---

## Solution Implemented
- Ensured proper ARIA roles are present:
  - role="tablist"
  - role="tab"
  - role="tabpanel"
- Verified aria-selected updates correctly on active tabs
- Linked tabs and panels using aria-controls
- Marked decorative icons with aria-hidden="true"
- No visual styles or logic were changed

---

## How to Test

### Keyboard Testing
1. Open Donor Dashboard
2. Press Tab until focus reaches the tab list
3. Use Left / Right arrow keys to move between tabs
4. Press Tab to move into active tab content

Expected:
- Focus moves correctly
- Active tab is visually highlighted

### Screen Reader Testing (Optional)
- Use NVDA or VoiceOver
- Navigate to the tab list
- Screen reader announces:
  - Tab name
  - Position (e.g. “2 of 3”)
  - Selected state

---

## Files Modified
- app/donor/DonorWeb.tsx

---

## Result
The Donor Dashboard tabs now meet accessibility requirements for:
- Keyboard navigation
- Screen reader support
- ARIA tab semantics

This improves usability and aligns with HaemoLogix’s accessibility goals.
