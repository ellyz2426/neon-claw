# Neon Claw VR

A holodeck-styled VR crane/claw machine arcade built with [IWSDK](https://iwsdk.dev) 0.4.1. Position a neon claw over glowing prizes, drop it, and grab! Physics-based grip mechanics make every grab a thrilling gamble.

**[Play Now](https://ellyz2426.github.io/neon-claw/)** | [Repository](https://github.com/ellyz2426/neon-claw)

## Features

### Core Gameplay
- **3D claw positioning** — move the claw on X/Z axes, drop to grab prizes
- **Physics-based grip** — claw strength vs prize weight determines success
- **Prize rarity system** — 14 prize types across 5 rarity tiers (Common to Legendary)
- **Combo/streak scoring** — consecutive grabs build multiplier (up to x5)
- **Ticket reward system** — earn tickets from each grab, multiplied by combo

### Machines
- **Neon Starter** — 12 prizes, 70% grip strength, beginner-friendly
- **Deluxe Grabber** — 18 prizes, 60% grip, more variety
- **Premium Vault** — 24 prizes, 50% grip, rare prizes available
- **Quantum Chamber** — 30 prizes, 40% grip, legendary prizes possible

### Game Modes
| Mode | Description |
|------|-------------|
| **Classic** | Limited drops (3-7 based on difficulty), maximize score |
| **Time Attack** | Race against 45-90 second clock |
| **Target** | Grab specific highlighted prizes for bonus points |
| **Progressive** | Machine gets harder each round |
| **Daily Challenge** | Same seeded layout for everyone each day |
| **Marathon** | Keep grabbing until 3 misses |
| **Precision** | Only 3 drops — make them count |
| **Practice** | No pressure, unlimited plays |

### Prize Collection
- 14 unique prize types with distinct shapes and colors
- 5 rarity tiers: Common, Uncommon, Rare, Epic, Legendary
- Collection album tracks discovered prizes
- Heavier/rarer prizes are harder to grab but worth more

### UI & Polish
- 16 PanelUI `.uikitml` spatial templates — **zero HTML DOM**
- Head-following HUD (score, grabs, attempts, combo, timer)
- World-space menus (title, modes, machines, settings, etc.)
- Toast notifications for grabs, misses, achievements
- 3-2-1 countdown before each game
- 5 arena themes (Neon Holodeck, Crimson Arcade, Toxic Neon, Ultra Violet, Solar Blaze)

### Audio
- 15+ procedural SFX (claw move, drop, close, grab, miss, collect, combo, etc.)
- Ambient drone (55Hz sine + triangle pad + LFO)
- Master/SFX/Music volume controls

### Achievements
- 30 achievements tracking grabs, streaks, combos, scores, collection, modes, and more

## Controls

### Browser
| Key | Action |
|-----|--------|
| WASD / Arrows | Move claw |
| Space | Drop claw |
| Escape | Pause |

### VR
| Input | Action |
|-------|--------|
| Right Thumbstick | Move claw |
| Right Trigger | Drop claw |
| B Button | Pause |
| Laser Pointer | Menu interaction |

## Tech Stack

- **IWSDK 0.4.1** — WebXR development framework
- **Dual runtime** — VR + browser-first (`xr: { offer: 'once' }`)
- **PanelUI** — `.uikitml` compiled spatial UI via `@iwsdk/vite-plugin-uikitml`
- **Web Audio API** — Procedural sound synthesis
- **Vite** — Build tooling
- **TypeScript** — Full type safety

## Project Structure

```
neon-claw/
  src/
    index.ts        — Main entry, game loop, UI wiring, input handling
    types.ts        — Types, prizes, machines, themes, achievements, state
    audio.ts        — Procedural Web Audio manager
    machine.ts      — Machine geometry, claw, prizes, rails
    environment.ts  — Holodeck environment, lighting, particles
    effects.ts      — Particle system, claw shadow, screen shake
  ui/               — 16 .uikitml spatial UI templates
  dist/             — Production build output
```

## Build & Deploy

```bash
npm install
npm run build
# Deploy dist/ to any static host
```

## Stats

- **6 source files**, ~2,100 lines of TypeScript
- **16 `.uikitml` templates**, zero HTML DOM
- **14 prize types**, 4 machines, 5 themes, 8 modes, 30 achievements
- IWSDK 0.4.1, dual-runtime VR + browser
