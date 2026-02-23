#!/usr/bin/env npx tsx
/**
 * One-time setup script: creates the "bsmeter.ai" project, generates an API key,
 * and creates slot definitions in the YoXperience gateway.
 *
 * Usage:
 *   npx tsx scripts/setup-bsmeter.ts <email> <password>
 *
 * Or, if already logged in, pass a token:
 *   YXP_TOKEN=<accessToken> npx tsx scripts/setup-bsmeter.ts
 */

const API = process.env.YXP_API_URL || "https://app.yoxperience.com";

async function api<T = any>(
  path: string,
  opts: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  return res.json();
}

async function main() {
  let token = process.env.YXP_TOKEN || "";

  // If no token, try logging in with email/password
  if (!token) {
    const email = process.argv[2];
    const password = process.argv[3];
    if (!email || !password) {
      console.error(
        "Usage: npx tsx scripts/setup-bsmeter.ts <email> <password>"
      );
      console.error("   Or: YXP_TOKEN=<token> npx tsx scripts/setup-bsmeter.ts");
      process.exit(1);
    }
    console.log(`Logging in as ${email}...`);
    const auth = await api<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    token = auth.accessToken;
    console.log("Logged in.");
  }

  // 1. Create the project
  console.log('\n1. Creating project "bsmeter.ai"...');
  let project: { id: string; name: string; slug: string };
  try {
    project = await api(
      "/api/projects",
      {
        method: "POST",
        body: JSON.stringify({
          name: "bsmeter.ai",
          coreApiUrl: "",
        }),
      },
      token
    );
    console.log(`   Project created: ${project.id} (slug: ${project.slug})`);
  } catch (err: any) {
    if (err.message.includes("409") || err.message.includes("already")) {
      console.log("   Project may already exist, listing projects...");
      const projects = await api<any[]>("/api/projects", {}, token);
      project = projects.find(
        (p: any) =>
          p.name === "bsmeter.ai" || p.slug === "bsmeter-ai"
      );
      if (!project) {
        console.error("   Could not find existing bsmeter.ai project");
        process.exit(1);
      }
      console.log(`   Found existing project: ${project.id}`);
    } else {
      throw err;
    }
  }

  // 2. Generate a publishable API key
  console.log("\n2. Generating publishable API key...");
  const keyResult = await api<{ id: string; rawKey: string; name: string }>(
    `/api/projects/${project.id}/keys`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "bsmeter-prod",
        type: "publishable",
      }),
    },
    token
  );
  console.log(`   Key name: ${keyResult.name}`);
  console.log(`\n   ╔══════════════════════════════════════════════════════╗`);
  console.log(`   ║  PUBLISHABLE KEY (copy this to Replit Secrets):     ║`);
  console.log(`   ║  ${keyResult.rawKey}`);
  console.log(`   ╚══════════════════════════════════════════════════════╝`);
  console.log(`\n   Set as VITE_YOXPERIENCE_KEY in bsmeter.ai Replit Secrets.`);

  // 3. Create slot definitions
  console.log("\n3. Creating slot definitions...");

  const slots = [
    {
      slotKey: "hero-headline",
      description:
        "A/B test hero headlines on the guest landing page (Home.tsx)",
      variants: ["default", "direct", "social_proof"],
      defaultVariant: "default",
    },
    {
      slotKey: "pricing-cta",
      description:
        "A/B test upgrade CTA button copy on the pricing page (Pricing.tsx)",
      variants: ["default", "urgency", "value"],
      defaultVariant: "default",
    },
  ];

  for (const slot of slots) {
    try {
      await api(
        `/api/projects/${project.id}/slots`,
        {
          method: "POST",
          body: JSON.stringify(slot),
        },
        token
      );
      console.log(
        `   Created slot "${slot.slotKey}" with variants: ${slot.variants.join(", ")}`
      );
    } catch (err: any) {
      if (err.message.includes("409") || err.message.includes("exists")) {
        console.log(`   Slot "${slot.slotKey}" already exists, skipping.`);
      } else {
        console.error(`   Failed to create slot "${slot.slotKey}":`, err.message);
      }
    }
  }

  console.log("\n Done! Summary:");
  console.log(`   Project: ${project.name} (${project.id})`);
  console.log(`   API Key: ${keyResult.rawKey.substring(0, 12)}...`);
  console.log(`   Slots: hero-headline, pricing-cta`);
  console.log(
    `\n   Next: paste the full API key as VITE_YOXPERIENCE_KEY in Replit Secrets,`
  );
  console.log(`   then redeploy bsmeter.ai.`);
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
