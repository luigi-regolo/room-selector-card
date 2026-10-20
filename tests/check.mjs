import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/room-selector-card.js',import.meta.url),'utf8');
assert.match(source,/\.rs-layer\{[^}]*pointer-events:auto/, 'Popup layer must receive clicks');
assert.match(source,/\.rs-card\.rs-dark\{[^}]*--rs-bg:#101211/, 'Card dark palette must match Camera Grid');
assert.match(source,/\.rs-panel\.rs-dark[^}]*--rs-bg:#101211/, 'Popup dark palette must match Camera Grid');
assert.match(source,/\.rs-panel\{[^}]*width:min\(390px,100%\)/, 'Popup remains compact');
assert.match(source,/\['ambienti','Ambienti'\].*\['avanzate','Avanzate'\]/, 'Editor exposes standard tabs');
assert.doesNotMatch(source,/Solo gli stati attivi compaiono sulla card\./, 'No unnecessary popup footer');
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
hass.themes={darkMode:true};card._sig='';card.hass=hass;
assert.ok(card.shadowRoot.innerHTML.includes('class="rs-card rs-dark"'),'auto theme uses dark palette');
hass.themes={darkMode:false};card._sig='';card.hass=hass;
assert.ok(card.shadowRoot.innerHTML.includes('class="rs-card rs-light"'),'auto theme uses light palette');
assert.ok(!card.shadowRoot.innerHTML.includes('1 luce accesa'),'Luci removed from card');
assert.ok(card.shadowRoot.innerHTML.includes('Allarme disinserito'));
assert.ok(card.shadowRoot.innerHTML.includes('Serratura da configurare'));
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
// Existing alarm and washer entity IDs migrate to arrays without changing the saved configuration.
const legacy=rsConfig({alarm_entity:'alarm_control_panel.old',washer_entity:'input_boolean.washer'});
assert.deepEqual(legacy.alarms,['alarm_control_panel.old']);
assert.deepEqual(legacy.washers,['input_boolean.washer']);
assert.deepEqual(rsConfig({...legacy,alarms:[],washers:[]}).alarms,[],'Explicitly cleared legacy alarms stay removed');
const expanded=rsConfig({
  alarms:['alarm_control_panel.first','alarm_control_panel.second'],
  washers:['binary_sensor.wash1','input_boolean.wash2'],
  custom_indicators:[{name:'Deumidificatori',icon:'mdi:air-humidifier',active_state:'on',entities:['input_boolean.dehumidifier','switch.air','sensor.invalid-syntax!']}]
});
assert.equal(expanded.custom_indicators.length,1);
assert.deepEqual(expanded.custom_indicators[0].entities,['input_boolean.dehumidifier','switch.air']);
assert.equal(expanded.custom_indicators[0].icon,'mdi:air-humidifier');
assert.deepEqual(expanded.alarms,['alarm_control_panel.first','alarm_control_panel.second']);
assert.deepEqual(expanded.washers,['binary_sensor.wash1','input_boolean.wash2']);
assert.ok(rsDuration(new Date(Date.now()-75*60000).toISOString()).includes('ora e 15 min'));
const CardMulti=elements.get('room-selector-card');
const multi=new CardMulti();
multi.setConfig(expanded);
multi.hass={states:{
  'alarm_control_panel.first':{state:'armed_home',last_changed:new Date(Date.now()-3600000).toISOString(),attributes:{}},
  'alarm_control_panel.second':{state:'disarmed',attributes:{}},
  'binary_sensor.wash1':{state:'off',attributes:{}},'input_boolean.wash2':{state:'on',attributes:{}},
  'input_boolean.dehumidifier':{state:'on',attributes:{}},'switch.air':{state:'off',attributes:{}}
}};
assert.deepEqual(multi._active().alarms,['alarm_control_panel.first']);
assert.deepEqual(multi._active().washers,['input_boolean.wash2']);
assert.deepEqual(multi._active().custom[0].active,['input_boolean.dehumidifier']);
assert.match(multi.shadowRoot.innerHTML,/Deumidificatori/);
assert.doesNotMatch(multi.shadowRoot.innerHTML,/2 allarmi inseriti/);
const customUnsafe=rsConfig({custom_indicators:[{name:'<img src=x onerror=alert(1)>',icon:'mdi:bell" onload=bad',active_state:'on',entities:['switch.test']} ]});
assert.equal(customUnsafe.custom_indicators[0].icon,'mdi:information-outline');
const malicious=new CardMulti();malicious.setConfig(customUnsafe);
assert.doesNotMatch(malicious.shadowRoot.innerHTML,/<img src=x/);

const home=rsConfig({lock_entity:'lock.front',dryers:['binary_sensor.dryer'],cooling_climates:['climate.ac'],dryer_time_entity:'sensor.time_dryer'});
assert.equal(home.lock_entity,'lock.front');
assert.deepEqual(home.dryers,['binary_sensor.dryer']);
assert.equal(home.dryer_time_entity,'sensor.time_dryer');
assert.equal(rsConfig({lock_entity:'switch.invalid'}).lock_entity,'');
const homeCard=new Card();
homeCard.setConfig({...home,alarms:['alarm_control_panel.house'],lights:['light.x']});
homeCard.hass={states:{
 'lock.front':{state:'unlocked',attributes:{}},
 'binary_sensor.dryer':{state:'on',attributes:{}},
 'sensor.time_dryer':{state:'37 min',attributes:{}},
 'climate.ac':{state:'cool',attributes:{hvac_action:'cooling'}},
 'light.x':{state:'off',attributes:{}},
 'alarm_control_panel.house':{state:'disarmed',attributes:{}}
}};
assert.match(homeCard.shadowRoot.innerHTML,/Allarme disinserito/);
assert.match(homeCard.shadowRoot.innerHTML,/Porta sbloccata/);
assert.match(homeCard.shadowRoot.innerHTML,/Asciugatrice attiva/);
assert.match(homeCard.shadowRoot.innerHTML,/Climatizzatore attivo/);
assert.doesNotMatch(homeCard.shadowRoot.innerHTML,/1 luce accesa/);
assert.equal(homeCard._timeValue('sensor.time_dryer'),'37 min');
homeCard.setConfig({...homeCard._config,alarms:[],lock_entity:''});
homeCard.hass={states:{}};
assert.match(homeCard.shadowRoot.innerHTML,/Allarme da configurare/);
assert.match(homeCard.shadowRoot.innerHTML,/Serratura da configurare/);
assert.doesNotMatch(homeCard.shadowRoot.innerHTML,/Asciugatrice attiva/);


assert.match(source,/\.rs-dialog-top strong\{[^}]*font-size:17px/);
assert.match(source,/env\(safe-area-inset-top\)/);
assert.match(source,/max-height:min\(90dvh,720px\)/);
assert.match(source,/\.rs-details\{[^}]*padding:5px 9px/);
assert.match(source,/\.rs-details\{[^}]*margin:12px 0 0/);
assert.match(source,/\.rs-details ha-icon\{[^}]*width:14px/);
assert.doesNotMatch(source,/this\._multi\('lights','Luci'/);
const detailCard=new Card();
detailCard.setConfig({alarms:['alarm_control_panel.house'],lock_entity:'lock.front',lights:['light.legacy'],climates:['climate.heating'],cooling_climates:['climate.cooling'],washers:['binary_sensor.washer'],dryers:['binary_sensor.dryer'],energy_entity:'sensor.month_energy',custom_indicators:[{name:'Deumidificatori',icon:'mdi:water',active_state:'on',entities:['switch.dehumidifier']}]});
detailCard.hass={states:{
 'alarm_control_panel.house':{state:'disarmed',attributes:{}},
 'lock.front':{state:'locked',attributes:{}},
 'light.legacy':{state:'on',attributes:{}},
 'climate.heating':{state:'heat',attributes:{hvac_action:'heating'}},
 'climate.cooling':{state:'cool',attributes:{hvac_action:'cooling'}},
 'binary_sensor.washer':{state:'off',attributes:{}},
 'binary_sensor.dryer':{state:'on',attributes:{}},
 'sensor.month_energy':{state:'9.4264',attributes:{unit_of_measurement:'kWh'}},
 'switch.dehumidifier':{state:'on',attributes:{}}
}};
assert.doesNotMatch(detailCard.shadowRoot.innerHTML,/luce accesa|luci accese/);
assert.match(detailCard.shadowRoot.innerHTML,/data-act="details"><ha-icon icon="mdi:information-outline"><\/ha-icon> Dettagli e stato<\/button>/);
const popupRoot={innerHTML:'',querySelector(){return null;},querySelectorAll(){return []}};
detailCard._overlay={shadowRoot:popupRoot};detailCard._overlayMode='details';detailCard._renderOverlay();
const popup=popupRoot.innerHTML;
assert.match(popup,/<strong>Dettagli e stato<\/strong>/);
assert.doesNotMatch(popup,/DETTAGLI AMBIENTE|STATO GENERALE DELLA CASA|rs-popup-title|rs-big-icon|class="rs-row-title">Luci<\/div>/);
assert.equal((popup.match(/>Gestisci<\/button>/g)||[]).length,2);
assert.equal((popup.match(/data-more=/g)||[]).length,2);
const ordering=['Allarme','Serratura','Termosifoni','Climatizzazione','Lavatrice','Asciugatrice','Energia del mese','Deumidificatori'];
let preceding=-1;
for(const label of ordering){
 const index=popup.indexOf('class="rs-row-title">'+label+'</div>');
 assert.ok(index>preceding,'Correct order '+label);
 preceding=index;
}
assert.doesNotMatch(popup,/data-action="(?:lights-off|climates-off)"/);

console.log('OK — legacy compatibility, multi-entity helpers, native-safe icons, alarm timing, conditional display, explicit controls.');