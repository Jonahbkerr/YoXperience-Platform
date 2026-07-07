# @yoxperience/react

React SDK for [YoXperience](https://www.yoxperience.com) — adaptive UI slots that
resolve a variant per visitor, track impressions/interactions automatically, and
credit server-attributed conversions.

Create a project and generate a publishable key (`yxp_pk_…`) in the
[dashboard](https://www.yoxperience.com/dashboard) first.

## Install

```bash
npm install @yoxperience/react
```

`react >= 18` is a peer dependency.

## Usage

Wrap your app in the provider:

```tsx
import { YoXperienceProvider } from "@yoxperience/react";

function Root() {
  return (
    <YoXperienceProvider
      apiBaseUrl="https://gateway-one-wheat.vercel.app"
      publishableKey="yxp_pk_your_key_here"
      userId={currentUser?.id ?? anonymousId}
    >
      <App />
    </YoXperienceProvider>
  );
}
```

Declare a slot as a component-per-variant map (the first key is the local fallback):

```tsx
import { Slot } from "@yoxperience/react";

<Slot
  name="hero-headline"
  variants={{ default: HeroDefault, bold: HeroBold, social_proof: HeroSocialProof }}
/>;
```

…or resolve the variant name yourself:

```tsx
import { useSlot } from "@yoxperience/react";

const { slot, trackEvent } = useSlot("pricing-cta", ["default", "urgency", "value"]);
const variant = slot?.variant ?? "default";
```

Credit a conversion (attributed server-side to every slot the visitor was exposed to):

```tsx
import { useConversion } from "@yoxperience/react";

const trackConversion = useConversion();
// on subscribe / signup / install / etc.
trackConversion("subscribe_click");
```

## Exports

`YoXperienceProvider`, `Slot`, `useSlot`, `useConversion`, `useYoXperience`,
`useYoXperienceOptional`, and the types `LayoutConfig`, `SlotConfig`,
`YoXperienceProviderProps`, `SlotProps`, `VariantProps`, `YoXperienceContextValue`.

## No-build / any-framework

Prefer a script tag? Use the framework-agnostic snippet instead:
`<script src="https://www.yoxperience.com/yoxperience.js" data-api-key="…">`.
