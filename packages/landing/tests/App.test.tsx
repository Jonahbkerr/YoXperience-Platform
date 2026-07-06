import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/App";

// Mock the analytics
vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

describe("Landing Page", () => {
  function renderApp(initialRoute = "/") {
    return render(
      React.createElement(MemoryRouter, { initialEntries: [initialRoute] },
        React.createElement(App)
      )
    );
  }

  it("renders the landing page with headline", () => {
    renderApp();
    // Text appears in heading AND footer — use getAllByText
    const elements = screen.getAllByText(/interfaces that/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the brand name multiple times", () => {
    renderApp();
    expect(screen.getAllByText("Yoxperience").length).toBeGreaterThan(0);
  });

  it("renders feature section headings for the current capabilities", () => {
    renderApp();
    expect(screen.getAllByText("Drop-in SDK, two flavors").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Per-user AI personalization").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recommendations you approve").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Conversion attribution").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Preview any variant, live").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Safety controls at every level").length).toBeGreaterThan(0);
  });

  it("renders use case sections", () => {
    renderApp();
    expect(screen.getAllByText("Onboarding Flows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pricing Pages").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Measure the unclickable").length).toBeGreaterThan(0);
  });

  it("renders honest pricing (no invented tiers)", () => {
    renderApp();
    expect(screen.getAllByText("Free while we build").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Create a free account").length).toBeGreaterThan(0);
    // Invented tiers must stay gone
    expect(screen.queryByText("$29")).toBeNull();
    expect(screen.queryByText("Hobby")).toBeNull();
  });

  it("mentions the production deployment (BSmeter)", () => {
    renderApp();
    expect(screen.getAllByText(/bsmeter\.ai/i).length).toBeGreaterThan(0);
  });

  it("renders the documentation page at /docs with the real API", () => {
    renderApp("/docs");
    expect(screen.getAllByText("Documentation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Script-tag setup (any framework)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("React integration").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Conversions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Preview mode").length).toBeGreaterThan(0);
    // The old, nonexistent API must not be documented
    expect(screen.queryByText(/MorphSlot/)).toBeNull();
    expect(screen.queryByText(/MorphProvider/)).toBeNull();
  });

  it("renders how it works steps", () => {
    renderApp();
    expect(screen.getAllByText("Install the SDK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pick an experiment mode").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approve the winner").length).toBeGreaterThan(0);
  });

  it("renders footer with working sections", () => {
    renderApp();
    expect(screen.getAllByText("Product").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contact").length).toBeGreaterThan(0);
  });

  it("links CTAs to the same-domain dashboard (app subdomain does not exist)", () => {
    renderApp();
    const signIns = screen.getAllByText("Sign In");
    expect(signIns.length).toBeGreaterThan(0);
    for (const el of signIns) {
      expect(el.getAttribute("href")).toBe("/dashboard/");
    }
  });
});
