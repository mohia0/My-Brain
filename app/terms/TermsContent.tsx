"use client";

import React from 'react';

export default function TermsContent() {
    return (
        <div className="terms-container">
            <div className="orb-background" />

            <main className="content-wrapper">
                <header className="page-header">
                    <div className="logo-container">
                        <h1>Brainia</h1>
                    </div>
                    <h2>Terms of Service</h2>
                    <p className="last-updated">Last Updated: February 13, 2026</p>
                </header>

                <section className="terms-section">
                    <h3>1. Acceptance of Terms</h3>
                    <p>
                        By accessing or using Brainia (the "Service"), including our website, desktop application,
                        mobile application, and browser extensions, you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, please do not use the Service.
                    </p>
                </section>

                <section className="terms-section">
                    <h3>2. Description of Service</h3>
                    <p>
                        Brainia is a spatial workspace designed for knowledge management,
                        offering an infinite canvas, AI-powered capture tools, and organizational systems.
                        The Service is provided "as is" and is subject to change or updates at any time.
                    </p>
                </section>

                <section className="terms-section">
                    <h3>3. User Accounts</h3>
                    <div className="card">
                        <p>
                            To use certain features, you must create an account. You are responsible for:
                        </p>
                        <ul>
                            <li>Maintaining the confidentiality of your account credentials.</li>
                            <li>All activities that occur under your account.</li>
                            <li>Notifying us immediately of any unauthorized use of your account.</li>
                        </ul>
                    </div>
                </section>

                <section className="terms-section">
                    <h3>4. Content Ownership & License</h3>
                    <div className="card">
                        <h4>Your Content</h4>
                        <p>
                            You retain full ownership of all text, images, links, and other data you input into Brainia ("User Content").
                            We do not claim any ownership rights over your data.
                        </p>
                        <h4>License to Us</h4>
                        <p>
                            By using the Service, you grant Brainia a worldwide, non-exclusive, royalty-free license to host,
                            store, and display your User Content solely for the purpose of providing the service to you
                            (e.g., syncing your data across devices).
                        </p>
                    </div>
                </section>

                <section className="terms-section">
                    <h3>5. Acceptable Use</h3>
                    <p>You agree not to use Brainia to:</p>
                    <ul>
                        <li>Upload content that is illegal, harmful, or violates the rights of others.</li>
                        <li>Attempt to reverse engineer, decompile, or disrupt the Service.</li>
                        <li>Engage in any activity that interferes with other users' enjoyment of the Service.</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h3>6. Payments & Subscriptions</h3>
                    <p>
                        Certain features are available through paid subscriptions or one-time purchases.
                        Payments are processed via <strong>LemonSqueezy</strong> or other third-party processors.
                        All fees are non-refundable unless required by law.
                    </p>
                </section>

                <section className="terms-section">
                    <h3>7. Termination</h3>
                    <p>
                        We reserve the right to suspend or terminate your account if you violate these Terms.
                        You may stop using the Service and delete your account at any time.
                    </p>
                </section>

                <section className="terms-section">
                    <h3>8. Limitation of Liability</h3>
                    <p className="highlight-box">
                        To the maximum extent permitted by law, Brainia Labs shall not be liable for any indirect,
                        incidental, or consequential damages resulting from your use of the Service.
                    </p>
                </section>

                <footer className="page-footer">
                    <p>Questions about our Terms? <a href="mailto:support@brainia.space">support@brainia.space</a></p>
                    <p>&copy; {new Date().getFullYear()} Brainia. All rights reserved.</p>
                </footer>
            </main>

            <style jsx global>{`
        :root {
          --terms-bg: #0a0a0c;
          --terms-text: #ededed;
          --terms-accent: #6e56cf;
          --terms-card-bg: rgba(255, 255, 255, 0.03);
          --terms-border: rgba(255, 255, 255, 0.08);
        }

        html, 
        body {
          overflow: auto !important;
          height: auto !important;
        }

        .terms-container {
          min-height: 100vh;
          background-color: var(--terms-bg);
          color: var(--terms-text);
          font-family: var(--font-sans, system-ui, sans-serif);
          position: relative;
          overflow-x: hidden;
        }

        .orb-background {
            position: fixed;
            top: -20%;
            left: -10%;
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(110,86,207,0.1) 0%, rgba(10,10,12,0) 70%);
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

        .terms-section {
          margin-bottom: 60px;
        }

        h3 {
          font-size: 1.5rem;
          color: var(--terms-accent);
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--terms-border);
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
          color: var(--terms-accent);
          text-decoration: underline;
          text-underline-offset: 4px;
          opacity: 0.9;
        }
        
        a:hover {
          opacity: 1;
        }

        .card {
          background: var(--terms-card-bg);
          border: 1px solid var(--terms-border);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .highlight-box {
          background: rgba(110, 86, 207, 0.1);
          border-left: 3px solid var(--terms-accent);
          padding: 16px;
          border-radius: 4px;
        }

        .page-footer {
          border-top: 1px solid var(--terms-border);
          padding-top: 40px;
          text-align: center;
          color: #666;
          font-size: 0.9rem;
        }
      `}</style>
        </div>
    );
}
