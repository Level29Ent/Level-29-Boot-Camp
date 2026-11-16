# Level-29-Boot-Camp
Level 29 Boot Camp game

## Play without registration
**Save name / play → Save name & play** stores only a local callsign and opens solo game choices immediately. Blank names default to Recruit. **Play without saving** uses a session guest name without replacing a stored name. If browser storage is denied, play still works and the screen explains that the name is session-only.

- **60-Second Races → Play now vs 7 bots** starts the existing local AI race, with shuffled courses, 60-second rounds and bottom-three disqualification. No HTTP, cloud account or login prompt.
- **5v5 War → Play local 5v5** starts a separate local bot simulation (one player + four allies vs five bots), with cover-aware navigation, line-of-sight shooting, reloading, scores and respawns. It uses the existing third-person arena/controls and is labeled LOCAL PRACTICE.
- **Continue training** uses existing browser-local campaign records. Appearance choices remain local.
- Optional cloud race/War buttons, online friend rooms, cash/XP and Armory ownership still require the external game service. Local practice does not create a cloud profile, replace a private recovery code, mint rewards or synchronize progress. The new Supabase server must be deployed separately using [SUPABASE-SETUP.md](SUPABASE-SETUP.md).

Cloud registration/restore lives under the expandable **Optional cloud saves, rewards & online friends** panel. Network/unreadable-response errors explain the available local-play path. A pending or failed optional registration does not disable local play or take the player away from gameplay when it completes. Remembered-profile auto-reconnect is silent if it fails, rather than forcing a login screen during play.

## Saving progress
- Create a profile once in **Player login / profile**, or restore your existing recovery code. Leave **Remember this device** enabled only on a trusted browser. The next visit restores that profile automatically. 
- Cash, XP and War match stats are authoritative in the included Supabase Edge Function. Deploy its migration and function first; see [SUPABASE-SETUP.md](SUPABASE-SETUP.md). Online race progress remains unranked and never awards currency or XP.
- Keep a private recovery code to move between devices or recover after clearing browser data. Remembered sign-in codes are stored in this site's local storage; anyone using the browser can access that profile. **Forget this device** removes the saved sign-in, not the cloud profile or current session.
- Completed campaign training levels, scores and completion times auto-save in this browser only (shared by users of this browser, not synced between profiles/devices). Mid-level checkpoints are not saved. Browser storage failures are reported rather than presented as successful saves.

## 5v5 War controls
- WASD / joystick: move; Shift: sprint; Space: jump; C: crouch.
- Click the arena to capture the mouse, move it to look, hold left mouse / J to fire. Escape releases the mouse. Drag-to-look and arrow-key look remain available without mouse capture.
- Hold right mouse / K for close shoulder aim. E / R reloads.
- The camera follows the visible soldier over their right shoulder and pulls forward around cover. Shots converge on the centre reticle; the cloud service still decides movement, hits, damage, respawns and match rewards.

This is a static ES-module application; no build step or package install is required to deploy. The browser loads Three.js 0.160.0 using the import map in `index.html`. Live profile and match verification requires a cloud player account; no preview test account is provided.

## Ranks and avatar kits
- **Ranks & Avatar Kits** previews the 10-rank XP ladder and four kits without signing in. Ranks use the existing progression: Recruit at 0 XP through Command at 9,000 XP, with 1,000 XP between ranks. Cloud-awarded XP determines your rank; training scores in local storage do not grant ranks.
- Purchase/equip the existing Recruit, Bronze Operator, Arctic Ghost and Gold Battalion cosmetics in **Command & Rewards → Armory**. Existing server IDs/prices are unchanged. Rigs and shoulder bands appear on the character, not just the nameplate. Rank patches use supplied cloud XP. These visuals do not change collision, damage or team helmet colors.
- Your signed-in kit appears on your soldier in races, campaign recruit stages and third-person War. Other players' kits/ranks render when room state supplies `equipped`/`xp`; absent XP does not imply a fabricated rank. Live cross-client propagation requires testing with the external room service.
- A global high-score leaderboard is **not implemented**: this repository has no authoritative score database or global-ranking API. Completing it requires the source/access for the external profile/match service, an agreed authoritative score metric, and a public-score endpoint that returns only safe fields (display name, score, rank and cosmetic ID), never private recovery codes. Browser-local training scores must not be trusted for global awards.

## 120 free visual styles
Open **Ranks & Avatar Kits**, filter the 12 palettes and clothing types, and select one of 10 different wearable designs per palette (120 distinct combinations). Ten cards render per page. Selection works without a cloud account. A selected style replaces the appearance of your cloud kit locally; **Use cloud Armory kit instead** removes the override. It never grants ownership, rank, XP, cash or stat boosts.

Styles save in this browser's local storage, shared by its players, and apply on your next deployment in races, campaign recruit stages and third-person War. A storage failure keeps the choice for the session and reports that it was not persisted. Signed-in players can select a style to save it to the new backend. Other clients receive the allowlisted public style ID on the next deployment; guests remain local-only. Team-colored armbands identify War squads; head-covering styles replace the helmet locally. Collision geometry remains unchanged.


## Shaped clothing and material preview
The 120 local styles now use 10 recognizable silhouettes per palette: baseball cap, boonie hat, knit beanie, curly hair, ponytail, mohawk, crewneck shirt, pullover hoodie, bear mascot and fox mascot. Previous palette/pattern IDs remain valid and map to the upgraded wearables, so saved selections do not disappear.

Use the palette and clothing-type filters, then **View in 3D** to inspect the actual rotating character and **Use this style** to equip for the next deployment. Preview and selection are separate. Pause rotation to inspect the silhouette. The showroom uses the same wearable geometry/materials as gameplay, with cloth weave, knit ribs, matte cotton/canvas/fleece, directional hair texture and soft plush bump mapping. No external model/texture downloads are needed. Materials are cached; clothing geometry is disposed on swap and showroom rendering pauses offscreen.

War keeps team-colored armbands on both upper arms. Hats/hair/hoods/mascot heads replace the local helmet to prevent overlapping headgear; shirts keep the helmet. Cloud-owned kits and other players are unchanged. The new wardrobe is still browser-local, not synchronized to other clients. These are stylized 3D assets, not photorealistic licensed character models.

## Featured Level 29 Jester Mascot
The wardrobe now includes a 121st choice, **Level 29 / Jester Mascot**, inspired by the user-provided jester reference: purple/green/gold curved cap points with gold bell tips, a gold face with black eye mask and white lenses, a pointed-tooth grin, and a matching bell collar and outfit. It is a modeled full-body mascot, not the uploaded image pasted on a face. Find it first in the full catalog, or filter **Signature / Jester Mascot** and **Mascots**. The original 120 saved styles remain valid.

The featured mascot uses the same preview/equip/persistence flow and browser-local multiplayer limitation as other styles. The reference image is not bundled or transmitted to another service.

## MOUT Shoot House
Select **MOUT Shoot House → Deploy into shoot house** for a signed-out, session-local target drill. A 180-second monotonic timer starts at deployment. Open the four ground-floor container rooms (A1/B1/A2/B2) with **E / BREACH**, enter each room and hit both red targets, then use the central metal ramp to reach the stacked upper rooms (A3/B3). Clear those and reach the marked upper catwalk extraction at the far end. Blue boards are no-shoot targets. Doors and walls occlude shots; closed doors block entry.

- **Web:** WASD moves, Shift sprints, C crouches; click/hold the arena for captured mouse-look/fire (drag-to-look fallback), J fires, right mouse/K zooms, E breaches, R/Space reloads a 12-round magazine. Arrow keys or a connected gamepad also aim. P/Escape or Pause drill stops the local clock. Hidden-page visibility pauses it too.
- **Touch/webview:** enable Joystick if needed; left joystick moves; swipe the scene to look; use FIRE, AIM, BREACH, RELOAD, CROUCH and SPRINT controls. Pointer capture/cancel, safe-area offsets and responsive portrait/landscape HUD are supported. This is browser/webview-compatible source, not a built or tested native app package.
- **Scoring:** accuracy is threat hits / shots fired. Session drill score = 100 per threat + 10 per accuracy percentage point + 5 per whole second remaining − 250 per blue no-shoot hit, floored at zero. Successful extractions now save a browser-local personal best (highest score, fastest tied time). Incomplete drills never replace that best. No global leaderboard or cloud cash/XP is granted. Rerun starts a fresh attempt.
- **Scene:** modified/stacked container rooms with side-fed breach openings, tight centre corridor, three-metre upper catwalk, ramp, guardrails, corrugated-metal bump texture, overhead floodlights, one 1024px shadow-casting spotlight and room practicals. Same layout definitions drive collision and visible walls. Shooting is first-person so targets remain aimable inside tight rooms.

The mode owns its HUD, targets, materials and lights; leaving restores rendering state and existing controls. No new dependency, external backend, assets, secret or Vercel configuration is required.

## Field Operations, squad roles and Drill Instructor challenges
Open **5v5 War**, select a local mission and role, then **Play local 5v5**. Local practice runs one human with AI squadmates. The included Supabase backend also supports authoritative online War: elimination, capture and intel in PvP or co-op; Crucible and escort in co-op only. Select mission/role before creating the room. Joiners select their role before joining. Deploy the backend before using online buttons. Every operation has a three-minute deadline:

- **Squad Crucible:** jump at the gold rally marker, cross two low hurdles while carrying supplies (reduced movement speed), deliver with an AI teammate for five seconds, earn three squad eliminations, then extract with two living AI teammates for five seconds. Supply/extraction holds reset when the required squad leaves the marker.
- **Capture zone:** earn 60 seconds of uncontested presence. Eliminations alone do not score objective points.
- **Retrieve intel:** pick up the gold marker and return to your own base three times. A dead carrier drops intel at their position. Either squad can carry it.
- **Supply escort:** stand near the truck to advance it along a cover-clearing route; nearby enemies stop it. Reach 100% before the deadline.
- **Team elimination:** the existing first-to-30 rules remain available.

Use **F** or the on-screen **ability button**. Abilities have a 25-second cooldown; no consumables, paid boosts or damage bonuses. Medic restores 35 HP to living allies within six metres. Engineer refills nearby living allies' magazines. Scout reveals distant enemies on radar for eight seconds (normally local radar reveals enemies within 12m). Rifleman instantly reloads their own magazine. Medic/Engineer do not spend cooldown when there is nothing to restore. Ability cooldowns persist through respawns. Controller players can use the existing mouse/touch button; no new controller binding is claimed.

After a full local match, the Drill Instructor reports three optional challenges: finish with no deaths; hit every shot with at least eight shots fired; heal/resupply teammates twice. Earned badges persist in browser storage, separate from cloud cash/XP and existing server achievements. Storage failure is reported. Aborting a match awards no badges.

## Personal bests and ghost races
Finish a **local** 60-second race to save the fastest finish and sampled path per course in this browser. Select **Retry this course / race your ghost** in the results. A translucent non-colliding recruit replays your fastest run; the HUD compares progress and shows the best time. The ghost is not a ninth competitor and cannot change standings, scores or cloud rewards. Slower runs and DNFs do not overwrite the fastest run. **Next shuffled race** keeps the existing no-repeat course rotation. Online races do not record ghosts or trust local bests for rewards. Storage denial/corruption does not prevent racing; a failed write is reported in results. Clearing site data removes local records and badges.

## New Supabase backend (deployment required)
See [SUPABASE-SETUP.md](SUPABASE-SETUP.md). The new project has no previous accounts; do not import or send old recovery codes. New recovery-code storage is project-scoped, leaving the old remembered code intact. This does not migrate old cash, XP or inventory.

The new function supports profiles, authenticated appearance updates, authoritative online War simulation/objectives/roles, public/private rooms, safe player snapshots, server-earned War rewards, daily eligibility and atomic purchases/claims. Clients never choose cash, XP, hits or damage. Race rooms use legacy client-reported positions and are explicitly **unranked**; race cash/XP and race-specific achievements remain disabled pending an authoritative obstacle/race simulator. Local drill badges and race ghosts remain separate.

This is a polling-driven server simulation, not a production-scale dedicated game server. It advances while clients poll, caps catch-up to 500ms and expires stale held inputs after 500ms. Long gaps discard missed simulation rather than inventing active play. Full match deadlines still use server wall time. Rooms expire after one hour and expired room rows are removed when new rooms are created. New registration is limited globally to 200/hour; player commands to 480/minute; room creation to 12/hour/player. These limits are a modest baseline, not DDoS protection or an anti-bot service. Load-test and review before public promotion. Player recovery codes are bearer credentials: protect them like passwords.

### Checks
Run `node --test tests/*.cjs tests/*.mjs` (Node 22+ with native ES-module syntax detection). No production dependency or build step was added. Behavioral tests cover contested capture, intel pickup/drop/delivery, escort presence/contest, Crucible phases, all four utilities/cooldowns, challenge requirements, faster-only records, ghost interpolation and denied/corrupt storage.


## Gameplay and visual polish
**OPTIONS** opens graphics quality (Performance/Balanced/High), look sensitivity and reduced-motion controls. Choices save on this device; storage failures are reported. Performance disables shadows and uses 1× resolution; Balanced caps resolution at 1.5× with 1024px sun shadows in campaign (1.25× without shadows for busy race/War scenes); High caps it at 2× with 2048px sun shadows. Actual frame rate depends on hardware; these are explicit budgets, not a promised FPS target. Local modes pause while changing options; online matches keep running and the player stops sending active input. Close options, then resume the local pause screen when ready.

- Campaign traversal now buffers a jump for 120ms before landing and clears the buffer on respawn. Pause/resume clears touch joystick, drag and gamepad-held input to prevent unwanted movement. Replaying a stage preserves the highest score, then the fastest time for a tied score instead of overwriting it with a worse run.
- Rifle qualification and generated firing stations refresh camera/world matrices before raycasting. Hit/penalty/checkpoint feedback and urgent timer colors improve readability. Reduced motion removes qualification sway, animated checkpoint arrows, wardrobe rotation and shoot-house recoil; it also disables UI pulse animation.
- Local War has a simulation clock that stops in its pause/exit dialog; online War continues on server time. Pause clears queued actions. The arena has a procedural grit/tyre-track surface and painted perimeter/base markings. Objective poles and wheeled supply trucks improve identification without altering collision rules.
- MOUT confirms hits at the reticle, warns on low time and saves successful extraction personal bests in browser storage. Failed attempts leave the best unchanged. All six rooms and the upper ramp have a grid-based reachability check; reload, no-shoot and extraction rules have behavioral coverage.
- Races reset pause bookkeeping on restart and update standings DOM at 10Hz while retaining per-frame character animation. Online results no longer advertise an unavailable same-course ghost retry.
- The wardrobe's second WebGL context is created only when a kit is previewed, not during game startup. Hidden wardrobe rendering stops. Scene resize/quality changes request a redraw even on static menus.

Visuals use the existing stylized procedural art, with no licensed asset downloads, postprocessing dependency or new game backend changes. Decorations do not add invisible collisions or change objective/reward rules. The Supabase setup requirements above still apply; online races remain unranked. This pass does not claim every possible gameplay issue or every full campaign route is solved.

## Squad depth, career and first deployment
- **Guided First Mission** is a separate, replayable lesson built from existing obstacles: low wall, high wall, wire, two practice targets, then E to rally with two squadmates. The briefing and sequential gold markers teach the controls; completion records the tutorial locally without marking a campaign level cleared. Normal campaign remains available and unchanged.
- **Daily Training** rotates three existing stages deterministically by UTC date. Enable/disable optional modifiers: Standard, Endurance (30% higher sprint stamina cost), Precision (extra 50-point miss/no-shoot penalty). Daily runs save only local completion, never overwrite campaign best scores and never mint Field Cash/XP. The most recent 14 dates are retained.
- **War squad commands:** team leader (first connected human by team slot) uses **1 / Follow**, **2 / Hold here**, **3 / Push objective**, or HUD buttons. Orders affect AI teammates only. Hold captures the leader's current location; Follow tracks them. Other humans cannot overwrite the order. A dead/disconnected leader's standing order stops applying; an available connected captain may issue another. Local and server simulations use the same rules; **online commands/AI changes require redeploying the updated Supabase function**.
- AI uses cover-aware line of sight, remembers last sightings briefly, investigates nearby recent enemy shots, uses alternating flank approaches in elimination, and seeks open cover while low on health or reloading. Safety/reloading can override an order. Bots still navigate the shared cover grid; no omniscient nearest-player chase or damage boost is added. Objective contribution measures seconds alive within five metres of the objective marker, not an inflated point/currency award.
- **After-action reports** in campaign, races, MOUT and War show relevant hit/miss/accuracy, obstacle resets, no-shoot hits, assists and objective presence, with a concrete next-run tip. Not every metric applies to every mode; reports do not fabricate global rankings.
- **Three device-local medals/cosmetics:** Boot Camp Veteran (10 distinct campaign completions) → Gold Braid boonie; Clean Breach (successful MOUT, zero no-shoot hits, 80%+ accuracy) → Ice Cap; Squad Backbone (finished local War, two teammate assists, 10 objective seconds) → Rescue Hoodie. See **Ranks & Avatar Kits → Earned medal cosmetics**. Preview is separate from equip; locked rewards cannot be selected. No stat bonuses or money. These rewards are intentionally **local only** and the cloud rejects them as appearance IDs because local achievements are not authoritative. Existing free styles still sync as before. Clearing site data removes local medal unlocks.
- **OPTIONS → Environment** selects original, rain-soaked woodland, coastal training ground or floodlit night for the next campaign/War scene. Original course layouts, collision, targets and fairness are unchanged. MOUT retains its bespoke shoot-house lighting; swimming keeps its water-survival scene. Woodland has bounded rain particles/puddles/pines; coast adds sea/sand/palms off the playable route; night adds lamp posts and two non-shadow point lights. Performance/reduced-motion disables animated rain. Themes are cosmetic and local, not extra server maps. Weather costs are bounded; actual device performance still needs hardware testing.

All browser-local saves report denied storage instead of claiming cloud persistence. Offline medal unlocks do not create online inventory, cash or XP. Existing Supabase setup is still required for multiplayer. The assistant cannot deploy to the owner's Supabase account or run a real two-player hosted match without that access; the prepared server changes must be deployed by the owner, followed by the acceptance checks in `SUPABASE-SETUP.md`.
