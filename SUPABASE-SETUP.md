# Set up your new Supabase project

**Nothing in this PR has been applied to Supabase.** The function URL in the game targets the newly supplied project `txrecpwlkdsyizulqnmn`. Until the steps below are complete, optional cloud features will fail; local play still works. The old project's accounts/recovery codes/cash are not copied. The old remembered recovery code stays under its original browser-storage key and is not sent to this project.

## Deploy from your computer

Use a computer terminal with Node.js 22+ and Git. No API key needs to go into the game or be sent to an assistant. From the updated repository checkout after merging this PR:

```sh
git pull --ff-only
npx supabase@3.1.0 login
npx supabase@3.1.0 link txrecpwlkdsyizulqnmn
npx supabase@3.1.0 db push --remote=txrecpwlkdsyizulqnmn --dry-run
```

Complete login and any database-password prompt **only in your own terminal**. Confirm that the target is your **new, empty** project and the only pending migration is `20261116050000_bootcamp.sql`. Then:

```sh
npx supabase@3.1.0 db push --remote=txrecpwlkdsyizulqnmn
npx supabase@3.1.0 functions deploy bootcamp-command --remote=txrecpwlkdsyizulqnmn --use-api --no-verify-jwt
```

Do not run a database reset. Do not use these instructions to overwrite a populated project. If either command fails, stop and retain the error (redact secrets), rather than repeatedly applying SQL manually. Supabase CLI 3.1.0 syntax was checked with installed command help; `db push` in this version is local by default, so the explicit `--remote` matters.

`verify_jwt=false` is intentional for the existing recovery-code protocol, **not** a database authorization bypass. Registration and health are public. Every other action checks a randomly generated 256-bit recovery code against its SHA-256 hash before reading private data. Tables have RLS enabled and no browser-role grants. The Edge Function uses Supabase-injected `SUPABASE_URL` and `SUPABASE_SECRET_KEYS.default` (legacy runtime service-role key fallback). Never copy service/secret keys into client JavaScript, Git, screenshots or chat.

The default allowed browser origin is `https://level29ent.github.io` (origin only, no trailing slash/path). Other sites—including Vercel previews and localhost—are denied until their exact origins are added to the function's optional `BOOTCAMP_ALLOWED_ORIGINS` environment variable. Use comma-separated exact origins, not `*`. CORS is not authentication: private operations always require the recovery code. See the official [secrets guide](https://supabase.com/docs/guides/functions/secrets) for environment configuration.

## Verify before announcing online play

1. Open the game and create a **new** optional cloud profile. Copy its private recovery code to a safe place. Refresh and confirm the same callsign/profile returns. Do not share the code.
2. Open a second independent browser/profile, create another recruit, and join a room using its six-character room code. Neither player should see the other's recovery code or private input.
3. Select a free style while signed in. Create/join a new room and check that the second browser sees it in the actual 3D match. New matches use the saved style; changing a local guest style does not synchronize it.
4. Test private PvP, separately hosted public PvP, co-op vs bots, all objective variants and each role. Only the host may start. Capture/Intel/Elimination allow PvP; Crucible/Escort are co-op only. Joiners choose their role before joining.
5. Finish a War match with at least 20 seconds of active play. Refresh the dossier twice: match cash/XP must be awarded once, and daily cash may be claimed only once. Local practice and online races never mint server rewards.
6. Test leaving/rejoining, closing one browser, expired rooms and bad recovery codes. Paused/closed clients must not keep moving/shooting after the 500ms input timeout. Finish a co-op failure and confirm it does not award a victory bonus.

Health can be checked without credentials in your own terminal:

```sh
curl 'https://txrecpwlkdsyizulqnmn.supabase.co/functions/v1/bootcamp-command' \
  -H 'Content-Type: application/json' --data '{"action":"health"}'
```

Expected response includes `ok:true`, `onlineWar:true`, `appearance:true`, and `raceRewards:false`. Health alone does not prove the migration or authenticated paths work; complete the browser checks too.

## Scope and limitations

- Backend code and tests are prepared, not remotely deployed/verified by the assistant. No Supabase credentials or authenticated integration were available in the session.
- This is a polling-based initial game server. Test real latency, concurrent players, CPU usage and billing before inviting a large audience. It is not a dedicated low-latency game-server cluster. Rate limits are intentionally conservative; deployment alone is not an anti-abuse guarantee.
- Offline ghosts and Drill Instructor badges remain browser-local. No global leaderboard is included.
- Online races are unranked because obstacle progress is still reported by the client. Race-specific cash/XP/achievements must remain disabled until server-side race validation exists.
- No migration from the previous unrelated Supabase project is attempted.
- For rollback, revert the client PR to return to local-only play; do not delete profile tables or reset the database. Preserve recovery codes and data backups before changing any deployed schema.

Official references: [deploy Edge Functions](https://supabase.com/docs/guides/functions/deploy), [function configuration](https://supabase.com/docs/guides/functions/function-configuration), [runtime secrets](https://supabase.com/docs/guides/functions/secrets).
