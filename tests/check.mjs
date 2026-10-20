import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/room-selector-card.js',import.meta.url),'utf8');
assert.match(source,/\.rs-layer\{[^}]*pointer-events:auto/, 'Popup layer must receive clicks');
const elements = new Map();
globalThis.HTMLElement = class { constructor(){this.isConnected=true;this.shadowRoot={innerHTML:'',addEventListener(){},querySelector(){return null;}};} attachShadow(){return this.shadowRoot;} dispatchEvent(){} };
globalThis.customElements = {get:k=>elements.get(k),define:(k,v)=>elements.set(k,v)};
globalThis.document = {removeEventListener(){}};
globalThis.window = {removeEventListener(){}};
const {rsConfig,rsEntity,rsArray,rsDuration}=await import('../dist/room-selector-card.js');
assert.equal(rsConfig().controls_enabled,false);
assert.equal(rsConfig().selection_entity,'');
assert.equal(rsConfig({selection_entity:'input_select.room'}).selection_entity,'input_select.room');
assert.equal(rsConfig({selection_entity:'select.rooms'}).selection_entity,'select.rooms');
assert.equal(rsConfig({selection_entity:'light.room'}).selection_entity,'');
assert.deepEqual(rsConfig({lights:['light.a','light.a','sensor.foo','light.b']}).lights,['light.a','light.b']);
assert.equal(rsEntity('sensor.foo',['light']),'');
assert.equal(rsDuration('not-a-time'),'');
const Card=elements.get('room-selector-card');
const card=new Card();
card.setConfig({selection_entity:'input_select.rooms',lights:['light.kitchen','light.bedroom'],climates:['climate.living'],alarm_entity:'alarm_control_panel.house',washer_entity:'binary_sensor.washer',energy_entity:'sensor.energy_month'});
const calls=[];
const hass={states:{
 'input_select.rooms':{state:'Open Space',attributes:{options:['Open Space','Lavanderia','Bagno','Camera']}},
 'light.kitchen':{state:'on',attributes:{}},'light.bedroom':{state:'off',attributes:{}},
 'climate.living':{state:'heat',attributes:{hvac_action:'heating',hvac_modes:['off','heat']}},
 'alarm_control_panel.house':{state:'disarmed',attributes:{}},
 'binary_sensor.washer':{state:'off',attributes:{}},
 'sensor.energy_month':{state:'121.5',attributes:{unit_of_measurement:'kWh'}}
 },callService:async(...args)=>{calls.push(args);}};
card.hass=hass;
assert.ok(card.shadowRoot.innerHTML.includes('Open Space'));
assert.ok(card.shadowRoot.innerHTML.includes('1 luce accesa'));
assert.ok(card.shadowRoot.innerHTML.includes('1 termosifone attivo'));
assert.ok(!card.shadowRoot.innerHTML.includes('Lavatrice attiva'));
assert.ok(!card.shadowRoot.innerHTML.includes('Allarme da'));
assert.equal(card._active().lights.length,1);
await card._selectRoom('Bagno');
assert.deepEqual(calls,[['input_select','select_option',{entity_id:'input_select.rooms',option:'Bagno'}]]);
await card._selectRoom('Non configurato');
assert.equal(calls.length,1);
await card._execute('lights-off');
assert.equal(calls.length,1,'controls disabled by default');
card.setConfig({...card._config, controls_enabled:true});
await card._execute('lights-off');
assert.deepEqual(calls[1],['light','turn_off',{entity_id:['light.kitchen']}]);
// An alarm triggered state must remain visible, not incorrectly reported safe.
hass.states['alarm_control_panel.house']={state:'triggered',attributes:{}};
card._sig='';card.hass=hass;
assert.ok(card.shadowRoot.innerHTML.includes('Allarme in corso'));
// Injection attempts cannot insert HTML or arbitrary icon attributes.
const unsafe=rsConfig({room_icons:{'Open Space':'mdi:home\" onload=alert(1)'},lights:['light.x<script>']});
assert.equal(unsafe.room_icons['Open Space'],'mdi:home-outline');
assert.deepEqual(unsafe.lights,[]);
console.log('OK — config, selection, active indicators, control opt-in, alarm critical state, validation.');