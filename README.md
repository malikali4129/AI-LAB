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
  - Hinglish and English roast modes
  - Roast intensity slider (Soft / Medium / Savage)
  - Share roast button
  - Copy roast button
  - Sound effects during generate/type animation
  - Loads roast lists directly from `data/roastData.json` and `data/englishRoastData.json`
  - Roast lines are managed in JSON file (not editable from module UI)

## 6) Wheel Picker
- Page: `wheel.html`
- Purpose: Spins two customizable name wheels and shows the combined winner result.
- Extra features:
  - Two editable wheels with tab switching
  - Spin all wheels at once
  - Add/remove wheels
  - Shuffle, sort, and customize wheel themes
  - Winner modal with remove action
  - Results history for recent spins

## 7) Life Progress Tracker
- Page: `life-progress-tracker.html`
- Purpose: Tracks live progress across time-based processes with one-second refresh.
- Included categories:
  - Clock cycles: minute, hour, day, month, year
  - Holidays / annual events: New Year, Ramzan, Eid al-Fitr, Eid al-Adha
  - Moon phases: synodic cycle and next major phase
  - Long-term events: decade, quarter-century, and Year 3000 checkpoint
- Assumptions in V1:
  - Uses local device timezone only
  - Moon and lunar events use estimated cycle math (not exact astronomy APIs)
  - Stable default dataset is embedded in module source

## 8) Life Stats
- Page: `life-stats.html`
- Purpose: Converts your birth date into a scroll-based real-time life statistics story.
- Flow:
  - First screen asks for month/day/year of birth
  - After submit, each scroll section shows one statement with one matching visual
- Included stats in V1:
  - Days and seconds alive
  - Heartbeats and breaths (modeled estimates)
  - Red blood cell production estimate
  - Sleep hours, blinks, steps, and water intake estimates
  - Weekend days, moon cycles, seasons, birthdays
  - Earth orbits lived and live next-birthday countdown
- Assumptions in V1:
  - Values are educational approximations, not medical measurements
  - DOB is validated per session and not stored in localStorage
  - Fast-changing stats update every second; slower stats refresh periodically

## 9) Guess Number Game
- Page: `guess-number.html`
- Purpose: Browser remake of the classic C-language "Guess The Number" school project.
- Included behavior:
  - Secret number generated between 1 and 100
  - Optional hint code configuration (default `0000`)
  - Higher/lower guidance after each attempt
  - Attempt counter with win state
  - Round history log and quick new-game reset

## 10) Websites Directory
- Page: `websites.html`
- Purpose: Shows a searchable and filterable directory of useful websites.
- Data source:
  - Primary editable source: `data/websites-source.txt`
  - Expected fields per item: `name`, `description`, `link`, `category`
- Included behavior:
  - Keyword search across name, description, and category
  - Category dropdown filter
  - Result count and no-results state
  - External link button for each website card

### Websites Text Workflow
- Edit `data/websites-source.txt` for easy updates.
- Keep one website per block and separate blocks with `---`.
- Inside each block, use:
  - `name: ...`
  - `description: ...`
  - `link: ...`
  - `category: ...`
- Save the file and refresh `websites.html`.

## 11) PDF Tools
- Page: `pdf-tools.html`
- Purpose: Fully client-side PDF toolkit with three modules:
  - JPG to PDF
  - PDF to JPG
  - Merge PDFs
- Browser libraries used by the page:
  - `pdf.js` for PDF rendering and page previews
  - `jsPDF` for PDF creation from images
  - `pdf-lib` for PDF merging
  - `JSZip` for packaging extracted JPG pages into one download
- Included behavior:
  - Drag and drop or click-to-upload file intake
  - Draggable preview cards with reorder support
  - Progress bar, spinner, toast notices, and roast-style completion messages
  - Mobile-friendly layout and dark themed glass UI

## Shared UX Features
- Consistent header/menu on all module pages.
- Smooth page transitions (fade-out on navigation, fade-in text on next page).
- Responsive design for desktop and mobile.
