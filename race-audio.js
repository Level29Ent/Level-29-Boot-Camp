// Original procedural soundtrack. No commercial music or downloaded samples.
export class FieldAudio{
  constructor(){this.context=null;this.mode='both';this.volume=.3;this.beat=0;this.clock=0;this.active=false;}
  start(context){this.context=context;this.active=true;}
  stop(){this.active=false;}
  pulse(freq,duration,kind,gain){
    const c=this.context;if(!c||this.mode==='off')return;
    const o=c.createOscillator(),g=c.createGain();o.type=kind;
    o.frequency.setValueAtTime(freq,c.currentTime);
    g.gain.setValueAtTime(Math.max(.0001,gain*this.volume),c.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);
    o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration);
  }
  noise(duration,gain,frequency){
    const c=this.context;if(!c)return;
    const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);
    const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
    const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();
    src.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;
    g.gain.setValueAtTime(Math.max(.0001,gain*this.volume),c.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);
    src.connect(filter).connect(g).connect(c.destination);src.start();
  }
  tick(dt,muted){
    if(!this.active||muted||this.mode==='off'||!this.context)return;
    this.clock+=dt;if(this.clock<.25)return;this.clock%=.25;
    const beat=this.beat++;
    if(this.mode!=='ambience'){
      if(beat%4===0){this.pulse(62,.15,'triangle',.24);this.pulse(110,.35,'sine',.12);}
      if(beat%4===2||beat%16>=12)this.noise(.07,.11,2600);
      if(beat%2===0)this.pulse([110,130.81,146.83,164.81][Math.floor(beat/8)%4],.23,'triangle',.055);
    }
    if(this.mode!=='music'){
      if(beat%16===0)this.noise(2.5,.075,350); // wind / distant rotor bed
      if(beat%23===9){this.noise(.7,.16,125);this.pulse(38,.8,'sine',.15);}
      if(beat%31===18){this.noise(.035,.08,1800);this.pulse(85,.1,'sawtooth',.015);}
    }
  }
}
