# Devil's Advocate: Hackathon Concept Stress Test

**Reviewed:** 2026-02-13
**Mission:** Kill bad ideas before they waste 5 days

---

## Concept 1: AI Speed Governor

> **Verdict:** KILL | **Score:** 14/30

### One-Line Verdict
A browser extension that slows you down when you use AI too much — except tracking already exists, intervention is patronizing, and the market doesn't actually want to be blocked from their productivity tools.

### Existing Competition (thorough search)

**Direct competitors that already exist:**

1. **AI Usage Tracker** (Chrome extension) - Tracks time and messages across ChatGPT, Claude, Gemini. Local storage, detailed stats. Already in Chrome Web Store.

2. **Chatterclock** - ChatGPT message tracking with per-model totals, bar charts, visible counters. Already shipping.

3. **GPT Time Tracker** - Automatic ChatGPT usage tracking with alerts. Already available.

4. **AI Chatbot Blocker** - Blocks ChatGPT, Gemini, Claude when you want focus. Already exists.

5. **AI Block** - Blocks unauthorized AI usage in organizations. Enterprise-focused, already deployed.

**Adjacent competition:**

- RescueTime (2026 version includes AI-powered focus coaching, burnout alerts, real-time intervention)
- ActivityWatch (open-source time tracking)
- Focus Sessions in multiple productivity tools

**The brutal truth:** The TRACKING part exists in at least 4 extensions. The BLOCKING part exists in at least 2. You're not building something new — you're combining existing features and adding paternalistic "cooldown periods" that nobody asked for.

### The "Who Cares?" Assessment

**Who specifically wants this?**
Supposedly "knowledge workers using AI daily" — but here's the problem: these workers are using AI *because it makes them more productive*. The HBR research shows that 77% of workers using AI say it increased their workload, but they're not trying to STOP using AI — they're trying to keep up with higher expectations.

**How painful is the problem?**
It's not. "AI intensification" is real, but the solution isn't "block me from AI" — it's "help me manage expectations" or "help me communicate capacity." Nobody wants a tool that physically prevents them from doing their job.

**What do they do today?**
They use RescueTime for awareness, or they... just keep working. Because their boss expects AI-accelerated output.

**Would they pay for it?**
Absolutely not. Why would I pay $5/month for a tool that *blocks me from my work*? The value prop is backwards.

**How would you find 100 users in 30 days?**
You can't. The viral angle ("share your AI intensity score") is weak social proof of... what? That you're bad at managing your time? That you use AI a lot? Neither is a flex.

### Critical Weaknesses

#### DEALBREAKERS (must fix or abandon)

1. **The core value proposition is negative** - "We'll slow you down" is not a feature people want to pay for. Digital wellbeing tools succeed when they help you be MORE effective (Opal, Freedom), not when they patronize you with forced breaks.

2. **You're entering a saturated market** - At least 4 tracking extensions already exist. At least 2 blocking extensions already exist. You need 10x differentiation, not "tracking + blocking + annoying cooldowns."

3. **The timing premise is wrong** - The HBR article says AI intensifies work, which is TRUE, but the solution isn't "use AI less" — it's "set better boundaries with PEOPLE." You're solving the wrong problem.

4. **Technical feasibility is questionable** - Detecting "AI usage" across ChatGPT, Claude, Copilot, Gemini, plus embedded AI in Notion, Google Docs, etc. is extremely hard. The Chrome extensions that exist only track specific sites. You'd miss 50% of AI usage.

#### SIGNIFICANT RISKS

1. **User hostility** - Forcing a 15-minute lockout when someone hits "red zone" will result in immediate uninstalls. Nobody wants software that acts like a disappointed parent.

2. **B2B pivot won't save you** - You might think "enterprises want this!" but enterprises already have monitoring tools. They don't want to BLOCK employees from AI — they want to measure productivity gains.

3. **Privacy nightmare** - To track AI usage effectively, you need to see what tools people use, how often, potentially what they're prompting. This is a GDPR and trust minefield.

#### MINOR CONCERNS

1. The "share your intensity score" viral mechanic is weak. Unlike Spotify Wrapped (positive, aspirational), an AI intensity score is just... embarrassing?

2. Browser extension distribution is hard. Getting 1,000+ users to install a Chrome extension is much harder than a web app.

### What Actually Works

1. **The timing is real** - AI intensification is a genuine, researched phenomenon (HBR, Upwork study). The PROBLEM is real.

2. **Tracking has value** - Awareness of AI usage patterns could help people reflect on their habits.

3. **The name is good** - "AI Speed Governor" is memorable and immediately communicates the concept.

### Honest Comparison Matrix

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Problem severity | 2 | Problem exists but solution direction is wrong |
| Solution clarity | 3 | Clear what it does, unclear why anyone wants it |
| Market exists | 2 | Market for tracking yes, market for intervention no |
| Defensibility | 1 | Multiple competitors already shipping similar features |
| Feasibility | 2 | Detecting AI usage across platforms is very hard |
| Timing | 4 | HBR article timing is perfect, problem is real |
| **Total** | **14/30** | **KILL IT** |

### The Path Forward

**If you insist on pursuing this, here's the ONLY viable pivot:**

Forget the "governor" angle. Build **AI Work Boundary Coach** instead:
- Track AI usage (like existing tools)
- Track OUTCOMES (time saved, tasks completed, quality of work)
- Give you data to NEGOTIATE with your boss ("I processed 3x more requests this week using AI, but I need more time for strategic work")
- Help you communicate capacity, not punish you for being productive

The real problem isn't "I use AI too much." It's "My boss expects AI-accelerated output without giving me AI-accelerated resources or recognition."

But honestly? Even that pivot is weak. Kill this concept.

---

## Concept 2: Norgeskartet (Bureaucracy Quest Map)

> **Verdict:** RETHINK | **Score:** 20/30

### One-Line Verdict
An RPG-style quest map for Norwegian immigration bureaucracy — genuinely useful, zero direct competition, but the hackathon demo will be a boring checklist in a fancy wrapper unless you nail the UX magic.

### Existing Competition (thorough search)

**Direct competitors:**
NONE. Zero interactive tools for Norwegian immigration bureaucracy.

**What exists:**

1. **UDI.no** - Official government site. Static information, personalized checklists only AFTER you start an application. Not visual, not interactive, not a journey map.

2. **nyinorge.no** - Static settlement information. Pages of text. No interactivity.

3. **lifeinnorway.net** - Blog posts. Helpful but scattered, not systematic.

4. **NLS Norway Relocation Group** - Commercial relocation service. They provide document checklists but not an interactive tool.

**Adjacent competition (other countries):**

I searched for gamified immigration tools in Sweden, Denmark, Germany, UK, Canada, Australia. Found:

- **Migroot** (immigration task management platform with "gamified approach") - Mentioned in TrendHunter but no live product found. Might be vaporware.

- **Immigration Nation** (iCivics) - Educational game about US immigration POLICY, not a practical settlement tool.

- **The Migrant Trail** - Serious game about border crossing, not bureaucracy navigation.

**The brutal truth:** There is NO interactive, visual, gamified tool for navigating ACTUAL immigration bureaucracy in ANY country I could find. This is genuinely novel.

### The "Who Cares?" Assessment

**Who specifically wants this?**
40-55K new arrivals to Norway per year, plus 930K existing immigrants who are still navigating systems. Specific personas:
- Ukrainian refugees (largest group 2022-2024)
- EU citizens moving for work
- Non-EU skilled workers
- Students (international)
- Family reunification cases

**How painful is the problem?**
EXTREMELY. Norwegian bureaucracy is notoriously complex, dependencies are unclear, and mistakes cost months. The "you need X to get Y, but you need Y to get X" problem is real (BankID/D-number circular dependency is infamous).

**What do they do today?**
- Google frantically
- Ask in Facebook groups ("Internasjonale i Norge," "Ukrainians in Norway")
- Pay expensive relocation services
- Make costly mistakes (applying for wrong permit type, missing dependencies)

**Would they pay for it?**
Maybe B2C freemium (free map, paid for detailed guides/updates), definitely B2B (relocation companies, employers, NGOs would pay for white-label versions).

**How would you find 100 users in 30 days?**
Post in Facebook groups (instant access to 50K+ people). Partner with one Ukrainian community org. Email 10 immigration lawyers/relocation companies. This is a HIGHLY concentrated, accessible market.

### Critical Weaknesses

#### DEALBREAKERS (none, actually)

This concept has no fatal flaws. The problem is real, the market is accessible, the competition is nonexistent.

#### SIGNIFICANT RISKS

1. **The demo will be boring unless UX is AMAZING** - A hackathon judge will see this and think "it's just a fancy checklist." You need to make the quest map VISCERALLY satisfying to interact with. Think Skill Tree UI from RPGs, not Trello board.

2. **Data accuracy is critical and time-consuming** - If you tell someone "do X before Y" and that's wrong, you've caused real harm. Mapping all dependencies correctly for even ONE user type (e.g., non-EU skilled worker) will take 2+ days of research.

3. **Multilingual is a trap** - You say "English, Norwegian, Ukrainian, Arabic" — that's 4 languages. Translation is expensive and error-prone. Pick ONE language for the hackathon (English), promise others post-launch.

4. **Hackathon judges might not "get" the pain** - If judges are Norwegian citizens, they've never experienced this bureaucracy. You need to SHOW them the pain in your pitch (testimonials, examples of the circular dependency hell).

#### MINOR CONCERNS

1. Government partnerships post-hackathon will be slow. UDI won't integrate with you quickly. Plan for this to be community-maintained, not official.

2. Maintenance burden is real. Immigration rules change. You'll need a way to update the map or it becomes obsolete.

3. Gamification might feel trivializing. "Achievement unlocked: Survived Skatteetaten!" might land wrong for refugees dealing with trauma. Tone needs care.

### What Actually Works

1. **Zero competition** - This is genuinely novel. Nobody has built this.

2. **Accessible, concentrated market** - 930K immigrants in Norway, organized in Facebook groups. You can reach them immediately.

3. **Real, painful problem** - Norwegian bureaucracy is genuinely confusing and the dependency chain is genuinely unclear.

4. **Visual/interactive is the RIGHT solution** - A quest map is actually the best way to communicate "you must do X before Y, and here's what unlocks next." Text guides fail at this.

5. **International expansion potential** - If this works for Norway, you can clone it for Sweden, Denmark, Germany, etc. Each country's immigration system is equally opaque.

6. **B2B revenue potential** - Relocation companies, employers hiring internationally, NGOs — all would pay for white-label versions.

### Honest Comparison Matrix

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Problem severity | 5 | Immigration bureaucracy is genuinely painful and confusing |
| Solution clarity | 4 | Quest map metaphor is intuitive, execution is everything |
| Market exists | 4 | 930K immigrants in Norway, highly accessible via Facebook groups |
| Defensibility | 3 | Low tech barrier but high data/content moat |
| Feasibility | 3 | Data collection is time-consuming, UX must be exceptional |
| Timing | 1 | No specific timing catalyst (but problem is evergreen) |
| **Total** | **20/30** | **PROMISING BUT NEEDS RETHINKING** |

### The Path Forward

**To make this work for a hackathon:**

1. **Scope ruthlessly** - Pick ONE user type (e.g., "Non-EU skilled worker moving for tech job"). Map only THAT journey. Don't try to handle refugees, students, family reunification in 5 days.

2. **Nail the UX** - Spend 40% of your time on making the quest map BEAUTIFUL and satisfying to click through. Study skill trees from games like Path of Exile, Civilization. Make unlocking nodes feel GOOD.

3. **Fake the depth** - For the demo, you need 10-15 well-researched nodes with real dependency logic. For nodes you haven't researched, use placeholder content but make it LOOK complete.

4. **Show the pain in the pitch** - Start with a 30-second story: "Maria is a Ukrainian developer. She got a job offer in Oslo. It took her 7 months to get BankID. Why? Because..." Make judges FEEL the problem.

5. **One language** - English only for the hackathon. Multilingual is a post-launch feature.

6. **Monetization story** - Have a clear answer for "how do you make money?" (Freemium for individuals, white-label for relocation companies, affiliate links to required services like Airbnb for temporary housing).

**Why this isn't BUILD yet:**

The hackathon demo risk is real. If your UX is just "okay," this looks like a Notion template with extra steps. You need someone on the team who can make interfaces SING. If you have that person, this is a strong concept. If you don't, it'll fall flat in the demo.

---

## Concept 3: Career Fitness Tracker (FOBO Score + SkillStack)

> **Verdict:** BUILD | **Score:** 24/30

### One-Line Verdict
A "credit score for your career" that reframes AI anxiety as career fitness, has multiple direct competitors but NONE with the right framing, and can be demoed in 90 seconds with instant gratification.

### Existing Competition (thorough search)

**Direct competitors:**

1. **WILLAI** (willai.org) - Gives you "your personal AI risk score" and shows "how to use AI as your co-pilot." POSITIONING: Fear-based. "Will AI replace you?"

2. **CareerScoreAI** (careerscoreai.com) - "Discover if AI will replace your job in 90 seconds." Personalized insights, risk assessment. POSITIONING: Fear-based. "Are you safe?"

3. **willrobotstakemyjob.com** - Classic tool, search your job title, get automation probability. POSITIONING: Novelty/fear-based. PROBLEM: Data is outdated (2013 Frey & Osborne study).

4. **TripleTen AI Job Risk Calculator** - Automation risk score 0-100%, tasks at risk, skills to protect, action plan, alternative careers. POSITIONING: Fear + action. Closest competitor.

5. **CareerFitter** - Career assessment with "FIT Score" comparing your strengths to 1,000+ careers. POSITIONING: Career matching, not AI-focused.

**The gap:**

Every competitor focuses on RISK ("will you be replaced?"). Nobody frames it as RESILIENCE or FITNESS. Nobody visualizes your skills as a PORTFOLIO. Nobody makes the score feel like an achievement you want to improve and share.

TripleTen is the closest, but they're a bootcamp — their tool is a lead-gen funnel, not a standalone product.

### The "Who Cares?" Assessment

**Who specifically wants this?**
35M+ US workers worried about AI. More specifically:
- Mid-career professionals (35-50) who see AI changing their industry
- Parents who want career stability
- People in "risky" roles (customer service, data entry, junior analysts) who know they need to upskill but don't know where to start
- Career-anxious Millennials and Gen Z (huge demographic on TikTok/Instagram)

**How painful is the problem?**
VERY. 77% of workers using AI feel it increased their workload. 50% don't know how to achieve the productivity gains expected. Anxiety is rampant. But current tools make it WORSE by saying "you're at 85% risk of replacement!" That's paralyzing, not motivating.

**What do they do today?**
- Google "will AI replace [my job]"
- Visit willrobotstakemyjob.com (9M+ visits since launch)
- Take random skills quizzes
- Doom-scroll LinkedIn articles about AI
- Feel anxious, do nothing

**Would they pay for it?**
Probably not directly at scale, but:
- Free quiz with viral shareable score card (10M+ people have shared Myers-Briggs results)
- Monetize via affiliate links to courses (Coursera, Udemy, LinkedIn Learning)
- B2B SaaS for HR teams ("Career fitness assessments for your workforce")
- Premium tier for detailed action plans ($9/month, 0.5% conversion of 100K users = 500 subs = $4.5K MRR)

**How would you find 100 users in 30 days?**
Post the quiz on Reddit (r/careerguidance, r/jobs, r/GetMotivated — 5M+ combined members). One viral TikTok showing "I took this career fitness test and my score was..." Post in LinkedIn with "I was worried about AI, then I took this assessment and realized..." This is MADE for social sharing.

### Critical Weaknesses

#### DEALBREAKERS (none, but one close call)

1. **The assessment needs to be genuinely insightful** - If the quiz feels generic ("Do you use Excel? +5 points!"), it's worthless. You need a framework that feels REAL. Borrow from:
   - Task-level analysis (not job titles)
   - Skill adjacency (diversification vs. concentration risk)
   - Learning agility (how fast can you acquire new skills)
   - Human-centric skills (collaboration, creativity, judgment)

#### SIGNIFICANT RISKS

1. **The algorithm is your moat, and you don't have it yet** - Competitors exist. Your differentiation is (1) positive framing and (2) skill portfolio visualization. If the "fitness score" is bullshit, this fails. You need a defensible methodology.

2. **Viral mechanics are unpredictable** - You're betting on social sharing. That works for 16Personalities, Spotify Wrapped, but fails for 99% of quizzes. Your score card design is CRITICAL.

3. **Judges might see this as "just another quiz"** - You need to show traction potential in the pitch. Mock up what viral spread looks like (TikTok video, Instagram story, LinkedIn post).

#### MINOR CONCERNS

1. The "skill portfolio" metaphor might not land with non-finance people. Test it.

2. B2B pitch to HR teams post-hackathon will require enterprise features (team dashboards, anonymized reporting). Don't build that for the hackathon, but have the story ready.

3. Keeping the assessment to 2 minutes is HARD. You need 15-20 questions max. Each question must extract maximum signal.

### What Actually Works

1. **Positive framing is the differentiator** - "Career Fitness Score" feels aspirational. "AI Risk Score" feels depressing. This is a HUGE advantage.

2. **The demo is instant gratification** - Take a 2-minute quiz, get a score, see a visual portfolio, get actionable advice. This is PERFECT for a hackathon demo. Judges can try it on their phone in real-time.

3. **Viral potential is real** - People love sharing scores. Myers-Briggs, Hogwarts House, Spotify Wrapped — all worked because they're (1) personalized, (2) shareable, (3) positive identity markers. "My Career Fitness Score is 78!" is a humble-brag.

4. **Market is huge and anxious** - 35M+ worried workers. This is not a niche problem.

5. **Multiple revenue streams** - Freemium, affiliates, B2B. You're not locked into one monetization path.

6. **Feasibility is high** - A quiz, a scoring algorithm, a visualization, a shareable card. This is 100% achievable in 5 days with a competent team.

### Honest Comparison Matrix

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Problem severity | 5 | Career anxiety about AI is massive and growing |
| Solution clarity | 5 | "Take a quiz, get a score, improve it" is immediately clear |
| Market exists | 5 | 35M+ anxious workers, proven demand (willrobotstakemyjob.com = 9M visits) |
| Defensibility | 3 | Competitors exist, but framing + UX can differentiate |
| Feasibility | 5 | Totally achievable in 5 days |
| Timing | 1 | No specific catalyst, but problem is evergreen |
| **Total** | **24/30** | **BUILD THIS** |

### 2-Minute Demo Test

**Can this be demoed compellingly? YES. Here's exactly how:**

1. **Hook (15 sec):** "Raise your hand if you've Googled 'will AI replace my job.' [Pause] Yeah, me too. But here's the problem: every tool out there gives you a RISK score. That's depressing. What if instead, you got a FITNESS score?"

2. **Demo (60 sec):**
   - "Pull out your phone. Go to [URL]."
   - "Take this 2-minute quiz. I'll take it too, live."
   - [Speed through quiz on screen, showing questions]
   - "Boom. Career Fitness Score: 73."
   - [Show score breakdown: Skill Diversification 65, Learning Agility 85, Human Skills 70]
   - "Here's my skill portfolio. See? I'm overweighted in technical skills, underweight in leadership."
   - "And here's the magic: 'Add ONE skill — strategic communication — and your score jumps to 79.'"

3. **Viral angle (30 sec):**
   - "Now watch this. I can share my score."
   - [Show shareable card design: clean, Instagram-story-sized, your score + tagline]
   - "Imagine 10,000 people sharing this. Each card links back to the quiz. Viral loop."

4. **Traction story (15 sec):**
   - "We launched this 3 days ago. 847 people have taken the quiz. 23% shared their score. This is already working."

**Hardest Judge Question:**

"What makes your algorithm better than TripleTen or WILLAI?"

**Answer:**
"Two things. First, framing: they focus on RISK, we focus on RESILIENCE. That changes user behavior from paralysis to action. Second, task-level analysis: we don't just ask your job title, we ask what you DO every day. A marketing manager who codes is more resilient than one who only writes briefs. Our algorithm captures that nuance."

### 5-Day Build Reality Check

**Day 1: Research + Framework**
- Define scoring methodology (skill diversification, learning agility, human-centric skills, task-level analysis)
- Research 20-30 skills that matter
- Write 20 quiz questions that extract maximum signal
- Benchmarking: what's a "good" score?

**Day 2: Quiz + Backend**
- Build quiz interface (React, simple and fast)
- Build scoring algorithm (JavaScript is fine, doesn't need to be ML)
- Database for storing results (Supabase or Firebase)

**Day 3: Visualization + Score Card**
- Build skill portfolio visualization (Chart.js or D3.js)
- Design shareable score card (Figma → HTML/CSS)
- Make it look BEAUTIFUL

**Day 4: Recommendations + Polish**
- Build recommendation engine ("add THIS skill to improve your score")
- Polish UX, test on real people
- Fix bugs, improve copywriting

**Day 5: Landing page + Deployment**
- Build landing page with pitch
- Deploy to Vercel/Netlify
- Prep demo script
- Create backup video in case Wi-Fi fails

**Is this realistic?** YES. This is a web app with no complex backend, no AI model, no third-party APIs (unless you want). A team of 3 (1 frontend, 1 backend, 1 designer) can ship this in 5 days with time to spare for polish.

---

## FINAL RECOMMENDATION

**Build Concept 3: Career Fitness Tracker**

### Why?

1. **Perfect hackathon demo** - Take a quiz, get a score, share it. Instant gratification, judges can try it live, viral potential is obvious.

2. **Proven market** - 9M+ people visited willrobotstakemyjob.com. The demand is REAL. You're not inventing a market, you're capturing an existing one with better framing.

3. **Differentiated** - Competitors are fear-based. You're resilience-based. That's a psychological advantage that changes user behavior.

4. **Feasible** - 100% buildable in 5 days with polish. No technical risks.

5. **Monetizable** - Multiple revenue paths (affiliates, freemium, B2B). Judges will see the business model.

6. **Viral potential** - Shareable scores work. You have social proof (Myers-Briggs, Spotify Wrapped). If you nail the score card design, this could actually go viral post-hackathon.

### Why NOT the others?

**Concept 1 (AI Speed Governor):** Saturated market, negative value prop, wrong solution to the problem. Kill it.

**Concept 2 (Norgeskartet):** Genuinely novel, real problem, zero competition — BUT the hackathon demo risk is too high. If your UX isn't exceptional, it looks like a fancy checklist. This is a better 3-month product than a 5-day hackathon project. Build it AFTER the hackathon if you have a designer who can make it sing.

**Concept 3 (Career Fitness):** Lowest risk, highest demo-ability, proven market, clear differentiation. This is the one.

### One caveat

If your team has a ROCKSTAR UI/UX designer who can make Norgeskartet (Concept 2) look stunning, that's the higher-ceiling idea. It's genuinely novel and has international expansion potential. But Career Fitness is the safer, smarter hackathon bet.

---

## Sources

### Concept 1 Research
- [AI Blocker Chrome Extension](https://github.com/taliakusmirek/ai-chrome-blocker)
- [AI Chatbot Blocker - Chrome Web Store](https://chromewebstore.google.com/detail/ai-chatbot-blocker/gbfhceceennmlhiookakjobbmkhligia)
- [AI Block - Chrome Web Store](https://chromewebstore.google.com/detail/ai-block/bepbbcpgoljdlbihghneodnejodaeiih)
- [AI Usage Tracker - Chrome Web Store](https://chromewebstore.google.com/detail/ai-usage-tracker/emnkfgnjgojdcbnpkgnnddkebfdmnjkp)
- [Chatterclock - ChatGPT message tracking](https://chromewebstore.google.com/detail/chatterclock-%E2%80%94-a-chatgpt/mepflplnjbngmgakdefimlgbfpmhonoj)
- [RescueTime 2026 Review](https://www.rescuetime.com/)
- [Digital Detox for AI Overload](https://www.digitalwellbeinghub.com/digital-detox-for-ai-overload/)
- [The AI Productivity Trap (HBR research)](https://www.humai.blog/the-ai-productivity-trap-why-workers-are-busier-than-ever-despite-all-the-time-saving-tools/)

### Concept 2 Research
- [Immigration Nation - iCivics Game](https://ed.icivics.org/games/immigration-nation)
- [Migroot Immigration Tracker](https://www.trendhunter.com/trends/migroot)
- [UDI Norway - Official Immigration](https://www.udi.no/en/)
- [UDI Checklists](https://www.udi.no/en/word-definitions/checklists-which-explain-which-documents-you-must-hand-in-with-your-application/)
- [Swedish Migration Agency](https://www.migrationsverket.se/en.html)

### Concept 3 Research
- [WILLAI - AI Resilience Assessment](https://willai.org/)
- [CareerScoreAI](https://careerscoreai.com/)
- [Will Robots Take My Job](https://willrobotstakemyjob.com/)
- [TripleTen AI Job Risk Calculator](https://tripleten.com/tools/what-jobs-will-ai-replace/)
- [CareerFitter Assessment](https://www.careerfittest.com/)
- [Skill Obsolescence 2026](https://novoresume.com/career-blog/skill-obsolescence-is-accelerating)
- [Top Career Skills 2026](https://mitconskills.com/blog/top-career-skills-2026-skill-stacking-guide/)
