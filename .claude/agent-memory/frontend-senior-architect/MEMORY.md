# Frontend Senior Architect - JOJUWallet Memory

## Project Structure
- Web app source: `apps/web/src/` (NOT `apps/web/app/`)
- Package name: `@joju/web` (use `--filter=@joju/web` or `--filter web` for turbo commands)
- Admin app: `apps/admin/src/`
- Build command: `pnpm --filter web build` / `pnpm --filter admin build`

## Theme System (Dark Premium)
- Base background: `#06060f`
- Gradient palette: purple (#7c3aed) -> blue (#3b82f6) -> cyan (#06b6d4)
- CSS utility classes defined in `globals.css`: `.glass-card`, `.glass-card-strong`, `.gradient-border`, `.gradient-text`, `.btn-gradient`, `.input-dark`, `.balance-gradient`, `.shimmer`, `.bg-premium`, `.bg-auth-mesh`
- TailwindCSS v4 uses `@theme inline {}` for token definitions
- Dark color tokens use rgba for transparency (white/5, white/10 patterns)

## Component Inventory
- `components/Navbar.tsx` - Top nav with notification badge
- `components/BalanceCard.tsx` - Balance display with animated gradient, "상세" toggle for breakdown
- `components/TransactionList.tsx` - Transaction items with status badges, accepts `currentUserId` prop for direction
- `components/QrScanner.tsx` - Camera QR scanner modal

## Key Patterns
- Auth pages use `bg-auth-mesh` animated gradient background
- Main layout uses `bg-premium` with radial gradients
- Cards: glass morphism with backdrop-blur and border-white/10
- Buttons: `.btn-gradient` for primary CTAs
- Inputs: `.input-dark` for form fields
- Modals: bg-black/60 backdrop-blur-sm with glass-card-strong
- Status badges: colored bg/text with transparency (e.g., `bg-green-500/15 text-green-400`)
- All transitions use `transition-all duration-300`
- `getUser()` from `@/lib/auth` returns user object with `id`, `name`, `email`

## Balance API Response
- `GET /wallet/balance` returns: `balances[]`, `pendingBySymbol`, `internalNetBySymbol`
- Effective balance = onchain + internalNet - pending (for internal transfers)
- On-chain available = onchain - pending (for external withdrawals only)
- Internal balance NOT withdrawable externally

## API Field Names
- Internal transfer POST uses `recipient` (NOT `toIdentifier`)
- Transaction items include `fromUserId`, `toUserId`, `fromUser`, `toUser` for direction detection

## Build Notes
- Turbo may show lockfile warning (harmless)
- Build takes ~24s with cache
- Admin dashboard grid: `xl:grid-cols-3` when 6 cards
