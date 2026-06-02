# 🕹️ Neon Claw VR

A feature-rich VR claw machine arcade built with [IWSDK](https://iwsdk.dev) 0.4.1. Grab prizes, unlock skins, compete in tournaments, and build your collection in a neon holodeck environment.

**[▶ Play Now](https://ellyz2426.github.io/neon-claw/)**

## 🎮 Features

### Core Gameplay
- **Physics-based claw grip** — grip strength vs prize weight determines success
- **6 machine types** — Neon Starter, Deluxe Grabber, Premium Vault, Quantum Chamber, Neon Tower, Void Arena
- **20 prize types** across 5 rarity tiers (Common → Legendary)
- **8 game modes** — Classic, Time Attack, Target, Progressive, Daily Challenge, Marathon, Precision, Practice
- **3 difficulty levels** — Easy, Medium, Hard
- **Dual-runtime** — Full VR (Quest/headset) + browser (WASD + mouse)

### Meta-Game Systems
- **Campaign Mode** — 3 seasons (Neon Origins, Crimson Gauntlet, Quantum Ascent) with 12 stages and progressive objectives
- **Tournament Mode** — 3 bracket tiers (Rookie Cup, Pro Circuit, Legend's Gauntlet) with 4-round escalating brackets
- **Custom Challenge Creator** — Design your own challenges with shareable 8-character codes
- **Prize Fusion Lab** — Combine 3 same-rarity prizes into a higher rarity
- **XP & Level Progression** — 50 levels with milestone rewards
- **Prestige System** — 10 tiers with permanent bonus multipliers
- **Ticket Shop** — 8 items across consumables, boosts, and utilities
- **Lucky Wheel** — Gacha spinner with 9 prize segments
- **Claw Frenzy** — Bonus round triggered by good performance (12s rapid-fire)

### Cosmetics & Collection
- **8 claw skins** — Level-unlocked visual customization
- **6 machine skins** — Ticket-purchasable machine cosmetics
- **5 arena themes** — Neon Holodeck, Crimson Arcade, Toxic Neon, Ultra Violet, Solar Blaze
- **Prize Codex** — Lore entries for all 20 prizes with origin stories
- **Prize Showcase Gallery** — Detailed view of discovered prizes

### Progression & Stats
- **102 achievements** spanning gameplay, collection, campaigns, tournaments, custom challenges
- **Per-mode statistics** — Games played, best scores, accuracy per mode
- **Session history** — Last 20 games with full stats
- **Career stats** — Lifetime grabs, scores, tickets, collection progress
- **Daily rewards** — 7-day login streak system
- **5 challenge modifiers** — Turbo Speed, Weak Grip, Double Points, No Power-ups, Mirror Controls

### Audio & Visual Polish
- **Procedural synthwave music** — Bass, pad, arpeggiator, hi-hat layers
- **15+ sound effects** — Claw mechanics, prizes, UI, achievements
- **Claw trail effects** — Theme-colored trail particles
- **Score popups** — Rarity-colored burst effects
- **Prize wobble physics** — Nearby prizes react to grabs
- **Legendary celebration VFX** — Confetti burst with rainbow particles
- **Screen shake** — Intensity scaled by rarity
- **Instant Replay** — Auto-plays after legendary grabs

### VR/XR Features
- **XR controller input** — Right thumbstick to move, trigger to drop, B to pause
- **PanelUI spatial interface** — All 41 UI templates use IWSDK's native spatial UI system
- **Follower HUDs** — Head-locked panels for score, power-ups, power bar
- **Zero HTML DOM** — All UI is XR-compatible

## 🎯 Controls

| Action | Browser | VR Controller |
|--------|---------|--------------|
| Move claw | WASD / Arrow keys | Right thumbstick |
| Drop claw | Space | Right trigger |
| Pause | Escape | B button |

## 🛠️ Tech Stack

- **IWSDK 0.4.1** — Meta's WebXR development framework
- **Three.js** (via IWSDK) — 3D rendering
- **PanelUI** — IWSDK's spatial UI system (`.uikitml` templates)
- **Web Audio API** — Procedural audio synthesis
- **TypeScript** — Full type safety
- **Vite** — Build tooling

## 📊 Build Stats

| Metric | Count |
|--------|-------|
| Source files | 60+ |
| Lines of code | 9,000+ |
| PanelUI templates | 41 |
| Achievements | 102 |
| Game modes | 8 |
| Build rounds | 8 |
| Total build time | ~360 minutes |

## 📦 Development

```bash
npm install
npm run dev    # Start dev server
npm run build  # Production build
```

## 📄 License

Built with IWSDK. See [iwsdk.dev](https://iwsdk.dev) for framework details.
