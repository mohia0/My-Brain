# Brainia Landing Page & SEO Plan

This document outlines the strategy for building a high-performance, SEO-optimized landing page for Brainia ("My Brain").

## 1. Architectural Strategy: Subdomains & Middleware

To support `app.brainia.space` for the app and `brainia.space` for the landing page, while ensuring the Mobile (Capacitor) and Extension continue to work seamlessly, we will use **Next.js Middleware for Subdomain Routing**.

### The Hybrid Approach
*   **The App stays at Root (`/`)**: This is critical for Capacitor and the Extension, which expect the app to be the default entry point (`index.html`).
*   **The Landing Page lives at `/home`**: We build the landing page in a sub-folder.
*   **Middleware does the magic**: It intercepts requests based on the **Hostname**.

### Routing Logic
| Hostname | Path | Middleware Action | Result |
| :--- | :--- | :--- | :--- |
| `brainia.space` | `/` | **Rewrite** to `/home` | User sees **Landing Page** (URL stays `/`) |
| `app.brainia.space` | `/` | **Pass-through** | User sees **App** |
| `localhost` / Capacitor | `/` | **Pass-through** | User sees **App** |

---

## 2. Directory Structure Updates

```text
/app
  layout.tsx          <- Root Layout (Providers, Fonts)
  page.tsx            <- THE APP (Canvas). Keep here for Capacitor/Extension.
  middleware.ts       <- NEW: Handles the subdomain routing.
  /home               <- NEW: Marketing Landing Page
    layout.tsx        <- Marketing-specific layout (Navbar, Footer, overflow:auto)
    page.tsx          <- The Landing Page content
```

### Why this is better than moving the App?
1.  **Zero Refactor for Mobile**: Capacitor builds the "Root" directory. If we moved the app to `/app`, we'd have to reconfigure Capacitor completely.
2.  **Extension Safe**: The extension likely points to the root URL.
3.  **Clean Separation**: We simple "mask" the app with the landing page only for the main domain.

---

## 3. Implementation Steps

### Step 1: Create Marketing Page
1.  Create `app/home/page.tsx` (Landing Page).
2.  Create `app/home/layout.tsx` (Marketing Layout - Scoped CSS, Navbar, Footer).

### Step 2: The Middleware (`middleware.ts`)
We will add a root middleware file:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Define our domains
  const appDomain = "app.brainia.space";
  const mainDomain = "brainia.space";
  const isDev = process.env.NODE_ENV === "development";

  // 1. App Subdomain -> Shows the App (Root)
  // No rewrite needed, as the App is already at /.
  if (hostname === appDomain) {
    return NextResponse.next();
  }

  // 2. Main Domain -> Shows Landing Page (/home)
  // We rewrite the root path `/` to `/home` so it looks like the root.
  if (hostname === mainDomain && url.pathname === '/') {
    return NextResponse.rewrite(new URL('/home', req.url));
  }
  
  // 3. Dev/Localhost -> Default to App (easier dev)
  // You can toggle this if you want to work on the landing page locally.
  return NextResponse.next();
}
```

### Step 3: Deployment Configuration
*   **Vercel**: Add `app.brainia.space` as a domain in Vercel project settings.
*   **DNS**: Point both `brainia.space` and `app.brainia.space` to Vercel (CNAME/A record).

---

## 4. Technical Implementation Plan

---

## 2. SEO Strategy & Keywords

**Primary Keywords**:
*   *Second Brain App*
*   *Spatial Knowledge Management*
*   *Infinite Canvas Note Taking*
*   *Visual Organization Tool*

**Meta Tags**:
*   **Title**: Brainia - Your Second Brain, Spatially Organized
*   **Description**: A powerful, spatial-first workspace for organizing thoughts, links, and projects. Replace linear lists with an infinite canvas that mimics how your mind works.

---

## 3. Landing Page Content Structure

The landing page will be built as a **Single Page Scrollable** site with the following sections, derived from `BRAINIA_CORE.md`:

### A. Hero Section (Above the Fold)
*   **Headline**: "Stop Forgetting. Start Connecting." (or "Your Second Brain, Spatially Organized")
*   **Subheadline**: "A spatial workspace that mimics your mind. Capture, organize, and retrieve ideas on an infinite canvas."
*   **CTA**: "Get Started for Free" / "Download Extension"
*   **Visual**: A high-quality screenshot or looping video of the Canvas in action (zooming in on a cluster of nodes).

### B. Core Features (The "Why")
*   **Spatial Engine**: "Think Outside the List."
    *   *Visual*: GIF of dragging/grouping items.
    *   *Copy*: Lists are restrictive. Brainia works like your brain with an infinite 2D workspace.
*   **Capture Engine**: "Save Anything, Instantly."
    *   *Visual*: Browser extension clipping a site + dragging into the canvas.
    *   *Copy*: One-click capture from Chrome/Edge. We handle the metadata so you don't have to.
*   **Organization Engine**: "Powerful Structure."
    *   *Visual*: Nested folders and "stacks" of cards.
    *   *Copy*: Deep hierarchies, drag-and-drop grouping, and smart collision detection.
*   **Sync Engine**: "One Brain, Everywhere."
    *   *Visual*: Phone and Laptop showing the same content.
    *   *Copy*: Real-time sync across desktop and mobile (Android/iOS).

### C. Use Cases
*   **For Researchers**: Collect sources and map connections visually.
*   **For Project Managers**: Organize tasks, docs, and assets in one visual whiteboard.
*   **For Creators**: Moodboards, storyboards, and asset libraries.

### D. Footer
*   Links: Terms, Privacy, Support, Twitter/X.
*   SEO Links: "Best Second Brain App", "Alternatives to Notion".

---

## 4. Technical Implementation Plan

### Step 1: Create Directory Structure
```text
/app
  /(marketing)      <- New Route Group
    layout.tsx      <- Scrollable layout, Navbar, Footer
    page.tsx        <- The Landing Page
  /(app)            <- New Route Group
    layout.tsx      <- Fixed layout (overflow: hidden), current globals
    page.tsx        <- The Canvas App (Moved from current root)
```

### Step 4: Component Development (`/components/Landing`)
We will create modular, aesthetic components:
*   `Navbar.tsx`: Transparent to solid on scroll.
*   `Hero.tsx`: Large typography, background glow effects (Orb).
*   `FeatureGrid.tsx`: Bento-grid style layout for features.
*   `CtaSection.tsx`: Final push to sign up.
*   `Footer.tsx`: Standard footer.

### Step 5: Core SEO Files
*   `sitemap.ts`: Auto-generate sitemap for crawling.
*   `robots.ts`: Direct bots to sitemap and allow crawling of `/`.

### Step 6: Mobile Considerations
*   Since the App remains at `/`, **Capacitor builds are unaffected**. They will continue to load the app correctly.
*   Extension users will point to `app.brainia.space` (or the production URL) which serves the app directly.

## 5. Next Steps

1.  **Approve Plan**: Confirm if moving the app to `/app` is acceptable.
2.  **Execute Move**: Refactor the file structure.
3.  **Build Landing Page**: Codex the components and styles.
4.  **Verify Mobile**: Ensure Capacitor build still loads the app correctly.
