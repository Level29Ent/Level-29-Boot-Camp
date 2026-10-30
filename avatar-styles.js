// Free, browser-local appearance variants. These are not cloud inventory IDs.
export const STYLE_PALETTES=[
  {id:'forest',name:'Forest',base:'#304c36',accent:'#b8d483'},
  {id:'desert',name:'Desert',base:'#8b6441',accent:'#f3d49a'},
  {id:'arctic',name:'Arctic',base:'#537887',accent:'#d2f4ff'},
  {id:'ember',name:'Ember',base:'#6b3030',accent:'#ff9867'},
  {id:'ocean',name:'Ocean',base:'#224b6d',accent:'#66d5ed'},
  {id:'violet',name:'Violet',base:'#50386d',accent:'#cf9bff'},
  {id:'gold',name:'Gold',base:'#66562d',accent:'#ffdb62'},
  {id:'slate',name:'Slate',base:'#3d4957',accent:'#c4cfde'},
  {id:'rose',name:'Rose',base:'#713b57',accent:'#ffa1c7'},
  {id:'mint',name:'Mint',base:'#285a50',accent:'#9bf3ce'},
  {id:'copper',name:'Copper',base:'#6c492f',accent:'#eeb081'},
  {id:'ivory',name:'Ivory',base:'#686952',accent:'#f5f1d2'}
];
// Normalized front/back vest decoration. The same rectangles drive SVG
// previews and actual 3D wearables, so the choices differ in shape, not name only.
export const STYLE_PATTERNS=[
  {id:'rails',name:'Twin Rails',rects:[[-.16,0,.07,.35],[.16,0,.07,.35]]},
  {id:'cross',name:'Rescue Cross',rects:[[0,0,.08,.36],[0,0,.4,.08]]},
  {id:'sash',name:'Diagonal Sash',rects:[[-.15,.12,.09,.09],[-.075,.06,.09,.09],[0,0,.09,.09],[.075,-.06,.09,.09],[.15,-.12,.09,.09]]},
  {id:'grid',name:'Field Grid',rects:[[-.14,.1,.09,.09],[0,.1,.09,.09],[.14,.1,.09,.09],[-.14,-.1,.09,.09],[0,-.1,.09,.09],[.14,-.1,.09,.09]]},
  {id:'bars',name:'Signal Bars',rects:[[0,.13,.38,.055],[0,0,.38,.055],[0,-.13,.38,.055]]},
  {id:'diamond',name:'Diamond',rects:[[0,.14,.07,.07],[-.1,.07,.07,.07],[.1,.07,.07,.07],[-.1,-.07,.07,.07],[.1,-.07,.07,.07],[0,-.14,.07,.07]]},
  {id:'frame',name:'Frame',rects:[[-.18,0,.04,.36],[.18,0,.04,.36],[0,.16,.36,.04],[0,-.16,.36,.04]]},
  {id:'offset',name:'Asymmetric',rects:[[-.14,0,.1,.36],[.09,.11,.17,.08],[.09,-.02,.17,.08]]},
  {id:'checker',name:'Checker',rects:[[-.15,.13,.09,.09],[.05,.13,.09,.09],[-.05,0,.09,.09],[.15,0,.09,.09],[-.15,-.13,.09,.09],[.05,-.13,.09,.09]]},
  {id:'beacon',name:'Beacon',rects:[[0,.1,.1,.24],[0,-.13,.1,.08],[-.16,.08,.06,.16],[.16,.08,.06,.16]]}
];
export const AVATAR_STYLES=STYLE_PALETTES.flatMap(palette=>STYLE_PATTERNS.map(pattern=>({
  id:palette.id+'-'+pattern.id,name:palette.name+' / '+pattern.name,palette,pattern
})));
const KEY='b29:avatar-style:v1';
export const styleFor=id=>AVATAR_STYLES.find(style=>style.id===id)||null;
let selected=null;
try{selected=styleFor(localStorage.getItem(KEY))?.id||null;}catch{}
export const selectedStyle=()=>selected;
export function selectStyle(id){
  if(id!==null&&!styleFor(id))return {ok:false,saved:false};
  selected=id;
  try{
    if(id===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,id);
    return {ok:true,saved:true};
  }catch{return {ok:true,saved:false};}
}
export function stylePreview(style){
  const {base,accent}=style.palette;
  const rects=style.pattern.rects.map(([x,y,w,h])=>`<rect x="${90+x*130-w*65}" y="${94-y*130-h*65}" width="${w*130}" height="${h*130}" fill="${accent}"/>`).join('');
  return `<svg class="avatar-preview" viewBox="0 0 180 210" role="img" aria-label="${style.name} visual style preview">
    <ellipse cx="90" cy="199" rx="54" ry="7" fill="#0b100a"/>
    <path d="M62 118h24v70H60zM94 118h24l2 70H94zM35 66h19v66H35zM126 66h19v66h-19z" fill="#647354"/>
    <path d="M58 180h29v17H53v-9zM93 180h29l5 8v9H93z" fill="#403c2e"/>
    <rect x="55" y="63" width="70" height="64" rx="4" fill="${base}"/>${rects}
    <path d="M34 83h21v8H34zM125 83h21v8h-21z" fill="${accent}"/>
    <rect x="73" y="22" width="34" height="39" rx="9" fill="#b88a70"/>
    <path d="M68 36q0-25 22-25t22 25z" fill="#53684b"/>
    <path d="M83 39h4M96 39h4" stroke="#1b241b" stroke-width="3"/>
  </svg>`;
}
