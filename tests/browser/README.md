# Local input-driven acceptance checks

These optional scripts require Node 22+, Playwright and Three.js 0.160.0 on Node's module path, plus Chromium. They are separate from the dependency-free `node --test tests/*.mjs tests/*.cjs` suite. No dependency is shipped to the production game.

One way to keep browser tooling outside the checkout (run from the repository root):

```sh
npm install --prefix /tmp/bootcamp-browser-check playwright@1.56.1 three@0.160.0
/tmp/bootcamp-browser-check/node_modules/.bin/playwright install chromium
python3 -m http.server 8080 --bind 127.0.0.1
```

In another terminal from the repository root:

```sh
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/campaign-traversal.cjs
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/urban-traversal.cjs
```

Use the supported Playwright browser for your OS. Do not disable browser security or supply cloud credentials to these scripts. They block non-local traffic other than a locally fulfilled Three.js CDN fixture. The renderer is deliberately stubbed: these scripts test input/physics/objectives, not 3D appearance, FPS, real phones/controllers or the deployed backend.

- Campaign check drives all 100 levels using movement/action inputs and fixture aiming, with no position teleporting. It waits/steers for the game's hazard rules, supplies precise fire/drill inputs and accelerates simulated time. It asserts recorded completion of each stage. This does not test human reaction/comprehension or every timing.
- Urban check walks the courtyard, breaches doors, shoots actual raycast targets in both connected rooms, reloads, climbs the physical exterior stair/landing, clears roof targets and reaches extraction. A test-only hook supplies camera heading/aim but never position. It verifies a separate urban record, no container medal/progress, and mobile menu overflow.

Real WebGL screenshots, storage/request-delay tests and real-device/hosted checks are separate; see `RELEASE-CHECKLIST.md`.


HUD/input regression checks (same server and external-tooling setup):

```sh
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/hud-war-mout.cjs
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/hud-campaign-race.cjs
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/local-response.cjs
```

These measure actual visible panel/reticle rectangles and assert no >2px intersections or offscreen rectangles among the listed selectors at 1280×800, 390×844, 844×390, 320×568, 568×320, 667×375 and 1024×600, with touch controls enabled. Intentional overlays (dialogs/countdown/respawn) are excluded. Lists live in the script so failures identify which two regions collide. They are renderer-stub layout assertions, not screenshots or universal proof for every text/font/zoom/device. The local-response check asserts player movement and ammo change within one 16ms simulation step, tactical-score pause/escape behavior and input isolation in pause/options.

Input ownership/button-chord regressions (same local server/tooling, renderer stub):

```sh
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/gameplay-input-edges.cjs
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/mouse-chord.cjs
NODE_PATH=/tmp/bootcamp-browser-check/node_modules node tests/browser/mout-mouse-chord.cjs
```

The first verifies mouse-fire release does not cancel held keyboard ADS, disabling the touch stick clears only touch input, and a simulated controller unplug stops its held movement. The other two use actual Playwright mouse button sequences: hold right aim, press/release left fire, keep right held. War/MOUT must fire during the chord and stop when left is released without exiting aim. These checks do not certify a physical controller, touch OS behavior or hardware input latency. No cloud credentials are needed.
