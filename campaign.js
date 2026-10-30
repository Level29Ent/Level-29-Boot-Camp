// Level 29 Boot Camp — 100-level campaign generator.
// Eight hand-built boot camp milestones plus 92 generated field-training gauntlets,
// each with a unique mix of military obstacles and live-fire shooting stations.

const MILESTONES = {
  0: { name: 'Yellow Footprints', week: 'RECEIVING', desc: 'A new beginning. Follow the gold markers, collect your gear, and report to your drill instructor.', tasks: ['Move with WASD or the touch pad. Drag the scene to rotate your camera.', 'Follow the glowing markers in order. Press E at each station.', 'Report to the drill instructor after collecting your gear.'], kind: 'receive', limit: 180 },
  9: { name: 'Close Order Drill', week: 'DRILL', desc: 'Discipline starts here. Respond to eight drill commands in time. This arcade exercise rewards attention and precision.', tasks: ['Stand on the parade deck. Watch for each command.', 'A = left face · D = right face · S = about face · E = attention.', 'Get at least 6 of 8 commands correct. You have 3 seconds per command.'], kind: 'drill', limit: 90 },
  24: { name: 'Confidence Course', week: 'CONDITIONING', desc: 'Find your confidence on the obstacle course. Clear four obstacles and reach the finish.', tasks: ['WASD to move. Shift to sprint; resting restores stamina.', 'Space to jump low walls. Hold C to crawl under the wire.', 'Near the tall wall, hold Space to climb. Follow the gold markers.'], kind: 'course', limit: 150 },
  39: { name: 'Combat Water Survival', week: 'WATER SURVIVAL', desc: 'Stay calm in the water. Swim through the five rescue buoys, then reach the ladder.', tasks: ['WASD to swim. Shift gives a burst but drains stamina.', 'Hold Space to tread water and recover your breath.', 'Touch every gold buoy in order. Keep your breath above zero.'], kind: 'swim', limit: 150 },
  54: { name: 'Pugil Stick Training', week: 'MARTIAL ARTS', desc: 'Controlled training in the padded ring. Read your opponent, block the incoming strikes, and counter.', tasks: ['J or click to strike. K or right-click to block.', 'Stay close to your opponent; WASD moves around the ring.', 'A gold wind-up signals an incoming strike. Block, then counter.'], kind: 'combat', limit: 150 },
  69: { name: 'Every Marine a Rifleman', week: 'MARKSMANSHIP', desc: 'Rifle qualification. Aim from an over-the-shoulder view and qualify with at least 6 hits from 12 shots.', tasks: ['Move the mouse or drag the scene to aim. Arrow keys also aim.', 'J or click to fire. Hold K to zoom; Shift steadies the sight.', 'Hit 6 targets before your 12 rounds run out.'], kind: 'range', limit: 180 },
  98: { name: 'The Crucible', week: 'CULMINATING CHALLENGE', desc: 'The final field challenge combines endurance, obstacles, and teamwork. No one finishes alone.', tasks: ['Collect the supply crate at the first marker with E.', 'Clear the wall with Space and crawl under the wire with C.', 'Reach your teammate and hold E to help them. March together to the summit.'], kind: 'crucible', limit: 200 },
  99: { name: 'Earned, Never Given', week: 'GRADUATION', desc: 'One final march. Join your formation, meet your instructor, and receive the emblem you have earned.', tasks: ['Follow the gold markers to the parade formation.', 'Press E to join your platoon.', 'Walk to the instructor and press E to complete the ceremony.'], kind: 'grad', limit: 120 }
};

export const OBSTACLES = {
  low_wall: { label: 'Jump the low wall', tier: 0, len: 10 },
  wire: { label: 'Crawl under the wire', tier: 0, len: 12 },
  hurdles: { label: 'Clear the hurdles', tier: 0, len: 14 },
  logs: { label: 'Hop the log hurdles', tier: 0, len: 14 },
  mud: { label: 'Push through the mud pit', tier: 0, len: 14 },
  weave: { label: 'Weave through the barriers', tier: 0, len: 16 },
  high_wall: { label: 'Climb the high wall', tier: 1, len: 10 },
  tunnel: { label: 'Crawl through the tunnel', tier: 1, len: 12 },
  water: { label: 'Wade the water crossing', tier: 1, len: 16 },
  trench: { label: 'Jump the trench', tier: 1, len: 10 },
  carry: { label: 'Ammo can carry', tier: 1, len: 22 },
  smoke: { label: 'Push through the smoke', tier: 1, len: 16 },
  beam: { label: 'Cross the balance beam', tier: 2, len: 14 },
  bars: { label: 'Cross the monkey bars', tier: 2, len: 12 },
  mines: { label: 'Cross the minefield in the marked lane', tier: 2, len: 18 },
  cargo_net: { label: 'Climb the cargo net', tier: 2, len: 10 },
  rope: { label: 'Climb the rope wall', tier: 2, len: 10 },
  sprint: { label: 'Sprint under fire', tier: 2, len: 22 }
};
export const STATIONS = {
  static: { label: 'Firing line · engage the targets', unlock: 1 },
  cover: { label: 'Take cover and engage', unlock: 1 },
  popup: { label: 'Hit the pop-up targets', unlock: 6 },
  plates: { label: 'Knock down the steel plates', unlock: 6 },
  moving: { label: 'Hit the moving targets', unlock: 15 },
  timed: { label: 'Timed fire · beat the clock', unlock: 15 },
  far: { label: 'Long-range targets · zoom with K', unlock: 30 },
  noshoot: { label: 'Shoot red only · blue is friendly', unlock: 30 }
};

const ENVS = ['course', 'forest', 'range', 'combat', 'coast', 'crucible', 'night', 'mountain'];
const PLACES = { course: 'Twentynine Palms', forest: 'Camp Lejeune', range: 'Edson Range', combat: 'Camp Pendleton', coast: 'Parris Island', crucible: 'Camp Horno', night: 'Camp Pendleton · night', mountain: 'Bridgeport · mountain warfare' };
const ADJ = ['Iron', 'Steel', 'Granite', 'Thunder', 'Devil Dog', 'Raider', 'Spartan', 'Hellfire', 'Bulldog', 'Leatherneck', 'Red Clay', 'Stormfront', 'Viper', 'Saber', 'Gunnery', 'Warpath', 'Crossbow', 'Bayonet'];
const ENV_ADJ = { course: ['Dust Devil', 'Sandstorm', 'Sun Scorch'], night: ['Midnight', 'Blackout', 'Nightfall'], mountain: ['Frostbite', 'Summit', 'Ice Ridge'], coast: ['Black Sand', 'Tidewater', 'Salt Marsh'], forest: ['Timber', 'Pine Hollow', 'Green Line'], crucible: ['First Light', 'Reaper', 'Daybreak'], combat: ['Sundown', 'Copper', 'Ember'], range: ['Known Distance', 'Bullseye', 'Hard Target'] };
const NOUN = ['Gauntlet', 'Run', 'Ridge', 'Crossing', 'Trail', 'Push', 'Line', 'Pass', 'March', 'Breach', 'Circuit', 'Lane', 'Hollow', 'Grind', 'Assault'];

function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function phaseOf(n) { return n < 25 ? 'FOUNDATION' : n < 55 ? 'IMMERSION' : n < 99 ? 'TRANSFORMATION' : 'TRANSITION'; }

function makeGauntlet(n, used, usedNames) {
  const r = rng(1009 + n * 7919), d = n / 99;
  const tierMax = n < 12 ? 0 : n < 30 ? 1 : 2;
  const pool = Object.keys(OBSTACLES).filter(k => OBSTACLES[k].tier <= tierMax);
  const spool = Object.keys(STATIONS).filter(k => STATIONS[k].unlock <= n);
  const obsCount = Math.min(7, 3 + Math.floor(n / 22) + (r() < 0.35 ? 1 : 0));
  const stCount = 1 + (n >= 40 ? 1 : 0) + (n >= 78 ? 1 : 0);
  let obs, sts, sig, tries = 0;
  // newest unlocked obstacle gets featured the first few levels after it unlocks
  const fresh = Object.keys(OBSTACLES).filter(k => OBSTACLES[k].tier === tierMax);
  do {
    const bag = pool.slice(); obs = [];
    if (tries < 40 && fresh.length && r() < 0.8) { const f = fresh[Math.floor(r() * fresh.length)]; obs.push(f); bag.splice(bag.indexOf(f), 1); }
    while (obs.length < obsCount && bag.length) { const i = Math.floor(r() * bag.length); obs.push(bag.splice(i, 1)[0]); }
    for (let i = obs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [obs[i], obs[j]] = [obs[j], obs[i]]; }
    const sb = spool.slice(); sts = [];
    while (sts.length < stCount && sb.length) { const i = Math.floor(r() * sb.length); sts.push(sb.splice(i, 1)[0]); }
    sig = obs.slice().sort().join('+') + '|' + sts.slice().sort().join('+');
    tries++;
  } while (used.has(sig) && tries < 200);
  used.add(sig);
  // interleave stations through the course
  const segs = obs.map(t => ({ t }));
  sts.forEach((s, i) => {
    const pos = Math.min(segs.length, Math.round(((i + 1) * segs.length) / (sts.length + 1)) + i);
    const req = Math.min(8, 3 + Math.round(d * 4) + (s === 'plates' ? 1 : 0) - (s === 'far' ? 1 : 0));
    segs.splice(pos, 0, { t: 'shoot', s, req, spare: Math.max(2, 6 - Math.round(d * 4)), size: 1 - d * 0.4, speed: 0.8 + d * 2.2, up: 2.6 - d * 1.3, tlimit: Math.round(14 - d * 5) });
  });
  const env = ENVS[(n * 3 + Math.floor(r() * 3)) % ENVS.length];
  let name, k = 0;
  do { const AL = r() < 0.45 ? ENV_ADJ[env] : ADJ; name = AL[Math.floor(r() * AL.length)] + ' ' + NOUN[Math.floor(r() * NOUN.length)]; k++; } while (usedNames.has(name) && k < 300);
  usedNames.add(name);
  const obsNames = obs.map(o => OBSTACLES[o].label.toLowerCase());
  const shoot = sts.map(s => ({ static: 'a firing line', cover: 'a covered firing position', popup: 'pop-up targets', plates: 'steel plates', moving: 'moving targets', timed: 'a timed string of fire', far: 'long-range targets', noshoot: 'a shoot or no-shoot lane' }[s]));
  const desc = `${PLACES[env]}. ${obs.length} obstacles, including: ${obsNames.slice(0, 3).join(', ')}${obs.length > 3 ? ', and more' : ''}. Then live fire: ${shoot.join(', ')}.`;
  const tasks = ['Follow the gold markers. Shift to sprint, Space to jump or climb, C to crawl.', 'Firing stations start automatically: aim with the mouse, J or click to fire, K to zoom.', 'Fall off a beam, the bars, or into a trench and you restart that obstacle.'];
  if (obs.includes('bars')) tasks.push('Monkey bars: hold Space the whole way across.');
  if (obs.includes('mines')) tasks.push('Minefield: stay between the white tape as the lane zig-zags.');
  if (obs.includes('carry')) tasks.push('Ammo can: press E to pick it up and E again to deliver it.');
  if (sts.includes('noshoot')) tasks.push('Blue targets are friendly. Hitting one costs points.');
  const budget = segs.reduce((a, s) => a + (s.t === 'shoot' ? 26 + s.req * 2 : (OBSTACLES[s.t].len) * 1.1 + 4), 0);
  const limit = Math.round((budget * (1.7 - d * 0.45) + 20) / 5) * 5;
  return { name, week: 'FIELD TRAINING · ' + PLACES[env].toUpperCase(), desc, tasks: tasks.slice(0, 5), kind: 'gauntlet', env, segs, limit, diff: d };
}

export function buildCampaign() {
  const used = new Set(), usedNames = new Set(['Iron Gauntlet']);
  const out = [];
  for (let n = 0; n < 100; n++) {
    const base = MILESTONES[n] ? { ...MILESTONES[n], milestone: true } : makeGauntlet(n, used, usedNames);
    out.push({ ...base, phase: phaseOf(n), num: n + 1 });
  }
  return out;
}
