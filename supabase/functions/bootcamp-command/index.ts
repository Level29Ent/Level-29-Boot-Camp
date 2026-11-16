import {Database,createService,createHandler} from './service.js';
// Supabase injects these into Edge Functions. Never put them in client code.
const url=Deno.env.get('SUPABASE_URL');
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!key)throw new Error('Supabase runtime environment is missing.');
const origins=(Deno.env.get('BOOTCAMP_ALLOWED_ORIGINS')||'https://level29ent.github.io').split(',').map(s=>s.trim()).filter(Boolean);
Deno.serve(createHandler(createService(new Database(url,key)),{origins}));
