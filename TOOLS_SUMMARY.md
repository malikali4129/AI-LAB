# AIM LAB Tools Summary

This file gives a quick overview of the current tools (modules) in AIM LAB.

## 1) Birthday Calculator
- Page: `birthday.html`
- Purpose: Calculates age in years/months/days and time left until next birthday.
- Extra: Shows results in an animated modal with a playful roast-style message.

## 2) Download Speed Calculator
- Page: `download-speed.html`
- Purpose: Estimates download time from file size and internet speed.
- Input options: File size units (KB/MB/GB/TB), speed units (bit/byte variants), and time intervals.

## 3) Password Strength Checker
- Page: `password-checker.html`
- Purpose: Checks password strength live while typing.
- Extra features:
  - Generate strong password
  - Show/Hide password
  - Copy password to clipboard
  - Salt popup: Generates a website-based salt in the format `AIMTECHmalik@websiteName.com` and inserts it into the main password input.

## 4) GPA Calculator
- Page: `gpa-calculator.html`
- Purpose: Calculates semester GPA from subjects, credits, and grades.
- Extra features:
  - Dynamic subject rows (add/remove)
  - Semester GPA + total credits
  - Optional cumulative GPA using previous credits/GPA
  - Reset and quick insights

## 5) Roaster Module
- Page: `roaster.html`
- Purpose: Generates random personalized roasts with selectable intensity.
- Extra features:
  - Roast intensity slider (Soft / Medium / Savage)
  - Share roast button
  - Copy roast button
  - Sound effects during generate/type animation
  - Loads roast lists directly from `modules/roastData.json`
  - Roast lines are managed in JSON file (not editable from module UI)

## Shared UX Features
- Consistent header/menu on all module pages.
- Smooth page transitions (fade-out on navigation, fade-in text on next page).
- Responsive design for desktop and mobile.
