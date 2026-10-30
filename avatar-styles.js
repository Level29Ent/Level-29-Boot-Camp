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
// Preserve existing saved IDs while upgrading each former pattern to a wearable.
export const STYLE_PATTERNS=[
  {id:'rails',name:'Baseball Cap',kind:'cap',category:'Caps',material:'Canvas'},
  {id:'cross',name:'Boonie Hat',kind:'boonie',category:'Hats',material:'Canvas'},
  {id:'sash',name:'Ribbed Beanie',kind:'beanie',category:'Hats',material:'Knit'},
  {id:'grid',name:'Curly Hair',kind:'curls',category:'Hair',material:'Hair'},
  {id:'bars',name:'Ponytail',kind:'ponytail',category:'Hair',material:'Hair'},
  {id:'diamond',name:'Mohawk',kind:'mohawk',category:'Hair',material:'Hair'},
  {id:'frame',name:'Crewneck Shirt',kind:'shirt',category:'Shirts',material:'Cotton'},
  {id:'offset',name:'Pullover Hoodie',kind:'hoodie',category:'Hoodies',material:'Fleece'},
  {id:'checker',name:'Bear Mascot',kind:'bear',category:'Mascots',material:'Plush'},
  {id:'beacon',name:'Fox Mascot',kind:'fox',category:'Mascots',material:'Plush'}
];
export const AVATAR_STYLES=STYLE_PALETTES.flatMap(palette=>STYLE_PATTERNS.map(pattern=>({
  id:palette.id+'-'+pattern.id,name:palette.name+' / '+pattern.name,palette,pattern
})));
export const STYLE_CATEGORIES=[...new Set(STYLE_PATTERNS.map(p=>p.category))];
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
// Lightweight catalog silhouettes; the live 3D viewer shows actual materials.
export function stylePreview(style){
  const {base,accent}=style.palette,{kind,material}=style.pattern;
  const headwear={
    cap:`<path d="M66 35q0-27 24-27t24 27z" fill="${base}"/><path d="M62 34h59l14 7H62z" fill="${accent}"/>`,
    boonie:`<ellipse cx="90" cy="35" rx="38" ry="9" fill="${accent}"/><path d="M68 33l6-24h32l6 24z" fill="${base}"/>`,
    beanie:`<path d="M64 37V26q0-25 26-25t26 25v11z" fill="${base}"/><path d="M64 30h52v10H64z" fill="${accent}"/>`,
    curls:`<path d="M65 35q-12-15 0-22q0-15 18-11q13-12 25 2q20 0 13 20l-7 12z" fill="${base}"/>`,
    ponytail:`<path d="M69 28q-14-26 20-26q26 0 26 28l9 11v45l-13-6-6-46z" fill="${base}"/>`,
    mohawk:`<path d="M82 31V2l7-7 9 7v29z" fill="${accent}"/>`
  }[kind]||'';
  const mascot=kind==='bear'||kind==='fox';
  const garment=['shirt','hoodie','bear','fox'].includes(kind);
  return `<svg class="avatar-preview" viewBox="0 0 180 220" role="img" aria-label="${style.name} ${material} silhouette">
    <ellipse cx="90" cy="208" rx="54" ry="7" fill="#0b100a"/>
    <path d="M62 126h24v70H60zM94 126h24l2 70H94z" fill="${mascot?base:'#647354'}"/>
    <path d="M55 76h70v57H55zM35 76h20v65H35zM125 76h20v65h-20z" fill="${garment?base:'#647354'}"/>
    ${kind==='hoodie'?`<path d="M60 78Q53 30 90 28q37 2 30 50l-11-16H71z" fill="${accent}"/><rect x="70" y="109" width="40" height="17" rx="7" fill="${accent}"/><path d="M80 77v26M100 77v26" stroke="#eee9d6" stroke-width="3"/>`:''}
    <rect x="73" y="32" width="34" height="39" rx="9" fill="#b88a70"/>
    <path d="M73 40q0-24 17-24t17 24z" fill="#443528"/>${headwear}
    ${mascot?`<ellipse cx="90" cy="40" rx="34" ry="32" fill="${base}"/>${kind==='bear'?`<circle cx="65" cy="13" r="12" fill="${base}"/><circle cx="115" cy="13" r="12" fill="${base}"/>`:`<path d="M59 20L58-6l24 20M98 14l24-20-1 28" fill="${base}"/>`}<ellipse cx="90" cy="51" rx="21" ry="16" fill="${accent}"/><circle cx="78" cy="36" r="4" fill="#171d17"/><circle cx="102" cy="36" r="4" fill="#171d17"/><ellipse cx="90" cy="47" rx="6" ry="4" fill="#171d17"/><ellipse cx="90" cy="103" rx="24" ry="26" fill="${accent}"/>`:''}
    ${kind==='shirt'?`<path d="M77 76q13 12 26 0" fill="none" stroke="${accent}" stroke-width="4"/>`:''}
  </svg>`;
}
