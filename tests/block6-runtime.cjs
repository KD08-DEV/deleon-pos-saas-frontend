const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const esbuild=require('../node_modules/esbuild'),puppeteer=require('../../pos-backend/node_modules/puppeteer');
(async()=>{
 const bundle=await esbuild.build({entryPoints:[path.join(__dirname,'block6-runtime.fixture.jsx')],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':'{}'}});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/app.js"></script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,results=[];let browser;
 try{
  browser=await puppeteer.launch({headless:true});const page=await browser.newPage(),errors=[];page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin+'/')?r.continue():r.abort());await page.goto(origin);
  const click=async text=>{await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text),{},text);await page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text).click(),text);};
  await page.waitForFunction(()=>document.body.textContent.includes('Alimentación'));
  await page.type('form input','Nueva categoría sin perder foco');assert.equal(await page.$eval('form input',e=>e.value),'Nueva categoría sin perder foco');
  await page.evaluate(()=>{const f=document.querySelector('form');f.requestSubmit();f.requestSubmit();});
  await page.waitForFunction(()=>window.requests.some(r=>r.method==='post')&&document.querySelector('form input').value==='');
  assert.equal(await page.evaluate(()=>window.requests.filter(r=>r.method==='post').length),1);
  results.push({name:'Escritura continua y doble envío: una sola creación',status:'PASS'});
  await page.waitForFunction(()=>!document.querySelector('form button').disabled || document.querySelector('form button').textContent.trim()==='Crear');
  await page.type('form input','Duplicada');await page.evaluate(()=>document.querySelector('form').requestSubmit());
  await page.waitForFunction(()=>document.body.textContent.includes('Ya existe una categoría'));
  assert.equal(await page.$eval('form input',e=>e.value),'Duplicada');
  results.push({name:'Duplicado: mensaje español y formulario conservado',status:'PASS'});
  await click('Editar');await page.waitForFunction(()=>document.querySelectorAll('form').length===2);
  await page.evaluate(()=>document.querySelectorAll('form')[1].requestSubmit());
  await page.waitForFunction(()=>document.querySelector('form [role="alert"]')?.textContent.includes('Ya existe'));
  results.push({name:'Error de edición visible dentro del modal',status:'PASS'});
  await click('Cancelar');await page.waitForFunction(()=>document.querySelectorAll('form').length===1);
  await click('Eliminar');await click('Sí, eliminar');
  await page.waitForFunction(()=>[...document.querySelectorAll('[role="alert"]')].some(e=>e.textContent.includes('tiene gastos asociados')));
  results.push({name:'Borrado rechazado conserva modal y explica los gastos asociados',status:'PASS'});
  const texts=await page.evaluate(()=>['INVALID_OPENING_FLOAT','PENDING_CASH_SESSION_CLOSE','SESSION_ALREADY_EXISTS','MISSING_REGISTER_ID','OPEN_CASH_SESSION_FAILED'].map(message=>window.financeErrorMessage({response:{status:409,data:{message}}})));
  assert.ok(texts.every(t=>!/[A-Z]{3}_/.test(t)));assert.match(texts[0],/monto válido/);assert.match(texts[1],/pendiente de cierre/);assert.deepEqual(errors,[]);
  results.push({name:'Mensajes de apertura en español',status:'PASS'});
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
 fs.writeFileSync(path.resolve(__dirname,'../../BLOQUE_6_2026-11-05/frontend-runtime.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
