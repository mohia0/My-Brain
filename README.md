# 🧠 Brainia: Your Second Brain, Spatially Organized

Brainia is a powerful, spatial-first "second brain" tool designed for seamless capture, organization, and retrieval of thoughts, links, and media. Unlike traditional list-based note apps, Brainia uses an infinite canvas approach to mimic the way the human brain naturally associates information.

---

## 🚀 Key Features

- **Infinite Canvas**: Navigate your thoughts spatially with seamless zoom and pan.
- **Smart Inbox**: Capture ideas instantly and organize them later.
- **Project Areas**: Group related items into zones and lock them to maintain your structure.
- **Rich Media Support**: Drop links, images, videos, and multi-format text notes.
- **Real-time Sync**: Powered by Supabase, your canvas stays in sync across all devices.
- **Mobile Integration**: Capacitor-powered native apps for capture on the go.
- **Secure Vault**: End-to-end encrypted storage for your most sensitive thoughts.

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 16 (App Router / Turbopack)
- **State**: Zustand (Multi-store spatial architecture)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Animations**: Framer Motion + GSAP
- **Native**: Capacitor (iOS/Android)
- **Editor**: BlockNote (Block-based rich text)

---

## 📦 Getting Started

### Prerequisites

- Node.js (v20+)
- NPM or PNPM
- Supabase account & project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mohia0/My-Brain.git
   cd My-Brain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📂 Documentation

- [BRAINIA_CORE.md](BRAINIA_CORE.md): Deep dive into the four pillars of Brainia.
- [CRITICAL_MOBILE_ARCHITECTURE.md](CRITICAL_MOBILE_ARCHITECTURE.md): Important notes on mobile API and CORS.

---

*Brainia is more than an app; it's a spatial extension of your memory.*
