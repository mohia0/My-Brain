"use client";

import React from 'react';

export default function PrivacyContent() {
    return (
        <div className="privacy-container">
            <div className="orb-background" />

            <main className="content-wrapper">
                <header className="page-header">
                    <div className="logo-container">
                        <h1>Brainia</h1>
                    </div>
                    <h2>Privacy Policy</h2>
                    <p className="last-updated">Last Updated: February 13, 2026</p>
                </header>

                <section className="policy-section extension-focus">
                    <h3>Chrome Extension Privacy Policy</h3>
                    <p>
                        This section specifically details how the <strong>Brainia Chrome Extension</strong> collects and handles your data,
                        in compliance with the <a href="https://developer.chrome.com/docs/webstore/program-policies/privacy/" target="_blank" rel="noreferrer">Chrome Web Store User Data Policy</a>.
                    </p>

                    <div className="card">
                        <h4>1. Data Collection & Permissions</h4>
                        <p>The Brainia Extension requires specific permissions to function:</p>
                        <ul>
                            <li><strong>activeTab / tabs:</strong> Used only when you explicitly trigger the extension (e.g., clicking "Save to Brainia") to capture the title and URL of the current page. We do not track your browsing history.</li>
                            <li><strong>contextMenus:</strong> Allows you to right-click and save selected text. We exclusively process the text you specifically select and choose to save.</li>
                            <li><strong>storage:</strong> Used to store your user session tokens locally so you stay logged in.</li>
                        </ul>
                    </div>

                    <div className="card">
                        <h4>2. How We Use Extension Data</h4>
                        <p>
                            Data collected via the extension (selected text, page URLs, page titles) is transmitted directly
                            to our secure database (hosted on Supabase) solely for the purpose of populating your
                            "Second Brain" workspace.
                        </p>
                        <p className="highlight-box">
                            <strong>We do not sell your data.</strong> The information captured via the extension is strictly for your personal use within the application.
                        </p>
                    </div>
                </section>

                <section className="policy-section">
                    <h3>General Privacy Policy (Desktop & Mobile)</h3>
                    <p>
                        This policy applies to the Brainia Desktop Application, Mobile App, and Web Platform.
                    </p>

                    <div className="policy-group">
                        <h4>Information We Collect</h4>
                        <p>
                            <strong>Account Information:</strong> When you sign up, we collect your email address and authentication credentials (managed securely via Supabase Auth).
                        </p>
                        <p>
                            <strong>User Content:</strong> We store the notes, cards, projects, images, and other files you explicitly create or upload to Brainia.
                        </p>
                        <p>
                            <strong>Usage Data:</strong> We may collect anonymous, aggregated telemetry data to understand app performance and features usage (e.g., "how many users use the graph view").
                        </p>
                    </div>

                    <div className="policy-group">
                        <h4>Data Storage & Security</h4>
                        <p>
                            Your data is encrypted in transit (SSL/TLS) and at rest. We utilize industry-standard providers:
                        </p>
                        <ul>
                            <li><strong>Supabase:</strong> For database, authentication, and file storage.</li>
                            <li><strong>LemonSqueezy:</strong> For processing subscription payments. We do not store your credit card details on our servers.</li>
                        </ul>
                    </div>

                    <div className="policy-group">
                        <h4>Data Retention & Deletion</h4>
                        <p>
                            We retain your data for as long as your account is active. You may delete specific items (notes, projects) at any time, which removes them from your workspace.
                        </p>
                        <p>
                            You make request full account deletion by contacting support. Upon deletion, all your personal data and content will be permanently removed from our servers within 30 days.
                        </p>
                    </div>
                </section>

                <footer className="page-footer">
                    <p>Questions? Contact us at <a href="mailto:support@brainia.space">support@brainia.space</a></p>
                    <p>&copy; {new Date().getFullYear()} Brainia. All rights reserved.</p>
                </footer>
            </main>

            <style jsx global>{`
        :root {
          --privacy-bg: #0a0a0c;
          --privacy-text: #ededed;
          --privacy-accent: #6e56cf;
          --privacy-card-bg: rgba(255, 255, 255, 0.03);
          --privacy-border: rgba(255, 255, 255, 0.08);
        }

        .privacy-container {
          min-height: 100vh;
          background-color: var(--privacy-bg);
          color: var(--privacy-text);
          font-family: var(--font-sans, system-ui, sans-serif);
          position: relative;
          overflow-x: hidden;
        }

        .orb-background {
            position: fixed;
            top: -20%;
            right: -10%;
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(110,86,207,0.15) 0%, rgba(10,10,12,0) 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            filter: blur(60px);
        }

        .content-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 1;
        }

        .page-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .logo-container h1 {
          font-family: var(--font-outfit, sans-serif);
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.05em;
          margin: 0;
          background: linear-gradient(135deg, #fff 0%, #aaa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        h2 {
          font-size: 2rem;
          margin-top: 16px;
          font-weight: 600;
        }

        .last-updated {
          color: #888;
          font-size: 0.9rem;
          margin-top: 8px;
        }

        .policy-section {
          margin-bottom: 60px;
        }

        h3 {
          font-size: 1.5rem;
          color: var(--privacy-accent);
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--privacy-border);
        }

        h4 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 16px;
          margin-top: 0;
        }

        p {
          line-height: 1.6;
          color: #ccc;
          margin-bottom: 16px;
        }

        ul {
          padding-left: 20px;
          margin-bottom: 20px;
          color: #ccc;
        }

        li {
          margin-bottom: 10px;
          line-height: 1.5;
        }

        strong {
          color: #fff;
        }

        a {
          color: var(--privacy-accent);
          text-decoration: underline;
          text-underline-offset: 4px;
          opacity: 0.9;
        }
        
        a:hover {
          opacity: 1;
        }

        .card {
          background: var(--privacy-card-bg);
          border: 1px solid var(--privacy-border);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .highlight-box {
          background: rgba(110, 86, 207, 0.1);
          border-left: 3px solid var(--privacy-accent);
          padding: 16px;
          border-radius: 4px;
        }

        .policy-group {
          margin-bottom: 40px;
        }

        .page-footer {
          border-top: 1px solid var(--privacy-border);
          padding-top: 40px;
          text-align: center;
          color: #666;
          font-size: 0.9rem;
        }
      `}</style>
        </div>
    );
}
