# Before inviting players

Local tests are evidence for the code paths they run, not proof that a hosted service or a particular phone works. Never send private recovery codes, database passwords or API keys to an assistant.

## Supabase (owner action, not deployed by this PR)
1. Follow `SUPABASE-SETUP.md` from your own authenticated computer. Apply the initial migration only if it has not already been applied; never reset a populated project.
2. Deploy the current `bootcamp-command` and check health, registration, refresh/restore, public/private rooms, join/leave/reconnect, objectives, abilities and appearance in **two independent browser profiles/devices**.
3. Finish an eligible War match, refresh twice and verify one reward only; try claiming daily cash twice. Aborted/local/unranked race runs must not create currency or XP.
4. Verify all-human Crucible supply/extraction, host restrictions, stale-input timeouts and disconnects. Check runtime logs/usage without recording recovery credentials.
5. This update makes no backend change. Earlier audit/squad changes still need redeployment if not yet applied. Local in-memory client/server tests cannot replace this hosted acceptance run.

## Vercel (owner/account action)
The agent's deployment checks have returned `Account is blocked.` Account status/billing can restrict deployment, independently of passing code checks. Review the team's Billing page and any account notices; if the displayed status and invoices disagree, contact Vercel Support rather than changing budgets or retrying deployments blindly. No payment, budget increase or support resolution is claimed by this PR.

## Actual phones/controllers
- Use at least one low/midrange Android device and one iPhone/iPad; start with Performance. Record browser/device, cold load time, median/p95 frame times during moving/aiming, and memory behavior after five mission restarts. Compare Balanced/High separately. A 390×844 software browser is not a real phone benchmark.
- Test joystick pointer-cancel, portrait/landscape rotation, touch aiming/fire/reload/breach, pause/resume, hidden-tab timer handling, survey views, route switching and readable overlays. Check the map does not cover the action buttons.
- Connect a physical controller. Confirm stick dead zones, camera motion, X/use, A/reload in MOUT, shoulder aiming and menus. Injected gamepad tests only verify mapping logic.
- Play the urban route from courtyard to U1/U2 through the communicating doorway, then up the exterior stair/landing to ROOF. Clear all six threats, avoid blue targets and extract. Check neither door nor roof edge can be bypassed. Container MOUT must still support all six breaches and 12 threats.
- Test keyboard/Space climbing/crawling/sprinting and cancellation on the campaign. Automated traversal does not test player comprehension or every input timing.

## Browser-local progress
Complete/fail/retry each route and refresh. Urban results must not overwrite container bests or grant Clean Breach. Verify denied storage gives honest messages and does not prevent play. Never clear site data to “fix” a bug without backing up what the user needs; it removes local records and may remove remembered login credentials.

## Mixed-input and presence regression acceptance
- Hold right mouse to aim, then hold/release left to fire, in War and both MOUT routes. Releasing left must stop shots and keep right aim. Test the reverse order too; releasing right must not stop left-held fire. Keyboard K plus mouse fire must remain independent.
- Hold a controller action, unplug it, and confirm movement/fire stops while any independently held keyboard action continues. Disable touch controls while the stick/FIRE is held: no stuck movement/shooting. Verify actual pointer-cancel on the target mobile OS.
- After deploying the updated function, verify explicit leave, 5-second silent-client presence expiry, lobby host transfer, stale-slot reclaim, PvP opponent requirement and intel drop-before-respawn. Keep the other client polling: there is no autonomous simulation/presence worker.
- Local automated browser checks and injected gamepads cannot replace these physical-device and hosted tests. Use the committed input/chord scripts to reproduce logic failures without credentials first.
