# Neon Skee VR

A classic skee-ball arcade game reimagined in VR with a holodeck neon wireframe aesthetic. Built with IWSDK 0.4.1.

## Play

**Live:** [https://ellyz2426.github.io/neon-skee/](https://ellyz2426.github.io/neon-skee/)

## Features

### Core Gameplay
- **Classic skee-ball lane** with inclined ramp, bump launcher, and circular scoring board
- **Physics-based ball rolling** up the ramp with bump-launched projectile arc
- **5 scoring rings:** 50 (center), 40, 30, 20, 10 (outer) points
- **2 corner pockets:** 100 points each for precision shots
- **9 balls per standard frame**
- **Ball spin/curve mechanics:** drag mouse or thumbstick while charging to curve the ball in flight

### Game Modes (8)
- **Classic** — Standard 9-ball frame, chase the high score
- **Speed Round** — Timed rush (45-90 seconds based on difficulty), unlimited balls
- **Target** — Hit specific ring values called out for bonus scoring
- **Progressive** — Escalating difficulty with each successful frame
- **Daily Challenge** — Date-seeded daily game with unique modifiers (wind, ball speed, ring scale)
- **Tournament** — 4-round bracket against AI opponents with named personalities
- **Practice** — Unlimited balls, no pressure, perfect for learning
- **Season** — 8-stage campaign with star ratings, unique modifiers (wind, gravity, speed, ring scale), and power-up spawns

### Power-Up System (5 types)
- **Multi-Ball** — Launches 3 balls at once (instant)
- **Magnet** — Ball curves toward the center ring (15s)
- **Big Ball** — Larger ball for easier hits (15s)
- **Score ×2** — All scores doubled (20s)
- **Ghost Ball** — Ball passes through rings for multi-hits (instant)
- Power-up orbs appear as glowing pickups above the lane — roll through them to collect
- Spawn chance varies by mode (higher in Season and Practice)

### Scoring System
- Combo multiplier builds with consecutive hits (x1 to x5 at 8+ combo)
- Score Boost power-up doubles all point values
- Streak tracking for 50+ point hits
- Per-frame score tracking with accuracy stats
- **Score popup VFX** — floating visual bursts at impact point
- **Ring flash effects** — bright flash and expanding ring wave on hits
- **Impact effects** — screen shake on pocket hits and big combos

### Season Campaign
- 8 stages with escalating difficulty and unique modifiers
- Star ratings (1-3 stars) based on score vs. target
- Progressive unlock: clear a stage to unlock the next
- Power-ups spawn during season stages
- Stages: Rookie Lane → Neon Alley → Wind Tunnel → Speed Demon → Shrunken Board → Heavy Gravity → Gale Force → Championship

### Customization
- **8 ball skins:** Neon Cyan, Solar Flare, Plasma Pink, Ice Crystal, Toxic Green, Void Purple, Chrome Silver, Inferno Red
- **5 arena themes:** Neon Holodeck, Crimson Arcade, Toxic Neon, Ultra Violet, Solar Blaze
- Level-gated skins at Lv.5, 10, 15
- Settings persistence via localStorage

### Progression
- XP earned from every game with mode/difficulty multipliers
- Level system with scaling XP curve (80 * 1.15^level)
- Skin unlocks gated by level
- Season star collection (24 total across 8 stages)

### 55 Achievements
Including: First Roll, Bullseye, Pocket Master, Spin Master, Grand Score, Perfect Frame, Hot Streak, Fire Streak, Untouchable (10-streak), Ring Collector, Powered Up, Full Arsenal, Triple Threat, Magnetic Pull, Phantom Scorer, Season Champion, Perfect Season, Star Collector, Ultra Score, God Score, Quarter Million, and more

### Audio
- 20+ procedural Web Audio SFX (roll, bump, ring hits, pocket arpeggio, gutter, charge, countdown, game start/end, achievements, combo, power-up collect/expire, season complete, star earned, score pops)
- Synthwave arpeggiator: 4-bar chord progression at 128 BPM (Am→C→D→B) with sawtooth oscillator + lowpass sweep
- Ambient drone: 55Hz sine + 82.5Hz triangle pad + LFO modulation
- Volume controls for master, SFX, and music

### Visual Effects
- **Score popup VFX:** Glowing sphere clusters that rise and fade at impact point
- **Ring flash animations:** Bright flash + expanding torus wave at hit location
- **Power-up orbs:** Floating, glowing, rotating pickup orbs above the lane
- Ball trail with additive blending (skin-colored)
- Particle bursts on scoring hits (color-coded by ring value)
- Slow-motion on 100-point pocket hits
- Camera shake on big hits
- Holodeck environment: neon grid floor/ceiling, 14 floating wireframe decorations with rotation + bob, 40 ambient particles with drift + pulse
- Scoring board with glowing ring torus geometry and corner pocket spheres

## Controls

### Browser
| Action | Input |
|--------|-------|
| Charge throw | Click + Hold |
| Aim | Move mouse left/right |
| Add spin | Drag sideways while charging |
| Roll | Release mouse |
| Pause | ESC |
| Rematch | R (game over) |

### VR
| Action | Input |
|--------|-------|
| Charge throw | Right Trigger (hold) |
| Aim + Spin | Right Thumbstick |
| Roll | Release Right Trigger |
| Pause | B Button |
| Menu interaction | Controller laser pointer |

## Technical Details
- **Framework:** IWSDK 0.4.1 (Immersive Web SDK)
- **Runtime:** Dual VR + browser (`xr: { offer: 'once' }` + `browserControls`)
- **UI:** 19 PanelUI `.uikitml` spatial templates, zero HTML DOM overlays
- **Physics:** Custom ball rolling + projectile arc simulation with 4-substep integration
- **Audio:** Procedural Web Audio API synthesis with arpeggiator
- **Persistence:** localStorage for achievements, leaderboard, stats, theme, skin, season progress, power-ups
- **Build:** Vite + TypeScript + esbuild

## Project Structure
```
neon-skee/
  src/
    index.ts            # Main game (all logic, physics, UI binding) — 2621 lines
    vite-env.d.ts       # Type declarations
  ui/
    title.uikitml       # Title screen
    modeselect.uikitml  # Mode selection (8 modes)
    difficulty.uikitml  # Difficulty selection
    hud.uikitml         # Head-following HUD
    powerbar.uikitml    # Power charge bar
    poweruphud.uikitml  # Active power-up indicator (Follower)
    pause.uikitml       # Pause menu
    gameover.uikitml    # Game over screen
    season.uikitml      # Season stage selection with star ratings
    seasonresult.uikitml# Season stage result with stars
    leaderboard.uikitml # Top 10 scores
    achievements.uikitml# 55 achievement slots
    settings.uikitml    # Theme + volume controls
    help.uikitml        # Controls + scoring + power-ups reference
    toast.uikitml       # Toast notifications
    countdown.uikitml   # 3-2-1-ROLL countdown
    stats.uikitml       # Career statistics
    skins.uikitml       # Ball skin selector (8 skins)
    tutorial.uikitml    # 7-step interactive tutorial
  vite.config.ts
  package.json
  tsconfig.json
```

## Build & Deploy
```bash
npm run build
# Deploy dist/ to GitHub Pages
```
