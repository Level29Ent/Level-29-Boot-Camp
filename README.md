# Level-29-Boot-Camp
Level 29 Boot Camp game

## Saving progress
- Create a profile once in **Player login / profile**, or restore your existing recovery code. Leave **Remember this device** enabled only on a trusted browser. The next visit restores that profile automatically.
- Cash, XP and match stats remain authoritative in the external cloud service. No profile/reward server code is included here.
- Keep a private recovery code to move between devices or recover after clearing browser data. Remembered sign-in codes are stored in this site's local storage; anyone using the browser can access that profile. **Forget this device** removes the saved sign-in, not the cloud profile or current session.
- Completed campaign training levels, scores and completion times auto-save in this browser only (shared by users of this browser, not synced between profiles/devices). Mid-level checkpoints are not saved. Browser storage failures are reported rather than presented as successful saves.

## 5v5 War controls
- WASD / joystick: move; Shift: sprint; Space: jump; C: crouch.
- Click the arena to capture the mouse, move it to look, hold left mouse / J to fire. Escape releases the mouse. Drag-to-look and arrow-key look remain available without mouse capture.
- Hold right mouse / K for close shoulder aim. E / R reloads.
- The camera follows the visible soldier over their right shoulder and pulls forward around cover. Shots converge on the centre reticle; the cloud service still decides movement, hits, damage, respawns and match rewards.

This is a static ES-module application; no build step or package install is required to deploy. The browser loads Three.js 0.160.0 using the import map in `index.html`. Live profile and match verification requires a cloud player account; no preview test account is provided.
