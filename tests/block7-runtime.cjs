const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const esbuild=require('../node_modules/esbuild'),puppeteer=require('../../pos-backend/node_modules/puppeteer');
(async()=>{
 const bundle=await esbuild.build({entryPoints:[path.join(__dirname,'block7-runtime.fixture.jsx')],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':'{}'},plugins:[{name:'local',setup(b){b.onResolve({filter:/\/EcfBranchOverview$/},()=>({path:'overview',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default function Overview(){return null}',loader:'jsx'}));}}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/app.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,results=[];let browser;
 try{
  browser=await puppeteer.launch({headless:true});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6000);await p.setRequestInterception(true);p.on('request',r=>r.url().startsWith(origin+'/')?r.continue():r.abort());await p.goto(origin);
  await p.waitForSelector('form');assert.ok(await p.evaluate(()=>document.body.textContent.includes('1/2')));
  await p.type('form input','Secundaria');await p.evaluate(()=>{document.querySelector('form').requestSubmit();document.querySelector('form').requestSubmit();});
  await p.waitForFunction(()=>document.body.textContent.includes('límite de 2 sucursales del plan Premium'));
  assert.equal(await p.evaluate(()=>window.requests.filter(r=>r.method==='post').length),1);
  results.push({name:'Límite dinámico desde servidor y doble envío protegido (cuota simulada)',status:'PASS'});
  await p.evaluate(()=>window.changePolicy({plan:'estandar',label:'Estándar',multiClient:false,maxBranches:1,canCreate:false}));
  await p.waitForFunction(()=>document.body.textContent.includes('Para crear varias sucursales'));
  assert.equal(await p.$('form'),null);assert.ok(await p.evaluate(()=>document.body.textContent.includes('Secundaria')));
  results.push({name:'Bajar plan oculta creación y conserva acceso a sedes existentes',status:'PASS'});
  await p.evaluate(()=>window.changePolicy({plan:'pro',label:'Pro',multiClient:true,maxBranches:3,canCreate:true}));await p.waitForSelector('form');
  assert.ok(await p.evaluate(()=>document.body.textContent.includes('2/3')));assert.deepEqual(errors,[]);
  results.push({name:'Subir plan restaura formulario sin recargar la aplicación',status:'PASS'});
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
 fs.writeFileSync(path.resolve(__dirname,'../../BLOQUE_7_2026-11-05/frontend-runtime.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
