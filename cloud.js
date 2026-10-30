import {rememberedPassport,rememberPassport} from './player-save.js';
const ENDPOINT='https://rubtdmmdxjvforydjjcn.supabase.co/functions/v1/bootcamp-command';
export const cloud={
  token:rememberedPassport(),remember:true,deviceError:false,deviceSaved:!!rememberedPassport(),profile:null,pending:null,revision:0,writes:0,change:0,
  async send(action,payload={},token=this.token){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,payload,token}),signal:controller.signal,credentials:'omit'});
      const data=await response.json();
      if(!response.ok)throw Object.assign(new Error(data.error||'Game service unavailable.'),{status:response.status});
      return data;
    }catch(e){if(e.name==='AbortError')throw new Error('Connection timed out. Please retry.');throw e;}
    finally{clearTimeout(timer);}
  },
  saveDevice(){
    const saved=rememberPassport(this.remember?this.token:'');
    this.deviceError=!saved;
    this.deviceSaved=saved&&this.remember&&!!this.token;
    return saved;
  },
  setRemember(value){this.remember=value;return this.saveDevice();},
  get saveStatus(){return this.deviceError?'Device storage unavailable · Copy your recovery code. To remove a previous saved login, clear this site’s browser data.':this.deviceSaved?'Auto-save on · Profile remembered on this device.':this.remember?'Device save unavailable · Copy your recovery code before leaving.':'Session only · Copy your recovery code before leaving.';},
  publish(profile){this.profile=profile;window.dispatchEvent(new CustomEvent('b29:profile',{detail:profile}));return profile;},
  async ensure(name='Recruit'){
    if(this.profile)return this.profile;
    if(this.pending)return this.pending;
    if(!this.token){window.dispatchEvent(new Event('b29:login'));throw new Error('Create or restore your recruit in Player Login first.');}
    this.pending=(async()=>{
      const revision=this.revision,token=this.token;
      let p;
      try{p=await this.send('profile',{},token);}
      catch(e){
        if((e.status===401||e.status===403)&&revision===this.revision&&token===this.token){
          this.token='';this.deviceSaved=false;rememberPassport('');
          window.dispatchEvent(new Event('b29:login'));
        }
        throw e;
      }
      return revision===this.revision&&token===this.token?this.publish(p):this.profile;
    })();
    try{return await this.pending;}finally{this.pending=null;}
  },
  async rpc(action,payload={}){await this.ensure(payload.name);return this.send(action,payload);},
  async refresh(){
    await this.ensure();const revision=this.revision,token=this.token,change=this.change;
    const p=await this.send('profile',{},token);
    return revision===this.revision&&token===this.token&&change===this.change&&!this.writes?this.publish(p):this.profile;
  },
  async restore(token){
    const profile=await this.send('profile',{},token.trim());
    this.revision++;this.change++;
    this.token=token.trim();this.saveDevice();
    return this.publish(profile);
  },
  async create(name){
    const result=await this.send('register',{name});
    this.revision++;this.change++;this.token=result.token;this.saveDevice();
    return this.publish(result.profile);
  },
  async mutate(action,payload){
    await this.ensure();const revision=this.revision,token=this.token;this.writes++;this.change++;
    try{const p=await this.send(action,payload,token);return revision===this.revision&&token===this.token?this.publish(p):this.profile;}
    finally{this.writes--;this.change++;}
  },
  get endpoint(){return ENDPOINT;}
};
