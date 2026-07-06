import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { Slot, useConversion } from './lib/yoxperience';
import type { VariantProps } from './lib/yoxperience';

const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 465 472" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M151.318 96.3453C187.144 84.7045 225.737 84.7046 261.564 96.3453C297.391 107.986 328.613 130.67 350.755 161.147C372.898 191.623 384.823 228.327 384.823 265.997C384.823 303.668 372.897 340.371 350.755 370.847C328.613 401.323 297.391 424.008 261.564 435.648C225.737 447.289 187.144 447.289 151.318 435.648C115.491 424.008 84.269 401.323 62.1268 370.847C39.9847 340.371 28.0586 303.668 28.0586 265.997C28.0586 228.327 39.9846 191.623 62.1268 161.147C84.269 130.671 115.491 107.986 151.318 96.3453ZM217.271 95.8726C210.232 93.5855 202.65 93.5855 195.611 95.8726C188.572 98.1597 182.437 102.616 178.087 108.604C173.737 114.592 171.394 121.803 171.394 129.205C171.394 136.606 173.737 143.817 178.087 149.804C182.437 155.792 188.572 160.249 195.611 162.536C202.65 164.823 210.232 164.823 217.271 162.536C224.31 160.249 230.444 155.792 234.794 149.804C239.145 143.817 241.487 136.606 241.487 129.205C241.487 121.803 239.145 114.592 234.794 108.604C230.444 102.616 224.31 98.1597 217.271 95.8726Z" fill="#E64FA9"/>
    <path d="M412.794 177.358C390.157 125.102 348.558 82.9717 296.676 59.6436H412.794V177.358Z" fill="#6D29D9"/>
  </svg>
);

const DASHBOARD_URL = '/dashboard/';

// ── Hero backdrop: cinematic Higgsfield loop over animated gradient blobs ──
function HeroBackdrop() {
  const [videoOk, setVideoOk] = React.useState(false);
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0b0512' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: videoOk ? 0.35 : 1, transition: 'opacity 1.2s ease' }}>
        <div className="yx-hero-blob a" />
        <div className="yx-hero-blob b" />
        <div className="yx-hero-blob c" />
      </div>
      <video
        className="yx-hero-video"
        src="/hero-loop.mp4"
        autoPlay muted loop playsInline
        onCanPlay={() => setVideoOk(true)}
        onError={() => setVideoOk(false)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: videoOk ? 0.62 : 0, transition: 'opacity 1.2s ease' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 52% 58% at 50% 47%, rgba(11,5,18,0.86) 0%, rgba(11,5,18,0.58) 42%, rgba(11,5,18,0.22) 72%, rgba(11,5,18,0) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,5,18,0.45) 0%, rgba(11,5,18,0) 30%, rgba(11,5,18,0) 68%, #0b0512 100%)' }} />
    </div>
  );
}

// ── Hero headline: live YoXperience slot (3 framings) ──
const heroH1: React.CSSProperties = { fontSize: 'clamp(38px, 6vw, 68px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: 880, margin: '0 0 22px', color: '#fff' };
const heroSub: React.CSSProperties = { fontSize: 'clamp(17px, 2vw, 21px)', color: 'rgba(255,255,255,0.78)', maxWidth: 660, margin: '0 0 38px', lineHeight: 1.6 };

const HeroControl = (_: VariantProps) => (
  <>
    <h1 style={heroH1}>Interfaces that <span className="yx-grad">learn</span> from your users.</h1>
    <p style={heroSub}>YoXperience runs controlled experiments on your UI, personalizes each visitor with AI, attributes real conversions to every variant — and asks <em>you</em> before anything changes site-wide.</p>
  </>
);
const HeroOutcome = (_: VariantProps) => (
  <>
    <h1 style={heroH1}>Ship the <span className="yx-grad">winning</span> UI. Not your best guess.</h1>
    <p style={heroSub}>Every headline, layout, and CTA competes on real visitor behavior. The AI personalizes per user, the evidence accumulates per variant, and nothing changes site-wide until you approve it.</p>
  </>
);
const HeroDogfood = (_: VariantProps) => (
  <>
    <h1 style={heroH1}>This page is <span className="yx-grad">A/B testing itself</span> right now.</h1>
    <p style={heroSub}>The headline you're reading is one of three variants served by YoXperience — the same engine, telemetry, and human-approved rollouts you'd put on your own product. You're the experiment.</p>
  </>
);

// ── content data ──
const FEATURES = [
  { icon: '⌘', title: 'Drop-in SDK, two flavors', body: <>A framework-agnostic <code className="yx-code">&lt;script&gt;</code> snippet with declarative <code className="yx-code">data-yx-slot</code> templates, or React components (<code className="yx-code">&lt;Slot&gt;</code>, <code className="yx-code">useSlot</code>). Slots self-register with the gateway on first load — no manual setup.</> },
  { icon: '◐', title: 'Per-user AI personalization', body: <>An always-on worker scores every visitor's behavior and an LLM writes per-user variant recommendations with human-readable rationale — each visitor gets a consistent experience tuned to them.</> },
  { icon: '✓', title: 'Recommendations you approve', body: <>The engine never flips your site silently. The queue shows which variant is winning across all visitors — with sample-size gates so it honestly says “gathering data” instead of guessing — and waits for your click.</> },
  { icon: '⤳', title: 'Conversion attribution', body: <>One call — <code className="yx-code">trackConversion('subscribe')</code> — credits every variant the user was exposed to, deduped per user. Passive UI that never gets clicked finally gets measured by what matters: did people who saw it convert?</> },
  { icon: '◉', title: 'Preview any variant, live', body: <>Append <code className="yx-code">?yxp_preview=slot:variant</code> to any page to see any variant rendered for real — telemetry suppressed so previews never pollute your data. The dashboard links every variant and renders them inline.</> },
  { icon: '⚙', title: 'Safety controls at every level', body: <>Per-slot modes (auto / forced / traffic split), a one-click project freeze that pins every slot to its default, and a global kill switch. Every control is reversible from the dashboard, instantly.</> },
];

const STEPS = [
  { n: 1, title: 'Install the SDK', body: <>Add the script snippet or the React provider with your publishable key. Wrap adaptive regions in <code className="yx-code">&lt;Slot&gt;</code> components (or <code className="yx-code">data-yx-slot</code> markup) — they register themselves with the gateway automatically.</> },
  { n: 2, title: 'Pick an experiment mode', body: <>Start with an even traffic split to explore fairly, let auto mode personalize per user, or force a variant while you decide. Flip modes any time from the dashboard.</> },
  { n: 3, title: 'Let the evidence accumulate', body: <>Impressions, engagement, and conversions stream in per variant. The AI analyzes each visitor within seconds; the Recommendations queue aggregates the site-wide picture with honest statistical gates.</> },
  { n: 4, title: 'Approve the winner', body: <>When a variant proves itself, the dashboard shows the lift and the evidence. You click once to promote it — then auto mode keeps personalizing on top of your new baseline.</> },
];

const USE_CASES = [
  { tag: 'Hero & Messaging', title: 'Find the framing that lands', body: 'Test five headline framings at once with an even split. The Recommendations queue tells you which one actually converts — with the sample sizes to back it — before you commit.' },
  { tag: 'Pricing Pages', title: 'CTA copy & plan emphasis', body: <>Which plan wears the “Recommended” badge? Does urgency copy beat value copy? Wrap them in slots, wire <code className="yx-code">trackConversion</code> to checkout, and let real subscribe clicks decide.</> },
  { tag: 'Layouts & Density', title: 'Measure the unclickable', body: 'Panel on the left or right? Gauge or badge? Passive choices never earn clicks — conversion attribution measures them by whether the people who saw each option stayed and converted.' },
  { tag: 'Onboarding Flows', title: 'Adapt to user expertise', body: 'Auto mode learns per visitor: strugglers get the guided step-by-step variant, power users get the streamlined one — each consistently, on every return visit.' },
];

function LandingPage() {
  const trackConversion = useConversion();
  return (
    <main style={{ flex: 1 }}>
      {/* HERO */}
      <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '110px 32px 120px', textAlign: 'center', minHeight: '82vh' }}>
        <HeroBackdrop />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', borderRadius: 999, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', marginBottom: 28 }}>
            ✨ The Adaptive UI Engine for SaaS
          </div>
          <Slot name="landing-hero" variants={{ control: HeroControl, outcome: HeroOutcome, dogfood: HeroDogfood }} fallback={<HeroControl slotKey="landing-hero" variant="control" trackEvent={() => {}} />} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="yx-btn yx-btn-primary" onClick={() => { track('LandingCTA', { action: 'open_dashboard', source: 'hero' }); trackConversion('dashboard_click'); window.location.href = DASHBOARD_URL; }}>
              Open the Dashboard
            </button>
            <Link className="yx-btn yx-btn-ghost" to="/docs" onClick={() => track('LandingCTA', { action: 'read_docs', source: 'hero' })}>Read the Docs</Link>
          </div>
          <div style={{ marginTop: 38, fontSize: 14, color: 'rgba(255,255,255,0.58)' }}>
            Running in production today — powering 7 adaptive slots on <a href="https://bsmeter.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#E64FA9', textDecoration: 'none' }}>bsmeter.ai</a> · and this hero
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="yx-section yx-glow-tl">
        <div className="yx-section-inner" style={{ textAlign: 'center' }}>
          <div className="yx-eyebrow">The platform</div>
          <h2 className="yx-h2">Everything between an idea<br />and a safe rollout</h2>
          <p className="yx-lede" style={{ margin: '0 auto 56px' }}>A full adaptive-UI stack — SDK, per-user AI, conversion attribution, and a human-in-the-loop approval layer — not just another A/B tool.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22, textAlign: 'left' }}>
            {FEATURES.map((f) => (
              <div className="yx-card" key={f.title}>
                <div className="yx-card-ico" style={{ fontSize: 20, color: '#fff' }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="yx-divider" style={{ maxWidth: 1120, margin: '0 auto' }} />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="yx-section yx-glow-br">
        <div className="yx-section-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="yx-eyebrow">How it works</div>
            <h2 className="yx-h2">From install to a proven winner</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, margin: '48px auto 0' }}>
            {STEPS.map((s) => (
              <div key={s.n} className="yx-card" style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                <div className="yx-step-n">{s.n}</div>
                <div>
                  <h3 style={{ marginBottom: 6 }}>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="yx-divider" style={{ maxWidth: 1120, margin: '0 auto' }} />

      {/* USE CASES */}
      <section id="use-cases" className="yx-section yx-glow-tl">
        <div className="yx-section-inner" style={{ textAlign: 'center' }}>
          <div className="yx-eyebrow">Built for modern SaaS</div>
          <h2 className="yx-h2">Where teams put it to work</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 22, textAlign: 'left', marginTop: 52 }}>
            {USE_CASES.map((u) => (
              <div className="yx-card" key={u.title} style={{ padding: '30px 30px 32px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E64FA9', marginBottom: 10 }}>{u.tag}</div>
                <h3 style={{ fontSize: 22 }}>{u.title}</h3>
                <p style={{ fontSize: 15.5 }}>{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="yx-section" style={{ paddingBottom: 140 }}>
        <div className="yx-section-inner" style={{ textAlign: 'center', maxWidth: 720 }}>
          <div className="yx-card" style={{ padding: '56px 40px', background: 'linear-gradient(160deg, rgba(109,41,217,0.18), rgba(230,79,169,0.10))', borderColor: 'rgba(180,140,255,0.25)' }}>
            <div className="yx-eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
            <h2 className="yx-h2">Free while we build</h2>
            <p className="yx-lede" style={{ margin: '0 auto 32px' }}>YoXperience is in active development and free to use — full engine, dashboard, and controls. Sign up, create a project, and generate an API key in under a minute.</p>
            <button className="yx-btn yx-btn-primary" style={{ padding: '15px 34px', fontSize: 17 }} onClick={() => { track('LandingCTA', { action: 'open_dashboard', source: 'pricing' }); window.location.href = DASHBOARD_URL; }}>
              Create a free account
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Footer() {
  const linkStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 };
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '56px 32px', background: '#0a0410' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40 }}>
        <div>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff', marginBottom: 16 }}>
            <Logo /><span style={{ fontSize: 19, fontWeight: 800 }}>Yoxperience</span>
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 320, lineHeight: 1.6, fontSize: 14 }}>The adaptive UI engine for modern SaaS. Build interfaces that learn — and stay in control.</p>
        </div>
        <div style={{ display: 'flex', gap: 56 }}>
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: '#fff' }}>Product</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><a href="/#features" style={linkStyle}>Features</a></li>
              <li><a href="/#how-it-works" style={linkStyle}>How it Works</a></li>
              <li><Link to="/docs" style={linkStyle}>Documentation</Link></li>
              <li><a href={DASHBOARD_URL} style={linkStyle}>Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: '#fff' }}>Contact</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><a href="mailto:support@attune-dating.com" style={linkStyle}>support@attune-dating.com</a></li>
              <li><a href="https://bsmeter.ai" target="_blank" rel="noopener noreferrer" style={linkStyle}>Live example ↗</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1120, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
        © {new Date().getFullYear()} Yoxperience. All rights reserved.
      </div>
    </footer>
  );
}

function CodeWin({ children }: { children: React.ReactNode }) {
  return (
    <div className="yx-win">
      <div className="yx-win-bar">
        <span className="yx-win-dot" style={{ background: '#ff5f57' }} />
        <span className="yx-win-dot" style={{ background: '#febc2e' }} />
        <span className="yx-win-dot" style={{ background: '#28c840' }} />
      </div>
      <div className="yx-win-body">{children}</div>
    </div>
  );
}

function DocumentationPage() {
  return (
    <div className="yx-doc" style={{ display: 'flex', flex: 1, background: '#0b0512' }}>
      <aside style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.08)', padding: '40px 0', position: 'sticky', top: 71, height: 'calc(100vh - 71px)', flexShrink: 0 }}>
        <div style={{ padding: '0 20px', marginBottom: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>Getting Started</div>
        <nav className="yx-doc-nav">
          <a href="#script-tag" className="active">Script-tag setup</a>
          <a href="#react">React integration</a>
          <a href="#conversions">Conversions</a>
          <a href="#preview">Preview mode</a>
          <a href="#controls">Dashboard &amp; controls</a>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '52px clamp(24px, 6vw, 72px)', maxWidth: 900 }}>
        <div className="yx-eyebrow">Documentation</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 16px' }}>Integrate in minutes</h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.66)', marginBottom: 48, lineHeight: 1.6 }}>
          Add the YoXperience adaptive UI engine to any web app. Create a project and generate a publishable
          key (<code className="yx-code">yxp_pk_…</code>) in the <a href={DASHBOARD_URL}>Dashboard</a> first.
        </p>

        <section id="script-tag" style={{ marginBottom: 64 }}>
          <h2>Script-tag setup (any framework)</h2>
          <p>Drop the snippet into your page, then mark up adaptive regions with <code className="yx-code">data-yx-slot</code> and one <code className="yx-code">&lt;template&gt;</code> per variant. Slots register themselves with the gateway on first load.</p>
          <CodeWin>{`<script src="/yoxperience.js"
  data-api-key="yxp_pk_your_key_here"
  data-user-id="user-123"
  data-base-url="https://gateway-one-wheat.vercel.app/v1"></script>

<div data-yx-slot="hero-banner" data-yx-default="default">
  <template data-yx-variant="default">
    <h1>Default hero</h1>
  </template>
  <template data-yx-variant="bold">
    <h1 style="font-size:3rem">Bold hero</h1>
  </template>
  <div class="fallback">Loading…</div>
</div>`}</CodeWin>
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.55)' }}>The snippet resolves each visitor's variant, renders the matching template, and streams impression/interaction telemetry automatically (batched every 2s). Omit <code className="yx-code">data-user-id</code> to track anonymous visitors.</p>
        </section>

        <section id="react" style={{ marginBottom: 64 }}>
          <h2>React integration</h2>
          <p>Wrap your app in the provider, then declare slots as component maps. The first variant key doubles as the local fallback.</p>
          <CodeWin>{`import { YoXperienceProvider, Slot, useSlot } from "./lib/yoxperience";

function App() {
  return (
    <YoXperienceProvider
      apiBaseUrl="https://gateway-one-wheat.vercel.app"
      publishableKey="yxp_pk_your_key_here"
      userId={currentUser?.id ?? anonymousId}
    >
      <YourApplication />
    </YoXperienceProvider>
  );
}

// Component-per-variant:
<Slot
  name="hero-headline"
  variants={{
    default: HeroDefault,
    bold: HeroBold,
    social_proof: HeroSocialProof,
  }}
/>

// Or resolve a variant name and render however you like:
const { slot, trackEvent } = useSlot("pricing-cta", ["default", "urgency", "value"]);
const variant = slot?.variant ?? "default";`}</CodeWin>
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.55)' }}>Variant components receive <code className="yx-code">{'{ slotKey, variant, trackEvent }'}</code>. Impressions are tracked automatically when a variant resolves.</p>
        </section>

        <section id="conversions" style={{ marginBottom: 64 }}>
          <h2>Conversions</h2>
          <p>Clicks only measure clickable UI. For everything else — layouts, score displays, copy — credit a downstream conversion. One call credits <em>every</em> slot variant this user was exposed to, deduped per user, attributed server-side.</p>
          <CodeWin>{`import { useConversion } from "./lib/yoxperience";

function CheckoutButton() {
  const trackConversion = useConversion();
  return (
    <button onClick={() => { trackConversion("subscribe_click"); startCheckout(); }}>
      Subscribe
    </button>
  );
}

// Typical conversion moments: signup, subscribe, install,
// core-action-completed (e.g. "analysis_completed")`}</CodeWin>
        </section>

        <section id="preview" style={{ marginBottom: 64 }}>
          <h2>Preview mode</h2>
          <p>See any variant on your live site without affecting real visitors or data — append the preview parameter:</p>
          <CodeWin>{`https://yourapp.com/?yxp_preview=hero-headline:bold
https://yourapp.com/pricing?yxp_preview=pricing-cta:urgency,plan-highlight:basic`}</CodeWin>
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.55)' }}>Preview mode forces the named variants for your browser only, shows a banner with an exit link, and suppresses all telemetry and conversions. Set your Site URL on the dashboard's Slots page and every variant becomes a one-click preview link.</p>
        </section>

        <section id="controls" style={{ marginBottom: 40 }}>
          <h2>Dashboard &amp; controls</h2>
          <p>Everything the engine does is visible and reversible from the <a href={DASHBOARD_URL}>Dashboard</a>:</p>
          <ul style={{ paddingLeft: 22 }}>
            <li><strong style={{ color: '#fff' }}>Slots</strong> — per-slot mode: <code className="yx-code">auto</code> (AI personalizes per user), <code className="yx-code">forced</code> (everyone sees one variant), <code className="yx-code">split</code> (fixed percentages for fair A/B exploration). Plus a project-wide freeze that pins every slot to its default.</li>
            <li><strong style={{ color: '#fff' }}>Analytics</strong> — live event stream, per-slot engagement, and AI Insights: the LLM's per-user recommendations with written rationale.</li>
            <li><strong style={{ color: '#fff' }}>Recommendations</strong> — the site-level verdict per slot: winning variant, conversion rates, lift, and confidence — gated by sample-size thresholds so early noise never masquerades as signal. Apply as default, force for everyone, or dismiss. Preview any variant inline before deciding.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <div className="yx-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--yc-font-sans)' }}>
      <header className="yx-header">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#fff' }}>
          <Logo /><span style={{ fontSize: 20, fontWeight: 800 }}>Yoxperience</span>
        </Link>
        <nav className="yx-nav" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/#how-it-works">How it Works</a>
          <a href="/#features">Features</a>
          <Link to="/docs">Docs</Link>
          <a className="yx-btn yx-btn-primary" style={{ padding: '9px 18px', fontSize: 14 }} href={DASHBOARD_URL} onClick={() => track('LandingCTA', { action: 'signin', source: 'header' })}>Sign In</a>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
      </Routes>
    </div>
  );
}
