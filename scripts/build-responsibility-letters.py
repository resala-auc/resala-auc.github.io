"""
One-page Letter of Responsibility for each member committee, rendered to PDF.

The acceptance email attaches the letter for the committee a member was
accepted into (responsibilities/<committee-id>.pdf, published with the site).
Part One is the same for everyone — the members' version of the Upper Board's
general guidelines. Part Two is short on purpose: what the role actually asks
of a member, in the committee's own words.

Run: python3 scripts/build-responsibility-letters.py
Needs Google Chrome for the PDF step.
"""
import base64, html, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "responsibilities"
LOGO = ROOT / "experience" / "public" / "resala-logo.png"
CHROME = "google-chrome"

GENERAL = [
    ("Teamwork and hierarchy", [
        "Build a healthy, respectful environment around you, and put people before targets.",
        "Take your tasks from your head, and refer every decision to the highest position in the committee that owns it.",
        "Support a decision once it is made. Raise disagreement with your head, not around them.",
        "Hand decisions to the Presidential Team whenever one of them is present.",
    ]),
    ("Respect and conduct", [
        "Avoid any act, comment or behaviour that leaves another person uncomfortable.",
        "Any report of discomfort with your conduct leads to an evaluation meeting.",
    ]),
    ("Ownership", [
        "Carry Resala's vision into every event and interaction you take part in.",
        "Show up when Resala needs you, and help any committee that asks.",
        "A task is done when its result is delivered, not when it is assigned or started.",
        "Report problems early, while they can still be fixed, and follow them until they are.",
    ]),
    ("Self awareness", [
        "Accept only what you can deliver, and say so the moment you are overextended.",
        "Represent Resala in every interaction connected to the club. Misrepresenting it leads to an evaluation meeting.",
    ]),
    ("Commitment and attendance", [
        "Attend a minimum of **four events per month**.",
        "Attend the reflection meeting **every two weeks** (Wednesday by default). Miss **no more than two per semester**.",
        "Attend **every bonding event**: the opening, the closing, and **two each month**.",
        "Commitments in other clubs are not an excuse. Give Resala priority at any event shared with other clubs.",
    ]),
    ("Warnings", [
        "Every member is entitled to **two warnings before downgrade**, following the Office of Residential Life framework.",
        "A warning arrives by email with a **15-day action plan**. Reply **within two days**: no reply brings a second warning, and no reply to that brings downgrade.",
    ]),
]

COMMITTEES = {
    "tech": ("Tech Team", "You will leave behind systems that keep working after you graduate.", [
        "Take on the tech tasks your head assigns — forms, trackers, automations, dashboards — and see each one through.",
        "Keep what you build simple, working and documented, so the next person can pick it up.",
        "Help recruitment, interviews and volunteer data run smoothly.",
        "Notice problems that repeat in how Resala works, and suggest a tech fix.",
        "Help other committees use the tools you build.",
    ]),
    "operations": ("Operations", "Nothing happens on the ground until someone like you makes it happen.", [
        "Help plan and set up the logistics before every event.",
        "Research vendors, prices, supplies and alternatives when asked.",
        "Help with purchasing, transport, storage and preparation.",
        "Log every request and purchase in the committee's tracker.",
        "Stay flexible when budget, timing or availability changes — and tell your head early.",
    ]),
    "branding-media": ("Branding / Media", "You decide how thousands of people first meet Resala.", [
        "Cover events and turn moments into stories: photos, video, reels and captions.",
        "Deliver designs and edits on the deadlines your head sets, from idea to final post.",
        "Keep Resala's visual identity and tone consistent in everything you make.",
        "Protect the dignity and privacy of the people we film and photograph. No child or family is posted without permission.",
        "Use content to build trust, visibility and recruitment for Resala.",
    ]),
    "hr": ("HR", "You hold the people who hold everyone else.", [
        "Help keep members engaged, connected and included.",
        "Help organize bonding and engagement activities.",
        "Notice when someone goes quiet, and follow up with them kindly.",
        "Support onboarding, so every new member feels welcome from the first day.",
        "Help run appreciation, feedback and accountability — fairly and in confidence.",
    ]),
    "pr-fundraising": ("PR / Fundraising", "You turn a conversation into a partnership, and a partnership into impact.", [
        "Help find partners, sponsors, alumni and organizations that fit Resala's vision.",
        "Prepare the messages, proposals and pitches your head assigns.",
        "Reach out and follow up professionally. Never commit Resala to anything without approval.",
        "Track every contact, reply and next step in the shared tracker.",
        "Represent Resala respectfully in every conversation.",
    ]),
    "visits": ("Visits", "You are the one who actually sits with the family, face to face.", [
        "Attend the visits you sign up for, on time and prepared.",
        "Help plan each visit's goal, flow, materials and volunteers.",
        "Help find the institutions and places that need our support.",
        "Protect the dignity and privacy of every family and child. No photos without permission.",
        "Share what you saw after each visit, so the next one is better.",
    ]),
    "childrens-day": ("Children's Day", "A child will remember one day you built for the rest of their life.", [
        "Attend your Saturday sessions, on time and prepared.",
        "Help prepare the slides, activities, worksheets, games and materials.",
        "Make sure every activity serves a clear goal for the children.",
        "Treat every child with patience and kindness, and keep them safe at all times.",
        "Give feedback after each week, so the next session is better.",
    ]),
    "initiatives": ("Initiatives", "You start the thing that did not exist before you.", [
        "Understand the problem each initiative solves, and the goal it is working toward.",
        "Take on the preparation and execution tasks your head assigns.",
        "Help coordinate with Operations, Branding and other committees when asked.",
        "Raise risks early, and bring a solution with them.",
        "Help record what worked and what did not, for the next campaign.",
    ]),
}

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; height: 297mm; }
body { font-family: "Noto Sans", Arial, sans-serif; color: #1c2140; font-size: 9pt; line-height: 1.42;
       -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; display: flex; flex-direction: column; overflow: hidden; }
header { background: #27328a; color: #fff; padding: 8mm 14mm 6.5mm; display: flex; align-items: center; gap: 6mm;
         position: relative; }
header::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1.6mm; background: #ff9933; }
header img { width: 21mm; height: 21mm; object-fit: contain; }
.kicker { font-size: 7.6pt; letter-spacing: .18em; text-transform: uppercase; color: #ffc98f; font-weight: 700; }
h1 { font-family: "Fredoka", "Noto Sans", sans-serif; font-weight: 600; font-size: 23pt; line-height: 1.05; margin-top: 1mm; }
.role { font-size: 11pt; color: #d9dce4; margin-top: 1mm; }
main { flex: 1; padding: 5mm 14mm 0; display: flex; flex-direction: column; gap: 3.2mm; }
.intro { font-size: 9.5pt; line-height: 1.5; color: #2b3163; }
.intro b { color: #27328a; }
.part { display: flex; align-items: baseline; gap: 3mm; border-bottom: 1.2pt solid #afb8db; padding-bottom: 1.2mm; }
.part .n { font-family: "Fredoka", sans-serif; font-weight: 600; color: #ff9933; font-size: 12pt; }
.part h2 { font-family: "Fredoka", sans-serif; font-weight: 600; color: #27328a; font-size: 12.5pt; }
.part .note { margin-left: auto; font-size: 7.6pt; color: #6b7090; }
.grid { columns: 2; column-gap: 7mm; }
.block { break-inside: avoid; margin-bottom: 3mm; }
h3 { font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: #27328a; font-weight: 800; margin-bottom: 1mm; }
ul { list-style: none; }
li { position: relative; padding-left: 3.6mm; margin-bottom: .9mm; }
li::before { content: ""; position: absolute; left: 0; top: 1.65mm; width: 1.5mm; height: 1.5mm; border-radius: 50%; background: #ff9933; }
strong.num { background: #fff0dc; color: #27328a; font-weight: 800; padding: .1mm 1.1mm; border-radius: 1mm;
             box-shadow: inset 0 -.5mm 0 #ff9933;
             -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.role-card { background: #f3f4f9; border-left: 1.6mm solid #27328a; border-radius: 2mm; padding: 3.2mm 5mm; }
.vow { font-family: "Fredoka", sans-serif; font-weight: 500; color: #27328a; font-size: 11pt; margin-bottom: 2.2mm; }
.role-card li { margin-bottom: 1.1mm; }
footer { padding: 3.5mm 14mm 7mm; }
.ack { font-size: 8.6pt; color: #2b3163; background: #f3f4f9; border-radius: 2mm; padding: 3mm 4mm; }
.ack b { color: #27328a; }
.sign { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
.line { border-top: .8pt solid #27328a; padding-top: 1.2mm; font-size: 7.6pt; color: #6b7090; letter-spacing: .06em; text-transform: uppercase; }
.line + .line { margin-top: 6mm; }
.brand { margin-top: 3.5mm; display: flex; justify-content: space-between; font-size: 7.4pt; color: #6b7090; }
.brand b { color: #27328a; }
"""

def marked(text):
    """Escape, then turn **x** into a highlighted number."""
    return re.sub(r"\*\*(.+?)\*\*", r'<strong class="num">\1</strong>', html.escape(text))


def letter(committee_id, name, vow, duties, logo_uri):
    e = html.escape
    general = "".join(
        f'<div class="block"><h3>{i}. {e(title)}</h3><ul>{"".join(f"<li>{marked(x)}</li>" for x in items)}</ul></div>'
        for i, (title, items) in enumerate(GENERAL, 1)
    )
    role = "".join(f"<li>{e(x)}</li>" for x in duties)
    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>Letter of Responsibility — {e(name)} Member</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Noto+Sans:wght@400;700;800&display=block" rel="stylesheet">
<style>{CSS}</style></head><body><div class="page">
<header>
  <img src="{logo_uri}" alt="Resala AUC">
  <div>
    <div class="kicker">Resala AUC · Beyond Ana Maly</div>
    <h1>Letter of Responsibility</h1>
    <div class="role">{e(name)} · Member</div>
  </div>
</header>
<main>
  <p class="intro">Dear {e(name)} member, by accepting your place in <b>{e(name)}</b> you join the people who turn Resala's
  work into something real. You work under your committee's heads and director, take ownership of the tasks they give
  you, and help your team deliver where it matters. This letter has two parts — the General Guidelines every Resala
  member keeps, and what your role asks of you. <b>Both parts are binding.</b></p>

  <div class="part"><span class="n">01</span><h2>General Guidelines for Members</h2><span class="note">The same for every committee</span></div>
  <div class="grid">{general}</div>

  <div class="part"><span class="n">02</span><h2>Your Role in {e(name)}</h2></div>
  <div class="role-card"><div class="vow">{e(vow)}</div><ul>{role}</ul></div>
</main>
<footer>
  <p class="ack">By replying <b>CONFIRMED</b> to your acceptance email, you acknowledge that you have read, understood and
  accepted both parts of this Letter of Responsibility, and commit to them throughout your time as a member of {e(name)}.</p>
  <div class="brand"><span><b>Resala AUC</b> · Build the First Step</span><span>Be the first step toward someone's better life.</span></div>
</footer>
</div></body></html>"""

def main():
    OUT.mkdir(exist_ok=True)
    logo_uri = "data:image/png;base64," + base64.b64encode(LOGO.read_bytes()).decode()
    for cid, (name, vow, duties) in COMMITTEES.items():
        src = OUT / f"{cid}.html"
        src.write_text(letter(cid, name, vow, duties, logo_uri), encoding="utf-8")
        pdf = OUT / f"{cid}.pdf"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--virtual-time-budget=15000", f"--print-to-pdf={pdf}", src.as_uri()],
                       check=True, capture_output=True)
        src.unlink()
        print(f"{cid}.pdf")

if __name__ == "__main__":
    sys.exit(main())
