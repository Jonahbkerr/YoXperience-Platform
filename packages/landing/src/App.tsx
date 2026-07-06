import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { Slot, useConversion } from './lib/yoxperience';
import type { VariantProps } from './lib/yoxperience';

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 465 472" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M151.318 96.3453C187.144 84.7045 225.737 84.7046 261.564 96.3453C297.391 107.986 328.613 130.67 350.755 161.147C372.898 191.623 384.823 228.327 384.823 265.997C384.823 303.668 372.897 340.371 350.755 370.847C328.613 401.323 297.391 424.008 261.564 435.648C225.737 447.289 187.144 447.289 151.318 435.648C115.491 424.008 84.269 401.323 62.1268 370.847C39.9847 340.371 28.0586 303.668 28.0586 265.997C28.0586 228.327 39.9846 191.623 62.1268 161.147C84.269 130.671 115.491 107.986 151.318 96.3453ZM217.271 95.8726C210.232 93.5855 202.65 93.5855 195.611 95.8726C188.572 98.1597 182.437 102.616 178.087 108.604C173.737 114.592 171.394 121.803 171.394 129.205C171.394 136.606 173.737 143.817 178.087 149.804C182.437 155.792 188.572 160.249 195.611 162.536C202.65 164.823 210.232 164.823 217.271 162.536C224.31 160.249 230.444 155.792 234.794 149.804C239.145 143.817 241.487 136.606 241.487 129.205C241.487 121.803 239.145 114.592 234.794 108.604C230.444 102.616 224.31 98.1597 217.271 95.8726Z" fill="#E64FA9"/>
    <path d="M412.794 177.358C390.157 125.102 348.558 82.9717 296.676 59.6436H412.794V177.358Z" fill="#6D29D9"/>
  </svg>
);

const DASHBOARD_URL = '/dashboard/';

const card: React.CSSProperties = {
  padding: 'var(--yc-space-6)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)', border: '1px solid var(--yc-color-border-secondary)'
};
const cardTitle: React.CSSProperties = { fontSize: 'var(--yc-font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' };
const cardBody: React.CSSProperties = { color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' };
const codeChip: React.CSSProperties = { backgroundColor: 'var(--yc-color-bg-layout)', padding: '2px 6px', borderRadius: '4px' };
const codeBlock: React.CSSProperties = {
  backgroundColor: 'var(--yc-color-bg-layout)', padding: '16px', borderRadius: '8px', overflowX: 'auto',
  border: '1px solid var(--yc-color-border-secondary)', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre'
};

/**
 * Hero backdrop: animated brand-gradient blobs, with a video layer that
 * activates automatically when /hero-loop.mp4 exists in the deploy. Until
 * the Higgsfield loop is generated, the blobs ARE the design — the video
 * simply fades in on top when present (onError keeps it hidden).
 */
function HeroBackdrop() {
  const [videoOk, setVideoOk] = React.useState(false);
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0b0512' }}>
      {/* Animated gradient blobs — the design when no video; dimmed under it */}
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
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: videoOk ? 0.62 : 0, transition: 'opacity 1.2s ease',
        }}
      />
      {/* Contrast scrims: (1) darken the CENTER band where the bright HUD core
          and the headline overlap, (2) a soft overall floor. Edges stay clear
          so the glowing side panels remain visible. */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 52% 58% at 50% 47%, rgba(11,5,18,0.86) 0%, rgba(11,5,18,0.58) 42%, rgba(11,5,18,0.22) 72%, rgba(11,5,18,0) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,5,18,0.45) 0%, rgba(11,5,18,0) 30%, rgba(11,5,18,0) 70%, rgba(11,5,18,0.55) 100%)' }} />
    </div>
  );
}

/**
 * Dogfooding: the hero headline is a live YoXperience slot ("landing-hero").
 * Three framings compete; CTA clicks are the engagement signal and
 * dashboard click-through is the conversion. This page tests itself.
 */
const heroH1: React.CSSProperties = { fontSize: 'var(--yc-font-size-5xl)', fontWeight: 'var(--yc-font-weight-bold)', lineHeight: 'var(--yc-line-height-tight)', maxWidth: '840px', margin: '0 0 var(--yc-space-6) 0', color: '#fff' };
const heroSub: React.CSSProperties = { fontSize: 'var(--yc-font-size-xl)', color: 'rgba(255,255,255,0.82)', maxWidth: '680px', margin: '0 0 var(--yc-space-10) 0', lineHeight: 'var(--yc-line-height-relaxed)' };

function HeroControl(_: VariantProps) {
  return (
    <>
      <h1 style={heroH1}>Interfaces that <span style={{ color: '#E64FA9' }}>learn</span> from your users.</h1>
      <p style={heroSub}>
        YoXperience runs controlled experiments on your UI, personalizes each visitor with AI,
        attributes real conversions to every variant — and asks <em>you</em> before anything changes site-wide.
      </p>
    </>
  );
}

function HeroOutcome(_: VariantProps) {
  return (
    <>
      <h1 style={heroH1}>Ship the <span style={{ color: '#E64FA9' }}>winning</span> UI. Not your best guess.</h1>
      <p style={heroSub}>
        Every headline, layout, and CTA competes on real visitor behavior. The AI personalizes per user,
        the evidence accumulates per variant, and nothing changes site-wide until you approve it.
      </p>
    </>
  );
}

function HeroDogfood(_: VariantProps) {
  return (
    <>
      <h1 style={heroH1}>This page is <span style={{ color: '#E64FA9' }}>A/B testing itself</span> right now.</h1>
      <p style={heroSub}>
        The headline you're reading is one of three variants served by YoXperience — the same engine,
        telemetry, and human-approved rollouts you'd put on your own product. You're the experiment.
      </p>
    </>
  );
}

function LandingPage() {
  const trackConversion = useConversion();
  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--yc-space-16) var(--yc-space-8)', textAlign: 'center', minHeight: '72vh'
      }}>
        <HeroBackdrop />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            padding: 'var(--yc-space-2) var(--yc-space-4)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
            borderRadius: 'var(--yc-radius-full)', fontSize: 'var(--yc-font-size-sm)', fontWeight: 'var(--yc-font-weight-semibold)', marginBottom: 'var(--yc-space-8)'
          }}>
            ✨ The Adaptive UI Engine for SaaS
          </div>

          <Slot
            name="landing-hero"
            variants={{
              control: HeroControl,
              outcome: HeroOutcome,
              dogfood: HeroDogfood,
            }}
            fallback={<HeroControl slotKey="landing-hero" variant="control" trackEvent={() => {}} />}
          />

          <div style={{ display: 'flex', gap: 'var(--yc-space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                track('LandingCTA', { action: 'open_dashboard', source: 'hero' });
                trackConversion('dashboard_click');
                window.location.href = DASHBOARD_URL;
              }}
              style={{
                padding: 'var(--yc-space-3) var(--yc-space-8)', backgroundColor: '#E64FA9', color: '#ffffff', border: 'none',
                borderRadius: 'var(--yc-radius-md)', fontSize: 'var(--yc-font-size-lg)', fontWeight: 'var(--yc-font-weight-semibold)', cursor: 'pointer', boxShadow: '0 4px 24px rgba(230,79,169,0.4)'
              }}
            >
              Open the Dashboard
            </button>
            <Link
              to="/docs"
              onClick={() => track('LandingCTA', { action: 'read_docs', source: 'hero' })}
              style={{
                padding: 'var(--yc-space-3) var(--yc-space-8)', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 'var(--yc-radius-md)', fontSize: 'var(--yc-font-size-lg)', fontWeight: 'var(--yc-font-weight-semibold)', cursor: 'pointer', textDecoration: 'none', backdropFilter: 'blur(8px)'
              }}
            >
              Read the Docs
            </Link>
          </div>

          <div style={{ marginTop: 'var(--yc-space-10)', fontSize: 'var(--yc-font-size-sm)', color: 'rgba(255,255,255,0.6)' }}>
            Running in production today — powering 7 adaptive slots on <a href="https://bsmeter.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#E64FA9', textDecoration: 'none' }}>bsmeter.ai</a> · and this hero
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-12)' }}>Everything between an idea and a safe rollout</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--yc-space-8)', maxWidth: '1000px', width: '100%' }}>
          <div style={card}>
            <h3 style={cardTitle}>Drop-in SDK, two flavors</h3>
            <p style={cardBody}>A framework-agnostic <code style={codeChip}>&lt;script&gt;</code> snippet with declarative <code style={codeChip}>data-yx-slot</code> templates, or React components (<code style={codeChip}>&lt;Slot&gt;</code>, <code style={codeChip}>useSlot</code>). Slots self-register with the gateway on first load — no manual setup.</p>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Per-user AI personalization</h3>
            <p style={cardBody}>An always-on worker scores every visitor's behavior (EMA over clicks, hovers, dismissals) and an LLM writes per-user variant recommendations with human-readable rationale — each visitor gets a consistent experience tuned to them.</p>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Recommendations you approve</h3>
            <p style={cardBody}>The engine never flips your site silently. The Recommendations queue shows which variant is winning across all visitors — with sample-size gates so it honestly says “gathering data” instead of guessing — and waits for your click: apply as default, force for everyone, or dismiss.</p>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Conversion attribution</h3>
            <p style={cardBody}>One call — <code style={codeChip}>trackConversion('subscribe')</code> — credits every variant the user was exposed to, deduped per user. Passive UI (score displays, layouts) that never gets clicked finally gets measured by what matters: did people who saw it convert?</p>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Preview any variant, live</h3>
            <p style={cardBody}>Append <code style={codeChip}>?yxp_preview=slot:variant</code> to any page of your site to see any variant rendered for real — telemetry suppressed so previews never pollute your data. The dashboard links every variant, and can render them inline.</p>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Safety controls at every level</h3>
            <p style={cardBody}>Per-slot modes (auto / forced / traffic split), a one-click project freeze that pins every slot to its default, and a global kill switch. Every control is reversible from the dashboard, instantly.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-12)' }}>How it Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-8)', maxWidth: '800px', width: '100%' }}>
          {[
            { n: 1, title: 'Install the SDK', body: <>Add the script snippet or the React provider with your publishable key. Wrap adaptive regions in <code style={codeChip}>&lt;Slot&gt;</code> components (or <code style={codeChip}>data-yx-slot</code> markup) — they register themselves with the gateway automatically.</> },
            { n: 2, title: 'Pick an experiment mode', body: <>Start with an even traffic split to explore fairly, let auto mode personalize per user, or force a variant while you decide. Flip modes any time from the dashboard.</> },
            { n: 3, title: 'Let the evidence accumulate', body: <>Impressions, engagement, and conversions stream in per variant. The AI analyzes each visitor within seconds; the Recommendations queue aggregates the site-wide picture with honest statistical gates.</> },
            { n: 4, title: 'Approve the winner', body: <>When a variant proves itself, the dashboard shows the lift and the evidence. You click once to promote it — then auto mode keeps personalizing on top of your new baseline.</> },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 'var(--yc-space-6)', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--yc-color-primary-bg)', color: 'var(--yc-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 'var(--yc-font-size-lg)' }}>{s.n}</div>
              <div>
                <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>{s.title}</h3>
                <p style={{ color: 'var(--yc-color-text-secondary)', lineHeight: '1.6' }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="use-cases" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', backgroundColor: 'var(--yc-color-bg-layout)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-12)' }}>Built for modern SaaS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--yc-space-8)', maxWidth: '1000px', width: '100%' }}>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Hero &amp; Messaging</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Find the framing that lands</h3>
            <p style={cardBody}>Test five headline framings at once with an even split. The Recommendations queue tells you which one actually converts — with the sample sizes to back it — before you commit.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Pricing Pages</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>CTA copy &amp; plan emphasis</h3>
            <p style={cardBody}>Which plan wears the “Recommended” badge? Does urgency copy beat value copy? Wrap them in slots, wire <code style={codeChip}>trackConversion</code> to checkout, and let real subscribe clicks decide.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Layouts &amp; Density</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Measure the unclickable</h3>
            <p style={cardBody}>Panel on the left or right? Gauge or badge? Passive choices never earn clicks — conversion attribution measures them by whether the people who saw each option stayed and converted.</p>
          </div>
          <div style={{ padding: 'var(--yc-space-8)', backgroundColor: '#fff', borderRadius: 'var(--yc-radius-lg)' }}>
            <div style={{ color: 'var(--yc-color-primary)', fontWeight: 'bold', marginBottom: 'var(--yc-space-2)' }}>Onboarding Flows</div>
            <h3 style={{ fontSize: 'var(--yc-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Adapt to user expertise</h3>
            <p style={cardBody}>Auto mode learns per visitor: strugglers get the guided step-by-step variant, power users get the streamlined one — each consistently, on every return visit.</p>
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: 'var(--yc-space-16) var(--yc-space-8)', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--yc-font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Free while we build</h2>
        <p style={{ color: 'var(--yc-color-text-secondary)', marginBottom: 'var(--yc-space-8)', fontSize: 'var(--yc-font-size-lg)', maxWidth: '560px', textAlign: 'center', lineHeight: '1.6' }}>
          YoXperience is in active development and free to use — full engine, dashboard, and controls.
          Sign up, create a project, and generate an API key in under a minute.
        </p>
        <button
          onClick={() => { track('LandingCTA', { action: 'open_dashboard', source: 'pricing' }); window.location.href = DASHBOARD_URL; }}
          style={{
            padding: 'var(--yc-space-3) var(--yc-space-8)', backgroundColor: 'var(--yc-color-primary)', color: '#fff', border: 'none',
            borderRadius: 'var(--yc-radius-md)', fontSize: 'var(--yc-font-size-lg)', fontWeight: 'var(--yc-font-weight-semibold)', cursor: 'pointer'
          }}
        >
          Create a free account
        </button>
      </section>

      <footer style={{ backgroundColor: '#fff', padding: 'var(--yc-space-12) var(--yc-space-8)', borderTop: '1px solid var(--yc-color-border-secondary)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'var(--yc-space-8)' }}>
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--yc-space-2)', textDecoration: 'none', color: 'inherit', marginBottom: 'var(--yc-space-4)' }}>
              <Logo />
              <span style={{ fontSize: 'var(--yc-font-size-lg)', fontWeight: 'var(--yc-font-weight-bold)' }}>Yoxperience</span>
            </Link>
            <p style={{ color: 'var(--yc-color-text-secondary)', maxWidth: '300px' }}>The adaptive UI engine for modern SaaS applications. Build interfaces that learn — and stay in control.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--yc-space-12)' }}>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-2)' }}>
                <li><a href="/#features" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Features</a></li>
                <li><a href="/#how-it-works" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>How it Works</a></li>
                <li><Link to="/docs" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Documentation</Link></li>
                <li><a href={DASHBOARD_URL} style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Contact</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--yc-space-2)' }}>
                <li><a href="mailto:support@attune-dating.com" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none' }}>support@attune-dating.com</a></li>
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
  const h2: React.CSSProperties = { fontSize: 'var(--yc-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-6)', paddingBottom: 'var(--yc-space-2)', borderBottom: '1px solid var(--yc-color-border-secondary)' };
  const p: React.CSSProperties = { marginBottom: 'var(--yc-space-4)', lineHeight: '1.6' };
  const navLink: React.CSSProperties = { padding: '8px var(--yc-space-8)', color: 'var(--yc-color-text-secondary)', textDecoration: 'none' };
  return (
    <div style={{ display: 'flex', flex: 1, backgroundColor: '#fff' }}>
      <aside style={{ width: '250px', borderRight: '1px solid var(--yc-color-border-secondary)', padding: 'var(--yc-space-8) 0', backgroundColor: 'var(--yc-color-bg-layout)', position: 'sticky', top: 0, height: 'calc(100vh - 73px)' }}>
        <div style={{ padding: '0 var(--yc-space-8)', marginBottom: 'var(--yc-space-4)', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', color: 'var(--yc-color-text-secondary)' }}>Getting Started</div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          <a href="#script-tag" style={{ ...navLink, color: 'var(--yc-color-primary)', fontWeight: 'bold', backgroundColor: 'var(--yc-color-primary-bg)', borderRight: '3px solid var(--yc-color-primary)' }}>Script-tag setup</a>
          <a href="#react" style={navLink}>React integration</a>
          <a href="#conversions" style={navLink}>Conversions</a>
          <a href="#preview" style={navLink}>Preview mode</a>
          <a href="#controls" style={navLink}>Dashboard &amp; controls</a>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 'var(--yc-space-12) var(--yc-space-16)', maxWidth: '900px' }}>
        <h1 style={{ fontSize: 'var(--yc-font-size-4xl)', fontWeight: 'bold', marginBottom: 'var(--yc-space-4)' }}>Documentation</h1>
        <p style={{ fontSize: 'var(--yc-font-size-lg)', color: 'var(--yc-color-text-secondary)', marginBottom: 'var(--yc-space-8)', lineHeight: '1.6' }}>
          Integrate the YoXperience adaptive UI engine in any web app. Create a project and generate a publishable
          key (<code style={codeChip}>yxp_pk_…</code>) in the <a href={DASHBOARD_URL} style={{ color: 'var(--yc-color-primary)' }}>Dashboard</a> first.
        </p>

        <section id="script-tag" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={h2}>Script-tag setup (any framework)</h2>
          <p style={p}>Drop the snippet into your page, then mark up adaptive regions with <code style={codeChip}>data-yx-slot</code> and one <code style={codeChip}>&lt;template&gt;</code> per variant. Slots register themselves with the gateway on first load.</p>
          <pre style={codeBlock}>{`<script src="/yoxperience.js"
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
</div>`}</pre>
          <p style={{ ...p, color: 'var(--yc-color-text-secondary)' }}>The snippet resolves each visitor's variant from the gateway, renders the matching template, and streams impression/interaction telemetry automatically (batched every 2s). Omit <code style={codeChip}>data-user-id</code> to track anonymous visitors.</p>
        </section>

        <section id="react" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={h2}>React integration</h2>
          <p style={p}>Wrap your app in the provider, then declare slots as component maps. The first variant key doubles as the local fallback.</p>
          <pre style={codeBlock}>{`import { YoXperienceProvider, Slot, useSlot } from "./lib/yoxperience";

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
const variant = slot?.variant ?? "default";
// trackEvent("click") on interactions you care about`}</pre>
          <p style={{ ...p, color: 'var(--yc-color-text-secondary)' }}>Variant components receive <code style={codeChip}>{'{ slotKey, variant, trackEvent }'}</code>. Impressions are tracked automatically when a variant resolves.</p>
        </section>

        <section id="conversions" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={h2}>Conversions</h2>
          <p style={p}>Clicks only measure clickable UI. For everything else — layouts, score displays, copy — credit a downstream conversion. One call credits <em>every</em> slot variant this user was exposed to, deduped per user, attributed server-side.</p>
          <pre style={codeBlock}>{`import { useConversion } from "./lib/yoxperience";

function CheckoutButton() {
  const trackConversion = useConversion();
  return (
    <button onClick={() => { trackConversion("subscribe_click"); startCheckout(); }}>
      Subscribe
    </button>
  );
}

// Typical conversion moments: signup, subscribe, install,
// core-action-completed (e.g. "analysis_completed")`}</pre>
        </section>

        <section id="preview" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={h2}>Preview mode</h2>
          <p style={p}>See any variant on your live site without affecting real visitors or data — append the preview parameter:</p>
          <pre style={codeBlock}>{`https://yourapp.com/?yxp_preview=hero-headline:bold
https://yourapp.com/pricing?yxp_preview=pricing-cta:urgency,plan-highlight:basic`}</pre>
          <p style={{ ...p, color: 'var(--yc-color-text-secondary)' }}>Preview mode forces the named variants for your browser only, shows a banner with an exit link, and suppresses all telemetry and conversions. Set your Site URL on the dashboard's Slots page and every variant becomes a one-click preview link.</p>
        </section>

        <section id="controls" style={{ marginBottom: 'var(--yc-space-16)' }}>
          <h2 style={h2}>Dashboard &amp; controls</h2>
          <p style={p}>Everything the engine does is visible and reversible from the <a href={DASHBOARD_URL} style={{ color: 'var(--yc-color-primary)' }}>Dashboard</a>:</p>
          <ul style={{ lineHeight: '1.8', marginBottom: 'var(--yc-space-6)', paddingLeft: 'var(--yc-space-6)' }}>
            <li><strong>Slots</strong> — per-slot mode: <code style={codeChip}>auto</code> (AI personalizes per user), <code style={codeChip}>forced</code> (everyone sees one variant), <code style={codeChip}>split</code> (fixed percentages for fair A/B exploration). Plus a project-wide freeze that pins every slot to its default.</li>
            <li><strong>Analytics</strong> — live event stream, per-slot engagement, and AI Insights: the LLM's per-user recommendations with written rationale.</li>
            <li><strong>Recommendations</strong> — the site-level verdict per slot: winning variant, conversion rates, lift, and confidence — gated by sample-size thresholds so early noise never masquerades as signal. Apply as default, force for everyone, or dismiss. Preview any variant inline before deciding.</li>
          </ul>
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
          <Link to="/docs" style={{ color: 'var(--yc-color-text-secondary)', textDecoration: 'none', fontWeight: 'var(--yc-font-weight-medium)' }}>Docs</Link>
          <a href={DASHBOARD_URL} onClick={() => track('LandingCTA', { action: 'signin', source: 'header' })} style={{
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
