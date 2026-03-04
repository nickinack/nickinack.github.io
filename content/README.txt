────────────────────────────────────────────────────────
  KARTHIK VISWANATHAN — Website Content Files
  Edit these files to update the website content.
  Changes reflect immediately on next page load.
────────────────────────────────────────────────────────

HOW TO RUN
──────────
This website needs a local server to load content files.
Run from your terminal:

    cd ~/Desktop/karthik_website
    bash start.sh

Or manually:

    cd ~/Desktop/karthik_website && python3 -m http.server 8000

Then open:  http://localhost:8000


FILE GUIDE
──────────

hero.txt
  Your name, tag line, short bio, and social links.
  Format:  key: value (one per line)

bio.txt
  Your "About Me" long-form text.
  Separate paragraphs with a blank line.

research_interests.txt
  Lines starting with # are comments and are ignored.
  Each interest line:  EMOJI | TITLE | DESCRIPTION

publications.json
  Array of objects. Each publication has:
    title      — paper/patent title
    authors    — author list (your name will appear as-is)
    venue      — journal/conference name
    year       — year string
    type       — one of: journal, conference, workshop, preprint, patent
    link       — URL or "#" if not yet online
    highlight  — true/false (adds cyan left border)
    note       — short badge text (e.g., "First Author")

experience.json
  Array of objects (in reverse chronological order). Each has:
    company, company_sub, location, role, dates, type
    bullets    — array of strings
    tech       — array of technology strings

education.json
  Array of objects. Fields:
    institution, location, degree, gpa, dates
    coursework — array of course names
    activities — array of activity strings

skills.json
  Object where each key is a category name
  and the value is an array of skill strings.

contact.json
  email, github, linkedin, phone, location, blurb


TIPS
────
- After editing a JSON file, make sure it's valid JSON
  (no trailing commas, all strings quoted).
- For publications.link: replace "#" with a real URL
  when your paper is published.
- To add a new publication, copy an existing {} block,
  paste it, and edit the fields. Add a comma between entries.

────────────────────────────────────────────────────────
