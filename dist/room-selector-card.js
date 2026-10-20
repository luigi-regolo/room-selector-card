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
  alarm_entity: '',
  washer_entity: '',
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
  washer_entity: ['binary_sensor', 'sensor', 'switch', 'input_boolean'],
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
    washer_entity:rsEntity(r.washer_entity,RS_DOMAINS.washer_entity),
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
  return hours<24?`da ${hours} ${hours===1?'ora':'ore'}`:`da ${Math.floor(hours/24)} ${Math.floor(hours/24)===1?'giorno':'giorni'}`;
}
const RS_STYLE = `
:host{display:block;min-width:0;container-type:inline-size;font-family:var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif)}
.rs-card{--rs-bg:var(--ha-card-background,var(--card-background-color,#17201c));--rs-text:var(--primary-text-color,#eef3f0);--rs-muted:var(--secondary-text-color,#b0bcb5);--rs-surface:var(--secondary-background-color,#232c27);--rs-line:var(--divider-color,#36453e);--rs-green:#08795c;background:var(--rs-bg);color:var(--rs-text);border:1px solid var(--rs-line);border-radius:25px;padding:20px 21px 17px;box-shadow:var(--ha-card-box-shadow,0 4px 18px #00000018);position:relative;min-width:0;}
.rs-card.rs-dark{--rs-bg:#171b19;--rs-text:#f2f5f2;--rs-muted:#aebbb3;--rs-surface:#232a26;--rs-line:#324139;--rs-green:#08795c;}
.rs-card.rs-light{--rs-bg:#fff;--rs-text:#17221b;--rs-muted:#5e7267;--rs-surface:#f0f4f1;--rs-line:#dbe5dd;--rs-green:#08795c;}
.rs-header{display:flex;gap:12px;justify-content:space-between;align-items:center;min-width:0}.rs-headtext{min-width:0}.rs-eyebrow{font-size:11px;letter-spacing:1.7px;font-weight:700;color:var(--rs-muted);margin:0 0 7px;text-transform:uppercase;line-height:1.1}
.rs-title{font-size:clamp(24px,5.8cqw,31px);font-weight:760;line-height:1.14;margin:0;min-width:0;overflow-wrap:anywhere;letter-spacing:-.8px}.rs-dot{color:#16b88c}
.rs-toggle{background:var(--rs-green);color:#fff;border:1px solid #ffffff1a;min-width:46px;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex:none}
.rs-toggle:focus-visible,.rs-chip:focus-visible,.rs-details:focus-visible{outline:3px solid var(--primary-color,#41b396);outline-offset:3px}
.rs-toggle ha-icon{--mdc-icon-size:22px}
.rs-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.rs-chip{appearance:none;border:1px solid var(--rs-line);background:var(--rs-surface);color:var(--rs-text);border-radius:13px;padding:9px 12px;min-height:40px;display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:12px;font-weight:600;max-width:100%;cursor:pointer;white-space:normal;text-align:left}
.rs-chip ha-icon{--mdc-icon-size:18px;flex:none}.rs-chip.light ha-icon{color:#e4b24d}.rs-chip.climate ha-icon{color:#eb9654}.rs-chip.alarm ha-icon{color:#0b9b77}.rs-chip.alarm-critical ha-icon{color:#db6867}.rs-chip.washer ha-icon{color:#87a7ba}
.rs-bottom{margin-top:15px;display:flex;justify-content:flex-start}.rs-details{border:0;background:var(--rs-green);color:white;font:inherit;font-size:12px;font-weight:700;border-radius:14px;padding:10px 15px;display:inline-flex;align-items:center;gap:9px;min-height:39px;cursor:pointer}
.rs-details ha-icon{--mdc-icon-size:17px}.rs-notice{font-size:12px;color:var(--rs-muted);margin-top:13px}.rs-error{font-size:12px;color:var(--error-color,#d86d60);margin-top:10px;overflow-wrap:anywhere}
@container(max-width:360px){.rs-card{padding:15px 14px;border-radius:20px}.rs-title{font-size:24px}.rs-chips{gap:6px;margin-top:13px}.rs-chip{font-size:11px;padding:8px 9px;min-height:38px}.rs-toggle{min-width:40px;width:40px;height:40px}.rs-bottom{margin-top:12px}}
@media(prefers-reduced-motion:reduce){.rs-toggle,.rs-chip,.rs-details{transition:none!important}}
`;
const RS_OVERLAY_STYLE = `
:host{font-family:var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif)}
.rs-layer{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box;background:#070f0cad;overscroll-behavior:contain;pointer-events:auto}
.rs-layer.menu-layer{background:transparent;pointer-events:auto;align-items:initial;justify-content:initial;padding:0}
.rs-panel,.rs-menu{box-sizing:border-box;--rs-bg:var(--ha-card-background,var(--card-background-color,#171b19));--rs-text:var(--primary-text-color,#eff5f0);--rs-muted:var(--secondary-text-color,#b6c2ba);--rs-line:var(--divider-color,#34443a);--rs-surface:var(--secondary-background-color,#222a26);background:var(--rs-bg);color:var(--rs-text);border:1px solid var(--rs-line);border-radius:22px;box-shadow:0 22px 64px #0009;min-width:0}
.rs-panel.rs-dark,.rs-menu.rs-dark{--rs-bg:#171b19;--rs-text:#f1f4f2;--rs-muted:#aebbb3;--rs-line:#324139;--rs-surface:#242a27}
.rs-panel.rs-light,.rs-menu.rs-light{--rs-bg:#fff;--rs-text:#17221b;--rs-muted:#617269;--rs-line:#dbe5dd;--rs-surface:#f1f4f2}
.rs-panel{width:min(520px,100%);max-height:min(680px,calc(100dvh - 32px));display:flex;flex-direction:column;overflow:hidden}
.rs-dialog-top{display:flex;align-items:center;gap:11px;padding:20px 19px 16px;border-bottom:1px solid var(--rs-line);flex:none;background:var(--rs-bg)}
.rs-big-icon{width:44px;height:44px;flex:none;border-radius:50%;background:#0a70573b;color:#15af85;display:grid;place-items:center}
.rs-big-icon ha-icon{--mdc-icon-size:25px}.rs-popup-titles{flex:1;min-width:0}.rs-eyebrow{letter-spacing:1.5px;font-size:10px;color:var(--rs-muted);font-weight:700}.rs-popup-title{font-weight:750;font-size:23px;line-height:1.2;overflow-wrap:anywhere}.rs-dot{color:#16b88c}.rs-x{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--rs-surface);border:1px solid var(--rs-line);color:var(--rs-text);cursor:pointer}
.rs-dialog-body{padding:16px 18px 18px;overflow:auto;overscroll-behavior:contain;min-height:0}.rs-row{display:flex;align-items:center;gap:12px;background:var(--rs-surface);border:1px solid var(--rs-line);padding:12px;border-radius:14px;min-width:0;margin-bottom:8px}
.rs-row-icon{color:#23ab89;width:34px;flex:none}.rs-row-icon ha-icon{--mdc-icon-size:24px}.rs-row-txt{flex:1;min-width:0}.rs-row-title{font-size:14px;font-weight:650}.rs-row-desc{font-size:12px;color:var(--rs-muted);margin-top:3px;overflow-wrap:anywhere}.rs-row button{border:1px solid var(--rs-line);border-radius:10px;color:var(--rs-text);background:var(--rs-bg);padding:8px 10px;font:inherit;font-size:12px;cursor:pointer;min-height:36px}
.rs-help{font-size:12px;color:var(--rs-muted);line-height:1.5;margin:11px 2px}.rs-confirm{border:1px solid #bd8a4e;background:#b17c2a1c;padding:13px;border-radius:12px;margin-bottom:12px}.rs-confirm p{font-size:13px;margin:0 0 10px}.rs-confirm-actions{display:flex;gap:9px}.rs-confirm-actions button{border-radius:10px;min-height:40px;font:inherit;font-size:12px;border:1px solid var(--rs-line);padding:8px 13px;color:var(--rs-text);background:var(--rs-surface);cursor:pointer}.rs-confirm-actions button.primary{background:#08795c;border-color:#08795c;color:#fff}
.rs-menu{position:fixed;max-height:min(460px,calc(100dvh - 20px));overflow:auto;min-width:220px;max-width:calc(100vw - 16px);padding:8px;border-radius:18px}
.rs-menu button{font:inherit;font-size:14px;border:0;color:var(--rs-text);background:transparent;display:flex;align-items:center;gap:11px;min-height:49px;width:100%;border-radius:12px;cursor:pointer;padding:8px 12px;text-align:left}
.rs-menu button[aria-current=true]{background:#08795c;color:#fff}.rs-menu button span{flex:1;overflow-wrap:anywhere}.rs-menu ha-icon{--mdc-icon-size:21px;flex:none}.rs-menu button:focus-visible,.rs-x:focus-visible,.rs-row button:focus-visible,.rs-confirm-actions button:focus-visible{outline:3px solid var(--primary-color,#5abf9e);outline-offset:2px}
@media(max-width:420px){.rs-dialog-top{padding:14px}.rs-dialog-body{padding:12px}.rs-panel{border-radius:19px}.rs-popup-title{font-size:20px}}
`;
class RoomSelectorCard extends HTMLElement {
  static getStubConfig(){return rsConfig();}
  static getConfigElement(){return document.createElement(RS_EDITOR);}
  constructor(){
    super();this.attachShadow({mode:'open'});this._config=rsConfig();this._hass=null;
    this._sig='';this._overlaySig='';this._overlay=null;this._overlayMode='';this._confirm='';this._busy=false;this._error='';this._returnFocus=null;
    this._onCardClick=e=>this._cardClick(e);this.shadowRoot.addEventListener('click',this._onCardClick);
    this._outside=e=>{if(e.target===this._overlay)this._closeOverlay();};
    this._escape=e=>{if(!this._overlay)return;if(e.key==='Escape'){e.preventDefault();this._closeOverlay();return;}if(e.key==='Tab'&&this._overlayMode==='details'){const buttons=[...this._overlay.shadowRoot.querySelectorAll('button:not([disabled])')];if(!buttons.length)return;const active=this._overlay.shadowRoot.activeElement;const index=buttons.indexOf(active);if(e.shiftKey && (index<=0)){e.preventDefault();buttons[buttons.length-1].focus();}else if(!e.shiftKey && index===buttons.length-1){e.preventDefault();buttons[0].focus();}}};
    this._onMove=()=>{if(this._overlayMode==='menu')this._positionMenu();};
  }
  connectedCallback(){this._render();}
  disconnectedCallback(){this._closeOverlay();}
  setConfig(raw){this._config=rsConfig(raw);this._sig='';this._closeOverlay();this._render();}
  set hass(hass){this._hass=hass;const old=this._sig;this._render();if(this._overlayMode==='details'&&old!==this._sig)this._renderOverlay();}
  getCardSize(){return 3;}
  _state(id){return id ? this._hass?.states?.[id]:null;}
  _palette(){const m=this._config.theme_mode;return m==='auto'?'':`rs-${m}`;}
  _options(){const obj=this._state(this._config.selection_entity);return Array.isArray(obj?.attributes?.options)?obj.attributes.options.filter(x=>typeof x==='string').slice(0,80):[];}
  _current(){const state=this._state(this._config.selection_entity);return rsKnown(state)?state.state:'';}
  _roomIcon(room){return this._config.room_icons[room]||rsDefaultIcon(room);}
  _active(){
    const c=this._config;
    const lights=c.lights.filter(id=>this._state(id)?.state==='on');
    const climates=c.climates.filter(id=>this._state(id)?.attributes?.hvac_action==='heating');
    const alarm=this._state(c.alarm_entity);
    const washer=this._state(c.washer_entity);
    return {
      lights,climates,
      alarm:rsKnown(alarm)&&(RS_ARMED.has(alarm.state)||RS_ALARM_ATTENTION.has(alarm.state))?alarm:null,
      washer:rsKnown(washer)&&washer.state===c.washer_active_state?washer:null
    };
  }
  _signature(){
    const c=this._config;const ids=[c.selection_entity,...c.lights,...c.climates,c.alarm_entity,c.washer_entity,c.energy_entity];
    const input=ids.filter(Boolean).map(id=>{const o=this._state(id);return [id,o?.state,o?.last_changed,o?.attributes?.options,o?.attributes?.hvac_action,o?.attributes?.hvac_modes,o?.attributes?.unit_of_measurement];});
    return JSON.stringify([input,this._hass?.themes?.darkMode,c]);
  }
  _render(){
    if(!this.isConnected)return;
    const sign=this._signature();if(sign===this._sig)return;this._sig=sign;
    const a=this._active();const chips=[];
    if(a.lights.length) chips.push({kind:'light',icon:'mdi:lightbulb-on-outline',label:`${a.lights.length} ${a.lights.length===1?'luce accesa':'luci accese'}`});
    if(a.climates.length) chips.push({kind:'climate',icon:'mdi:radiator',label:`${a.climates.length} ${a.climates.length===1?'termosifone attivo':'termosifoni attivi'}`});
    if(a.alarm){const urgent=RS_ALARM_ATTENTION.has(a.alarm.state);chips.push({kind:urgent?'alarm-critical':'alarm',icon:urgent?'mdi:shield-alert-outline':'mdi:shield-lock-outline',label:a.alarm.state==='triggered'?'Allarme in corso':urgent?'Allarme in transizione':`Allarme ${rsDuration(a.alarm.last_changed)||'inserito'}`});}
    if(a.washer)chips.push({kind:'washer',icon:'mdi:washing-machine',label:'Lavatrice attiva'});
    const room=this._current();const missing=!this._config.selection_entity || !this._state(this._config.selection_entity);
    this.shadowRoot.innerHTML=`<style>${RS_STYLE}</style><div class="rs-card ${this._palette()}">
      <div class="rs-header"><div class="rs-headtext"><p class="rs-eyebrow">${rsEsc(this._config.eyebrow)}</p><h2 class="rs-title">${rsEsc(room||'Seleziona ambiente')}<span class="rs-dot">.</span></h2></div>
      <button type="button" class="rs-toggle" data-act="menu" aria-label="Apri selettore ambienti" aria-expanded="${this._overlayMode==='menu'}" ${!this._options().length?'disabled':''}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>
      ${chips.length?`<div class="rs-chips">${chips.map(v=>`<button type="button" class="rs-chip ${v.kind}" data-act="details" aria-label="Dettagli: ${rsEsc(v.label)}"><ha-icon icon="${v.icon}"></ha-icon>${rsEsc(v.label)}</button>`).join('')}</div>`:''}
      ${this._config.show_details_button?`<div class="rs-bottom"><button type="button" class="rs-details" data-act="details">Dettagli e stato <ha-icon icon="mdi:arrow-right"></ha-icon></button></div>`:''}
      ${missing?'<div class="rs-notice">Seleziona un’entità input_select o select nell’editor visuale.</div>':''}
      ${this._error?`<div class="rs-error" role="alert">${rsEsc(this._error)}</div>`:''}
    </div>`;
  }
  _cardClick(e){const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='menu')this._openOverlay('menu');if(act==='details')this._openOverlay('details');}
  _openOverlay(mode){
    this._returnFocus=this.shadowRoot.activeElement;this._closeOverlay(false);this._overlayMode=mode;this._confirm='';this._error='';
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
  _detailRow(title,desc,icon,entity='',action=''){
    return `<div class="rs-row"><div class="rs-row-icon"><ha-icon icon="${rsIcon(icon)}"></ha-icon></div>
      <div class="rs-row-txt"><div class="rs-row-title">${rsEsc(title)}</div><div class="rs-row-desc">${rsEsc(desc)}</div></div>
      ${action?`<button type="button" data-action="${rsEsc(action)}">${action==='lights-off'||action==='climates-off'?'Spegni':'Gestisci'}</button>`:entity?`<button type="button" data-more="${rsEsc(entity)}">Gestisci</button>`:''}</div>`;
  }
  _renderOverlay(){
    if(!this._overlay)return;
    const root=this._overlay.shadowRoot;const palette=this._palette();const room=this._current();
    if(this._overlayMode==='menu'){
      const items=this._options();root.innerHTML=`<style>${RS_OVERLAY_STYLE}</style><div class="rs-layer menu-layer" data-backdrop="true" style="pointer-events:auto"><div class="rs-menu ${palette}" role="menu" aria-label="Ambienti">
        ${items.map((name,i)=>`<button type="button" role="menuitemradio" aria-checked="${name===room}" aria-current="${name===room}" data-room="${rsEsc(name)}" ${i===0?'data-focus="true"':''}><ha-icon icon="${rsIcon(this._roomIcon(name))}"></ha-icon><span>${rsEsc(name)}</span>${name===room?'<ha-icon icon="mdi:check"></ha-icon>':''}</button>`).join('')}</div></div>`;
      this._positionMenu();return;
    }
    const a=this._active(), c=this._config;const rows=[];
    if(c.lights.length){rows.push(this._detailRow('Luci',`${a.lights.length} di ${c.lights.length} accese`,'mdi:lightbulb-on-outline','',a.lights.length&&c.controls_enabled?'lights-off':''));}
    if(c.climates.length){
      const canStop=a.climates.length>0 && a.climates.every(id=>this._state(id)?.attributes?.hvac_modes?.includes('off'));
      rows.push(this._detailRow('Riscaldamento',`${a.climates.length} di ${c.climates.length} in riscaldamento`,'mdi:radiator','',canStop&&c.controls_enabled?'climates-off':''));
    }
    if(c.alarm_entity){const alarm=this._state(c.alarm_entity);const text=!rsKnown(alarm)?'Stato non disponibile':alarm.state==='disarmed'?'Disinserito':alarm.state==='triggered'?'Allarme in corso':RS_ARMED.has(alarm.state)?`Inserito ${rsDuration(alarm.last_changed)}`:alarm.state==='arming'||alarm.state==='pending'?'Transizione in corso':`Stato: ${alarm.state}`;rows.push(this._detailRow('Allarme',text,'mdi:shield-lock-outline',c.alarm_entity));}
    if(c.washer_entity){const washer=this._state(c.washer_entity);rows.push(this._detailRow('Lavatrice',!rsKnown(washer)?'Stato non disponibile':a.washer?'In funzione':'Non in funzione','mdi:washing-machine',c.washer_entity));}
    const energy=this._state(c.energy_entity);if(c.energy_entity){
      const amount=rsKnown(energy)&&Number.isFinite(Number(energy.state))?`${energy.state} ${energy.attributes?.unit_of_measurement||''}`.trim():'Dato non disponibile';
      rows.push(this._detailRow('Energia del mese',amount,'mdi:lightning-bolt',c.energy_entity));
    }
    const names={ 'lights-off':'Spegnere tutte le luci accese configurate?', 'climates-off':'Disattivare il riscaldamento per tutti i termostati attivi configurati?' };
    root.innerHTML=`<style>${RS_OVERLAY_STYLE}</style><div class="rs-layer" data-backdrop="true"><section class="rs-panel ${palette}" role="dialog" aria-modal="true" aria-label="Dettagli e stato">
      <div class="rs-dialog-top"><div class="rs-big-icon"><ha-icon icon="${rsIcon(this._roomIcon(room))}"></ha-icon></div><div class="rs-popup-titles"><div class="rs-eyebrow">DETTAGLI AMBIENTE</div><div class="rs-popup-title">${rsEsc(room||'Ambiente')}<span class="rs-dot">.</span></div></div><button type="button" class="rs-x" data-close="true" aria-label="Chiudi dettagli" data-focus="true"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="rs-dialog-body">${this._confirm?`<div class="rs-confirm"><p>${rsEsc(names[this._confirm]||'Confermare?')}</p><div class="rs-confirm-actions"><button data-cancel="true">Annulla</button><button class="primary" data-execute="${this._confirm}" ${this._busy?'disabled':''}>Conferma</button></div></div>`:''}
      ${rows.length?rows.join(''):'<div class="rs-help">Nessun indicatore configurato. Aggiungi le entità dall’editor visuale.</div>'}
      <p class="rs-help">Solo gli stati attivi compaiono sulla card. I comandi richiedono abilitazione esplicita. Allarme e lavatrice si gestiscono dall’interfaccia nativa di Home Assistant.</p>
      ${this._error?`<p class="rs-help" role="alert">${rsEsc(this._error)}</p>`:''}</div></section></div>`;
  }
  _overlayClick(e){
    const target=e.target;const el=target.closest?.('button');
    if(!el){if(target?.dataset?.backdrop)this._closeOverlay();return;}
    if(el.hasAttribute('data-close')){this._closeOverlay();return;}
    if(el.hasAttribute('data-cancel')){this._confirm='';this._renderOverlay();return;}
    if(el.hasAttribute('data-room')){this._selectRoom(el.dataset.room);return;}
    if(el.hasAttribute('data-more')){const id=el.dataset.more;this._closeOverlay();if(this._state(id))this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));return;}
    if(el.hasAttribute('data-action')){this._confirm=el.dataset.action;this._renderOverlay();return;}
    if(el.hasAttribute('data-execute'))this._execute(el.dataset.execute);
  }
  async _selectRoom(option){
    const entity=this._config.selection_entity;const choices=this._options();if(!entity || !choices.includes(option)||this._busy)return;
    this._busy=true;this._error='';
    try{const domain=entity.split('.')[0];await this._hass.callService(domain,'select_option',{entity_id:entity,option});this._closeOverlay();}
    catch(e){this._error=rsText(e?.message||'Selezione ambiente non riuscita',180);this._closeOverlay();this._render();}
    finally{this._busy=false;}
  }
  async _execute(action){
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
:host{display:block;font-family:var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif);color:var(--primary-text-color)}
.rs-edit{display:grid;gap:14px;padding:4px 0}.rs-e-section{border:1px solid var(--divider-color,#d5ded7);border-radius:13px;padding:14px}.rs-e-section h3{margin:0 0 13px;font-size:15px}.rs-e-field{margin:9px 0}.rs-e-field label{display:block;font-size:12px;font-weight:600;margin-bottom:7px}.rs-e-field input[type=text],.rs-e-field select{padding:10px;border:1px solid var(--divider-color,#bac9be);border-radius:9px;box-sizing:border-box;width:100%;background:var(--card-background-color,#fff);color:var(--primary-text-color);font:inherit}.rs-e-field ha-selector{display:block;width:100%}.rs-e-fallback{display:none}.rs-e-no-native .rs-e-fallback{display:block}.rs-e-help{font-size:12px;color:var(--secondary-text-color);margin:8px 0}.rs-e-line{display:flex;align-items:center;gap:9px;margin-top:7px}.rs-e-line>*:first-child{flex:1;min-width:0}.rs-e-line button,.rs-e-button{border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:9px;padding:8px 11px;cursor:pointer}.rs-e-check{display:flex;align-items:center;gap:9px;font-size:13px}.rs-e-check input{width:18px;height:18px;accent-color:#08795c}.rs-e-item{display:flex;align-items:center;gap:8px;margin:8px 0}.rs-e-item span{flex:1;overflow-wrap:anywhere;font-size:12px}
`;
class RoomSelectorCardEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._config=rsConfig();this._hass=null;this._attempted=false;
    this.shadowRoot.addEventListener('click',e=>this._click(e));this.shadowRoot.addEventListener('change',e=>this._change(e));}
  set hass(hass){this._hass=hass;this.shadowRoot.querySelectorAll('ha-selector').forEach(el=>el.hass=hass);}
  setConfig(raw){this._config=rsConfig(raw);this._render();}
  connectedCallback(){this._render();this._ensureNative();}
  async _ensureNative(){if(this._attempted)return;this._attempted=true;
    if(!customElements.get('ha-selector')){try{const helper=await window.loadCardHelpers?.();await helper?.importSelector?.();}catch{/* Inputs remain usable */}}
    this._render();}
  _update(patch){this._config=rsConfig({...this._config,...patch});this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));this._render();}
  _field(label,key,placeholder=''){return `<div class="rs-e-field"><label>${rsEsc(label)}</label><div data-selector="${key}"></div><div class="rs-e-fallback"><input type="text" data-field="${key}" placeholder="${rsEsc(placeholder)}" value="${rsEsc(this._config[key]||'')}"></div></div>`;}
  _multi(key,label,domains){
    return `<div class="rs-e-field"><label>${rsEsc(label)}</label>${this._config[key].map(id=>`<div class="rs-e-item"><span>${rsEsc(id)}</span><button type="button" data-remove="${key}" data-id="${rsEsc(id)}" aria-label="Rimuovi ${rsEsc(id)}"><ha-icon icon="mdi:close"></ha-icon></button></div>`).join('')}
    <div class="rs-e-line"><div data-selector="${key}" data-add="true"></div></div>
    <div class="rs-e-fallback"><input type="text" data-field="${key}" placeholder="${domains[0]}.*" value=""/></div></div>`;
  }
  _render(){if(!this.isConnected)return;const c=this._config;const room=this._hass?.states?.[c.selection_entity];const options=Array.isArray(room?.attributes?.options)?room.attributes.options:[];
    this.shadowRoot.innerHTML=`<style>${RS_EDITOR_STYLE}</style><div class="rs-edit ${customElements.get('ha-selector')?'':'rs-e-no-native'}">
      <section class="rs-e-section"><h3>Ambienti</h3>${this._field('Selettore ambienti (input_select / select)','selection_entity','input_select.*')}
      <div class="rs-e-help">Riutilizza l’entità che controlla già il contenuto della dashboard.</div>
      ${options.length?`<div class="rs-e-help">Opzioni rilevate: ${options.map(x=>rsEsc(x)).join(', ')}</div>`:''}
      ${options.map(n=>`<div class="rs-e-field"><label>Icona di ${rsEsc(n)}</label><input type="text" data-icon-name="${rsEsc(n)}" value="${rsEsc(c.room_icons[n]||rsDefaultIcon(n))}" placeholder="mdi:home-outline" /></div>`).join('')}
      </section>
      <section class="rs-e-section"><h3>Indicatori attivi</h3>${this._multi('lights','Luci',RS_DOMAINS.lights)}${this._multi('climates','Termostati',RS_DOMAINS.climates)}
      ${this._field('Allarme','alarm_entity','alarm_control_panel.*')}${this._field('Lavatrice (stato)','washer_entity','binary_sensor.*')}
      <div class="rs-e-field"><label>Valore che indica lavatrice attiva</label><input type="text" data-field="washer_active_state" value="${rsEsc(c.washer_active_state)}"/></div></section>
      <section class="rs-e-section"><h3>Dettagli e comandi</h3>${this._field('Sensore energia consumata nel mese (opzionale)','energy_entity','sensor.*')}
      <div class="rs-e-field"><label>Tema</label><select data-field="theme_mode">${['auto','light','dark'].map(x=>`<option value="${x}" ${c.theme_mode===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <label class="rs-e-check"><input type="checkbox" data-field="show_details_button" ${c.show_details_button?'checked':''}/>Mostra “Dettagli e stato”</label>
      <label class="rs-e-check"><input type="checkbox" data-field="controls_enabled" ${c.controls_enabled?'checked':''}/>Abilita i comandi luci e riscaldamento (con conferma)</label>
      <p class="rs-e-help">I comandi rimangono disabilitati per impostazione predefinita. Per allarme e lavatrice vengono usati i dettagli nativi Home Assistant.</p></section>
    </div>`;this._mountSelectors();}
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
  }
  _click(e){const b=e.target.closest('button');if(!b)return;
    if(b.dataset.remove){this._update({[b.dataset.remove]:this._config[b.dataset.remove].filter(id=>id!==b.dataset.id)});return;}
  }
  _change(e){const input=e.target;const key=input.dataset.field;
    if(input.hasAttribute('data-icon-name')){const name=input.dataset.iconName;this._update({room_icons:{...this._config.room_icons,[name]:rsIcon(input.value,rsDefaultIcon(name))}});return;}
    if(!key)return;
    if(key==='controls_enabled'||key==='show_details_button'){this._update({[key]:input.checked});return;}
    if(key==='theme_mode'){this._update({theme_mode:input.value});return;}
    if(key==='washer_active_state'){this._update({washer_active_state:input.value});return;}
    if(key==='lights'||key==='climates'){
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
export {rsConfig,rsEntity,rsArray,rsDuration};