const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const esbuild=require('../node_modules/esbuild'),puppeteer=require('../../pos-backend/node_modules/puppeteer');
(async()=>{
 const results=[];
 for(const baseline of [true,false]){
 const build=await esbuild.build({entryPoints:[path.join(__dirname,'block3-runtime.fixture.jsx')],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':'{}'},plugins:[{name:'fixture',setup(b){
 b.onLoad({filter:/pages[\\/]admin[\\/]Inventory.jsx$/},args=>{const source=baseline?JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../BLOQUE_3_2026-11-04/estado-inicial.json'))).find(x=>x.path.endsWith('/Inventory.jsx')).source:fs.readFileSync(args.path,'utf8');return {contents:source+'\nexport {MovementModal};',loader:'jsx'};});
 b.onResolve({filter:/^react-i18next$/},()=>({path:'i18n',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'const t=x=>x;export const useTranslation=()=>({t,i18n:{language:"es"}});'}));
 }}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?build.outputFiles[0].text:'<div id="root"></div><script src="/app.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 try{browser=await puppeteer.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin+'/')?r.continue():r.abort());await page.goto(origin);await page.waitForSelector('[class*="md:grid-cols-3"] > input:not([type])');
 const selector='[class*="md:grid-cols-3"] > input:not([type])';await page.$eval(selector,e=>{window.field=e;});await page.type(selector,'ABC');
 const state=await page.evaluate(()=>({same:window.field.isConnected,focused:document.activeElement===window.field,values:[...document.querySelectorAll('[class*="md:grid-cols-3"] > input:not([type])')].map(e=>e.value)}));
 if(baseline){assert.equal(state.same,false);results.push({name:'Antes: escribir reemplaza el campo y pierde foco',status:'REPRODUCIDO'});}
 else {assert.equal(state.same,true);assert.equal(state.focused,true);assert.ok(state.values[0].endsWith('ABC'));await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');assert.ok((await page.$eval(selector,e=>e.value)).endsWith('A'));results.push({name:'Después: escribir y borrar mantiene campo y foco',status:'PASS'});
 const click=label=>page.evaluate(label=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().endsWith(label));if(!b)throw Error(label);b.click();},label);
 await click('actions.addStep');const count=await page.$$eval(selector,es=>es.length);assert.equal(count,3);await page.$$eval(selector,es=>{window.last=es[2];});await click('actions.remove');assert.equal(await page.evaluate(()=>window.last.isConnected),true);results.push({name:'Eliminar otra fila conserva identidad de las restantes',status:'PASS'});
 const numbers=await page.$$('input[type="number"]');await numbers[0].type('10');await numbers[1].type('100');await numbers[2].type('8');
 await click('actions.save');await click('actions.saving');assert.equal(await page.evaluate(()=>window.requests.length),1);assert.equal(await page.evaluate(()=>window.modalClosed),false);await page.evaluate(()=>window.finish(false));await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim().endsWith('actions.save')));assert.equal(await page.evaluate(()=>window.modalClosed),false);assert.equal(await numbers[0].evaluate(e=>e.value),'10');await click('actions.save');assert.equal(await page.evaluate(()=>window.requests[0].idempotencyKey===window.requests[1].idempotencyKey),true);await page.evaluate(()=>window.finish(true));await page.waitForFunction('window.modalClosed===true');results.push({name:'Doble clic, error conserva datos, reintento y cierre tras éxito',status:'PASS'});
 }
 assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
 }
 fs.writeFileSync(path.resolve(__dirname,'../../BLOQUE_3_2026-11-04/frontend-runtime.json'),JSON.stringify(results,null,2));console.log(results);
})().catch(e=>{console.error(e);process.exitCode=1;});
