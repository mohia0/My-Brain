# 🧠 Brainia: Your Second Brain, Spatially Organized

Brainia is a powerful, spatial-first "second brain" tool designed for seamless capture, organization, and retrieval of thoughts, links, and media. Unlike traditional list-based note apps, Brainia uses an infinite canvas approach to mimic the way the human brain naturally associates information.

---

## 🚀 Core Systems (The Brainia Pillars)

Brainia is built upon four architectural "Cores" that drive the entire experience:

### 1. The Spatial Engine (Canvas Core)
The heart of Brainia is an **infinite 2D workspace**. It replaces linear lists with absolute spatial orientation.
- **Infinite Zoom & Pan**: Navigate through vast mental maps using the `ZoomWheel` and `MiniMap`.
- **Intelligent Collision System**: When items are dropped, the engine automatically finds "safe" spots, preventing visual clutter while maintaining a "beside" preference for related items.
- **Project Areas**: Custom-defined rectangular zones that can group items together. Projects can be **locked** to prevent accidental movement of contents, or moved as a single cohesive unit.

### 2. The Capture Engine (Inbox Core)
Capture should be friction-less. The Capture Engine ensures that information can flow into your brain from anywhere.
- **Browser Extension**: A dedicated plugin to clip links, text snippets, and screenshots directly from any website.
- **Smart Inbox**: A dedicated triage area where captured items wait. Items in the Inbox are decoupled from the canvas until you drag them into place, allowing for organized "triage" sessions.
- **Metadata API**: Automatically fetches titles, rich descriptions, and site icons for any URL you drop in.

### 3. The Organization Engine (Structure Core)
Brainia provides powerful tools to refine and structure your knowledge over time.
- **Nested Folders**: Create infinite hierarchies of folders to group related thoughts. Folders on the canvas provide a visual "container" for deep dives.
- **Rich Item Types**: 
  - **Links**: Rich previews with snapshots.
  - **Text Notes**: Powered by a block-editor for rich formatting.
  - **Images & Videos**: Visual assets rendered directly on the canvas.
- **The Archive**: A dedicated "cold storage" zone. Use the **Archive Zone** on the canvas to quickly stash items away without deleting them.

### 4. The Sync Engine (Realtime Core)
Your brain should be available everywhere, instantly.
- **Supabase Backbone**: Every movement, edit, and capture is synced in real-time across all devices.
- **Optimistic UI**: Interactions (drags, edits) happen instantly on the client, with background synchronization ensuring consistency with the cloud.
- **Mobile Integration**: A Capacitor-powered mobile experience allows you to view your canvas and capture new thoughts on the go, with optimized touch controls.

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 15 (App Router)
- **State Management**: Zustand (Multi-store architecture: `itemsStore`, `canvasStore`)
- **Backend/Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Vanilla CSS Modules (Premium aesthetics with Glassmorphism)
- **Native**: Capacitor (iOS/Android)
- **Editor**: BlockNote (Block-based rich text)

---

## ✨ Key Features At a Glance

| Feature | Description |
| :--- | :--- |
| **Search your Mind** | Global fuzzy search that locates items across projects and folders instantly. |
| **Spatial multi-select** | Drag boxes or use Shift+Click to move groups of items at once. |
| **Focus Mode** | Dim the rest of the canvas to focus on specific selections. |
| **Auto-Layout** | Instantly organize a messy selection into a neat masonry grid. |
| **Glassmorphism UI** | A premium, immersive aesthetic with translucent layers and vibrant accents. |

---

## 🎨 Visual Identity & Aesthetics

Brainia isn't just functional; it's designed to be an immersive, premium experience.

- **The Orb**: A central visual element that provides a dynamic, glowing background. It shifts and reacts as you navigate the canvas, acting as a "north star" for your mental space.
- **Glassmorphism**: The UI uses heavily translucent surfaces with background blurs, creating a sense of depth and focus.
- **Micro-animations**: Smooth transitions, spring-based drags, and fading sequences ensure the interaction feels "alive" and responsive.

---

## 📂 Project Structure

- `/components`: The UI building blocks (Canvas, ItemModal, Toolbar, etc.)
- `/extension`: The Chrome/Edge browser extension source code.
- `/lib/store`: The "Brain" logic (Zustand stores for items and canvas state).
- `/app`: The Next.js application routes and API endpoints.
- `/android`: Capacitor-based native project for mobile.

---

*Brainia is more than an app; it's a spatial extension of your memory.*
