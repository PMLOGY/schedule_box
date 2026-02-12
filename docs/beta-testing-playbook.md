# Beta Testing Playbook — ScheduleBox

## 1. Program Overview

**Goal:** Validate ScheduleBox with 3-5 real Czech/Slovak SMBs before public launch

**Duration:** 4 weeks per cohort

**Success Metric:** NPS >= 7 average, 2+ testers willing to convert to paid

**Incentive:** 6 months free Growth tier (value 8,940 Kč)

**Target:** 3-15 businesses total (minimum 3, target 9-15 across all personas)

## 2. Beta Tester Personas

We target 3 distinct personas matching our Czech/Slovak SMB market. Each represents a different market segment with unique needs, technical proficiency, and usage patterns.

| Persona                           | Profile                                                                                                                       | Recruitment Channel                                                                   | Why Important                                                                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Beauty Salon Owner**            | 45-60 years old, non-technical, smartphone-primary user, 3-8 employees                                                        | Local Facebook groups, beauty industry associations, personal referrals               | Tests mobile UX and validates onboarding simplicity. This is our biggest market segment and represents the least technical users. Success with this persona proves the product is truly accessible. |
| **Fitness/Wellness Studio**       | 30-40 years old, moderately technical, uses existing SaaS tools (e.g., Gymbeam, Ecomail), 5-15 employees                      | LinkedIn outreach, fitness networking events, industry forums                         | Tests integration capabilities and provides valuable API feedback. Validates multi-service booking flows and class scheduling. Comfortable giving detailed technical feedback.                      |
| **Medical/Professional Practice** | 50+ years old, desktop-first user, security-conscious, high privacy requirements, 2-5 employees (dentist, lawyer, accountant) | Direct outreach via chambers of commerce, medical associations, professional networks | Tests compliance features and validates trust signals. Critical for premium tier validation and ensures platform meets strict privacy/GDPR requirements.                                            |

**Recruitment Target:** 3-5 businesses per persona (9-15 total). **Minimum Viable:** 1 per persona (3 total).

## 3. Screening Criteria

All beta testers must meet these criteria to ensure productive participation:

- ✅ **Must have 3+ employees who accept bookings** (validates multi-user scenarios)
- ✅ **Currently using a booking system** (competitor product or manual/paper-based system — ensures they understand the problem domain)
- ✅ **Willing to commit 4 weeks of active usage** (at least 10 bookings per week minimum)
- ✅ **Located in Czech Republic or Slovakia** (validates locale, currency, language, legal requirements)
- ✅ **Available for 30-minute weekly check-in call** (critical for structured feedback collection)
- ✅ **Willing to sign NDA and provide honest feedback** (legal protection and candid insights)
- ✅ **NOT friends/family of the team** (avoid selection bias — research shows friends give artificially positive feedback)

**Screening Questions** (ask during initial contact):

1. How many employees currently accept bookings in your business?
2. What system do you use today for managing bookings? (competitor name or "manual")
3. How many bookings do you process per week on average?
4. Are you willing to dedicate time each week to test a new system and provide feedback?
5. What's your biggest frustration with your current booking process?

## 4. Onboarding Process

**Week 0 (Pre-Beta Launch):**

### Step 1: Send Welcome Email

- Login credentials (unique per business)
- Quick start guide PDF (5-page visual walkthrough)
- Link to schedule onboarding call (Calendly or manual coordination)
- NDA and Data Processing Agreement (GDPR compliance)

### Step 2: Schedule 45-Minute Video Onboarding Call

- **Timing:** Within 3 days of beta start
- **Platform:** Google Meet or Zoom
- **Attendees:** 1-2 team members + business owner + key staff member

### Step 3: During Onboarding Call

Complete these setup tasks together (live, not async):

1. **Company Profile Setup**
   - Business name, address, phone, email
   - Logo upload
   - Business hours configuration
   - Currency and timezone verification (Europe/Prague)

2. **Import Existing Customer List**
   - Provide CSV template with sample data
   - Walk through CSV import process
   - Verify: at least 5 customers imported successfully

3. **Configure Services**
   - Add 3-5 key services with pricing and duration
   - Assign services to employees
   - Set buffer times between appointments

4. **Add Employees**
   - Create user accounts for 2-3 staff members
   - Set working hours per employee
   - Configure employee-specific services

5. **Create Test Booking**
   - Walk tester through creating a manual booking
   - Show public booking page
   - Verify booking appears in calendar

### Step 4: Verification Checkpoint

Before ending call, verify:

- ✅ Tester can log in independently
- ✅ Dashboard displays correctly
- ✅ At least one test booking exists and shows in calendar
- ✅ Public booking link is accessible and displays services

### Step 5: Add to Support Channel

- Add tester to dedicated Slack workspace (channel: #beta-testers) or WhatsApp group
- Introduce team members (dev lead, product manager, support)
- Share support SLA and response expectations

## 5. Weekly Feedback Schedule

Each week focuses on a specific product area with targeted questions. Feedback collected via phone calls + online surveys.

---

### **Week 1: Onboarding and Setup**

**Focus Areas:** Account setup, service configuration, employee management

**Feedback Method:** 15-minute phone call + online survey (Google Forms or Typeform)

**Survey Questions:**

1. **How easy was the initial setup?** (Scale: 1-10, where 1 = very difficult, 10 = very easy)

2. **What was confusing or unclear during setup?** (Open text)
   - Prompt: "Think about the onboarding call and your first 30 minutes using the system. What made you pause or feel uncertain?"

3. **How long did setup take in total?** (Multiple choice: < 30 min, 30-60 min, 1-2 hours, 2+ hours)

4. **Would you be able to set this up without our help?** (Options: Yes / Partially / No)
   - If "Partially" or "No": "What specific step would you need help with?"

5. **What feature did you expect that was missing?** (Open text)
   - Prompt: "Based on your experience with other tools, what did you look for but couldn't find?"

**Check-in Call Topics:**

- Screen share: watch tester navigate to calendar, create a booking, edit a service
- Ask: "Show me how you'd add a new employee. What would you do first?"
- Observe: Note any hesitation, confusion, or incorrect assumptions

---

### **Week 2: First Real Bookings**

**Focus Areas:** Customer-facing booking flow, availability management, calendar usage

**Trigger:** After 5th real booking (not test booking), show in-app NPS survey modal

**Feedback Method:** In-app survey + 15-minute phone call

**Survey Questions:**

1. **How did your customers react to online booking?** (Options: Positive / Neutral / Negative)
   - If "Positive": "What did they like most?"
   - If "Neutral" or "Negative": "What complaints or confusion did they mention?"

2. **Did any customer have trouble booking? What happened?** (Open text)
   - Prompt: "Describe any phone calls, emails, or in-person questions customers had about the booking process."

3. **Rate the booking calendar view** (Scale: 1-10, where 1 = unusable, 10 = excellent)
   - Follow-up: "What would make it a 10?"

4. **Did you encounter any bugs?** (Yes/No)
   - If "Yes": "Describe what happened, when it happened, and what you were trying to do."

5. **NPS: How likely are you to recommend ScheduleBox to a colleague?** (Scale: 0-10)
   - If 0-6 (Detractor): "What would need to change for you to recommend it?"
   - If 7-8 (Passive): "What's holding you back from giving a 9 or 10?"
   - If 9-10 (Promoter): "What's the main reason you'd recommend it?"

**Check-in Call Topics:**

- Review: Look at actual bookings in their calendar together
- Ask: "Walk me through what happens when you get a new booking notification"
- Test: "Show me how you'd reschedule this appointment"
- Observe: Note any workarounds, manual steps, or friction points

---

### **Week 3: Payment and Notifications**

**Focus Areas:** Payment processing (Comgate, QR, cash), email/SMS notifications, automation rules

**Trigger:** After first payment is processed (any method), send survey link via email

**Feedback Method:** Online survey + 15-minute phone call

**Survey Questions:**

1. **Did payment processing work correctly?** (Options: Yes / No / Didn't use payments yet)
   - If "No": "Describe the issue. What happened? What were you expecting?"

2. **Did your customers receive booking confirmation emails?** (Options: Yes, always / Yes, sometimes / No / Don't know)
   - If "Yes, sometimes" or "No": "Can you provide an example booking where email failed?"

3. **Rate the notification templates (emails/SMS)** (Scale: 1-10, where 1 = unprofessional, 10 = perfect)
   - Follow-up: "What would you change about the templates?"

4. **Did you set up any automation rules?** (Options: Yes / No / Tried but couldn't figure it out)
   - If "Yes": "Which ones? Are they working as expected?"
   - If "Tried but couldn't": "What part was confusing?"

5. **What notification would you want that doesn't exist yet?** (Open text)
   - Prompt: "Think about communications you currently send manually. What could be automated?"

**Check-in Call Topics:**

- Review: Check notification log together, verify delivery
- Ask: "Show me a confirmation email you sent. Does it look professional?"
- Test: "Let's create an automation rule together. What would be useful for you?"
- Discuss: Payment gateway experience, any customer complaints about checkout

---

### **Week 4: Full Flow and Retrospective**

**Focus Areas:** Overall experience, missing features, willingness to pay, decision to continue

**Feedback Method:** 30-minute video retrospective interview (recorded with permission)

**Interview Questions:**

1. **Overall satisfaction with ScheduleBox** (Scale: 1-10)
   - "Why that score? What influenced it most?"

2. **Top 3 things you love about ScheduleBox** (Open text, ranked)
   - Prompt: "What would you miss most if you stopped using it tomorrow?"

3. **Top 3 things that need improvement** (Open text, ranked by priority)
   - Prompt: "If we could only fix 3 things, what would they be?"

4. **Would you pay 990 Kč/month for this? Why or why not?** (Open text)
   - If "No": "What price would feel fair?"
   - If "Yes": "What features justify that price for you?"

5. **What would make you switch from your current system?** (Open text)
   - If currently using competitor: "What would ScheduleBox need to do better than [competitor]?"
   - If using manual system: "What's the biggest hassle we'd be solving?"

6. **Final NPS** (Scale: 0-10)
   - Compare to Week 2 NPS. If it changed: "What changed between Week 2 and now?"

7. **Would you continue using ScheduleBox after beta?** (Options: Yes, definitely / Maybe / No)
   - If "Yes": "Would you be interested in converting to a paid plan when the free period ends?"
   - If "Maybe" or "No": "What's the main reason you'd stop using it?"

**Retrospective Call Topics:**

- Screen share: Ask tester to show their favorite feature
- Discuss: Biggest pain point in current workflow
- Explore: Feature requests in detail (get user stories, not just "I want X")
- Close: Thank you, next steps, how to stay in touch

---

## 6. Success Criteria

The beta program is considered successful if:

- ✅ **Average NPS >= 7** across all testers (industry benchmark for SaaS is 30-40, but for beta we need 7+ to indicate product-market fit)
- ✅ **At least 2 testers willing to convert to paid plan** (validates willingness to pay)
- ✅ **No critical bugs reported by Week 4** (all critical bugs resolved within 48 hours)
- ✅ **Average setup time < 60 minutes with assistance** (validates onboarding simplicity)
- ✅ **At least 50 real bookings processed across all testers** (validates core functionality under real usage)

**Nice-to-Have Goals:**

- 🎯 3+ testers actively using payments
- 🎯 5+ feature requests from multiple testers (indicates engagement)
- 🎯 At least one tester shares positive feedback on LinkedIn/Facebook organically

## 7. Support SLA During Beta

Beta testers receive priority support to ensure successful testing:

| Issue Type                                             | Acknowledgment Time | Resolution Time | Channel                    |
| ------------------------------------------------------ | ------------------- | --------------- | -------------------------- |
| **Critical Bug** (system down, cannot create bookings) | 1 hour              | 24 hours        | Slack #beta-testers, phone |
| **High Bug** (feature broken, workaround exists)       | 4 hours             | 48 hours        | Slack, email               |
| **Medium Bug** (cosmetic, minor annoyance)             | 24 hours            | 1 week          | Slack, email               |
| **Feature Request**                                    | 24 hours            | Triaged weekly  | Slack, email               |
| **Question/How-To**                                    | 2 hours             | 4 hours         | Slack (fastest)            |

**Support Channels:**

- **Slack workspace:** #beta-testers channel (dev team monitors 9am-6pm CET Mon-Fri)
- **WhatsApp group:** For urgent issues outside business hours
- **Email:** beta@schedulebox.cz (checked twice daily)
- **Weekly check-in calls:** Mandatory, scheduled in advance

**Escalation Path:**

- Tester reports issue → Team acknowledges → Triage → Assign → Fix → Verify with tester → Close

## 8. Data Collection and Privacy

**GDPR Compliance:**

- ✅ **Beta testers sign Data Processing Agreement** before onboarding (required by GDPR Article 28)
- ✅ **Anonymize all beta data** before internal reporting (use "Tester A", "Salon 1", etc. in documentation)
- ✅ **Testers can export all their data** at any time via GDPR export feature (already implemented in Phase 3)
- ✅ **Testers can delete their account** after beta ends (soft delete preserves anonymized analytics)

**Data We Collect:**

- Survey responses (stored in Google Forms/Typeform, exported to Google Sheets)
- Call recordings (with explicit permission, stored on Google Drive, deleted after 6 months)
- Usage analytics (booking count, feature adoption, session duration — anonymized)
- Bug reports and feature requests (stored in Linear/GitHub Issues)

**Data We DO NOT Collect:**

- ❌ Customer personal data (tester's end customers — only aggregate counts)
- ❌ Payment card details (handled by Comgate, we only see transaction IDs)
- ❌ Screenshots without permission (always ask before taking screenshots during calls)

**Retention Policy:**

- Survey data: 2 years (for trend analysis)
- Call recordings: 6 months (then deleted)
- Bug reports: Indefinitely (for product history)
- Anonymized usage data: Indefinitely (aggregate metrics)

## 9. Post-Beta Actions

After the 4-week program ends:

### Week 5: Analysis and Reporting

1. **Compile Feedback Report**
   - Quantitative section: NPS scores, setup times, bug counts, booking volumes
   - Qualitative section: Themes from open-text responses (use affinity mapping)
   - Segment by persona: Compare feedback across beauty, fitness, medical

2. **Prioritize Top 5 Issues for Immediate Fix**
   - Use MoSCoW method: Must-have (blocking launch), Should-have (fix before GA), Could-have (roadmap), Won't-have (out of scope)
   - Focus on issues mentioned by 2+ testers (signal vs. noise)

3. **Share Report with Team**
   - Internal presentation to dev, product, marketing teams
   - Celebrate wins (quote positive feedback verbatim)
   - Assign owners to top 5 fixes

### Week 6: Tester Appreciation

4. **Send Thank-You Email**
   - Personalized message (not template)
   - Activate 6-month free Growth tier (value 8,940 Kč)
   - Share what we learned and what we'll fix
   - Ask permission to use their business as a case study

5. **Publish Case Studies** (if testers consent)
   - 1-page PDF per persona: "How [Business Name] Uses ScheduleBox"
   - Include: business challenge, solution, results (quantify: "Reduced no-shows by 30%")
   - Use on marketing website and sales outreach

### Month 2-3: Retention Check-In

6. **Schedule 1-Month Follow-Up Call**
   - Check if they're still using ScheduleBox actively
   - Ask: "What changed since the beta ended?"
   - Gauge interest in converting to paid plan (offer early-bird discount if needed)

7. **Monitor Retention Metrics**
   - Track: Monthly active users, booking volume, payment processing
   - Red flag: Tester stops logging in for 2 weeks → proactive outreach

### Month 6: Conversion and Renewal

8. **2 Weeks Before Free Period Ends**
   - Send conversion email with pricing options
   - Offer: 20% off first 3 months if they convert now (early adopter bonus)
   - Highlight: New features shipped since beta (show progress)

9. **Conversion Results**
   - Goal: 50%+ conversion rate (2-3 out of 5 testers per persona)
   - If tester declines: Exit interview to understand why

## 10. Beta Cohort Scheduling

**Recommended Approach:** Staggered cohorts to manage support load

| Cohort               | Start Date | Personas      | Testers | Support Capacity       |
| -------------------- | ---------- | ------------- | ------- | ---------------------- |
| **Cohort 1 (Pilot)** | Week 1     | 1 per persona | 3 total | Full team (high touch) |
| **Cohort 2**         | Week 3     | 2 per persona | 6 total | Team + support hire    |
| **Cohort 3**         | Week 5     | 2 per persona | 6 total | Scaled support         |

**Rationale:**

- Cohort 1 is a learning cohort (expect bugs, iterate fast)
- Cohort 2 validates fixes from Cohort 1
- Cohort 3 proves scalability and readiness for public launch

**Alternative:** Single cohort of 9-15 testers if support capacity allows (faster feedback loop, but higher risk).

---

## Appendix A: Recruitment Email Template

**Subject:** Pozvánka do beta programu ScheduleBox — 6 měsíců zdarma 🎁

Dobrý den,

rádi bychom Vás pozvali do **beta programu ScheduleBox** — moderního rezervačního systému určeného pro české a slovenské firmy.

**Co je ScheduleBox?**

- Online rezervace 24/7 s platbou předem
- Automatické SMS a e-mailové notifikace
- Kalendář pro celý tým
- AI optimalizace cen a využití kapacity

**Co získáte?**

- ✅ 6 měsíců **Growth tier ZDARMA** (hodnota 8 940 Kč)
- ✅ Přímý kontakt s vývojovým týmem
- ✅ Vliv na budoucnost produktu
- ✅ Prioritní podpora během celého beta testu

**Co od Vás potřebujeme?**

- 4 týdny aktivního používání (alespoň 10 rezervací týdně)
- 30 minut týdně na zpětnou vazbu (videohovor + krátký dotazník)
- Upřímná zpětná vazba (i kritika je užitečná!)

**Podmínky účasti:**

- Alespoň 3 zaměstnanci, kteří přijímají objednávky
- Firma v ČR nebo SK
- Momentálně používáte nějaký rezervační systém nebo papírový diář

Máte zájem? **Odpovězte na tento e-mail** a my Vám zašleme více detailů!

S pozdravem,
[Jméno]
ScheduleBox Team

---

## Appendix B: Weekly Call Checklist

Print this checklist for each weekly call:

**Pre-Call:**

- [ ] Review tester's usage data (bookings, logins, feature adoption)
- [ ] Check for open bug reports
- [ ] Prepare screen share link

**During Call:**

- [ ] Record with permission (state: "Recording for internal use only")
- [ ] Ask all survey questions
- [ ] Observe tester using the product (screen share)
- [ ] Note any workarounds or friction points
- [ ] Ask: "What surprised you this week?"
- [ ] Capture exact quotes (for testimonials/case studies)

**Post-Call:**

- [ ] Send summary notes to tester (verify accuracy)
- [ ] Log bugs in GitHub Issues (tag: beta-feedback)
- [ ] Update beta feedback spreadsheet
- [ ] Triage urgent issues with dev team

---

**Document Version:** 1.0
**Last Updated:** 2026-02-12
**Owner:** Product Team
