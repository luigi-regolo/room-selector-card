/**
 * Room Selector Card — experimental Home Assistant custom dashboard card.
 * Development version: 0.1 (not a public release).
 * Copyright (c) 2026 luigi-regolo. SPDX-License-Identifier: GPL-3.0-only.
 * No telemetry, external dependencies, credentials, or remote assets.
 */
const RS_TAG = 'room-selector-card';
const RS_EDITOR = 'room-selector-card-editor';
const RS_DEFAULTS = Object.freeze({
  type: 'custom:room-selector-card',
  eyebrow: 'SELEZIONA AMBIENTE',
  theme_mode: 'auto',
  selection_entity: '',
  room_icons: {},
  lights: [],
  climates: [],
  alarm_entity: '', // Legacy configuration supported
  alarms: [],
  washer_entity: '', // Legacy configuration supported
  washers: [], dryers: [], dryer_active_state: 'on',
  cooling_climates: [], lock_entity: '',
  alarm_away_script: '', lock_action_entity: '',
  alarm_time_entity: '', washer_time_entity: '', dryer_time_entity: '',
  heating_time_entity: '', cooling_time_entity: '',
  custom_indicators: [],
  washer_active_state: 'on',
  energy_entity: '',
  controls_enabled: false,
  show_details_button: true
});
const RS_DOMAINS = Object.freeze({
  selection_entity: ['input_select', 'select'],
  lights: ['light'],
  climates: ['climate'],
  alarm_entity: ['alarm_control_panel'],
  alarms: ['alarm_control_panel'],
  washer_entity: ['binary_sensor', 'sensor', 'switch', 'input_boolean'],
  washers: ['binary_sensor', 'sensor', 'switch', 'input_boolean'],
  dryers: ['binary_sensor', 'sensor', 'switch', 'input_boolean'],
  cooling_climates: ['climate'], lock_entity: ['lock'],
  alarm_away_script: ['script'], lock_action_entity: ['lock','script'],
  alarm_time_entity: ['sensor'], washer_time_entity: ['sensor'],
  dryer_time_entity: ['sensor'], heating_time_entity: ['sensor'],
  cooling_time_entity: ['sensor'],
  custom_entities: ['input_boolean', 'binary_sensor', 'sensor', 'light', 'switch', 'fan', 'climate', 'cover', 'alarm_control_panel'],
  energy_entity: ['sensor']
});
const RS_ARMED = new Set(['armed_home','armed_away','armed_night','armed_vacation','armed_custom_bypass']);
const RS_ALARM_ATTENTION = new Set(['triggered','arming','pending']);
function rsText(value, max=80) { return String(value ?? '').trim().slice(0,max); }
function rsEsc(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function rsEntity(value, domains) {
  const id=rsText(value,160);
  return domains.includes(id.split('.')[0]) && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(id) ? id : '';
}
function rsIcon(value, fallback='mdi:home-outline') {
  const icon=rsText(value,80);
  return /^mdi:[a-z0-9-]+$/.test(icon) ? icon : fallback;
}
function rsArray(value, domains) {
  return Array.isArray(value) ? [...new Set(value.map(v=>rsEntity(v,domains)).filter(Boolean))].slice(0,40) : [];
}
function rsCustom(raw={}) {
  const r=raw && typeof raw==='object' && !Array.isArray(raw) ? raw : {};
  return {
    name:rsText(r.name||'Nuovo indicatore',55),
    icon:rsIcon(r.icon,'mdi:information-outline'),
    active_state:rsText(r.active_state??'on',60)||'on',
    entities:rsArray(r.entities,RS_DOMAINS.custom_entities)
  };
}
function rsIsCustomActive(entity, custom) {
  if(!rsKnown(entity))return false;
  // Exact matching prevents unknown / unavailable values from appearing active.
  return entity.state===custom.active_state;
}
function rsConfig(raw={}) {
  const r=raw && typeof raw==='object' && !Array.isArray(raw) ? raw : {};
  const icons={};
  if (r.room_icons && typeof r.room_icons==='object' && !Array.isArray(r.room_icons)) {
    for (const [name,icon] of Object.entries(r.room_icons).slice(0,50)) {
      if(rsText(name,70)) icons[rsText(name,70)]=rsIcon(icon);
    }
  }
  return {
    ...r, type:RS_DEFAULTS.type,
    eyebrow:rsText(r.eyebrow ?? RS_DEFAULTS.eyebrow,55) || RS_DEFAULTS.eyebrow,
    theme_mode:['auto','light','dark'].includes(r.theme_mode) ? r.theme_mode:'auto',
    selection_entity:rsEntity(r.selection_entity,RS_DOMAINS.selection_entity),
    room_icons:icons,
    lights:rsArray(r.lights,RS_DOMAINS.lights),
    climates:rsArray(r.climates,RS_DOMAINS.climates),
    alarm_entity:rsEntity(r.alarm_entity,RS_DOMAINS.alarm_entity),
    alarms:rsArray(Array.isArray(r.alarms)?r.alarms:(r.alarm_entity?[r.alarm_entity]:[]),RS_DOMAINS.alarms),
    washer_entity:rsEntity(r.washer_entity,RS_DOMAINS.washer_entity),
    washers:rsArray(Array.isArray(r.washers)?r.washers:(r.washer_entity?[r.washer_entity]:[]),RS_DOMAINS.washers),
    dryers:rsArray(r.dryers,RS_DOMAINS.dryers),
    dryer_active_state:rsText(r.dryer_active_state??'on',40)||'on',
    cooling_climates:rsArray(r.cooling_climates,RS_DOMAINS.cooling_climates),
    lock_entity:rsEntity(r.lock_entity,RS_DOMAINS.lock_entity),
    alarm_away_script:rsEntity(r.alarm_away_script,RS_DOMAINS.alarm_away_script),
    lock_action_entity:rsEntity(r.lock_action_entity,RS_DOMAINS.lock_action_entity),
    alarm_time_entity:rsEntity(r.alarm_time_entity,RS_DOMAINS.alarm_time_entity),
    washer_time_entity:rsEntity(r.washer_time_entity,RS_DOMAINS.washer_time_entity),
    dryer_time_entity:rsEntity(r.dryer_time_entity,RS_DOMAINS.dryer_time_entity),
    heating_time_entity:rsEntity(r.heating_time_entity,RS_DOMAINS.heating_time_entity),
    cooling_time_entity:rsEntity(r.cooling_time_entity,RS_DOMAINS.cooling_time_entity),
    custom_indicators:Array.isArray(r.custom_indicators)?r.custom_indicators.slice(0,16).map(rsCustom):[],
    washer_active_state:rsText(r.washer_active_state ?? 'on',40) || 'on',
    energy_entity:rsEntity(r.energy_entity,RS_DOMAINS.energy_entity),
    controls_enabled:r.controls_enabled===true,
    show_details_button:r.show_details_button!==false
  };
}
function rsKnown(state) { return !!state && !['unknown','unavailable',''].includes(state.state); }
function rsDefaultIcon(room) {
  const t=String(room).toLowerCase();
  if(/lavanderia|laundry/.test(t))return 'mdi:washing-machine';
  if(/bagno|bath/.test(t))return 'mdi:bathtub-outline';
  if(/camera|bedroom/.test(t))return 'mdi:bed-double-outline';
  if(/open space|salotto|living|soggiorno/.test(t))return 'mdi:sofa-outline';
  if(/cucina|kitchen/.test(t))return 'mdi:chef-hat';
  return 'mdi:home-outline';
}
function rsDuration(date) {
  const ms=Date.now()-Date.parse(date || '');
  if(!Number.isFinite(ms)||ms<0)return '';
  const minutes=Math.floor(ms/60000);
  if(minutes<1)return 'da poco';
  if(minutes<60)return `da ${minutes} min`;
  const hours=Math.floor(minutes/60);
  if(hours<24)return `da ${hours} ${hours===1?'ora':'ore'}${minutes%60?` e ${minutes%60} min`:''}`;
  const days=Math.floor(hours/24);
  return `da ${days} ${days===1?'giorno':'giorni'}${hours%24?` e ${hours%24} h`:''}`;
}
const RS_STYLE = `
:host{display:block;min-width:0;container-type:inline-size;font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif));font-size:14px}
*,*:before,*:after{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
.rs-card{--rs-green:#0a7156;--rs-bg:#fafbf9;--rs-text:#18221c;--rs-muted:#56675c;--rs-surface:#f0f2ef;--rs-circle:#fff;--rs-line:#e0e5df;background:var(--rs-bg);color:var(--rs-text);border:1px solid var(--rs-line);border-radius:26px;padding:18px;min-width:0;position:relative}
.rs-card.rs-dark{--rs-green:#0e795d;--rs-bg:#101211;--rs-text:#f5f7f4;--rs-muted:#bbc5bd;--rs-surface:#191c1a;--rs-circle:#282b29;--rs-line:#2b302c}
.rs-card.rs-light{--rs-green:#0a7156;--rs-bg:#fafbf9;--rs-text:#18221c;--rs-muted:#56675c;--rs-surface:#f0f2ef;--rs-circle:#fff;--rs-line:#e0e5df}
.rs-header{display:flex;gap:12px;justify-content:space-between;align-items:center;min-width:0;margin:2px 4px 0}.rs-headtext{min-width:0}.rs-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:750;color:var(--rs-muted);margin:0 0 7px;text-transform:uppercase;line-height:1.1}
.rs-title{font-size:clamp(23px,5.8cqw,25px);font-weight:780;line-height:1.14;margin:0;min-width:0;overflow-wrap:anywhere;letter-spacing:-.7px}.rs-dot{color:var(--rs-green)}
.rs-toggle{background:var(--rs-green);color:#fff;border:0;min-width:42px;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex:none}.rs-toggle ha-icon{--mdc-icon-size:21px}
.rs-toggle:focus-visible,.rs-chip:focus-visible,.rs-details:focus-visible{outline:2px solid var(--rs-green);outline-offset:3px}
.rs-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}
.rs-chip{border:1px solid var(--rs-line);background:var(--rs-surface);color:var(--rs-text);border-radius:14px;padding:9px 11px;min-height:40px;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;max-width:100%;white-space:normal;text-align:left}
.rs-chip ha-icon{--mdc-icon-size:18px;flex:none}.rs-chip.light ha-icon{color:#e4b24d}.rs-chip.climate ha-icon{color:#eb9654}.rs-chip.alarm ha-icon{color:#0b9b77}.rs-chip.alarm-critical ha-icon{color:#db6867}.rs-chip.washer ha-icon{color:#87a7ba}.rs-chip.dryer ha-icon{color:#87a7ba}.rs-chip.cooling ha-icon{color:#7caadd}.rs-chip.alarm-off ha-icon,.rs-chip.lock-unknown ha-icon{color:var(--rs-muted)}.rs-chip.lock-locked ha-icon{color:#0b9b77}.rs-chip.lock-unlocked ha-icon,.rs-chip.lock-moving ha-icon{color:#dcaa55}.rs-chip.lock-critical ha-icon{color:#db6867}.rs-chip.custom ha-icon{color:var(--rs-green)}
.rs-bottom{display:flex;justify-content:flex-start}.rs-details{display:inline-flex;align-items:center;justify-content:center;vertical-align:top;gap:5px;border:0;border-radius:999px;color:#fff;background:var(--rs-green);padding:5px 9px;margin:12px 0 0;font-family:inherit;font-size:11px;font-weight:650;line-height:1.2;cursor:pointer;white-space:nowrap}
.rs-details ha-icon{display:block;flex:none;margin:0;--mdc-icon-size:14px;width:14px;height:14px;color:inherit}.rs-notice{font-size:12px;color:var(--rs-muted);margin:13px 4px 0;line-height:1.45}.rs-error{font-size:12px;color:var(--error-color,#d86d60);margin-top:10px;overflow-wrap:anywhere}
@container(max-width:360px){.rs-card{padding:13px;border-radius:23px}.rs-title{font-size:23px}.rs-chips{gap:6px;margin-top:12px}.rs-chip{font-size:11px;padding:7px 9px;min-height:36px}.rs-toggle{min-width:38px;width:38px;height:38px}}
@media(prefers-reduced-motion:reduce){.rs-toggle,.rs-chip,.rs-details{transition:none!important}}
`;
const RS_OVERLAY_STYLE = `
:host{font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif));font-size:14px}
*,*:before,*:after{box-sizing:border-box}button{font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
.rs-layer{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;background:#0009;overscroll-behavior:contain;pointer-events:auto}
.rs-layer.menu-layer{background:transparent;pointer-events:auto;align-items:initial;justify-content:initial;padding:0}
.rs-panel,.rs-menu{--rs-green:#0a7156;--rs-bg:#fafbf9;--rs-text:#18221c;--rs-muted:#56675c;--rs-surface:#f0f2ef;--rs-circle:#fff;--rs-line:#e0e5df;background:var(--rs-bg);color:var(--rs-text);border:1px solid var(--rs-line);border-radius:26px;box-shadow:0 18px 60px #0005;min-width:0}
.rs-panel.rs-dark,.rs-menu.rs-dark{--rs-green:#0e795d;--rs-bg:#101211;--rs-text:#f5f7f4;--rs-muted:#bbc5bd;--rs-surface:#191c1a;--rs-circle:#282b29;--rs-line:#2b302c}
.rs-panel.rs-light,.rs-menu.rs-light{--rs-green:#0a7156;--rs-bg:#fafbf9;--rs-text:#18221c;--rs-muted:#56675c;--rs-surface:#f0f2ef;--rs-circle:#fff;--rs-line:#e0e5df}
.rs-panel{width:min(390px,100%);max-height:min(90vh,720px);max-height:min(90dvh,720px);display:flex;flex-direction:column;overflow:hidden;padding:20px}
.rs-dialog-top{display:flex;align-items:center;gap:10px;min-height:38px;margin:0 0 12px;background:var(--rs-bg);flex:none}.rs-dialog-top strong{flex:1;min-width:0;font-size:17px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}
.rs-x{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--rs-surface);border:0;color:var(--rs-text);padding:0}.rs-x ha-icon{--mdc-icon-size:18px}
.rs-dialog-body{padding:0 2px 2px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;min-height:0;-webkit-overflow-scrolling:touch;scrollbar-gutter:stable}
.rs-row{display:flex;align-items:center;gap:10px;background:var(--rs-surface);border:1px solid var(--rs-line);padding:11px 12px;border-radius:14px;min-width:0;margin:0 0 9px;min-height:66px}
.rs-row-icon{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;color:var(--rs-text);background:var(--rs-circle)}.rs-row-icon ha-icon{--mdc-icon-size:20px}.rs-custom-items{margin:0 0 12px 14px;padding-left:10px;border-left:2px solid var(--rs-line)}.rs-custom-item{display:flex;align-items:center;gap:9px;padding:7px 0;font-size:12px}.rs-custom-item span{flex:1;overflow-wrap:anywhere}.rs-custom-item button{font:inherit;font-size:12px;padding:6px 9px;border:1px solid var(--rs-line);border-radius:9px;background:var(--rs-surface);color:var(--rs-text);cursor:pointer}
.rs-row-txt{flex:1;min-width:0}.rs-row-title{font-size:13px;font-weight:650}.rs-row-desc{font-size:12px;color:var(--rs-muted);margin-top:3px;overflow-wrap:anywhere}.rs-row button{border:1px solid var(--rs-line);border-radius:999px;color:var(--rs-text);background:var(--rs-circle);padding:8px 10px;font-size:11px;min-height:32px;white-space:nowrap;flex:none}
.rs-row.rs-row-action{display:block}.rs-row-main{display:flex;align-items:center;gap:10px;min-width:0}.rs-row-shortcut{border-top:1px solid var(--rs-line);margin-top:9px;padding-top:9px;display:flex;align-items:center;justify-content:space-between;gap:10px}.rs-row-shortcut span{font-size:12px;color:var(--rs-muted);min-width:0}.rs-row-shortcut button{min-height:30px;padding:6px 12px;background:var(--rs-green);color:#fff;border:0}.rs-row-shortcut button:focus-visible{outline:2px solid var(--rs-green);outline-offset:2px}
.rs-help{font-size:12px;color:var(--rs-muted);line-height:1.5;margin:11px 2px}.rs-confirm{border:1px solid #bd8a4e;background:#b17c2a1c;padding:12px;border-radius:14px;margin-bottom:12px}.rs-confirm p{font-size:13px;margin:0 0 10px}.rs-confirm-actions{display:flex;gap:9px}.rs-confirm-actions button{border-radius:999px;min-height:36px;font-size:12px;border:1px solid var(--rs-line);padding:7px 12px;color:var(--rs-text);background:var(--rs-circle)}.rs-confirm-actions button.primary{background:var(--rs-green);border-color:var(--rs-green);color:#fff}
.rs-menu{position:fixed;max-height:min(460px,calc(100dvh - 20px));overflow-y:auto;overflow-x:hidden;min-width:220px;max-width:calc(100vw - 16px);padding:8px;border-radius:18px;box-shadow:0 18px 60px #0009}
.rs-menu button{font-size:13px;border:0;color:var(--rs-text);background:transparent;display:flex;align-items:center;gap:11px;min-height:46px;width:100%;border-radius:12px;padding:8px 12px;text-align:left}.rs-menu button[aria-current=true]{background:var(--rs-green);color:#fff}.rs-menu button span{flex:1;overflow-wrap:anywhere}.rs-menu ha-icon{--mdc-icon-size:20px;flex:none}
.rs-menu button:focus-visible,.rs-x:focus-visible,.rs-row button:focus-visible,.rs-confirm-actions button:focus-visible{outline:2px solid var(--rs-green);outline-offset:2px}
@media(max-width:420px){.rs-panel{padding:14px;border-radius:23px;width:min(390px,100%)}.rs-row{gap:8px;padding:10px}.rs-row-icon{width:34px;height:34px}.rs-row button{font-size:10px}}
`;
class RoomSelectorCard extends HTMLElement {
  static getStubConfig(){return rsConfig();}
  static getConfigElement(){return document.createElement(RS_EDITOR);}
  constructor(){
    super();this.attachShadow({mode:'open'});this._config=rsConfig();this._hass=null;
    this._clockTimer=null;this._sig='';this._overlaySig='';this._overlay=null;this._overlayMode='';this._confirm='';this._busy=false;this._error='';this._feedback='';this._sentActions=new Set();this._returnFocus=null;
    this._onCardClick=e=>this._cardClick(e);this.shadowRoot.addEventListener('click',this._onCardClick);
    this._outside=e=>{if(e.target===this._overlay)this._closeOverlay();};
    this._escape=e=>{if(!this._overlay)return;if(e.key==='Escape'){e.preventDefault();this._closeOverlay();return;}if(e.key==='Tab'&&this._overlayMode==='details'){const buttons=[...this._overlay.shadowRoot.querySelectorAll('button:not([disabled])')];if(!buttons.length)return;const active=this._overlay.shadowRoot.activeElement;const index=buttons.indexOf(active);if(e.shiftKey && (index<=0)){e.preventDefault();buttons[buttons.length-1].focus();}else if(!e.shiftKey && index===buttons.length-1){e.preventDefault();buttons[0].focus();}}};
    this._onMove=()=>{if(this._overlayMode==='menu')this._positionMenu();};
  }
  connectedCallback(){this._render();this._syncClock();}
  disconnectedCallback(){this._stopClock();this._closeOverlay();}
  setConfig(raw){this._config=rsConfig(raw);this._sig='';this._closeOverlay();this._render();this._syncClock();}
  set hass(hass){this._hass=hass;const old=this._sig;this._render();if(this._overlayMode==='details'&&old!==this._sig)this._renderOverlay();this._syncClock();}
  getCardSize(){return 3;}
  _state(id){return id ? this._hass?.states?.[id]:null;}
  _palette(){const m=this._config.theme_mode;return `rs-${m==='auto'?(this._hass?.themes?.darkMode===true?'dark':'light'):m}`;}
  _options(){const obj=this._state(this._config.selection_entity);return Array.isArray(obj?.attributes?.options)?obj.attributes.options.filter(x=>typeof x==='string').slice(0,80):[];}
  _current(){const state=this._state(this._config.selection_entity);return rsKnown(state)?state.state:'';}
  _roomIcon(room){return this._config.room_icons[room]||rsDefaultIcon(room);}
  _active(){
 const c=this._config;
 const lights=c.lights.filter(id=>this._state(id)?.state==='on');
 const climates=c.climates.filter(id=>this._state(id)?.attributes?.hvac_action==='heating');
 const alarms=c.alarms.filter(id=>{const a=this._state(id);return rsKnown(a)&&(RS_ARMED.has(a.state)||RS_ALARM_ATTENTION.has(a.state));});
 const washers=c.washers.filter(id=>{const a=this._state(id);return rsKnown(a)&&a.state===c.washer_active_state;});
 const dryers=c.dryers.filter(id=>{const a=this._state(id);return rsKnown(a)&&a.state===c.dryer_active_state;});
 const cooling=c.cooling_climates.filter(id=>this._state(id)?.attributes?.hvac_action==='cooling');
 const custom=c.custom_indicators.map((indicator,index)=>({index,indicator,active:indicator.entities.filter(id=>rsIsCustomActive(this._state(id),indicator))}));
 return {lights,climates,alarms,washers,dryers,cooling,custom};
}
  _timeValue(id){const e=this._state(id);if(!rsKnown(e))return '';const value=rsText(e.state,80),unit=rsText(e.attributes?.unit_of_measurement||'',18);return value+(unit&&!value.endsWith(unit)?' '+unit:'');}
  _alarmInfo(){
 const c=this._config,a=this._active();
 if(!c.alarms.length)return {label:'Allarme da configurare',kind:'alarm-off',icon:'mdi:shield-outline'};
 const rows=c.alarms.map(id=>this._state(id));
 if(rows.some(e=>e?.state==='triggered'))return {label:'Allarme in corso',kind:'alarm-critical',icon:'mdi:shield-alert-outline'};
 if(rows.some(e=>e?.state==='arming'||e?.state==='pending'))return {label:'Allarme in transizione',kind:'alarm-critical',icon:'mdi:shield-alert-outline'};
 if(a.alarms.length)return {label:a.alarms.length===1?'Allarme inserito':a.alarms.length+' allarmi inseriti',kind:'alarm',icon:'mdi:shield-lock-outline'};
 if(rows.every(e=>e?.state==='disarmed'))return {label:'Allarme disinserito',kind:'alarm-off',icon:'mdi:shield-off-outline'};
 return {label:'Allarme non disponibile',kind:'alarm-off',icon:'mdi:shield-outline'};
}
  _lockInfo(){
 const id=this._config.lock_entity,e=this._state(id);
 if(!id)return {label:'Serratura da configurare',kind:'lock-unknown',icon:'mdi:lock-question'};
 if(!rsKnown(e))return {label:'Serratura non disponibile',kind:'lock-unknown',icon:'mdi:lock-question'};
 if(e.state==='locked')return {label:'Porta bloccata',kind:'lock-locked',icon:'mdi:lock-outline'};
 if(e.state==='unlocked')return {label:'Porta sbloccata',kind:'lock-unlocked',icon:'mdi:lock-open-outline'};
 if(e.state==='locking'||e.state==='unlocking')return {label:'Serratura in movimento',kind:'lock-moving',icon:'mdi:lock-clock'};
 if(e.state==='jammed')return {label:'Serratura inceppata',kind:'lock-critical',icon:'mdi:lock-alert-outline'};
 if(e.state==='open')return {label:'Porta aperta',kind:'lock-unlocked',icon:'mdi:door-open'};
 return {label:'Stato serratura: '+rsText(e.state,30),kind:'lock-unknown',icon:'mdi:lock-question'};
}
  _stopClock(){if(this._clockTimer!=null){window.clearInterval?.(this._clockTimer);this._clockTimer=null;}}
  _syncClock(){
    if(!this.isConnected)return;
    const active=this._active().alarms.length>0;
    if(!active){this._stopClock();return;}
    if(this._clockTimer!=null||typeof window.setInterval!=='function')return;
    // Only active alarms need the passage-of-time refresh; no network polling.
    this._clockTimer=window.setInterval(()=>{
      if(!this.isConnected)return;
      const old=this._sig;this._render();
      if(this._overlayMode==='details'&&old!==this._sig)this._renderOverlay();
      this._syncClock();
    },30000);
  }
  _signature(){
    const c=this._config;
    const ids=[c.selection_entity,...c.lights,...c.climates,...c.cooling_climates,...c.alarms,...c.washers,...c.dryers,c.lock_entity,c.alarm_away_script,c.lock_action_entity,c.energy_entity,c.alarm_time_entity,c.washer_time_entity,c.dryer_time_entity,c.heating_time_entity,c.cooling_time_entity,...c.custom_indicators.flatMap(x=>x.entities)];
    const input=[...new Set(ids.filter(Boolean))].map(id=>{
      const o=this._state(id);
      return [id,o?.state,o?.last_changed,o?.attributes?.options,o?.attributes?.hvac_action,o?.attributes?.hvac_modes,o?.attributes?.unit_of_measurement];
    });
    return JSON.stringify([input,this._hass?.themes?.darkMode,c,this._active().alarms.length?Math.floor(Date.now()/60000):0]);
  }
  _render(){
    if(!this.isConnected)return;
    const sign=this._signature();if(sign===this._sig)return;this._sig=sign;

  const a=this._active(),chips=[this._alarmInfo(),this._lockInfo()];
  if(a.climates.length)chips.push({kind:'climate',icon:'mdi:radiator',label:`${a.climates.length} ${a.climates.length===1?'termosifone attivo':'termosifoni attivi'}`});
  if(a.cooling.length)chips.push({kind:'cooling',icon:'mdi:air-conditioner',label:a.cooling.length===1?'Climatizzatore attivo':`${a.cooling.length} climatizzatori attivi`});
  if(a.washers.length)chips.push({kind:'washer',icon:'mdi:washing-machine',label:a.washers.length===1?'Lavatrice attiva':`${a.washers.length} lavatrici attive`});
  if(a.dryers.length)chips.push({kind:'dryer',icon:'mdi:tumble-dryer',label:a.dryers.length===1?'Asciugatrice attiva':`${a.dryers.length} asciugatrici attive`});
  for(const group of a.custom){
    if(group.active.length)chips.push({kind:'custom',icon:group.indicator.icon,label:group.active.length===1?group.indicator.name:`${group.indicator.name} · ${group.active.length} attivi`});
  }

    const room=this._current();const missing=!this._config.selection_entity || !this._state(this._config.selection_entity);
    this.shadowRoot.innerHTML=`<style>${RS_STYLE}</style><div class="rs-card ${this._palette()}">
      <div class="rs-header"><div class="rs-headtext"><p class="rs-eyebrow">${rsEsc(this._config.eyebrow)}</p><h2 class="rs-title">${rsEsc(room||'Seleziona ambiente')}<span class="rs-dot">.</span></h2></div>
      <button type="button" class="rs-toggle" data-act="menu" aria-label="Apri selettore ambienti" aria-expanded="${this._overlayMode==='menu'}" ${!this._options().length?'disabled':''}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>
      <div class="rs-chips">${chips.map(v=>`<button type="button" class="rs-chip ${v.kind}" data-act="details" aria-label="Dettagli: ${rsEsc(v.label)}"><ha-icon icon="${v.icon}"></ha-icon>${rsEsc(v.label)}</button>`).join('')}</div>
      ${this._config.show_details_button?`<div class="rs-bottom"><button type="button" class="rs-details" data-act="details"><ha-icon icon="mdi:information-outline"></ha-icon> Dettagli e stato</button></div>`:''}
      ${missing?'<div class="rs-notice">Seleziona un’entità input_select o select nell’editor visuale.</div>':''}
      ${this._error?`<div class="rs-error" role="alert">${rsEsc(this._error)}</div>`:''}
    </div>`;
  }
  _cardClick(e){const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='menu')this._openOverlay('menu');if(act==='details')this._openOverlay('details');}
  _openOverlay(mode){
    this._returnFocus=this.shadowRoot.activeElement;this._closeOverlay(false);this._overlayMode=mode;this._confirm='';this._error='';this._feedback='';this._sentActions.clear();
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:9999;pointer-events:none;';
    host.attachShadow({mode:'open'});this._overlay=host;document.body.appendChild(host);
    host.shadowRoot.addEventListener('click',e=>this._overlayClick(e));
    document.addEventListener('keydown',this._escape,true);
    if(mode==='menu'){window.addEventListener('resize',this._onMove);window.addEventListener('scroll',this._onMove,true);}
    this._renderOverlay();
    this._overlay.shadowRoot.querySelector('[data-focus]')?.focus();
    this._render();
  }
  _closeOverlay(restoreFocus=true){
    document.removeEventListener('keydown',this._escape,true);
    window.removeEventListener('resize',this._onMove);window.removeEventListener('scroll',this._onMove,true);
    const old=this._overlay;this._overlay=null;this._overlayMode='';this._confirm='';if(old){old.remove();this._render();if(restoreFocus && this._returnFocus?.isConnected)this._returnFocus.focus();}
  }
  _positionMenu(){
    const anchor=this.shadowRoot.querySelector('.rs-toggle');const menu=this._overlay?.shadowRoot.querySelector('.rs-menu');if(!anchor||!menu)return;
    const r=anchor.getBoundingClientRect();const width=Math.min(270,window.innerWidth-16);const x=Math.max(8,Math.min(window.innerWidth-width-8,r.right-width));
    menu.style.width=`${width}px`;menu.style.left=`${x}px`;
    const below=window.innerHeight-r.bottom;const desired=Math.min(370,menu.scrollHeight);
    menu.style.top=`${below>=Math.min(220,desired)?Math.min(r.bottom+8,window.innerHeight-16):Math.max(8,r.top-desired-8)}px`;
  }
  _canArmAway(){
 const c=this._config;
 return !this._sentActions.has('arm-away') && !!c.alarm_away_script && c.alarms.length>0
   && c.alarms.every(id=>this._state(id)?.state==='disarmed')
   && this._state(c.alarm_away_script)?.state==='off';
}
  _canLockDoor(){
 const c=this._config,action=c.lock_action_entity;
 if(this._sentActions.has('lock-door')||!c.lock_entity||!action||this._state(c.lock_entity)?.state!=='unlocked')return false;
 const domain=action.split('.')[0];
 if(domain==='lock')return action===c.lock_entity&&this._state(action)?.state==='unlocked';
 if(domain==='script')return this._state(action)?.state==='off';
 return false;
}
  _detailRow(title,desc,icon,entity='',action='',quickAction='',quickTitle=''){
 const item=`<div class="rs-row-icon"><ha-icon icon="${rsIcon(icon)}"></ha-icon></div>
   <div class="rs-row-txt"><div class="rs-row-title">${rsEsc(title)}</div><div class="rs-row-desc">${rsEsc(desc)}</div></div>
   ${action?`<button type="button" data-action="${rsEsc(action)}">${action==='lights-off'||action==='climates-off'?'Spegni':'Gestisci'}</button>`:entity?`<button type="button" data-more="${rsEsc(entity)}">Gestisci</button>`:''}`;
 return `<div class="rs-row ${quickAction?'rs-row-action':''}">${quickAction?`<div class="rs-row-main">${item}</div><div class="rs-row-shortcut"><span>${rsEsc(quickTitle)}</span><button type="button" data-action="${rsEsc(quickAction)}" aria-label="${rsEsc(quickTitle)}">Attiva</button></div>`:item}</div>`;
}
  _renderOverlay(){
 if(!this._overlay)return;
 const root=this._overlay.shadowRoot,palette=this._palette(),room=this._current();
 const scrollTop=root.querySelector('.rs-dialog-body')?.scrollTop||0;
 const oldFocus=root.activeElement;
 const focusKey=oldFocus&&['data-more','data-close','data-cancel','data-execute','data-action'].find(key=>oldFocus.hasAttribute(key));
 const focusValue=focusKey?oldFocus.getAttribute(focusKey):null;
 if(this._overlayMode==='menu'){
   const items=this._options();
   root.innerHTML=`<style>${RS_OVERLAY_STYLE}</style><div class="rs-layer menu-layer" data-backdrop="true" style="pointer-events:auto"><div class="rs-menu ${palette}" role="menu" aria-label="Ambienti">
     ${items.map((name,i)=>`<button type="button" role="menuitemradio" aria-checked="${name===room}" aria-current="${name===room}" data-room="${rsEsc(name)}" ${i===0?'data-focus="true"':''}><ha-icon icon="${rsIcon(this._roomIcon(name))}"></ha-icon><span>${rsEsc(name)}</span>${name===room?'<ha-icon icon="mdi:check"></ha-icon>':''}</button>`).join('')}</div></div>`;
   this._positionMenu();return;
 }
 const a=this._active(),c=this._config,rows=[];
 for(const id of (c.alarms.length?c.alarms:[''])){
   const e=this._state(id),available=rsKnown(e),armed=available&&RS_ARMED.has(e.state);
   let state='Non configurato';
   if(id){
     if(!available)state='Stato non disponibile';
     else if(e.state==='disarmed')state='Disinserito';
     else if(e.state==='triggered')state='Allarme in corso';
     else if(e.state==='arming'||e.state==='pending')state='Attivazione in corso';
     else if(armed){
       const modes={armed_away:'Fuori casa',armed_home:'In casa',armed_night:'Notte',armed_vacation:'Vacanza',armed_custom_bypass:'Personalizzato'};
       const time=e.state==='armed_away'?this._timeValue(c.alarm_time_entity)||rsDuration(e.last_changed):rsDuration(e.last_changed);
       state=`Inserito · ${modes[e.state]||'Attivo'}${time?' · '+time:''}`;
     }else state='Stato: '+rsText(e.state,40);
   }
   rows.push(this._detailRow(c.alarms.length>1?(e?.attributes?.friendly_name||id):'Allarme',state,
     !available?'mdi:shield-outline':e.state==='triggered'?'mdi:shield-alert-outline':armed?'mdi:shield-lock-outline':'mdi:shield-off-outline',id,'',id===c.alarms[0]&&this._canArmAway()?'arm-away':'','Modalità fuori casa'));
 }
 const lock=this._lockInfo();
 rows.push(this._detailRow('Serratura',lock.label,lock.icon,c.lock_entity,'',this._canLockDoor()?'lock-door':'','Blocca porta'));
 if(c.climates.length){
   const time=a.climates.length?this._timeValue(c.heating_time_entity):'';
   rows.push(this._detailRow('Termosifoni',`${a.climates.length} di ${c.climates.length} attivi${time?' · Tempo: '+time:''}`,'mdi:radiator'));
 }
 if(c.cooling_climates.length){
   const time=a.cooling.length?this._timeValue(c.cooling_time_entity):'';
   rows.push(this._detailRow('Climatizzazione',`${a.cooling.length} di ${c.cooling_climates.length} attivi${time?' · Tempo: '+time:''}`,'mdi:air-conditioner'));
 }
 for(const id of c.washers){
   const e=this._state(id),active=a.washers.includes(id),time=active?this._timeValue(c.washer_time_entity):'';
   rows.push(this._detailRow(c.washers.length>1?(e?.attributes?.friendly_name||id):'Lavatrice',
     !rsKnown(e)?'Stato non disponibile':active?`In funzione${time?' · Tempo: '+time:''}`:'Spenta','mdi:washing-machine'));
 }
 for(const id of c.dryers){
   const e=this._state(id),active=a.dryers.includes(id),time=active?this._timeValue(c.dryer_time_entity):'';
   rows.push(this._detailRow(c.dryers.length>1?(e?.attributes?.friendly_name||id):'Asciugatrice',
     !rsKnown(e)?'Stato non disponibile':active?`In funzione${time?' · Tempo: '+time:''}`:'Spenta','mdi:tumble-dryer'));
 }
 const energy=this._state(c.energy_entity);
 if(c.energy_entity){
   const amount=rsKnown(energy)&&Number.isFinite(Number(energy.state))?`${new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(Number(energy.state))} ${rsText(energy.attributes?.unit_of_measurement||'',20)}`.trim():'Dato non disponibile';
   rows.push(this._detailRow('Energia del mese',amount,'mdi:lightning-bolt'));
 }
 for(const group of a.custom){
   const ci=group.indicator;
   rows.push(this._detailRow(ci.name,`${group.active.length} di ${ci.entities.length} attivi`,ci.icon));
   if(ci.entities.length){
     const list=ci.entities.map(id=>{
       const state=this._state(id),label=state?.attributes?.friendly_name||id;
       const summary=rsKnown(state)?state.state:'Non disponibile';
       return `<div class="rs-custom-item"><span>${rsEsc(label)} · ${rsEsc(summary)}</span></div>`;
     }).join('');
     rows.push(`<div class="rs-custom-items" aria-label="Entità ${rsEsc(ci.name)}">${list}</div>`);
   }
 }
 const names={'lights-off':'Spegnere tutte le luci accese configurate?','climates-off':'Disattivare il riscaldamento per tutti i termostati attivi configurati?','arm-away':'Vuoi attivare l’allarme fuori casa?','lock-door':'Vuoi bloccare la porta?'};
 root.innerHTML=`<style>${RS_OVERLAY_STYLE}</style><div class="rs-layer" data-backdrop="true"><section class="rs-panel ${palette}" role="dialog" aria-modal="true" aria-label="Dettagli e stato">
   <div class="rs-dialog-top"><strong>Dettagli e stato</strong><button type="button" class="rs-x" data-close="true" aria-label="Chiudi dettagli" data-focus="true"><ha-icon icon="mdi:close"></ha-icon></button></div>
   <div class="rs-dialog-body">${this._confirm?`<div class="rs-confirm"><p>${rsEsc(names[this._confirm]||'Confermare?')}</p><div class="rs-confirm-actions"><button data-cancel="true">Annulla</button><button class="primary" data-execute="${this._confirm}" ${this._busy?'disabled':''}>Conferma</button></div></div>`:''}
   ${rows.join('')||'<div class="rs-help">Nessun indicatore configurato.</div>'}
   ${this._error?`<p class="rs-help" role="alert">${rsEsc(this._error)}</p>`:''}${this._feedback?`<p class="rs-help" role="status">${rsEsc(this._feedback)}</p>`:''}</div></section></div>`;
 const body=root.querySelector('.rs-dialog-body');if(body)body.scrollTop=scrollTop;
 if(focusKey){const next=[...root.querySelectorAll('button')].find(x=>x.getAttribute(focusKey)===focusValue);next?.focus?.({preventScroll:true});}
}
  _overlayClick(e){
    const target=e.target;const el=target.closest?.('button');
    if(!el){if(target?.dataset?.backdrop)this._closeOverlay();return;}
    if(el.hasAttribute('data-close')){this._closeOverlay();return;}
    if(el.hasAttribute('data-cancel')){this._confirm='';this._renderOverlay();return;}
    if(el.hasAttribute('data-room')){this._selectRoom(el.dataset.room);return;}
    if(el.hasAttribute('data-more')){const id=el.dataset.more;this._closeOverlay();if(this._state(id))this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));return;}
    if(el.hasAttribute('data-action')){const action=el.dataset.action;if(action==='arm-away'&&!this._canArmAway())return;if(action==='lock-door'&&!this._canLockDoor())return;this._confirm=action;this._feedback='';this._renderOverlay();return;}
    if(el.hasAttribute('data-execute'))this._execute(el.dataset.execute);
  }
  async _selectRoom(option){
    const entity=this._config.selection_entity;const choices=this._options();if(!entity || !choices.includes(option)||this._busy)return;
    this._busy=true;this._error='';
    try{const domain=entity.split('.')[0];await this._hass.callService(domain,'select_option',{entity_id:entity,option});this._closeOverlay();}
    catch(e){this._error=rsText(e?.message||'Selezione ambiente non riuscita',180);this._closeOverlay();this._render();}
    finally{this._busy=false;}
  }
  async _executeSecurity(action){
 if(this._busy || this._confirm!==action || this._overlayMode!=='details' || !this._overlay)return;
 let domain='',service='',entity='';
 if(action==='arm-away'&&this._canArmAway()){
   domain='script';service='turn_on';entity=this._config.alarm_away_script;
 }else if(action==='lock-door'&&this._canLockDoor()){
   entity=this._config.lock_action_entity;
   domain=entity.split('.')[0];
   service=domain==='lock'?'lock':'turn_on';
 }else return;
 this._busy=true;this._error='';this._feedback='';
 this._renderOverlay();
 try{
   await this._hass.callService(domain,service,{entity_id:entity});
   this._sentActions.add(action);this._confirm='';
   this._feedback='Comando inviato. Verifica lo stato aggiornato in Home Assistant.';
 }catch(error){
   this._confirm='';this._error=rsText(error?.message||'Comando non riuscito',180);
 }finally{
   this._busy=false;this._renderOverlay();
 }
}
  async _execute(action){
    if(action==='arm-away'||action==='lock-door')return this._executeSecurity(action);
    if(this._busy||!this._config.controls_enabled)return;
    const a=this._active();let domain,service,ids,data;
    if(action==='lights-off'){domain='light';service='turn_off';ids=a.lights;data={entity_id:ids};}
    else if(action==='climates-off'){
      domain='climate';service='set_hvac_mode';ids=a.climates;
      if(!ids.every(id=>this._state(id)?.attributes?.hvac_modes?.includes('off')))return;
      data={entity_id:ids,hvac_mode:'off'};
    }else return;
    if(!ids.length)return;
    this._busy=true;this._error='';this._renderOverlay();
    try{await this._hass.callService(domain,service,data);this._confirm='';}
    catch(e){this._error=rsText(e?.message||'Comando non riuscito',180);}
    finally{this._busy=false;this._renderOverlay();}
  }
}
const RS_EDITOR_STYLE = `
:host{display:block;color:var(--primary-text-color,#18221c);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);font-size:var(--ha-font-size-m,14px)}
*,*:before,*:after{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}
.rs-edit{display:block}.rs-e-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#dfe5df)}
.rs-e-tab{border:0;background:transparent;color:var(--secondary-text-color,#536359);border-radius:13px;padding:10px 13px;white-space:nowrap}.rs-e-tab.active{color:var(--primary-text-color,#17231c);background:var(--secondary-background-color,#f0f2ef);font-weight:650}
.rs-e-heading{font-size:21px;font-weight:500;margin:25px 0 9px}.rs-e-desc{color:var(--secondary-text-color,#55665a);font-size:13px;line-height:1.5;margin-bottom:24px}
.rs-e-field{margin:20px 0}.rs-e-field label,.rs-e-label{display:block;font-size:14px;margin-bottom:10px;font-weight:400}.rs-e-input{display:block;width:100%;background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#18221c);border:0;border-bottom:1px solid var(--divider-color,#a5afa5);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0}
.rs-e-field ha-selector{display:block;width:100%;--mdc-theme-primary:var(--primary-color,#0b7457)}.rs-e-fallback{display:none}.rs-e-no-native .rs-e-fallback{display:block}.rs-e-no-native [data-selector]{display:none}
.rs-e-help{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#5e6c62);margin:9px 0}.rs-e-line{display:flex;align-items:center;gap:8px;min-width:0}.rs-e-selector{flex:1;min-width:0}
.rs-e-button{background:var(--secondary-background-color,#eff2ee);border:1px solid var(--divider-color,#dbe2db);color:var(--primary-text-color,#18221c);padding:9px 12px;border-radius:14px}.rs-e-button:disabled{opacity:.45;cursor:not-allowed}.rs-e-clear{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;background:var(--secondary-background-color,#eef1ef);border:1px solid var(--divider-color,#dfe5df);border-radius:50%;color:var(--secondary-text-color,#57655c);padding:0}.rs-e-clear ha-icon{--mdc-icon-size:18px}
.rs-e-check{border-bottom:1px solid var(--divider-color,#e3e7e3);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px;font-size:13px}.rs-e-check input{width:18px;height:18px;accent-color:var(--primary-color,#0c7157);flex:none}
.rs-e-item{display:flex;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid var(--divider-color,#e3e7e3)}.rs-e-item span{flex:1;overflow-wrap:anywhere;font-size:13px}.rs-e-room{border-bottom:1px solid var(--divider-color,#e3e7e3);padding:12px 0 16px}.rs-e-room-title{font-size:13px;font-weight:650;margin-bottom:8px}.rs-e-icon-line{display:flex;align-items:center;gap:12px}.rs-e-icon-line ha-icon{--mdc-icon-size:24px;flex:none;color:var(--primary-text-color)}
 .rs-e-icon-picker{flex:1;min-width:0}.rs-e-icon-picker ha-selector{display:block;width:100%}.rs-e-icon-fallback{display:none}.rs-e-no-native .rs-e-icon-fallback{display:block}.rs-e-no-native [data-icon-selector]{display:none}
.rs-e-choice{display:flex;flex-wrap:wrap;gap:6px;padding:10px 0;border-bottom:1px solid var(--divider-color,#dfe5df)}.rs-e-choice button{font:inherit;color:var(--secondary-text-color);background:transparent;border:0;padding:9px 11px;border-radius:11px;cursor:pointer}.rs-e-choice button.active{background:var(--secondary-background-color);color:var(--primary-text-color);font-weight:650}
.rs-e-item ha-icon{--mdc-icon-size:21px;color:var(--secondary-text-color)}.rs-e-group{padding-bottom:20px;border-bottom:1px solid var(--divider-color,#dfe5df)}.rs-e-sub{font-size:15px;font-weight:650;margin:18px 0 10px}.rs-e-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.rs-e-input:focus-visible,.rs-e-button:focus-visible,.rs-e-tab:focus-visible,.rs-e-clear:focus-visible{outline:2px solid var(--primary-color,#0b7457);outline-offset:2px}
`;
class RoomSelectorCardEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._config=rsConfig();this._hass=null;this._attempted=false;this._tab='ambienti';this._optionsSig='';this._selectedCustom=0;
    this.shadowRoot.addEventListener('click',e=>this._click(e));this.shadowRoot.addEventListener('change',e=>this._change(e));}
  set hass(hass){this._hass=hass;this.shadowRoot.querySelectorAll('ha-selector').forEach(el=>el.hass=hass);const options=hass?.states?.[this._config.selection_entity]?.attributes?.options;const sig=JSON.stringify(Array.isArray(options)?options:[]);if(sig!==this._optionsSig){this._optionsSig=sig;this._render();}}
  setConfig(raw){const cfg=rsConfig(raw);if(JSON.stringify(cfg)===JSON.stringify(this._config)&&this.shadowRoot.querySelector('.rs-edit'))return;this._config=cfg;this._render();}
  connectedCallback(){this._render();this._ensureNative();}
  async _ensureNative(){if(this._attempted)return;this._attempted=true;
    if(!customElements.get('ha-selector')){try{const helper=await window.loadCardHelpers?.();await helper?.importSelector?.();}catch{/* Inputs remain usable */}}
    this._render();}
  _update(patch){this._config=rsConfig({...this._config,...patch});this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));this._render();}
  _iconPicker(scope,index,icon,roomName=''){
    const fallback=rsIcon(icon,'mdi:information-outline');
    const attrs=`data-icon-selector="${scope}" data-icon-index="${index}" ${roomName?`data-icon-room="${rsEsc(roomName)}"`:''}`;
    return `<div class="rs-e-icon-line"><ha-icon icon="${fallback}" aria-hidden="true"></ha-icon><div class="rs-e-icon-picker"><div ${attrs}></div><div class="rs-e-icon-fallback"><input type="text" class="rs-e-input" data-icon-fallback="${scope}" data-icon-index="${index}" ${roomName?`data-icon-room="${rsEsc(roomName)}"`:''} value="${fallback}" aria-label="Icona MDI"/></div></div></div>`;
  }
  _entityLine(id,key='',index=-1){
    const state=this._hass?.states?.[id];
    const icon=rsIcon(state?.attributes?.icon,'mdi:checkbox-marked-circle-outline');
    const label=state?.attributes?.friendly_name||id;
    return `<div class="rs-e-item"><ha-icon icon="${icon}"></ha-icon><span>${rsEsc(label)}<div class="rs-e-help">${rsEsc(id)}</div></span><button type="button" class="rs-e-clear" ${key==='custom'?`data-custom-remove="${index}"`: `data-remove="${key}"`} data-id="${rsEsc(id)}" aria-label="Rimuovi ${rsEsc(id)}"><ha-icon icon="mdi:close"></ha-icon></button></div>`;
  }
  _changeCustom(index,patch){
    if(!this._config.custom_indicators[index])return;
    const arr=this._config.custom_indicators.map((obj,i)=>i===index?{...obj,...patch}:obj);
    this._update({custom_indicators:arr});
  }
  _field(label,key,placeholder=''){
    const val=this._config[key]||'';
    return `<div class="rs-e-field"><label>${rsEsc(label)}</label><div class="rs-e-line"><div class="rs-e-selector"><div data-selector="${key}"></div><div class="rs-e-fallback"><input class="rs-e-input" type="text" data-field="${key}" placeholder="${rsEsc(placeholder)}" value="${rsEsc(val)}"/></div></div>${val?`<button type="button" class="rs-e-clear" data-clear="${key}" aria-label="Rimuovi ${rsEsc(label)}"><ha-icon icon="mdi:close"></ha-icon></button>`:''}</div></div>`;
  }
  _multi(key,label,domains){
    return `<div class="rs-e-field"><div class="rs-e-label">${rsEsc(label)}</div>${this._config[key].map(id=>this._entityLine(id,key)).join('')}
    <div class="rs-e-line"><div class="rs-e-selector"><div data-selector="${key}" data-add="true"></div><div class="rs-e-fallback"><input class="rs-e-input" type="text" data-field="${key}" placeholder="${domains[0]}.*" value=""/></div></div></div></div>`;
  }
  _customEditor(){
    const all=this._config.custom_indicators;
    if(!all.length)return `<div class="rs-e-help">Nessun indicatore personalizzato.</div><button class="rs-e-button" type="button" data-custom-add="true">+ Aggiungi indicatore</button>`;
    this._selectedCustom=Math.max(0,Math.min(this._selectedCustom,all.length-1));
    const index=this._selectedCustom, ci=all[index];
    const picker=`<div class="rs-e-choice">${all.map((v,i)=>`<button type="button" data-custom-select="${i}" class="${i===index?'active':''}">${rsEsc(v.name||`Indicatore ${i+1}`)}</button>`).join('')}</div>`;
    return picker+`<div class="rs-e-group"><div class="rs-e-actions"><button type="button" class="rs-e-button" data-custom-add="true">+ Aggiungi</button><button type="button" class="rs-e-button" data-custom-move="-1" ${index===0?'disabled':''}>Sposta su</button><button type="button" class="rs-e-button" data-custom-move="1" ${index===all.length-1?'disabled':''}>Sposta giù</button><button type="button" class="rs-e-button" data-custom-delete="true">Elimina</button></div>
      <div class="rs-e-field"><label>Nome visualizzato</label><input class="rs-e-input" data-custom-field="name" type="text" maxlength="55" value="${rsEsc(ci.name)}"/></div>
      <div class="rs-e-field"><label>Icona (catalogo Home Assistant)</label>${this._iconPicker('custom',index,ci.icon)}</div>
      <div class="rs-e-field"><label>Stato che indica attività</label><input class="rs-e-input" type="text" data-custom-field="active_state" maxlength="60" value="${rsEsc(ci.active_state)}"/><div class="rs-e-help">Confronto esatto: per esempio on, running o active. Gli stati sconosciuti non attivano l'indicatore.</div></div>
      <div class="rs-e-field"><label>Entità e aiutanti</label>${ci.entities.map(id=>this._entityLine(id,'custom',index)).join('')}
      <div class="rs-e-line"><div class="rs-e-selector"><div data-custom-add-entity="${index}"></div><div class="rs-e-fallback"><input class="rs-e-input" type="text" data-custom-entity-input="${index}" placeholder="input_boolean.*, binary_sensor.*, sensor.*"/></div></div></div><div class="rs-e-help">Puoi aggiungere più entità. Nel popup ciascuna apre i controlli nativi Home Assistant.</div></div>
    </div>`;
  }
  _check(key,label,help=''){
    return `<label class="rs-e-check"><span>${rsEsc(label)}${help?`<div class="rs-e-help">${rsEsc(help)}</div>`:''}</span><input type="checkbox" data-field="${key}" ${this._config[key]?'checked':''}/></label>`;
  }
  _render(){
    if(!this.isConnected)return;
    const c=this._config, current=this._hass?.states?.[c.selection_entity];
    const options=Array.isArray(current?.attributes?.options)?current.attributes.options.filter(x=>typeof x==='string').slice(0,80):[];
    const tabs=[['ambienti','Ambienti'],['indicatori','Indicatori'],['aspetto','Aspetto'],['avanzate','Avanzate']];
    let body='';
    if(this._tab==='ambienti'){
      body='<div class="rs-e-heading">Selezione ambienti</div><div class="rs-e-desc">Collega il selettore già utilizzato dalla dashboard. Le opzioni vengono lette automaticamente, senza ricreare gli ambienti.</div>'+
        this._field('Selettore ambienti (input_select / select)','selection_entity','input_select.*')+
        (options.length?'<div class="rs-e-heading">Icone degli ambienti</div><div class="rs-e-desc">Personalizza le icone MDI utilizzate dal menu. Ogni ambiente conserva il proprio nome originale.</div>'+options.map(name=>{
          const icon=rsIcon(c.room_icons[name],rsDefaultIcon(name));return `<div class="rs-e-room"><div class="rs-e-room-title">${rsEsc(name)}</div>${this._iconPicker('room',0,icon,name)}</div>`;
        }).join(''):'<div class="rs-e-help">Seleziona un helper con ambienti disponibili per configurare le relative icone.</div>');
    }
    if(this._tab==='indicatori'){
      body='<div class="rs-e-heading">Stato generale della casa</div><div class="rs-e-desc">Allarme e serratura sono sempre visibili sulla card; gli altri indicatori compaiono soltanto quando attivi. I dati sono indipendenti dall’ambiente selezionato.</div>'+
        this._multi('alarms','Allarmi',RS_DOMAINS.alarms)+
        this._field('Serratura della porta','lock_entity','lock.*')+
        '<div class="rs-e-heading">Azioni di sicurezza</div><div class="rs-e-desc">Azioni opzionali con conferma. Per bloccare la porta scegli la stessa entità lock monitorata oppure uno script dedicato. Non è previsto lo sblocco.</div>'+
        this._field('Script: attiva allarme fuori casa','alarm_away_script','script.*')+
        this._field('Entità: blocca porta (lock / script)','lock_action_entity','lock.* / script.*')+
        this._multi('climates','Termosifoni / valvole',RS_DOMAINS.climates)+
        this._multi('washers','Lavatrice (stato)',RS_DOMAINS.washers)+
        this._multi('dryers','Asciugatrice (stato)',RS_DOMAINS.dryers)+
        this._multi('cooling_climates','Climatizzazione (stato)',RS_DOMAINS.cooling_climates)+
        '<div class="rs-e-heading">Sensori di durata</div><div class="rs-e-desc">Collega gli aiutanti esistenti. Nel popup i tempi compaiono soltanto se i dispositivi corrispondenti sono attivi. Il tempo allarme fuori casa appare solo per quella modalità.</div>'+
        this._field('Tempo allarme fuori casa','alarm_time_entity','sensor.*')+
        this._field('Tempo lavatrice','washer_time_entity','sensor.*')+
        this._field('Tempo asciugatrice','dryer_time_entity','sensor.*')+
        this._field('Tempo riscaldamento','heating_time_entity','sensor.*')+
        this._field('Tempo climatizzazione','cooling_time_entity','sensor.*')+
        '<div class="rs-e-heading">Energia</div>'+
        this._field('Energia consumata nel mese','energy_entity','sensor.*')+
        '<div class="rs-e-heading">Indicatori personalizzati</div><div class="rs-e-desc">Ogni indicatore può usare più entità o aiutanti e scegliere l’icona dal catalogo Home Assistant.</div>'+this._customEditor();
    }
    if(this._tab==='aspetto'){
      const theme=`<select class="rs-e-input" data-field="theme_mode">${[['auto','Auto (Home Assistant)'],['light','Light Edera'],['dark','Dark Edera']].map(([v,label])=>`<option value="${v}" ${c.theme_mode===v?'selected':''}>${label}</option>`).join('')}</select>`;
      body='<div class="rs-e-heading">Aspetto Edera</div><div class="rs-e-desc">Personalizza intestazione, tema e pulsante dei dettagli, seguendo il design delle altre card.</div>'+
        `<div class="rs-e-field"><label>Intestazione superiore</label><input class="rs-e-input" type="text" data-field="eyebrow" maxlength="55" value="${rsEsc(c.eyebrow)}"/></div>`+
        `<div class="rs-e-field"><label>Tema</label>${theme}</div>`+
        this._check('show_details_button','Mostra “Dettagli e stato”');
    }
    if(this._tab==='avanzate'){
      body='<div class="rs-e-heading">Avanzate</div><div class="rs-e-desc">Gli indicatori sono informativi. I controlli di allarme e serratura si aprono con Home Assistant.</div>'+
        `<div class="rs-e-field"><label>Valore che indica lavatrice attiva</label><input class="rs-e-input" type="text" data-field="washer_active_state" value="${rsEsc(c.washer_active_state)}"/></div>`+
        `<div class="rs-e-field"><label>Valore che indica asciugatrice attiva</label><input class="rs-e-input" type="text" data-field="dryer_active_state" value="${rsEsc(c.dryer_active_state)}"/></div>`;
    }
    this.shadowRoot.innerHTML=`<style>${RS_EDITOR_STYLE}</style><div class="rs-edit ${customElements.get('ha-selector')?'':'rs-e-no-native'}"><div class="rs-e-tabs">${tabs.map(([id,label])=>`<button type="button" class="rs-e-tab ${this._tab===id?'active':''}" data-tab="${id}" aria-pressed="${this._tab===id}">${label}</button>`).join('')}</div>${body}</div>`;
    this._mountSelectors();
  }
  _mountSelectors(){if(!customElements.get('ha-selector'))return;
    this.shadowRoot.querySelectorAll('[data-selector]').forEach(slot=>{
      const key=slot.dataset.selector;const selector=document.createElement('ha-selector');selector.hass=this._hass;
      const domain=RS_DOMAINS[key];selector.selector={entity:{domain:domain.length===1?domain[0]:domain}};
      selector.value=slot.dataset.add?'':this._config[key];selector.setAttribute('aria-label',key);
      selector.addEventListener('value-changed',e=>{
        if(!selector.isConnected||!e.detail||!Object.prototype.hasOwnProperty.call(e.detail,'value'))return;
        const value=rsEntity(e.detail.value,domain);
        if(slot.dataset.add){if(value&&!this._config[key].includes(value))this._update({[key]:[...this._config[key],value]});}
        else this._update({[key]:value});
      });slot.appendChild(selector);
    });
    this.shadowRoot.querySelectorAll('[data-icon-selector]').forEach(slot=>{
      const picker=document.createElement('ha-selector');picker.hass=this._hass;
      picker.selector={icon:{}};
      const room=slot.dataset.iconRoom;
      const index=Number(slot.dataset.iconIndex);
      picker.value=room?this._config.room_icons[room]||rsDefaultIcon(room):this._config.custom_indicators[index]?.icon||'mdi:information-outline';
      picker.setAttribute('aria-label','Scegli icona dal catalogo');
      picker.addEventListener('value-changed',e=>{
        e.stopPropagation();
        if(!picker.isConnected||!e.detail||!Object.prototype.hasOwnProperty.call(e.detail,'value'))return;
        const icon=rsIcon(e.detail.value,room?rsDefaultIcon(room):'mdi:information-outline');
        if(room)this._update({room_icons:{...this._config.room_icons,[room]:icon}});
        else this._changeCustom(index,{icon});
      });slot.appendChild(picker);
    });
    this.shadowRoot.querySelectorAll('[data-custom-add-entity]').forEach(slot=>{
      const index=Number(slot.dataset.customAddEntity),picker=document.createElement('ha-selector');
      picker.hass=this._hass;picker.selector={entity:{domain:RS_DOMAINS.custom_entities}};picker.value='';
      picker.setAttribute('aria-label','Aggiungi entità all’indicatore');
      picker.addEventListener('value-changed',e=>{
        e.stopPropagation();
        if(!picker.isConnected||!e.detail||!Object.prototype.hasOwnProperty.call(e.detail,'value'))return;
        const id=rsEntity(e.detail.value,RS_DOMAINS.custom_entities);
        const ci=this._config.custom_indicators[index];
        if(id&&ci&&!ci.entities.includes(id))this._changeCustom(index,{entities:[...ci.entities,id]});
      });slot.appendChild(picker);
    });
  }
  _click(e){const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab){this._tab=b.dataset.tab;this._render();return;}
    if(b.dataset.clear){this._update({[b.dataset.clear]:''});return;}
    if(b.dataset.remove){this._update({[b.dataset.remove]:this._config[b.dataset.remove].filter(id=>id!==b.dataset.id)});return;}
    if(b.hasAttribute('data-custom-add')){this._selectedCustom=this._config.custom_indicators.length;
      this._update({custom_indicators:[...this._config.custom_indicators,rsCustom()]});return;}
    if(b.hasAttribute('data-custom-select')){this._selectedCustom=Number(b.dataset.customSelect);this._render();return;}
    if(b.hasAttribute('data-custom-delete')){const copy=[...this._config.custom_indicators];copy.splice(this._selectedCustom,1);this._selectedCustom=Math.max(0,this._selectedCustom-1);this._update({custom_indicators:copy});return;}
    if(b.hasAttribute('data-custom-move')){const from=this._selectedCustom,to=from+Number(b.dataset.customMove);
      if(to<0||to>=this._config.custom_indicators.length)return;
      const arr=[...this._config.custom_indicators];[arr[from],arr[to]]=[arr[to],arr[from]];this._selectedCustom=to;this._update({custom_indicators:arr});return;}
    if(b.hasAttribute('data-custom-remove')){const index=Number(b.dataset.customRemove),ci=this._config.custom_indicators[index];if(ci)this._changeCustom(index,{entities:ci.entities.filter(id=>id!==b.dataset.id)});return;}
  }
  _change(e){const input=e.target;const key=input.dataset.field;
    if(input.dataset.iconFallback){const room=input.dataset.iconRoom;
      if(room)this._update({room_icons:{...this._config.room_icons,[room]:rsIcon(input.value,rsDefaultIcon(room))}});
      else this._changeCustom(Number(input.dataset.iconIndex),{icon:rsIcon(input.value,'mdi:information-outline')});return;}
    if(input.dataset.customField){this._changeCustom(this._selectedCustom,{[input.dataset.customField]:input.value});return;}
    if(input.hasAttribute('data-custom-entity-input')){const index=Number(input.dataset.customEntityInput),ci=this._config.custom_indicators[index];
      const id=rsEntity(input.value,RS_DOMAINS.custom_entities);if(ci&&id&&!ci.entities.includes(id))this._changeCustom(index,{entities:[...ci.entities,id]});return;}
    if(!key)return;
    if(key==='controls_enabled'||key==='show_details_button'){this._update({[key]:input.checked});return;}
    if(key==='theme_mode'){this._update({theme_mode:input.value});return;}
    if(key==='washer_active_state'||key==='dryer_active_state'||key==='eyebrow'){this._update({[key]:input.value});return;}
    if(key==='lights'||key==='climates'||key==='alarms'||key==='washers'||key==='dryers'||key==='cooling_climates'){
      const value=rsEntity(input.value,RS_DOMAINS[key]);if(value&&!this._config[key].includes(value))this._update({[key]:[...this._config[key],value]});return;
    }
    this._update({[key]:rsEntity(input.value,RS_DOMAINS[key])});
  }
}
if(typeof customElements!=='undefined'){
  if(!customElements.get(RS_TAG))customElements.define(RS_TAG,RoomSelectorCard);
  if(!customElements.get(RS_EDITOR))customElements.define(RS_EDITOR,RoomSelectorCardEditor);
}
if(typeof window!=='undefined'){
  window.customCards=window.customCards||[];
  if(!window.customCards.some(x=>x.type===RS_TAG))window.customCards.push({type:RS_TAG,name:'Room Selector Card',description:'Selettore ambienti e indicatori attivi in stile Edera.',preview:true});
}
export {rsConfig,rsEntity,rsArray,rsDuration,rsCustom,rsIsCustomActive};