# Arrakis - Vault Dashboard — Product Designer Challenge

## TL;DR

- Built a fully functional **Vault Overview Dashboard** for Arrakis in 72 hours, using Next.js, Recharts, shadcn, WalletConnect, and AI-accelerated development.
- **Objective**: Allow protocol founders/CFOs to understand vault performance in 20 seconds.
- **Core strategy**: Minimal surface area, high information density, zero-learning-curve interactions, and progressive disclosure.
- **Liquidity distribution** redesigned from first principles → clean histogram, price-anchored, skew-aware, clarity-first, matching Uniswap mental models but adding Arrakis-specific KPIs.
- **Navigation** supports multi-vault clients, multi-wallet connections, and rapid switching, treating vaults like "accounts".
- **Dashboard** expresses status, risk, allocation, performance, and execution quality in one sweep — no tab-hunting.
- **System** built with a tiny design token footprint; extremely portable, low-dependency, and implementation-ready (implemented already).
- **Cost**: $280 in tools/tokens.
- **Output**: Design + full implementation.

---

## Figma File

**View the design**: [Arrakis Challenge - Figma](https://www.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge?node-id=22-5321&t=Awq8FMuzAuWslMea-1)

<a href="https://www.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge?node-id=22-5321&t=Awq8FMuzAuWslMea-1">
  <img src="https://img.shields.io/badge/Figma-View%20Design-F24E1E?logo=figma&logoColor=white" alt="View Figma Design" />
</a>

<!-- Figma Embed (for supported viewers) -->
<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="800" height="450" src="https://embed.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge?node-id=22-5321&embed-host=share" allowfullscreen></iframe>

---

## Notes

### 1. Debrief

**Goal**: Build a transparency dashboard for protocol clients to monitor Arrakis-managed liquidity vaults.

**Context**: Some clients have 1 vault, others multiple on different chains. The UX must scale from simple to many, keeping cognitive load near zero.

---

### 2. User Persona

Protocol founders, CFOs, quant teams, treasury managers.

**Traits**:
- Busy, data-driven, impatient.
- Need signal, not noise.
- Must evaluate risk, execution quality, and liquidity posture fast.

---

### 3. Problem Framing

**The original challenge**:
- Liquidity data is complex, tick-based, volatile.
- Vault status depends on composition, skew, price impact, fees, and historical activity.
- Users need clarity in 20 seconds, and depth when they want it.

**The design must bridge**:
- high-frequency market complexity ↔ human legibility.

---

### 4. Concept Solution

#### Design North Star

> "One-glance vault intelligence with zero-friction navigation."

**Achieved via**:
- Clean card system
- Chunked information hierarchy
- Metadata before math
- Progressive disclosure
- Integrated tooltips only where needed
- Near-zero-click, zero-scrolling approach (hover → insights)
- Responsiveness could be improved

---

### 5. Design Rationale

#### 5.1 The Liquidity Distribution (The Main Chart)

**The heart of the dashboard.**

**What it does**:
- Shows where liquidity sits relative to current price.
- Highlights range, skew, risk insights, and current position directionality.
- Makes tick-level dynamics readable via histogram + smoothing.

**Why it matters**:

Liquidity posture dictates:
- Fee generation potential
- Risk exposure
- Rebalance needs
- Execution quality
- Position range strategy

This is the single most important signal for vault performance.

**Technical/Design Achievements**:
- Custom data transformation pipeline.
- Range cropping + Gaussian smoothing.
- Bucketizing for Uniswap-like histogram interpretation (but cleaner, and focused on distribution/concentration)
- Current price as thin green vertical anchor → instantly find equilibrium.
- Color spectrum (Efficient / Buffer / Thin) rewritten to reflect meaning, not "warning/critical" semantics.
- Tooltips always show price first, % second → aligned with trader mental model.

---

#### 5.2 Information Decoding Strategy

**Metadata first**:
- DEX
- Fee tier
- Chain
- Pair
- TVL
- APR
- Fees
- Composition

Users can orient instantly without scanning paragraphs.

**Chunking**:

Four primary chunks:
1. **State** (TVL + composition + skew + price if available or computable)
2. **Risk** (range, skew, distribution shape)
3. **Performance** (fees, price impact vs trade size)
4. **Behavior over time** (inventory ratio chart)

Each block answers a distinct question.

**Progressive Disclosure**:
- Tooltips reveal raw values.
- Hover on histogram reveals price + % + band meaning.
- Secondary charts expresses in detail when user engages.

---

#### 5.3 Near-Zero Click Navigation

Users can:
- Switch vaults from the left rail or the breadcrumbs
- Switch wallets for treasury vs protocol view on the user component
- Navigate between multiple vaults (or projects) without losing context and with fluid animations
- Use a simple navbar to jump to other pools instantly

Everything is reachable in one or two clicks max.
Nothing below the fold, 900px wide main container, fully responsive, modular and stackable.

---

#### 5.4 Supporting Charts

**Price Impact**
Shows execution quality across trade sizes.
*Why*: CFOs judge AMM performance on slippage curve shape.

**Fees Over Time**
Shows yield behavior and vault health.

**Inventory Ratio (Historical Composition)**
Shows how vault rebalances over time → reveals strategy adherence.

**TVL & Status**
Instant signal of vault health and rebalance mode.

---

### 6. Technical Execution

- Built in **Next.js** with TypeScript.
- **Recharts** for all visualizations.
- Custom liquidity transformation algorithm for chart clarity.
- **shadcn** for UI consistency.
- **WalletConnect** Multi-wallet integration.
- **Vercel Analytics** for production monitoring.
- **Sonner** for toast notifications with dark mode styling.
- Full implementation, not just design — ready to ship.
- Smooth transitions, hover states, loading states, empty states.
- Interactive token symbols with clipboard integration.
- Direct DEX pool links (Uniswap, PancakeSwap, Aerodrome).

---

### 7. Visual & Interaction Philosophy

**Minimalist B2B**
Every component "fought for its life" — only essential survive.

**Token-Sparse**
Few design tokens → clean, branded, maintainable.

**Fluid Animations**
- Micro-interactions
- Soft easing
- Maintain performance at scale

**Arrakis Branding**
- Warm neutrals + liquidity spectrum + subtle glow. Minimal but distinct.
- Protocols can also visualize their brands through token color.
- Custom empty state illustrations.

---

### 8. Time & Cost

- **Duration**: 72 hours
- **Cost**: $280 in tools + compute
- **Output**: From 0 → full product mock + code implementation
- **Deployment**: Production-ready on Vercel with analytics enabled

---

### 9. If Given One More Week

1. **Anomaly detection** ("What changed?")
2. **Compare mode** between vaults
3. **Liquidity strategy simulation** tools
4. **On-chain events timeline** overlay

---

## Implementation Details

### Key URLs

| Route | Description |
|-------|-------------|
| `/dashboard-preview` | **Main working dashboard** V3 with all features and functioning prototype |
| `/vaults` | Vault list view | V2. Tested data propagation.
| `/vault/[chainId]/[address]` | V1. Individual vault detail page. Tested data transformation. |
| `/` | Original starter template (reference) |

### Component Architecture

```
components/
├── dashboard/
│   ├── data-viz/          # Chart cards (Distribution, Fees, Inventory, PriceImpact)
│   ├── widgets/           # Metadata cards (VaultMetadataCard, MetricCard)
│   └── layouts/           # App shell (AppSidebar, AppTopBar)
├── liquidity/             # Liquidity-specific components
├── ui/                    # shadcn/ui primitives
└── charts/                # Legacy chart components (v1)
```

### Design Tokens

```typescript
const COLORS = {
  surface: '#171312',      // Card backgrounds
  background: '#0B0909',   // Page background
  border: '#221C1B',       // Subtle borders
  wormbone: '#F5EBE5',     // Primary text
  muted: '#8E7571',        // Secondary text
  accent: '#3BE38B',       // Active/current price
  token0: '#2775CA',       // USDC blue
  token1: '#103E36',       // Base token green e.g. VSN
}
```

### API Integration

All six API endpoints fully integrated:
1. ✅ Vault Details
2. ✅ Liquidity Profile
3. ✅ Live Inventory
4. ✅ Vault Balance History
5. ✅ Price Impact
6. ✅ Fees History

### Interactive Features

- **Token Address Copying**: Click token symbols (icons or text) to copy block explorer URLs to clipboard
- **DEX Pool Links**: DEX badges link directly to underlying liquidity pools:
  - Uniswap: `https://app.uniswap.org/explore/pools/{chain}/{poolAddress}`
  - PancakeSwap: `https://pancakeswap.finance/liquidity/pool/bsc/{poolAddress}`
  - Aerodrome: `https://base.blockscout.com/address/{poolAddress}`
- **Conditional UI**: Dropdown chevron only appears when multiple vaults exist
- **Hover States**: Subtle overlay effects using brand colors instead of opacity changes
- **Toast Notifications**: Dark mode toasts with brand styling for user feedback

---

## Evaluation Criteria Alignment

| Criterion | Weight | How Addressed |
|-----------|--------|---------------|
| **Product Thinking** | 30% | Right KPIs chosen (TVL, APR, fees, composition), charts are meaningful, DeFi partners get immediate clarity, B2B workflow reflected |
| **Design & UX** | 40% | Clear hierarchy, readable charts, DeFi-native behaviors, Figma deliverable quality |
| **Technical Execution** | 20% | Clean component structure, functional dashboard, proper API usage, loading/error states |
| **Autonomy & Ownership** | 10% | Filled gaps independently, used AI tools effectively, treated as real feature delivery |

---

## Acknowledgments

Built with the Arrakis Indexer API, following the brand guidelines provided. Design inspiration from the Figma file with adaptations for technical feasibility and UX best practices.

