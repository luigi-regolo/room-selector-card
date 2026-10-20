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
.rs-chip ha-icon{--mdc-icon-size:18px;flex:none}.rs-chip.light ha-icon{color:#e4b24d}.rs-chip.climate ha-icon{color:#eb9654}.rs-chip.alarm ha-icon{color:#0b9b77}.rs-chip.alarm-critical ha-icon{color:#db6867}.rs-chip.washer ha-icon{color:#87a7ba}
.rs-bottom{margin-top:14px;display:flex;justify-content:flex-start}.rs-details{border:0;background:var(--rs-green);color:#fff;font-size:11px;font-weight:650;border-radius:999px;padding:7px 11px;display:inline-flex;align-items:center;gap:6px;min-height:30px;line-height:1.2}
.rs-details ha-icon{--mdc-icon-size:14px}.rs-notice{font-size:12px;color:var(--rs-muted);margin:13px 4px 0;line-height:1.45}.rs-error{font-size:12px;color:var(--error-color,#d86d60);margin-top:10px;overflow-wrap:anywhere}
@container(max-width:360px){.rs-card{padding:13px;border-radius:23px}.rs-title{font-size:23px}.rs-chips{gap:6px;margin-top:12px}.rs-chip{font-size:11px;padding:7px 9px;min-height:36px}.rs-toggle{min-width:38px;width:38px;height:38px}.rs-bottom{margin-top:12px}}
@media(prefers-reduced-motion:reduce){.rs-toggle,.rs-chip,.rs-details{transition:none!important}}
`;
const RS_OVERLAY_STYLE = `
:host{font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif));font-size:14px}
*,*:before,*:after{box-sizing:border-box}button{font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
.rs-layer{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:#0009;overscroll-behavior:contain;pointer-events:auto}
.rs-layer.menu-layer{background:transparent;pointer-events:auto;align-items:initial;justify-content:initial;padding:0}
.rs-panel,.rs-menu{--rs-green:#0a7156;--rs-bg:#fafbf9;--rs-text:#18221c;--rs-muted:#56675c;--rs-surface:#f0f2ef;--rs-circle:#fff;--rs-line:#e0e5df;background:var(--rs-bg);color:var(--rs-text);border:1px solid var(--rs-line);border-radius:26px;box-shadow:0 18px 60px #0005;min-width:0}
.rs-panel.rs-dark,.rs-menu.rs-dark{--rs-green:#0e795d;--rs-bg:#101211;--rs-text:#f5f7f4;--rs-muted:#bbc5bd;--rs-surface:#191c1a;--rs-circle:#282b29;--rs-line:#2b302c}
.rs-panel.rs-light,.rs-menu.rs-light{--rs-green:#0a7156;--rs-bg:#fafbf9;--rs-text:#18221c;--rs-muted:#56675c;--rs-surface:#f0f2ef;--rs-circle:#fff;--rs-line:#e0e5df}
.rs-panel{width:min(390px,100%);max-height:min(90dvh,720px);display:flex;flex-direction:column;overflow:hidden;padding:18px}
.rs-dialog-top{display:flex;align-items:center;gap:10px;min-height:38px;margin:0 0 12px;background:var(--rs-bg);flex:none}
.rs-big-icon{width:39px;height:39px;flex:none;border-radius:50%;background:var(--rs-circle);color:var(--rs-text);display:grid;place-items:center}.rs-big-icon ha-icon{--mdc-icon-size:21px}
.rs-popup-titles{flex:1;min-width:0}.rs-eyebrow{letter-spacing:1.5px;font-size:10px;color:var(--rs-muted);font-weight:750;margin-bottom:4px}.rs-popup-title{font-weight:650;font-size:19px;line-height:1.2;overflow-wrap:anywhere}.rs-dot{color:var(--rs-green)}
.rs-x{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--rs-surface);border:0;color:var(--rs-text);padding:0}.rs-x ha-icon{--mdc-icon-size:18px}
.rs-dialog-body{padding:0 2px 2px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;min-height:0;scrollbar-gutter:stable}
.rs-row{display:flex;align-items:center;gap:10px;background:var(--rs-surface);border:1px solid var(--rs-line);padding:11px 12px;border-radius:14px;min-width:0;margin:0 0 9px;min-height:66px}
.rs-row-icon{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;color:var(--rs-text);background:var(--rs-circle)}.rs-row-icon ha-icon{--mdc-icon-size:20px}
.rs-row-txt{flex:1;min-width:0}.rs-row-title{font-size:13px;font-weight:650}.rs-row-desc{font-size:12px;color:var(--rs-muted);margin-top:3px;overflow-wrap:anywhere}.rs-row button{border:1px solid var(--rs-line);border-radius:999px;color:var(--rs-text);background:var(--rs-circle);padding:8px 10px;font-size:11px;min-height:32px;white-space:nowrap;flex:none}
.rs-help{font-size:12px;color:var(--rs-muted);line-height:1.5;margin:11px 2px}.rs-confirm{border:1px solid #bd8a4e;background:#b17c2a1c;padding:12px;border-radius:14px;margin-bottom:12px}.rs-confirm p{font-size:13px;margin:0 0 10px}.rs-confirm-actions{display:flex;gap:9px}.rs-confirm-actions button{border-radius:999px;min-height:36px;font-size:12px;border:1px solid var(--rs-line);padding:7px 12px;color:var(--rs-text);background:var(--rs-circle)}.rs-confirm-actions button.primary{background:var(--rs-green);border-color:var(--rs-green);color:#fff}
.rs-menu{position:fixed;max-height:min(460px,calc(100dvh - 20px));overflow-y:auto;overflow-x:hidden;min-width:220px;max-width:calc(100vw - 16px);padding:8px;border-radius:18px;box-shadow:0 18px 60px #0009}
.rs-menu button{font-size:13px;border:0;color:var(--rs-text);background:transparent;display:flex;align-items:center;gap:11px;min-height:46px;width:100%;border-radius:12px;padding:8px 12px;text-align:left}.rs-menu button[aria-current=true]{background:var(--rs-green);color:#fff}.rs-menu button span{flex:1;overflow-wrap:anywhere}.rs-menu ha-icon{--mdc-icon-size:20px;flex:none}
.rs-menu button:focus-visible,.rs-x:focus-visible,.rs-row button:focus-visible,.rs-confirm-actions button:focus-visible{outline:2px solid var(--rs-green);outline-offset:2px}
@media(max-width:420px){.rs-panel{padding:14px;border-radius:23px;width:min(390px,100%)}.rs-popup-title{font-size:18px}.rs-row{gap:8px;padding:10px}.rs-row-icon{width:34px;height:34px}.rs-row button{font-size:10px}}
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
  _palette(){const m=this._config.theme_mode;return `rs-${m==='auto'?(this._hass?.themes?.darkMode===true?'dark':'light'):m}`;}
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
      const amount=rsKnown(energy)&&Number.isFinite(Number(energy.state))?`${new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(Number(energy.state))} ${rsText(energy.attributes?.unit_of_measurement||'',20)}`.trim():'Dato non disponibile';
      rows.push(this._detailRow('Energia del mese',amount,'mdi:lightning-bolt',c.energy_entity));
    }
    const names={ 'lights-off':'Spegnere tutte le luci accese configurate?', 'climates-off':'Disattivare il riscaldamento per tutti i termostati attivi configurati?' };
    root.innerHTML=`<style>${RS_OVERLAY_STYLE}</style><div class="rs-layer" data-backdrop="true"><section class="rs-panel ${palette}" role="dialog" aria-modal="true" aria-label="Dettagli e stato">
      <div class="rs-dialog-top"><div class="rs-big-icon"><ha-icon icon="${rsIcon(this._roomIcon(room))}"></ha-icon></div><div class="rs-popup-titles"><div class="rs-eyebrow">DETTAGLI AMBIENTE</div><div class="rs-popup-title">${rsEsc(room||'Ambiente')}<span class="rs-dot">.</span></div></div><button type="button" class="rs-x" data-close="true" aria-label="Chiudi dettagli" data-focus="true"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="rs-dialog-body">${this._confirm?`<div class="rs-confirm"><p>${rsEsc(names[this._confirm]||'Confermare?')}</p><div class="rs-confirm-actions"><button data-cancel="true">Annulla</button><button class="primary" data-execute="${this._confirm}" ${this._busy?'disabled':''}>Conferma</button></div></div>`:''}
      ${rows.length?rows.join(''):'<div class="rs-help">Nessun indicatore configurato. Aggiungi le entità dall’editor visuale.</div>'}
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
.rs-e-input:focus-visible,.rs-e-button:focus-visible,.rs-e-tab:focus-visible,.rs-e-clear:focus-visible{outline:2px solid var(--primary-color,#0b7457);outline-offset:2px}
`;
class RoomSelectorCardEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._config=rsConfig();this._hass=null;this._attempted=false;this._tab='ambienti';this._optionsSig='';
    this.shadowRoot.addEventListener('click',e=>this._click(e));this.shadowRoot.addEventListener('change',e=>this._change(e));}
  set hass(hass){this._hass=hass;this.shadowRoot.querySelectorAll('ha-selector').forEach(el=>el.hass=hass);const options=hass?.states?.[this._config.selection_entity]?.attributes?.options;const sig=JSON.stringify(Array.isArray(options)?options:[]);if(sig!==this._optionsSig){this._optionsSig=sig;this._render();}}
  setConfig(raw){const cfg=rsConfig(raw);if(JSON.stringify(cfg)===JSON.stringify(this._config)&&this.shadowRoot.querySelector('.rs-edit'))return;this._config=cfg;this._render();}
  connectedCallback(){this._render();this._ensureNative();}
  async _ensureNative(){if(this._attempted)return;this._attempted=true;
    if(!customElements.get('ha-selector')){try{const helper=await window.loadCardHelpers?.();await helper?.importSelector?.();}catch{/* Inputs remain usable */}}
    this._render();}
  _update(patch){this._config=rsConfig({...this._config,...patch});this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));this._render();}
  _field(label,key,placeholder=''){
    const val=this._config[key]||'';
    return `<div class="rs-e-field"><label>${rsEsc(label)}</label><div class="rs-e-line"><div class="rs-e-selector"><div data-selector="${key}"></div><div class="rs-e-fallback"><input class="rs-e-input" type="text" data-field="${key}" placeholder="${rsEsc(placeholder)}" value="${rsEsc(val)}"/></div></div>${val?`<button type="button" class="rs-e-clear" data-clear="${key}" aria-label="Rimuovi ${rsEsc(label)}"><ha-icon icon="mdi:close"></ha-icon></button>`:''}</div></div>`;
  }
  _multi(key,label,domains){
    return `<div class="rs-e-field"><div class="rs-e-label">${rsEsc(label)}</div>${this._config[key].map(id=>`<div class="rs-e-item"><span>${rsEsc(id)}</span><button type="button" class="rs-e-clear" data-remove="${key}" data-id="${rsEsc(id)}" aria-label="Rimuovi ${rsEsc(id)}"><ha-icon icon="mdi:close"></ha-icon></button></div>`).join('')}
    <div class="rs-e-line"><div class="rs-e-selector"><div data-selector="${key}" data-add="true"></div><div class="rs-e-fallback"><input class="rs-e-input" type="text" data-field="${key}" placeholder="${domains[0]}.*" value=""/></div></div></div></div>`;
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
          const icon=rsIcon(c.room_icons[name],rsDefaultIcon(name));return `<div class="rs-e-room"><div class="rs-e-room-title">${rsEsc(name)}</div><div class="rs-e-icon-line"><ha-icon icon="${icon}"></ha-icon><input class="rs-e-input" type="text" data-icon-name="${rsEsc(name)}" value="${icon}" placeholder="mdi:home-outline" aria-label="Icona di ${rsEsc(name)}"/></div></div>`;
        }).join(''):'<div class="rs-e-help">Seleziona un helper con ambienti disponibili per configurare le relative icone.</div>');
    }
    if(this._tab==='indicatori'){
      body='<div class="rs-e-heading">Indicatori attivi</div><div class="rs-e-desc">Configura le entità da monitorare. Sulla card vengono mostrati soltanto gli stati attivi; nel popup trovi i relativi dettagli.</div>'+
        this._multi('lights','Luci',RS_DOMAINS.lights)+this._multi('climates','Termostati',RS_DOMAINS.climates)+
        this._field('Allarme (facoltativo)','alarm_entity','alarm_control_panel.*')+
        this._field('Stato lavatrice (facoltativo)','washer_entity','binary_sensor.*')+
        this._field('Energia consumata nel mese (facoltativo)','energy_entity','sensor.*');
    }
    if(this._tab==='aspetto'){
      const theme=`<select class="rs-e-input" data-field="theme_mode">${[['auto','Auto (Home Assistant)'],['light','Light Edera'],['dark','Dark Edera']].map(([v,label])=>`<option value="${v}" ${c.theme_mode===v?'selected':''}>${label}</option>`).join('')}</select>`;
      body='<div class="rs-e-heading">Aspetto Edera</div><div class="rs-e-desc">Personalizza intestazione, tema e pulsante dei dettagli, seguendo il design delle altre card.</div>'+
        `<div class="rs-e-field"><label>Intestazione superiore</label><input class="rs-e-input" type="text" data-field="eyebrow" maxlength="55" value="${rsEsc(c.eyebrow)}"/></div>`+
        `<div class="rs-e-field"><label>Tema</label>${theme}</div>`+
        this._check('show_details_button','Mostra “Dettagli e stato”');
    }
    if(this._tab==='avanzate'){
      body='<div class="rs-e-heading">Avanzate</div><div class="rs-e-desc">La card è inizialmente in sola lettura. Attiva i comandi reali soltanto dopo aver verificato le entità e i permessi Home Assistant.</div>'+
        this._check('controls_enabled','Abilita lo spegnimento di luci e riscaldamento','Richiede conferma prima dei comandi; allarme e lavatrice si gestiscono dall’interfaccia nativa.')+
        `<div class="rs-e-field"><label>Valore che indica lavatrice attiva</label><input class="rs-e-input" type="text" data-field="washer_active_state" value="${rsEsc(c.washer_active_state)}"/></div>`;
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
  }
  _click(e){const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab){this._tab=b.dataset.tab;this._render();return;}
    if(b.dataset.clear){this._update({[b.dataset.clear]:''});return;}
    if(b.dataset.remove){this._update({[b.dataset.remove]:this._config[b.dataset.remove].filter(id=>id!==b.dataset.id)});return;}
  }
  _change(e){const input=e.target;const key=input.dataset.field;
    if(input.hasAttribute('data-icon-name')){const name=input.dataset.iconName;this._update({room_icons:{...this._config.room_icons,[name]:rsIcon(input.value,rsDefaultIcon(name))}});return;}
    if(!key)return;
    if(key==='controls_enabled'||key==='show_details_button'){this._update({[key]:input.checked});return;}
    if(key==='theme_mode'){this._update({theme_mode:input.value});return;}
    if(key==='washer_active_state'||key==='eyebrow'){this._update({[key]:input.value});return;}
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