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

  it("renders feature section headings", () => {
    renderApp();
    expect(screen.getAllByText("Drop-in React SDK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI-Powered Engine").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Multi-Tenant Architecture").length).toBeGreaterThan(0);
  });

  it("renders use case sections", () => {
    renderApp();
    expect(screen.getAllByText("Onboarding Flows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("E-Commerce Checkout").length).toBeGreaterThan(0);
  });

  it("renders pricing tiers", () => {
    renderApp();
    expect(screen.getAllByText("Hobby").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Most Popular").length).toBeGreaterThan(0);
  });

  it("renders the documentation page at /docs", () => {
    renderApp("/docs");
    expect(screen.getAllByText("Documentation").length).toBeGreaterThan(0);
  });

  it("renders how it works steps", () => {
    renderApp();
    expect(screen.getAllByText("Install the SDK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Define Variations").length).toBeGreaterThan(0);
  });

  it("renders footer categories", () => {
    renderApp();
    expect(screen.getAllByText("Product").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Company").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Legal").length).toBeGreaterThan(0);
  });
});
