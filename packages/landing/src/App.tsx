import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 465 472" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M151.318 96.3453C187.144 84.7045 225.737 84.7046 261.564 96.3453C297.391 107.986 328.613 130.67 350.755 161.147C372.898 191.623 384.823 228.327 384.823 265.997C384.823 303.668 372.897 340.371 350.755 370.847C328.613 401.323 297.391 424.008 261.564 435.648C225.737 447.289 187.144 447.289 151.318 435.648C115.491 424.008 84.269 401.323 62.1268 370.847C39.9847 340.371 28.0586 303.668 28.0586 265.997C28.0586 228.327 39.9846 191.623 62.1268 161.147C84.269 130.671 115.491 107.986 151.318 96.3453ZM217.271 95.8726C210.232 93.5855 202.65 93.5855 195.611 95.8726C188.572 98.1597 182.437 102.616 178.087 108.604C173.737 114.592 171.394 121.803 171.394 129.205C171.394 136.606 173.737 143.817 178.087 149.804C182.437 155.792 188.572 160.249 195.611 162.536C202.65 164.823 210.232 164.823 217.271 162.536C224.31 160.249 230.444 155.792 234.794 149.804C239.145 143.817 241.487 136.606 241.487 129.205C241.487 121.803 239.145 114.592 234.794 108.604C230.444 102.616 224.31 98.1597 217.271 95.8726Z" fill="#E64FA9"/>
    <path d="M412.794 177.358C390.157 125.102 348.558 82.9717 296.676 59.6436H412.794V177.358Z" fill="#6D29D9"/>
  </svg>
);

const API_BASE = "http://localhost:3456";

function LandingPage() {
  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--yc-space-16) var(--yc-space-8)', textAlign: 'center', backgroundColor: '#fff'
      }}>
        <div style={{
          padding: 'var(--yc-space-2) var(--yc-space-4)', backgroundColor: 'var(--yc-color-primary-bg)', color: 'var(--yc-color-primary)',
          borderRadius: 'var(--yc-radius-full)', fontSize: 'var(--yc-font-size-sm)', fontWeight: 'var(--yc-font-weight-semibold)', marginBottom: 'var(--yc-space-8)'
        }}>
          ✨ The Adaptive UI Engine for SaaS
        </div>
        
        <h1 style={{ fontSize: 'var(--yc-font-size-5xl)', fontWeight: 'var(--yc-font-weight-bold)', lineHeight: 'var(--yc-line-height-tight)', maxWidth: '800px', margin: '0 0 var(--yc-space-6) 0' }}>
          Interfaces that <span style={{ color: 'var(--yc-color-primary)' }}>learn</span> from your users.
        </h1>
        
        <p style={{ fontSize: 'var(--yc-font-size-xl)', color: 'var(--yc-color-text-secondary)', maxWidth: '600px', margin: '0 0 var(--yc-space-10) 0', lineHeight: 'var(--yc-line-height-relaxed)' }}>
          Yoxperience automatically A/B tests and adapts your application's layout in real-time to maximize user engagement using AI-driven telemetry.
        </p>

        <button 
          onClick={() => window.location.href = '/dashboard/'}
          style={{
            padding: 'var(--yc-space-3) var(--yc-space-8)', backgroundColor: 'var(--yc-color-primary)', color: '#ffffff', border: 'none',
            borderRadius: 'var(--yc-radius-md)', fontSize: 'var(--yc-font-size-lg)', fontWeight: 'var(--yc-font-weight-semibold)', cursor: 'pointer', boxShadow: 'var(--yc-shadow-sm)', transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--yc-color-primary-hover)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--yc-color-primary)'}
        >
          Sign In to Dashboard
        </button>
      </section>

      <section id="features" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-12)' }}>Why choose Yoxperience?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--yc-space-8)', maxWidth: '1000px', width: '100%' }}>
          <div style={{ padding: 'var(--yc-space-6)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)', border: '1px solid var(--yc-color-border-secondary)' }}>
            <h3 style={{ fontSize: 'var(--yc-font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Drop-in React SDK</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Wrap your UI components in our &lt;MorphSlot /&gt; and instantly start collecting telemetry. Zero boilerplate required.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-6)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)', border: '1px solid var(--yc-color-border-secondary)' }}>
            <h3 style={{ fontSize: 'var(--yc-font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>AI-Powered Engine</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Our backend uses state-of-the-art LLMs to analyze user friction, predicting which layout style fits each user's unique habits.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-6)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)', border: '1px solid var(--yc-color-border-secondary)' }}>
            <h3 style={{ fontSize: 'var(--yc-font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Multi-Tenant Architecture</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Securely generate API keys per project. Your user data is rigidly isolated, backed by enterprise-grade Postgres.</p>
          </div>
        </div>
      </section>

      <section id="use-cases" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-12)' }}>Built for modern SaaS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--yc-space-8)', maxWidth: '1000px', width: '100%' }}>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Onboarding Flows</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Adapt to user expertise</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Detect when a user is struggling to complete an onboarding tutorial. YoXperience can automatically switch them to a more guided, step-by-step layout with extra tooltips, while power users get the streamlined interface.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>E-Commerce Checkout</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Maximize conversions</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Serve different checkout page variations based on cart abandonment history. Test a multi-page checkout against a single-page accordion to see which reduces friction for specific user segments.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Dashboard Layouts</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Personalize navigation</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Some users prefer top navigation, others need a dense left sidebar. Let YoXperience find the optimal layout based on where they hover and click most frequently, improving daily engagement.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Pricing Pages</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Automated A/B testing</h3>
            <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Say goodbye to static A/B tests. Wrap your pricing tiers in a MorphSlot and let our LLM engine continuously optimize the presentation to drive higher plan adoption rates.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--yc-color-bg-layout)' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-12)' }}>How it Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-8)', maxWidth: '800px', width: '100%' }}>
          <div style={{ display: 'flex', gap: 'var(--yc-space-6)', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--yc-color-primary-bg)', color: 'var(--yc-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 'var(--yc-font-size-lg)' }}>1</div>
            <div>
              <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Install the SDK</h3>
              <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Add the Yoxperience provider to your app and input your API key. Wrap variable UI sections in <code style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '2px 6px', borderRadius: '4px' }}>&lt;MorphSlot&gt;</code> components.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--yc-space-6)', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--yc-color-primary-bg)', color: 'var(--yc-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 'var(--yc-font-size-lg)' }}>2</div>
            <div>
              <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Define Variations</h3>
              <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Provide multiple design variations for each slot. From simple button color changes to entirely different layout structures.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--yc-space-6)', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--yc-color-primary-bg)', color: 'var(--yc-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 'var(--yc-font-size-lg)' }}>3</div>
            <div>
              <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Watch it Adapt</h3>
              <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>Our engine silently collects interaction telemetry (clicks, hovers, scroll depth) and uses an LLM to serve the winning layout for each specific user profile.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Simple, usage-based pricing</h2>
        <p style={{ color: 'var(--yc-color-text-secondary)', marginBottom: 'var(--yc-space-12)', fontSize: 'var(--yc-font-size-lg)' }}>Start for free, scale when you need.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--yc-space-8)', maxWidth: '900px', width: '100%' }}>
          {/* Free Tier */}
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)', border: '1px solid var(--yc-color-border-secondary)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Hobby</h3>
            <div style={{ fontSize: 'var(--yc-font-size-4xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)' }}>$0<span style={{ fontSize: 'var(--yc-font-size-base)', fontWeight: 'normal', color: 'var(--yc-color-text-secondary)' }}>/mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--yc-space-8) 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-3)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Up to 10,000 events/mo</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ 3 active slots</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Basic analytics</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Community support</li>
            </ul>
            <button style={{ width: '100%', padding: 'var(--yc-space-3)', backgroundColor: '#fff', color: '#000', border: '1px solid #000', borderRadius: 'var(--yc-radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>Get Started</button>
          </div>

          {/* Pro Tier */}
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: '#000', color: '#fff', borderRadius: 'var(--yc-radius-lg)', border: '1px solid #000', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '24px', backgroundColor: 'var(--yc-color-primary)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Most Popular</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Pro</h3>
            <div style={{ fontSize: 'var(--yc-font-size-4xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)' }}>$29<span style={{ fontSize: 'var(--yc-font-size-base)', fontWeight: 'normal', color: 'var(--yc-color-text-secondary)' }}>/mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--yc-space-8) 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-3)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Up to 500,000 events/mo</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Unlimited active slots</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Advanced LLM predictions</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✓ Priority support</li>
            </ul>
            <button style={{ width: '100%', padding: 'var(--yc-space-3)', backgroundColor: 'var(--yc-color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--yc-radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>Start Free Trial</button>
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: '#fff', padding: 'var(--yc-space-12) var(--yc-space-8)', borderTop: '1px solid var(--yc-color-border-secondary)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'var(--yc-space-8)' }}>
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--yc-space-2)', textDecoration: 'none', color: 'inherit', marginBottom: 'var(--yc-space-4)' }}>
              <Logo />
              <span style={{ fontSize: 'var(--yc-font-size-lg)', fontWeight: 'var(--yc-font-weight-bold)' }}>Yoxperience</span>
            </Link>
            <p style={{ color: 'var(--yc-color-text-secondary)', maxWidth: '300px' }}>The adaptive UI engine for modern SaaS applications. Build interfaces that learn.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--yc-space-12)' }}>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-2)' }}>
                <li><a href="/#features" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Features</a></li>
                <li><a href="/#pricing" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Pricing</a></li>
                <li><Link to="/docs" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-2)' }}>
                <li><a href="#" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>About</a></li>
                <li><a href="#" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Blog</a></li>
                <li><a href="#" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-2)' }}>
                <li><a href="#" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Privacy Policy</a></li>
                <li><a href="#" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1000px', margin: 'var(--yc-space-12) auto 0', paddingTop: 'var(--yc-space-6)', borderTop: '1px solid var(--yc-color-border-secondary)', textAlign: 'center', color: 'var(--yc-color-text-secondary)', fontSize: 'var(--yc-font-size-sm)' }}>
          © {new Date().getFullYear()} Yoxperience. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

function DocumentationPage() {
  return (
    <div style={{ display: 'flex', flex: 1, backgroundColor: '#fff' }}>
      <aside style={{ width: '250px', borderRight: '1px solid var(--yc-color-border-secondary)', padding: 'var(--yc-space-8) 0', backgroundColor: 'var(--yc-color-bg-layout)', position: 'sticky', top: 0, height: 'calc(100vh - 73px)' }}>
        <div style={{ padding: '0 var(--yc-space-8)', marginBottom: 'var(--yc-space-4)', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', color: 'var(--yc-color-text-secondary)' }}>Getting Started</div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          <a href="#installation" style={{ padding: '8px var(--yc-space-8)', color: 'var(--yc-color-primary)', fontWeight: 'bold', textDecoration: 'none', backgroundColor: 'var(--yc-color-primary-bg)', borderRight: '3px solid var(--yc-color-primary)' }}>Installation</a>
          <a href="#provider" style={{ padding: '8px var(--yc-space-8)', color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>MorphProvider</a>
          <a href="#slots" style={{ padding: '8px var(--yc-space-8)', color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>MorphSlot</a>
          <a href="#telemetry" style={{ padding: '8px var(--yc-space-8)', color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Telemetry Tracking</a>
          <a href="#api-reference" style={{ padding: '8px var(--yc-space-8)', color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>API Reference</a>
          <a href="#advanced" style={{ padding: '8px var(--yc-space-8)', color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Advanced Setup</a>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 'var(--yc-space-12) var(--yc-space-16)', maxWidth: '900px' }}>
        <h1 style={{ fontSize: 'var(--yc-font-size-4xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Documentation</h1>
        <p style={{ fontSize: 'var(--yc-font-size-lg)', color: 'var(--yc-color-text-secondary)', marginBottom: 'var(--yc-space-12)', lineHeight: '1.6' }}>Learn how to integrate the YoXperience adaptive UI engine into your React application to start delivering AI-personalized interfaces.</p>

        <section id="installation" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={{ fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' }}>Installation</h2>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>Install the official React SDK package via npm, yarn, or pnpm.</p>
          <div style={{ backgroundColor: '#000', color: '#fff', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', marginBottom: 'var(--yc-space-4)' }}>
            npm install @yoxperience/sdk
          </div>
        </section>

        <section id="provider" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={{ fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' }}>1. Set up the Provider</h2>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>Wrap your application with the <code style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '2px 6px', borderRadius: '4px' }}>MorphProvider</code>. You will need your project's publishable API key, which you can generate from the <Link to="/dashboard" style={{ color: 'var(--yc-color-primary)' }}>Dashboard</Link>.</p>
          <pre style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--yc-color-border-secondary)', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
            <code style={{ color: '#d73a49' }}>import</code> {'{ MorphProvider }'} <code style={{ color: '#d73a49' }}>from</code> <code style={{ color: '#032f62' }}>'@yoxperience/sdk'</code>;{'\n\n'}
            <code style={{ color: '#d73a49' }}>function</code> <code style={{ color: '#6f42c1' }}>App</code>() {'{\n'}
            {'  '}<code style={{ color: '#d73a49' }}>return</code> {'(\n'}
            {'    <'}<code style={{ color: '#22863a' }}>MorphProvider</code> <code style={{ color: '#6f42c1' }}>publishableKey</code>=<code style={{ color: '#032f62' }}>"pk_live_your_api_key_here"</code>{'>\n'}
            {'      <YourApplication />\n'}
            {'    </'}<code style={{ color: '#22863a' }}>MorphProvider</code>{'>\n'}
            {'  );\n'}
            {'}'}
          </pre>
        </section>

        <section id="slots" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={{ fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' }}>2. Define Variations with MorphSlot</h2>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>Identify a section of your UI that you want to test and adapt. Pass the different React components you want to test to the <code style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '2px 6px', borderRadius: '4px' }}>variations</code> prop.</p>
          <pre style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--yc-color-border-secondary)', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
            <code style={{ color: '#d73a49' }}>import</code> {'{ MorphSlot }'} <code style={{ color: '#d73a49' }}>from</code> <code style={{ color: '#032f62' }}>'@yoxperience/sdk'</code>;{'\n\n'}
            <code style={{ color: '#d73a49' }}>function</code> <code style={{ color: '#6f42c1' }}>LandingPageHero</code>() {'{\n'}
            {'  '}<code style={{ color: '#d73a49' }}>return</code> {'(\n'}
            {'    <'}<code style={{ color: '#22863a' }}>MorphSlot</code>{'\n'}
            {'      '}<code style={{ color: '#6f42c1' }}>slotId</code>=<code style={{ color: '#032f62' }}>"landing_page_hero"</code>{'\n'}
            {'      '}<code style={{ color: '#6f42c1' }}>variations</code>={'{{'}{'\n'}
            {'        A: <OriginalHeroLayout />,\n'}
            {'        B: <AggressiveCallToActionLayout />,\n'}
            {'        C: <SocialProofFocusedLayout />\n'}
            {'      }'}{'}'}{'\n'}
            {'    />\n'}
            {'  );\n'}
            {'}'}
          </pre>
          <p style={{ marginTop: 'var(--yc-space-4)', lineHeight: '1.6', color: 'var(--yc-color-text-secondary)' }}><strong>Note:</strong> The SDK automatically tracks which variation is served to which user session. By default, it will randomly split traffic until the AI engine has enough statistical confidence to begin serving targeted variations based on user telemetry profiles.</p>
        </section>

        <section id="telemetry" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={{ fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' }}>3. Telemetry Tracking</h2>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>YoXperience automatically instruments wrapped variations for standard interactions (click, hover, visibility). If you need to manually push a business metric (like a successful checkout or signup), use the <code style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '2px 6px', borderRadius: '4px' }}>useMorphContext</code> hook.</p>
          <pre style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--yc-color-border-secondary)', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
            <code style={{ color: '#d73a49' }}>import</code> {'{ useMorphContext }'} <code style={{ color: '#d73a49' }}>from</code> <code style={{ color: '#032f62' }}>'@yoxperience/sdk'</code>;{'\n\n'}
            <code style={{ color: '#d73a49' }}>function</code> <code style={{ color: '#6f42c1' }}>SignupForm</code>() {'{\n'}
            {'  '}<code style={{ color: '#d73a49' }}>const</code> {'{ trackEvent } = '}<code style={{ color: '#6f42c1' }}>useMorphContext</code>{'();\n\n'}
            {'  '}<code style={{ color: '#d73a49' }}>const</code> <code style={{ color: '#6f42c1' }}>handleSignup</code> = <code style={{ color: '#d73a49' }}>async</code> {'() => {\n'}
            {'    '}<code style={{ color: '#6a737d' }}>// ... your signup logic ...</code>{'\n'}
            {'    trackEvent('}<code style={{ color: '#032f62' }}>"signup_completed"</code>{', { value: 1 });\n'}
            {'  };\n'}
            {'}'}
          </pre>
        </section>

        <section id="api-reference" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={{ fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' }}>API Reference</h2>
          
          <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}><code>&lt;MorphProvider&gt;</code></h3>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>The root context provider for the SDK. Must wrap any components that use <code>&lt;MorphSlot&gt;</code> or <code>useMorphContext</code>.</p>
          <ul style={{ lineHeight: '1.6', marginBottom: 'var(--yc-space-6)', paddingLeft: 'var(--yc-space-6)' }}>
            <li><code>publishableKey</code> (string, required): Your project's API key.</li>
            <li><code>endpoint</code> (string, optional): Override the default telemetry ingestion URL.</li>
            <li><code>userId</code> (string, optional): A unique identifier for the current user. If omitted, the SDK generates a random anonymous session ID.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}><code>&lt;MorphSlot&gt;</code></h3>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>Defines a region of adaptive UI.</p>
          <ul style={{ lineHeight: '1.6', marginBottom: 'var(--yc-space-6)', paddingLeft: 'var(--yc-space-6)' }}>
            <li><code>slotId</code> (string, required): A unique string identifying this layout region (e.g., "checkout_sidebar").</li>
            <li><code>variations</code> (Record&lt;string, ReactNode&gt;, required): An object mapping variation names to their React components.</li>
            <li><code>fallback</code> (string, optional): The key of the variation to render while waiting for the LLM resolution. Defaults to the first key in <code>variations</code>.</li>
          </ul>
        </section>

        <section id="advanced" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={{ fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' }}>Advanced Configuration</h2>
          <p style={{ marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' }}>You can fine-tune how telemetry is buffered before it hits the backend to save on network requests. By default, events are batched and sent every 5 seconds or when the user navigates away.</p>
          <pre style={{ backgroundColor: 'var(--yc-color-bg-layout)', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--yc-color-border-secondary)', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
            {'<'}<code style={{ color: '#22863a' }}>MorphProvider</code>{'\n'}
            {'  '}<code style={{ color: '#6f42c1' }}>publishableKey</code>=<code style={{ color: '#032f62' }}>"pk_live_your_api_key_here"</code>{'\n'}
            {'  '}<code style={{ color: '#6f42c1' }}>telemetryConfig</code>={'{{\n'}
            {'    batchIntervalMs: 2000, '}<code style={{ color: '#6a737d' }}>// Send events every 2 seconds</code>{'\n'}
            {'    maxBufferSize: 50, '}<code style={{ color: '#6a737d' }}>// Or when 50 events are queued</code>{'\n'}
            {'  }}\n'}
            {'>\n'}
            {'  <YourApplication />\n'}
            {'</'}<code style={{ color: '#22863a' }}>MorphProvider</code>{'>'}
          </pre>
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--yc-font-sans)',
      color: 'var(--yc-color-text)',
      backgroundColor: 'var(--yc-color-bg-layout)',
    }}>
      {/* Global Header */}
      <header style={{
        padding: 'var(--yc-space-4) var(--yc-space-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--yc-color-bg-container)',
        borderBottom: '1px solid var(--yc-color-border-secondary)'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--yc-space-3)', textDecoration: 'none', color: 'inherit' }}>
          <Logo />
          <span style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'var(--yc-font-weight-bold)' }}>
            Yoxperience
          </span>
        </Link>
        <nav style={{ display: 'flex', gap: 'var(--yc-space-5)', alignItems: 'center' }}>
          <a href="/#how-it-works" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none', fontWeight: 'var(--yc-font-weight-medium)' }}>How it Works</a>
          <a href="/#features" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none', fontWeight: 'var(--yc-font-weight-medium)' }}>Features</a>
          <a href="/#pricing" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none', fontWeight: 'var(--yc-font-weight-medium)' }}>Pricing</a>
          <Link to="/docs" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none', fontWeight: 'var(--yc-font-weight-medium)' }}>Docs</Link>
          <a href="/dashboard/" style={{
            backgroundColor: 'var(--yc-color-primary)',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            color: '#fff',
            fontWeight: 'var(--yc-font-weight-semibold)',
            cursor: 'pointer',
            textDecoration: 'none'
          }}>Sign In</a>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
      </Routes>
    </div>
  );
}
