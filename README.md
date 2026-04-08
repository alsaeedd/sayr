# سَيْر — Sayr

**Walk your day with purpose.**

A focused productivity app built on Imam Al-Ghazali's six-step framework for managing time, drawn from *Kitab al-Muraqaba wa'l-Muhasaba* (Book 38, Ihya Ulum al-Din).

---

<p align="center">
  <strong>Musharata → Muraqaba → Muhasaba → Mu'aqaba → Mujahada → Mu'ataba</strong><br/>
  <em>Set conditions → Watch & work → Self-account → Course correct → Strive → Gentle review</em>
</p>

---

## What is Sayr?

Sayr structures each work session as a guided journey through Al-Ghazali's six steps — from setting your intentions before you begin, through focused execution with a live timer, to honest self-accounting and gentle reflection at the end.

### The Six Steps

| # | Arabic | Step | What happens |
|---|--------|------|-------------|
| 1 | المشارطة | **Musharata** | Define tasks, avoidances, boundaries, and time blocks anchored to prayer times |
| 2 | المراقبة | **Muraqaba** | Review your contract, then enter a focused session with a countdown timer and drift tracker |
| 3 | المحاسبة | **Muhasaba** | Check off completed tasks, identify time drains, write a brief reflection |
| 4 | المعاقبة | **Mu'aqaba** | Review your accounting and commit to specific adjustments |
| 5 | المجاهدة | **Mujahada** | Identify the lies your nafs told you and pre-commit strategies against them |
| 6 | المعاتبة | **Mu'ataba** | End-of-day only — recognize patterns, choose one change for tomorrow, close with dhikr |

At step 6, you're asked: *are you done for the day?* If not, you start a fresh session. Mu'ataba only activates when you're truly wrapping up.

## Features

- **Prayer-time anchored scheduling** — Fetches live prayer times for your location (Aladhan API) to anchor your time blocks between salawat
- **Focused timer** — Countdown based on your committed time block with pause/resume and drift counting
- **Dark premium Islamic aesthetic** — Deep blacks, gold accents, Arabic calligraphy, glass morphism, geometric patterns
- **Smooth transitions** — Framer Motion page slides between each step
- **Google SSO** — Simple login via Supabase Auth
- **Session history** — Dashboard tracks active and completed sessions

## Tech Stack

- **Next.js 16** (App Router, Server Components)
- **Supabase** (Auth + PostgreSQL)
- **Tailwind CSS v4**
- **Framer Motion**
- **TypeScript**

## Getting Started

### Prerequisites

- Node.js 20.9+
- A [Supabase](https://supabase.com) project
- Google OAuth credentials ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))

### Setup

```bash
cd app
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
npm install
```

Run `supabase-schema.sql` in your Supabase SQL editor to create the tables and RLS policies.

Enable **Google** under Supabase → Authentication → Providers, and add your Google Client ID and Secret. Set the authorized redirect URI in Google Cloud to:

```
https://<your-project>.supabase.co/auth/v1/callback
```

### Run

```bash
npm run dev
```

---

<p align="center">
  <em>Begin with Bismillah. End with Shukr.</em>
</p>
