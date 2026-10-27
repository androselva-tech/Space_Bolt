# SpaceBolt: answer it, fly it

A science learning game, the sister of LearnBolt (same engine, same pencil-and-dusk art style).
Answer science questions to **build your rocket part by part**, then **fly it** through space.
Every right answer adds a part; every wrong one leaves a gap, so a weaker rocket means a harder flight.

**Science knowledge = rocket parts = how well you fly.**

## Run it

```bash
npm install
npx expo run:android      # or: npx expo run:ios
npm run web               # quick test in the browser
```

## How it plays

One long round trip, told like a film: **from Earth to the Moon and back home**, in 27 stages.
Progress saves after every stage. A **pause / play** button (❚❚, or P / Esc on a computer) stops
everything: the flight, the clocks, the movies.

| World | Stages | The story |
| --- | --- | --- |
| **Earth to Moon** | 1–20 | Build, paint and fuel the rocket and launch into Earth orbit (1). Then 384,000 km of deep space (2–19): systems checks, faults to fix, meteor storms. The slow Moon landing (20): the hatch opens, two astronauts climb down, the flag goes up. |
| **Moon to Earth** | 21–27 | Two 3D Moon walks to find the **Lunar Shuttle**'s parts (21–22), build it and lift off from the Moon (23), a quick hop to the space station (24: five questions), dock by hand (25), repairs (26), and the capsule's ride home under parachutes you fire yourself (27). |

Every stage is one leg of the trip (`LEGS` in `rules.ts`):

1. **Liftoff** (stage 1). **Build the rocket** in the workshop: 13 real parts, like a model rocket kit

   | Booster stage (falls away after launch) | Upper stage (flies on and lands) |
   | --- | --- |
   | body tube • engine mount with centering rings • engine hook • fin set • launch lug • tube coupler (the separation joint) | body tube • landing legs with descent engine • transition • payload section (crew cabin) • nose block and shock cord • parachute • nose cone |

   Each part is **earned with a question** (physics, space, chemistry or the human body), then
   **dragged to its place** and **bolted on** (tap each bolt 3 times). **Paint** it and give it a
   name; **fuel up** (fuel, liquid oxygen, the crew check; a wrong answer leaks); **GO FOR LAUNCH**,
   countdown, **IGNITION**, booster separation, into Earth orbit.
2. **Deep space** legs. A **systems check** first (engine tune-up, shield charge, life support: a
   right answer charges each), then a long flight (drag up or down, web: ↑ ↓) through a nebula-lit
   asteroid field: round cratered rocks, giant asteroids, comets, dead satellites and torn solar
   panels. The HUD counts the **kilometres to the Moon** (or home). Every flight has its own mix of
   **show stoppers** (`stageEvents` in `rules.ts`; new ones arrive one stage at a time):
   - 🔧 **Equipment failure**: logic and maths problems until it's fixed; a wrong answer burns out a shield cell.
   - ☄️ **Asteroid storm**: a shield for every right answer, then walls of rock with one gap.
   - 💥 **Collision course**: a huge asteroid grows ahead: answer before the 15-second clock runs out or crash.
   - ☀️ **Solar flare**: the Sun blazes up; answer what you can in 35 seconds; too little shielding and radiation hits.
   - 🧭 **Navigation error**: re-plot the course, then fly through 5 beacon rings (a missed ring costs fuel).
   - ⛽ **Fuel leak**: patch it, then catch the fuel canisters while the tank drains fast (running dry costs a heart).
   - 🛰️ **Space junk**: a field of tumbling satellites and panels.
   - 🆘 **Mayday**: an astronaut adrift: fly into them, a health check brings them aboard (+1 heart).
   - 📡 **Secret message**: decode Mission Control's code for a reward.
3. **Moon landing** (stage 20). A slow, engine-only descent (no air, no parachute), the legs swing
   out, touchdown; the **hatch opens**, a ladder comes down, **two astronauts** climb down one after
   the other and **plant the flag** in the rocket's colours.
4. **Moon walks** (stages 21–22), in 3D. Rolling grey ground full of craters runs to a curved
   horizon under a black sky with the Earth in it. The astronaut lopes along in one-sixth gravity
   (drag anywhere like a joystick; web: W A S D or the arrows), leaving footprints and puffs of
   dust, around boulders, up and down the slopes; the camera follows. Each part stands under a
   beacon of light; arrows at the edge of the view and a radar point to the rest. Walk onto one and
   answer to pick it up (two right answers for the major parts).
5. **The Lunar Shuttle** (stage 23). A new craft, nothing like the Earth rocket: a gold landing
   platform on four struts, the ascent engine, an octagonal hull with fuel spheres and thruster
   pods, solar wings, the crew cabin (later the re-entry capsule) and a docking probe. Fit the 8
   parts you found, fuel up, and lift off; the platform stays behind on the Moon, like Apollo's.
6. **To the station** (stage 24): a quick hop, five course burns, one question each.
7. **Docking** (stage 25), in 3D, from the cockpit, like the scene in Interstellar: a wheel of
   twelve modules spinning over the Earth. Roll to match its spin (⟲ ⟳, A / D) until it stops
   turning and its slot lies flat, keep the port's diamond in your cross-hair with the side
   thrusters (◀ ▲ ▶ ▼, the arrow keys: nothing slows a drift in space), and close in (+ / −, W / S)
   to touch at under 1.5 m/s. Then **DOCKED SUCCESSFULLY**, or **DOCKING FAILED** with the reason
   (a heart lost) and a retry.
8. **Repairs** (stage 26): heat shield, oxygen scrubber, solar panels, navigation, flight computer
   and parachutes, each fixed with questions.
9. **Home** (stage 27). Undocking, the deorbit burn, the capsule leaves the rest of the shuttle,
   **re-entry** in a glow of plasma (radio blackout); then **you fire the parachutes**: DEPLOY
   DROGUES when it turns green, then DEPLOY MAINS. Too early and Mission Control says wait; too
   late and the backups fire (a rougher ride, fewer stars). Splashdown, flotation bags, the
   recovery ship: **MISSION ACCOMPLISHED**.

After the first landing, a SKIP button lets players skip the movies.

- **Getting harder:** question tier 1–6 rises through each world; two answers per major part on the
  Moon; more hazards, faster and longer flights, bigger storms. Every course keeps enough room to
  steer between hazards (`minGapSec` in `rules.ts`), stacked hazards and storm walls always leave a
  gap the rocket fits through, and nothing waits right after a stop.
- **Bonus and boss stages:** bonus at 5 and 15 (answers pay ×2); boss at 10, 20, 25 and 27
  (harder questions, a crowded sky, the docking, the ride home).
- **Learning:** adaptive difficulty, no repeats, revision of missed questions, accuracy per subject
  in the Profile.
- **Coins:** per right answer by tier, +10% no hint, +10% fast, streak multiplier (×1.2 at 3 … ×3 at 20).
  Spend them on the **50/50 hint** (10 coins, or free after a rewarded ad) and in the **Hangar**:
  permanent upgrades (ion booster, reserve tank, shield generator, med bay), 3 levels each.
- **Stars:** 3 for 85%+ right, at most one hint and no hits or docking bumps.
- **Old saves** (from the 50-stage version) keep their coins, upgrades and stats; the stages start again.

## The questions

`src/questions/data.ts`: 420 questions in five subjects: physics, space, chemistry and the human
body (90 each: the basics plus the Moon, the space station, re-entry and the sea) and **logic &
maths** (60: patterns, sequences, deduction, codes and space sums, for faults and repairs). At least
10 per subject per tier, one line each:

```
tier|picture|question|correct answer|wrong 1|wrong 2|wrong 3|did-you-know fact
3|🌀|What force keeps the planets going around the Sun?|Gravity|Magnetism|Wind|Friction|The Sun's gravity holds the whole solar system together.
2|🔥|Venus is the hottest planet.|TRUE|FALSE|||Venus's thick clouds trap heat ...
```

True/false questions use `TRUE`/`FALSE` as the answer with the wrong answers left empty. The
picture is one emoji that may hint but never gives the answer away. To add questions, add lines
(keep at least 8 per subject per tier); `npm test` checks the format, that every question has 4
different answers (or is true/false), and that no question is repeated.
To serve questions from a server later, download the same format and pass it to `parseBank()` in
`src/questions/index.ts`.

## Where things live

| Path | What |
| --- | --- |
| `src/questions/` | The question bank, picking (adaptive tier, anti-repetition, revision) and answer shuffling |
| `src/game/rules.ts` | The two worlds and each stage's leg, parts, hangar upgrades, rewards, stars, each flight's course with its events and storm (`buildCourse`), faults, the Moon walk's field, docking and the station's systems |
| `src/game/store.ts` | Game state: each stage's phases, questions per part, fitting and bolts, paint, fuelling and leaks, the crew check, the systems check, events in flight, the Moon walk, docking, repairs, landing and splashdown, hints, hangar, saving |
| `src/rocket/` | The rocket: its 13 parts as vector shapes with bolt holes, paint and patterns (`model.ts`), the painted name (`name.ts`, letter outlines in `glyphs.json`), drawn with SVG (`RocketSvg.tsx`) and three.js (`RocketMesh.tsx`) |
| `src/workshop/` | The workshop (drag a part to its place, tap its bolts) and the paint shop |
| `src/cinematic/` | The launch pad and launch movie (from Earth or the Moon), the Moon landing, the splashdown, and their captions / countdown / IGNITION overlay |
| `src/flight/FlightScene.tsx` | The journey (three.js via React Three Fiber): parallax space with Earth and the Moon, the painted upper stage, hazards, storms, coins |
| `src/moonwalk/` | The 3D Moon walk: the terrain (`terrain.ts`), the scene (ground, boulders, beacons, the astronaut, footprints, dust) and the joystick, edge arrows and radar |
| `src/station/` | The space station: its 2D art, the 3D docking scene and its controls and result card, and the repair bay |
| `src/ui/QuizPanel.tsx` | The question panel (text auto-sized to always fit) and the in-flight gauges |
| `src/ui/` | HUD, round card / stage complete, map (a page per mission), hangar, profile, sign-in, splash |
| `tools/make-space.mjs` | Draws the deep-space art: the nebula, the asteroids, space junk, Earth's and the Moon's glowing edges, the solar flare, beacon rings and fuel canisters (`cd tools && node make-space.mjs`) |
| `tools/make-art.mjs` | Draws the movie props (smoke, glow, clouds, the astronaut), the name's letter outlines, the shield, the checkpoint ring, the part icons, the app icon and the logo (`npm run assets`); then `npm run icons` cuts the icon and splash files |

The planets, coins, stars and hearts are LearnBolt's art.

## Testing

- `npm test`: unit tests. Every question's format; the campaign's story order; fair courses for
  every flight (gaps, storm walls, calm after stops); the Moon walk's layout; the whole stage flow
  for every leg (build, paint, fuel, launch, the systems check, faults and storms, the Moon landing,
  the Moon walk, the Moon rebuild, docking and repairs, splashdown), 50/50, hangar, saves.
- `npm run test:e2e`: plays stages 1–3 in Chrome like a player: answers every question, drags every
  part onto the rocket with the mouse and taps its bolts tight, paints and names the rocket, fuels
  up, presses GO FOR LAUNCH and IGNITION; the dev-build autopilot steers, walks the Moon and docks.
  Writes `e2e/report/report.md` and `report.html` with screenshots per stage. `-- --from 21 --to 23`
  for other stages, `-- --right 0.7` to get 30% wrong, `npm run demo` to watch it in a window.
- `npm run test:e2e:all` plays all 27 stages (movies skipped after the first); `npm run demo:all`
  does it in a window you can watch. `npm run demo:home` (and `npm run test:e2e:home`, headless)
  plays just the way home, stages 21–27. Open `e2e/report/report.html` to see every stage.

## Before publishing

1. **Expo project:** `eas init` (creates the project and writes its id into `app.json`).
2. **Ads (Unity LevelPlay):** the Android app key and an Android **Interstitial** ad unit are in
   `LEVELPLAY` in `src/ads/levelplay.ts`. Still to do there: a **Rewarded** ad unit for Android
   (until then the free 50/50 stays free) and the iOS app key and units. Rebuild after any change
   (`npx expo prebuild --clean`, then `npx expo run:android`).
   **Testing ads:** the app key and unit are the real ones, so ads are live. Never tap live ads on
   your own phone. Instead, add your phone as a **test device** in the LevelPlay dashboard (its
   advertising ID) to get test ads on it, and/or run the **integration test suite**:
   `EXPO_PUBLIC_AD_TEST_SUITE=1 npx expo run:android` opens it right after LevelPlay starts (it
   checks each network and shows ads, with a Live / Test switch for bidding networks). The age
   gate decides first: answer as 14 or older when testing, since a child's device ID is opted out.
   **COPPA: partially directed.** On first launch the map asks for the player's birth year (the
   neutral age gate, `src/ui/AgeGate.tsx`; only "13 or under" or not is kept, and Profile can
   change it). Children get child-directed ads (no personalised ads, the device id opted out, do
   not sell); older players get normal ads. The build keeps the advertising-ID permission
   (`childDirected: false` for `plugins/withLevelPlay.js` in `app.json`). In the LevelPlay
   dashboard turn on only ad networks that support child-directed traffic, add each network's iOS
   SKAdNetwork ids to `skAdNetworkIds` in `app.json`, and add LevelPlay's `app-ads.txt` lines to
   your developer website. Players in the EEA and UK also need a consent message before
   personalised ads; that isn't built yet.
3. **Upload key:** make one for SpaceBolt and keep it outside the project:
   `keytool -genkeypair -v -keystore ~/.android-keys/spacebolt-upload.jks -alias spacebolt -keyalg RSA -keysize 2048 -validity 10000`
   then add `SPACEBOLT_UPLOAD_STORE_FILE`, `_STORE_PASSWORD`, `_KEY_ALIAS`, `_KEY_PASSWORD` to
   `~/.gradle/gradle.properties`. **Back both up.**
4. **Build:** `npm run release:android` raises the version code and writes
   `dist/spacebolt-v<version>-<code>.aab` for Play Console.
5. **Sign-in (optional):** like LearnBolt, it shares the Motion Firebase project (`fitness-52d79`).
   Add an Android app with package `com.androselva1988.spacebolt` and its SHA-1s, download
   `google-services.json` into this folder and rebuild. The save is a `spaceBolt` field on `users/{uid}`.
6. **Play listing:** the app targets children, so fill in the Families declarations (target age,
   ads in the app). The Data safety form must list what LevelPlay collects (diagnostics and app
   activity for ads; no advertising ID, since the build removes that permission), and email
   sign-in if you turn it on.
