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

## Ranks and avatar kits
- **Ranks & Avatar Kits** previews the 10-rank XP ladder and four kits without signing in. Ranks use the existing progression: Recruit at 0 XP through Command at 9,000 XP, with 1,000 XP between ranks. Cloud-awarded XP determines your rank; training scores in local storage do not grant ranks.
- Purchase/equip the existing Recruit, Bronze Operator, Arctic Ghost and Gold Battalion cosmetics in **Command & Rewards → Armory**. Existing server IDs/prices are unchanged. Rigs and shoulder bands appear on the character, not just the nameplate. Rank patches use supplied cloud XP. These visuals do not change collision, damage or team helmet colors.
- Your signed-in kit appears on your soldier in races, campaign recruit stages and third-person War. Other players' kits/ranks render when room state supplies `equipped`/`xp`; absent XP does not imply a fabricated rank. Live cross-client propagation requires testing with the external room service.
- A global high-score leaderboard is **not implemented**: this repository has no authoritative score database or global-ranking API. Completing it requires the source/access for the external profile/match service, an agreed authoritative score metric, and a public-score endpoint that returns only safe fields (display name, score, rank and cosmetic ID), never private recovery codes. Browser-local training scores must not be trusted for global awards.

## 120 free visual styles
Open **Ranks & Avatar Kits**, filter the 12 palettes and clothing types, and select one of 10 different wearable designs per palette (120 distinct combinations). Ten cards render per page. Selection works without a cloud account. A selected style replaces the appearance of your cloud kit locally; **Use cloud Armory kit instead** removes the override. It never grants ownership, rank, XP, cash or stat boosts.

Styles save in this browser's local storage, shared by its players, and apply on your next deployment in races, campaign recruit stages and third-person War. A storage failure keeps the choice for the session and reports that it was not persisted. Other clients still see the cloud-owned kit: the external multiplayer service does not yet synchronize these local style IDs. Team-colored armbands identify War squads; head-covering styles replace the helmet locally. Collision geometry remains unchanged.


## Shaped clothing and material preview
The 120 local styles now use 10 recognizable silhouettes per palette: baseball cap, boonie hat, knit beanie, curly hair, ponytail, mohawk, crewneck shirt, pullover hoodie, bear mascot and fox mascot. Previous palette/pattern IDs remain valid and map to the upgraded wearables, so saved selections do not disappear.

Use the palette and clothing-type filters, then **View in 3D** to inspect the actual rotating character and **Use this style** to equip for the next deployment. Preview and selection are separate. Pause rotation to inspect the silhouette. The showroom uses the same wearable geometry/materials as gameplay, with cloth weave, knit ribs, matte cotton/canvas/fleece, directional hair texture and soft plush bump mapping. No external model/texture downloads are needed. Materials are cached; clothing geometry is disposed on swap and showroom rendering pauses offscreen.

War keeps team-colored armbands on both upper arms. Hats/hair/hoods/mascot heads replace the local helmet to prevent overlapping headgear; shirts keep the helmet. Cloud-owned kits and other players are unchanged. The new wardrobe is still browser-local, not synchronized to other clients. These are stylized 3D assets, not photorealistic licensed character models.

## Featured Level 29 Jester Mascot
The wardrobe now includes a 121st choice, **Level 29 / Jester Mascot**, inspired by the user-provided jester reference: purple/green/gold curved cap points with gold bell tips, a gold face with black eye mask and white lenses, a pointed-tooth grin, and a matching bell collar and outfit. It is a modeled full-body mascot, not the uploaded image pasted on a face. Find it first in the full catalog, or filter **Signature / Jester Mascot** and **Mascots**. The original 120 saved styles remain valid.

The featured mascot uses the same preview/equip/persistence flow and browser-local multiplayer limitation as other styles. The reference image is not bundled or transmitted to another service.
