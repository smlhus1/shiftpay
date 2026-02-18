# Phase 3: Deep Competitive Analysis & Validation

> Researched: 2026-02-13 | Sources consulted: 45+ | Confidence: High

## TL;DR

All 5 problems are real and validated by data. The strongest hackathon candidates are **Problem 1 (AI Work Intensification Tracker)** and **Problem 5 (Immigrant Settlement Navigator)** due to timing, gap size, and buildability. Problem 2 (Caregiver Hub) is a massive market but crowded. Problem 3 (FOBO Score) has the best viral potential. Problem 4 (AI Slop Detector) already has emerging competitors.

---

## Problem 1: AI Work Intensification Tracker

### Competitive Landscape

| Product | Price | Type | Strengths | Weaknesses |
|---------|-------|------|-----------|------------|
| RescueTime | $12/mo | Time tracker | Smart burnout warnings, focus sessions, real-time alerts | Tracks TIME, not AI-specific patterns. Employer-oriented. No scope creep tracking |
| Rize | $10/mo | AI time tracker | Auto-categorization, break prompts, focus coaching | Productivity-focused, not burnout/intensification framing |
| ActivityWatch | Free/OSS | Time tracker | Open source, privacy-first, local data only | No AI-specific tracking, no burnout analytics, DIY setup |
| Reclaim.ai | Free-$10/mo | Calendar AI | Work-life balance metrics, overtime tracking | Calendar-centric, doesn't track AI usage patterns |
| WebWork | $4.99/user/mo | Employee monitoring | Burnout detection, overload alerts | EMPLOYER tool, surveillance-oriented, not personal |
| Insightful | Custom pricing | Workforce analytics | Productivity insights, burnout prevention | Enterprise-only, invasive monitoring |
| MonitUp | $5/mo | Activity tracker | Screenshots, AI analysis | Invasive, employer-oriented |

### Real User Quotes

**From Hacker News (Feb 9, 2026) discussion of the HBR article:**

1. "If AI was so good at reducing work, why is it every company engaging with AI has their workload increase. 20 years ago SV was stereotyped for 'lazy' or fun loving engineers who barely worked. Now the stereotype is overworked engineer."

2. "Since my team has jumped into an AI everything working style, expectations have tripled, stress has tripled and actual productivity has only gone up by maybe 10%. Leadership is putting immense pressure on everyone to prove their investment in AI is worth it."

3. "Are the people leveraging LLMs making more money while working the same number of hours? Are they working fewer hours while making the same amount? If neither of these are true, then LLMs have not made your life better as a working programmer."

4. "I laughed at all the Super Bowl commercials showing frazzled office workers transformed into happy loafers after AI has done all their work for them..."

5. "LLMs could be a Moloch problem. If anyone uses it your life will be worse, but if you don't use it then your life will be even worse."

**From DHR Global survey (2025):** 83% of corporate professionals experiencing burnout, with overwhelming workloads and excessive hours as top culprits.

### Target Audience Size

- **UC Berkeley study (2026):** 200 employees tracked for 8 months at a US tech company; 62% of associates and 61% of entry-level workers reported burnout
- **Gallup (2025):** US workplace AI use jumped to 45% of workers
- **DHR Global:** 83% of 1,500 corporate professionals experiencing burnout
- **Knowledge workers in US:** ~60M people. If 45% use AI at work = ~27M potential users
- **Global knowledge workers:** ~1B. Conservative estimate of AI-using workers susceptible to intensification: 100M+

### The Hook

The HBR article (Feb 9, 2026) went massively viral -- featured on Hacker News (#1), TechCrunch, Fortune, Tom's Hardware, The Register, Futurism, Decrypt. THIS WEEK is the peak awareness moment. A tool that quantifies the exact problem the article describes would ride the wave of recognition. The hook: "You read the article. Now measure it in YOUR work."

### Critical Gap

**NO existing tool tracks AI-specific work intensification patterns.** All current tools are either:
- **Employer surveillance** (WebWork, Insightful, Teramind) -- workers don't want bosses monitoring them
- **General time trackers** (RescueTime, Rize) -- track hours, not AI interaction patterns
- **Calendar tools** (Reclaim.ai) -- track meetings, not scope creep

What's missing: A PERSONAL, PRIVATE tool that tracks:
- How many AI threads/conversations you had today
- Scope expansion: tasks you took on BECAUSE AI made them seem possible
- Context switches between AI-assisted and manual work
- After-hours AI work bleeding into personal time
- Weekly "intensification score" showing the trend

### 5-Day MVP Definition

1. **Daily check-in** (30 seconds): "How many AI tools did you use today? How many tasks did you take on that aren't your core role? Did you work after hours with AI?"
2. **Intensification Score** (0-100): Calculated from check-in answers, displayed as a gauge
3. **Weekly trend graph**: Shows your intensification pattern over time
4. **3 AI boundaries**: Simple rules you set ("No AI after 6pm", "Max 3 new scope items per day")
5. **Share card**: "My AI Intensification Score this week" -- for social virality

**Tech:** Web app (React + Supabase). No browser extension needed for MVP -- self-reported data is faster to build and more privacy-friendly.

### Verdict

**STRONG YES.** Perfect timing (HBR article is 4 days old and still trending), zero direct competitors for PERSONAL AI intensification tracking, and the MVP is achievable in 5 days. The concept has built-in virality (people want to share their scores) and speaks to a universal experience. The risk: self-reported data may feel less "real" than automatic tracking. Mitigation: frame it as a mindfulness/awareness tool, not a measurement tool.

---

## Problem 2: Family Caregiver Coordination Hub

### Competitive Landscape

| Product | Price | Type | Strengths | Weaknesses |
|---------|-------|------|-----------|------------|
| Caring Village | Free (basic), $15-25/mo (premium) | All-in-one | AI assistant, medication list, document storage, shared calendar, messaging | Buggy, limited to-do features, expensive for larger families, US-focused |
| Lotsa Helping Hands | Free | Community coordination | Task sign-ups, meals/rides/visits coordination, community messaging | No calendar view (list only), can't edit notes, no medication tracking, outdated UI |
| ianacare | Free (basic), employer-sponsored PLUS | Caregiver support | Care requests, team calendar, expert navigators, employer benefits integration | Limited free tier, US employer-focused model |
| CircleOf | $45/mo | Family care | Single point of contact, shared responsibilities | Expensive, limited adoption |
| Carely | Free | Communication | Simple updates, scheduling, shared stories/photos | Limited features, mostly communication-focused |
| CaringBridge | Free (donations) | Health updates | Patient updates to community, well-wishes | Not coordination-focused, more like a health blog |
| Medisafe | Free-$10/mo | Medication only | Medication reminders, tracking | Single-purpose, no family coordination |
| CareZone | Free | Health info | Medication lists, appointments, documents | Acquired by Walmart (2020), uncertain future, US-only |

**Norwegian alternatives:**
| Product | Status | Limitations |
|---------|--------|-------------|
| Helsenorge | Active | Patient-focused, limited caregiver features, requires BankID, no family coordination |
| weCare (Stiftelsen Dam) | Small-scale pilot | Not widely available, professional caregiver focus |
| DIGGPa | Launched 2025 | Professional caregivers, not family coordination |

### Real User Quotes

**From The Local Norway (June 2025) and caregiver forums:**

1. "You are effectively locked out of Norwegian society [without BankID]" -- applies to caregivers trying to coordinate with Norwegian health system

2. From Caring Village review: "$25/month for a bigger village is ridiculous, seeing as $15 is already way overpriced."

3. From Lotsa Helping Hands reviews: "Missing a calendar view feature; currently the only way to view all tasks and needs is in a list view."

4. From Reddit r/AgingParents (general pattern from PMC study): Caregivers on Reddit primarily disclose stressors about coordination, medication management, and feeling isolated in the caregiving role.

5. From Eurocarers Norway report: Informal carers contribute services worth EUR 5.5 billion annually -- equivalent to the annual salaries of 100,000 nurses -- yet have minimal digital support.

### Target Audience Size

- **Norway:** 800,000 informal caregivers (prorende) out of 5.3 million population (15% of population)
- **Norway economic value:** NOK 63 billion/year in unpaid care (EUR 5.5B)
- **Norway working carers:** 70% of carers aged 40-70 have paid work (560,000 people juggling work + care)
- **Global:** 53M unpaid caregivers in US alone (AARP 2020), 100M+ in Europe
- **Market:** Global caregiver app market growing at 15-20% CAGR

### The Hook

Norway is developing a National Carers Strategy and exploring paid care days for working carers. The policy environment is shifting in caregivers' favor. Trigger: "Your parent's health changed and suddenly you're the coordinator -- but your siblings all have different information and nobody knows what happened at the last doctor's visit."

### Critical Gap

**No Norwegian-language, Norway-integrated caregiver coordination tool exists.** All major apps are:
- US-focused (Caring Village, ianacare, Lotsa Helping Hands)
- In English only
- Not integrated with Norwegian systems (Helsenorge, fastlege, NAV)
- Either too expensive ($25-45/mo) or too limited (free tiers)

What's missing: A simple, FREE tool in Norwegian that lets siblings:
1. See today's status at a glance ("Mamma spiste frokost, tok medisinene, virket i godt humor")
2. Coordinate who visits when (shared calendar)
3. Track medications and appointments
4. Share updates without endless group chats

### 5-Day MVP Definition

1. **Create a care circle**: Invite family members via link/code
2. **Daily check-in**: Quick status update after visiting (mood, meals, medications, notes)
3. **Shared timeline**: Feed showing all updates from all family members
4. **Simple task list**: "Noen ma handle mat", "Legetime tirsdag kl 14"
5. **Norwegian UI**: Full Norwegian language

**Tech:** Web app (React + Supabase auth + real-time). Keep it dead simple -- the value is in the COORDINATION, not features.

### Verdict

**YES, but with caveats.** Massive market, real pain, and a clear Norway-specific gap. However, this is a CROWDED space globally, and building trust for a health-adjacent app is harder than a utility tool. For a hackathon, the Norwegian angle is the differentiator. Risk: 5 days may not be enough to build the real-time coordination features well. The MVP needs to be RUTHLESSLY simple.

---

## Problem 3: FOBO / AI Obsolescence Risk Score

### Competitive Landscape

| Product | Price | Type | Strengths | Weaknesses |
|---------|-------|------|-----------|------------|
| willrobotstakemyjob.com | Free | Risk calculator | O*NET data, BLS labor stats, well-known brand | Based on 2013 Oxford study, novelty/toy feel, no actionable advice, no reskilling |
| ReplaceMeter | Free | AI risk calculator | OpenAI-powered analysis, A-G risk scale, dual scores (resilience + adaptability) | Generic summaries, WordPress-based, no personalized roadmap |
| TripleTen Job Risk Calculator | Free (lead gen) | Risk + action plan | 0-100% risk score, task-level analysis, reskilling suggestions with timelines, alternative career paths | Marketing funnel for TripleTen courses, biased toward their offerings |
| Replaced By Robot | Free | Risk lookup | Simple interface | Outdated data, no personalization |
| Job Extinction Index (voxos.ai) | Free | Risk database | 700 US occupations, BLS + O*NET data, task-level analysis | Database only, no personal assessment, no reskilling |
| Kickresume AI Career Map | Free | Career pathing | AI-powered career suggestions, visual map | Focused on job search, not risk assessment |
| CareerSeeker AI | Free-$29 | Career quiz | Personality-based, salary outlooks, role recommendations | Generic, not AI-risk focused |

### Real User Quotes

1. **Gallup (2023-2024):** "22% of workers feared their jobs would become obsolete due to technology, up from 15% in 2021" -- the sharpest 2-year rise in Gallup's polling history

2. **From People Managing People (2026):** "64% are 'job hugging' -- clinging to current roles despite burnout because they don't trust they can compete for something better."

3. **From World Economic Forum:** FOBO is "the creeping sense that your skills are degrading in real time, that you're falling behind faster than you can catch up."

4. **From HR Digest:** "When employees feel obsolete, they disengage -- emotionally and intellectually."

5. **From Fortune (2023):** Workers describe FOBO as not knowing "what relevant means anymore."

### Target Audience Size

- **US workers fearing AI obsolescence:** 22% of 160M workforce = ~35M people
- **College-educated workers worried:** 20% (doubled from 8% in 2021)
- **Young workers (18-34):** 30% worried about obsolescence
- **Workers below $100K income:** 27% worried (vs 17% above $100K)
- **Global:** PwC 2025 survey shows similar patterns worldwide
- **CHROs expecting AI job replacements within 3 years:** 72%

### The Hook

FOBO is a trending buzzword. People share their results from quizzes compulsively (see: personality tests, "What X are you?" virality). The hook: "Find out your FOBO score -- and get a plan to fix it." The trigger is every new AI product launch, every "AI replaces X" headline, every layoff announcement.

### Critical Gap

Current tools give you a NUMBER but no PLAN. They say "your job has a 72% automation risk" and leave you there. What's missing:

1. **Personalized assessment** based on YOUR actual tasks, not just your job title
2. **Actionable reskilling roadmap** with specific courses, skills, and timeline
3. **Task-level analysis**: "These 4 of your 10 daily tasks are at risk, but these 6 are safe"
4. **Progress tracking**: "You've reduced your FOBO score from 72 to 48 by learning X"
5. **Non-promotional**: Not a marketing funnel for a specific course platform

### 5-Day MVP Definition

1. **Smart quiz** (2-3 minutes): Job title + 10 questions about your actual daily tasks (not just job description)
2. **FOBO Score** (0-100): With breakdown by task category (creative, analytical, communication, routine)
3. **Risk map**: Visual showing which of YOUR tasks are safe vs. at risk (powered by O*NET data)
4. **Top 3 reskilling recommendations**: Specific, free resources (Coursera, YouTube, etc.)
5. **Shareable score card**: "My FOBO Score is 47/100" with visual design optimized for social sharing

**Data source:** O*NET API (free, public) for task-level occupational data. Use an LLM to map user's self-reported tasks to O*NET categories and generate personalized recommendations.

### Verdict

**STRONG YES for virality, MEDIUM for depth.** This has the best potential for going viral (quizzes + FOBO trending topic). The 5-day MVP is very achievable. Risk: the output needs to feel genuinely useful, not gimmicky. If the reskilling roadmap is generic ("learn Python"), it'll feel like every other tool. The differentiator is TASK-LEVEL personalization.

---

## Problem 4: AI Slop Detector / Human Content Finder

### Competitive Landscape

| Product | Price | Type | Strengths | Weaknesses |
|---------|-------|------|-----------|------------|
| GPTZero | Free (10K words/mo), $12.99/mo+ | AI detector | 99% claimed accuracy, sentence-level detection, browser extension, color-coded highlights | Education-focused, not consumer UX, false positives on polished human writing |
| Originality.ai | $15/mo | AI detector | Publisher/SEO focused, plagiarism + AI detection combo | 4.79% false positive rate, not consumer-facing |
| Winston AI | $18/mo | AI detector | Content creator focused, document scanning | 79% real-world accuracy, misses 34% of AI text |
| ZeroGPT | Free | AI detector | Free, simple interface | Least accurate of major tools, unreliable results |
| Slop Evader | Free (extension) | Temporal filter | Filters Google to pre-Nov 2022 results only, eliminates AI content by date | Crude approach (loses 3+ years of legitimate content), not detection |
| SkipSlop | Free (extension) | Platform filter | AI slop detection across streaming/social platforms | Limited to specific platforms |
| Kagi SlopStop | Kagi subscription ($10/mo) | Search integration | Community-driven flagging, domain-level blocking, building AI slop database | Requires Kagi subscription, search-only |
| AI Slop Detector (GitHub) | Free/OSS | Image detector | Local inference, privacy-first, uses HuggingFace models | Images only, requires Python backend, technical setup |

### Real User Quotes

1. **Europol prediction:** "By 2026, 90% of online content could be synthetically generated"

2. **Ahrefs (Apr 2025):** "74.2% of new web pages contain AI content" (from prior research)

3. **Fast Company on Slop Evader:** Called it "the best idea of 2025" -- resonating with widespread frustration

4. **Illinois State University (2024):** "Many detectors do not perform much better than chance in certain contexts and should not be used as sole evidence"

5. **Stanford SCALE Initiative:** GPTZero showed inconsistent performance on paraphrased or heavily edited text

### Target Audience Size

- **Internet users frustrated with AI content:** Hard to quantify, but "AI slop" was Merriam-Webster Word of the Year 2025
- **Chrome extension market:** 3.2B Chrome users globally
- **GPTZero users:** 10M+ total users (primarily educators)
- **EU AI Act (Aug 2026):** Will require AI content labeling, creating regulatory tailwind
- **People searching for AI detectors:** Massive search volume growth since 2023

### The Hook

The feeling of "Is this real?" when reading anything online. The trigger: encountering obviously AI-generated content in search results, social media, or product reviews, and wanting to know before you waste time reading.

### Critical Gap

The gap is CONSUMER-FACING, PASSIVE detection:
- GPTZero/Originality = you paste text into a box (active, deliberate)
- Slop Evader = nuclear option (hides ALL post-2022 content)
- Kagi SlopStop = search-only, paid subscription

What's missing: A browser extension that AUTOMATICALLY flags AI content as you browse, in a non-intrusive way. Like an "AI probability" badge on every article, review, and social media post you encounter.

### 5-Day MVP Definition

1. **Chrome extension** that adds a small indicator badge to web pages
2. **Page-level analysis**: Scans visible text and provides an "AI probability" score (0-100%)
3. **Color-coded indicator**: Green (likely human), Yellow (mixed), Red (likely AI)
4. **Click for details**: Highlights specific sentences flagged as AI-generated
5. **Simple UI**: Non-intrusive floating badge in corner

**Technical reality check:** Building a RELIABLE AI detector in 5 days is VERY HARD. Options:
- **API approach**: Use GPTZero's API ($0.10/1000 words) -- fast to build but adds cost and dependency
- **Local model**: Use a small model via WebGPU -- technically impressive but accuracy will be lower
- **Heuristic approach**: Check for known AI patterns (perplexity, burstiness) -- less accurate but self-contained

### Verdict

**RISKY.** The problem is real and the timing is good (EU AI Act coming, "AI slop" awareness at peak). However:
1. **Accuracy is the entire product** -- if it's wrong 20% of the time, it's useless
2. **Competitors already exist** with larger teams and more data (GPTZero has a browser extension)
3. **5 days is very tight** for a reliable detection engine
4. **False positives** could make the tool more annoying than helpful

If you go this route, frame it as a "Human Content Finder" (positive framing) rather than "AI Detector" (negative/accusatory). Focus on HIGHLIGHTING human content rather than flagging AI content.

---

## Problem 5: Immigrant Settlement Navigator (Norway)

### Competitive Landscape

| Product | Price | Type | Strengths | Weaknesses |
|---------|-------|------|-----------|------------|
| UDI.no | Free | Government info | Official, comprehensive visa/permit info, personalized checklists for applications | Not a step-by-step guide, confusing navigation, only covers immigration permits |
| nyinorge.no | Free | Government info | Multi-agency info portal, available in multiple languages | Static information pages, no interactivity, no personal checklist |
| Helsenorge.no | Free | Health portal | Digital health services, prescription access | Requires BankID (catch-22 for newcomers), Norwegian-focused |
| lifeinnorway.net | Free | Blog/guide | Practical advice from expat perspective, well-written | Not interactive, ad-supported, no checklist/tracking |
| thenorwayguide.com | Free | Blog/guide | Detailed how-to articles (BankID, bank accounts, etc.) | Blog format, not a tool, no personalization |
| Norge.no | Free | Government portal | Links to all government services, life situation pages | Link aggregator only, no guidance or tracking |
| Norden.org moving guide | Free | Nordic cooperation | Cross-Nordic comparison, structured info | Very high-level, not step-by-step |
| NLS Norway Relocation | Paid service | Relocation assistance | Hands-on help, personal guidance | Expensive corporate service, not self-service |

### Real User Quotes

1. **The Local Norway (June 2025):** "Without BankID you are nobody. No mobile phone number, no online shopping, no Vipps. There are some places where that is the only payment option."

2. **Polish respondent (The Local):** "Over two months to open a bank account!" and "To get my National ID number and the bank account took me at least three months."

3. **Greek respondent (The Local):** "When you register at UDI as a job seeker, nobody tells you that you should go to NAV. Also at the tax office, nobody tells you that you should try NAV first if you don't have a job yet."

4. **General pattern:** Multiple respondents described getting "contradictory information from different government officials, or on different government websites."

5. **Life in Norway:** "There's a lot of paperwork, hassle, questions, and even confusion to get through in the move, and it can be really difficult to get a straight answer."

### Target Audience Size

- **Norway annual immigration (2024):** 36,000 new immigrants on long-term/permanent basis
- **Ukraine collective protection (2024):** 18,321 applications
- **Total first-time residence permits (2024):** 23,589 to non-EU nationals
- **Annual new arrivals needing settlement guidance:** ~40,000-55,000/year
- **Existing immigrant population:** 930,000 first-generation immigrants (potential for retroactive use)
- **Breakdown:** 49% free mobility (EU), 11% labour, 33% family, 8% humanitarian
- **International students in Norway:** ~30,000 (also need settlement guidance)

### The Hook

You just got your residence permit. You arrive in Norway. Now what? The government websites tell you WHAT you need, but not IN WHAT ORDER, and nobody tells you about the dependencies. The hook: "Your personal step-by-step guide for your first 90 days in Norway -- no more circular bureaucracy."

### Critical Gap

**NO interactive, personalized, step-by-step tool exists for settling in Norway.** Everything is:
- **Static information pages** (UDI, nyinorge, norge.no) -- you have to figure out the order yourself
- **Blog posts** (lifeinnorway, thenorwayguide) -- helpful but not actionable checklists
- **Government silos** -- UDI handles permits, Skatteetaten handles tax, NAV handles benefits, banks handle BankID -- nobody shows the FULL picture

What's critically missing:
1. **Dependency-aware sequencing**: "You can't get BankID until you have a bank account, you can't get a bank account until you have a D-number, you can't get a D-number until..." -- shown as a clear flowchart
2. **Personalization**: "I'm an EU citizen" vs "I'm from outside EU" vs "I'm a refugee" -- completely different paths
3. **Progress tracking**: Check off completed steps, see what's next
4. **Estimated timelines**: "This step typically takes 2-6 weeks"
5. **Tips and gotchas**: "Bring these EXACT documents to this appointment"

### 5-Day MVP Definition

1. **Profile selection**: EU citizen / Non-EU worker / Student / Family reunification / Refugee (5 paths)
2. **Interactive checklist**: Ordered steps with dependencies shown (step 3 unlocks after step 2)
3. **Step detail cards**: For each step -- what to do, where to go, what to bring, how long it takes, common gotchas
4. **Progress tracker**: Visual progress bar, completed/remaining steps
5. **Resource links**: Direct links to correct government pages for each step

**Content source:** Compile from UDI.no, nyinorge.no, lifeinnorway.net, thenorwayguide.com, The Local, and expat forums. The VALUE is in the curation, sequencing, and personalization.

**Tech:** Web app (React + static content). Could even be a single-page app with no backend needed for MVP. Add Supabase later for user accounts and progress saving.

### Verdict

**STRONG YES.** This has the clearest gap of all 5 problems. Zero interactive tools exist. The pain is deeply documented and emotionally resonant. The audience is well-defined (~40-55K new arrivals/year, plus 930K existing immigrants who would share it). The MVP is achievable in 5 days because it's primarily CONTENT + UX, not complex functionality. The Norway-specific angle also aligns perfectly with representing Norway in the competition.

Potential risk: Content accuracy is critical -- wrong information about government processes could be harmful. Mitigation: Link to official sources for every step, add disclaimers, use "last verified" dates.

---

## Summary Comparison

| Criteria | P1: AI Tracker | P2: Caregiver Hub | P3: FOBO Score | P4: AI Slop | P5: Immigrant Nav |
|----------|---------------|-------------------|----------------|-------------|-------------------|
| **Timing** | PERFECT (viral NOW) | Good (always relevant) | Great (trending topic) | Good (EU AI Act coming) | Great (always relevant) |
| **Competition** | None for personal use | Very crowded globally | Several exist (weak) | GPTZero has extension | ZERO interactive tools |
| **Gap size** | Large | Medium (Norway gap) | Medium | Small | Very Large |
| **Viral potential** | High (shareable score) | Low (private/family) | Very High (quiz+share) | Medium | Medium (immigrant networks) |
| **5-day feasibility** | High (self-reported) | Medium (real-time sync) | High (quiz + API) | LOW (accuracy risk) | High (content + UX) |
| **Emotional resonance** | High (burnout = universal) | Very High (family care) | High (fear/anxiety) | Medium (annoyance) | Very High (lost/confused) |
| **Audience size** | 27M+ (US AI workers) | 800K (Norway carers) | 35M (US worried workers) | 3.2B (Chrome users) | 40-55K/year (Norway) |
| **Revenue potential** | High (B2C + B2B) | Medium (B2C) | High (B2B HR tools) | Low (extension) | Low (free tool, sponsorship) |
| **Hackathon judge appeal** | High (trendy + novel) | High (social impact) | High (viral + data) | Medium (exists already) | High (real-world impact) |

## Final Ranking for Hackathon

1. **Problem 1: AI Work Intensification Tracker** -- Best timing, zero competition, high virality, strong narrative
2. **Problem 5: Immigrant Settlement Navigator** -- Biggest gap, most achievable MVP, strong Norway angle
3. **Problem 3: FOBO Score** -- Best viral potential, but needs to differentiate from existing tools
4. **Problem 2: Family Caregiver Coordination** -- Strongest emotional story, but hardest to build well in 5 days
5. **Problem 4: AI Slop Detector** -- Real problem but competitors exist and accuracy is make-or-break

## Sources

1. [AI Doesn't Reduce Work--It Intensifies It (HBR, Feb 2026)](https://hbr.org/2026/02/ai-doesnt-reduce-work-it-intensifies-it) -- Primary source for AI intensification data
2. [Hacker News discussion thread](https://news.ycombinator.com/item?id=46945755) -- User quotes and reactions
3. [Fortune: AI having opposite effect (Feb 2026)](https://fortune.com/2026/02/10/ai-future-of-work-white-collar-employees-technology-productivity-burnout-research-uc-berkeley/) -- Berkeley study coverage
4. [Tom's Hardware: AI increases burnout](https://www.tomshardware.com/tech-industry/using-ai-actually-increases-burnout-despite-productivity-improvements-study-shows) -- Workload creep details
5. [Caring Village (2025)](https://caringvillage.com/2025/11/07/caregiving-app-family-caregiving-2025/) -- Caregiver app features and pricing
6. [Lotsa Helping Hands](https://lotsahelpinghands.com/) -- Competitor analysis
7. [ianacare](https://ianacare.com/) -- Caregiver platform details
8. [Eurocarers: Norway's Informal Carers](https://eurocarers.org/unveiling-the-hidden-workforce-norways-informal-carers-contribute-e5-5-billion-annually/) -- Norway caregiver statistics (800K carers, EUR 5.5B)
9. [Norway National Carers Strategy](https://eurocarers.org/norway-on-its-way-to-the-first-national-carers-strategy/) -- Policy context
10. [willrobotstakemyjob.com](https://willrobotstakemyjob.com/) -- FOBO competitor analysis
11. [ReplaceMeter](https://replacemeter.com/) -- AI job risk calculator analysis
12. [TripleTen AI Job Risk Calculator](https://tripleten.com/tools/what-jobs-will-ai-replace/) -- Competitor with reskilling features
13. [Gallup: Workers fear obsolescence](https://news.gallup.com/poll/510551/workers-fear-technology-making-jobs-obsolete.aspx) -- 22% of workers, up from 15%
14. [People Managing People: AI Fears 2026](https://peoplemanagingpeople.com/workforce-management/ai-fears-2026/) -- 64% "job hugging" stat
15. [GPTZero](https://gptzero.me/) -- AI detector market leader analysis
16. [Winston AI vs GPTZero comparison](https://gowinston.ai/winston-ai-vs-gptzero/) -- Accuracy benchmarks
17. [Slop Evader (Fast Company)](https://www.fastcompany.com/91461264/slop-evader-ai-slop-browser-best-idea-of-2025) -- Consumer AI slop tool
18. [Kagi SlopStop](https://blog.kagi.com/slopstop) -- Community-driven AI slop detection
19. [SkipSlop](http://skipslop.com/) -- Browser extension for AI slop
20. [The Local: BankID frustration (June 2025)](https://www.thelocal.no/20250604/without-bankid-you-are-nobody-foreigners-in-norway-lament-bureaucratic-headaches) -- Immigrant quotes
21. [UDI immigration statistics](https://www.udi.no/en/statistics-and-analysis/statistics/) -- Norway arrival numbers
22. [OECD Norway Migration Outlook 2025](https://www.oecd.org/en/publications/2025/11/international-migration-outlook-2025_355ae9fd/full-report/norway_e1a65790.html) -- 36K new immigrants, demographic breakdown
23. [nyinorge.no](https://www.nyinorge.no/en/) -- Government immigrant info portal
24. [Life in Norway immigration guide](https://www.lifeinnorway.net/norway-immigration-guide/) -- Practical advice source
25. [O*NET AI task methodology (Pew)](https://www.pewresearch.org/social-trends/2023/07/26/2023-ai-and-jobs-methodology-for-onet-analysis/) -- Data source for FOBO tool
26. [Job Extinction Index](https://jobs.voxos.ai/) -- O*NET-based automation risk scores
27. [RescueTime Review 2026](https://www.linktly.com/productivity-software/rescuetime-review/) -- Burnout warning features
28. [ActivityWatch](https://activitywatch.net/) -- Open source time tracker
29. [Gallup: AI use at 45%](https://www.gallup.com/workplace/691643/work-nearly-doubled-two-years.aspx) -- Workplace AI adoption stats
30. [AI Slop Detector GitHub](https://github.com/voidcommit-afk/ai-slop-detector) -- OSS image detection tool
