// Real React components in Chromium, with delayed HTTP adapter and no external access.
const path=require('node:path'), fs=require('node:fs'), http=require('node:http'), assert=require('node:assert/strict');
const esbuild=require('../node_modules/esbuild');
const puppeteer=require('../../pos-backend/node_modules/puppeteer');
const root=path.resolve(__dirname,'..'), output=path.resolve(root,'../BLOQUE_1_2026-11-04');
(async()=>{
  const mocks={
    'react-i18next':'export const useTranslation=()=>({t:(k,o)=>o?.defaultValue||k,i18n:{language:"es"}});',
    'notistack':'export const enqueueSnackbar=(text,options)=>window.messages.push({text,...options}); export const useSnackbar=()=>({enqueueSnackbar});',
    'socket':'export const getSocket=()=>null; export const connectSocket=()=>null;',
  };
  const bundle=await esbuild.build({entryPoints:[path.join(__dirname,'block1-runtime.fixture.jsx')],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':'{}'},plugins:[{name:'isolated-block1',setup(build){
    build.onResolve({filter:/^(react-i18next|notistack)$|\/socket$/},args=>({path:args.path.split('/').pop(),namespace:'mock'}));
    build.onResolve({filter:/\/(Invoice|SplitBillModal|OrderCorrectionEditor|OrderCorrectionHistory|SplitInvoicesModal|TableAccountsActions)$/},()=>({path:'unused-child',namespace:'mock'}));
    build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path]||'export default function Unused(){return null;}',loader:'js'}));
    build.onResolve({filter:/^@https$/},()=>({path:path.join(root,'src/https/index.js')}));
    build.onResolve({filter:/^@components\//},args=>({path:path.join(root,'src/components',args.path.slice(12)+'.jsx')}));
    build.onResolve({filter:/^@\//},args=>({path:path.join(root,'src',args.path.slice(2)+'.js')}));
  }}]});
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/app.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const results=[];let browser;
  const click=async(page,label,twice=false)=>page.evaluate(({label,twice})=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label);if(!b)throw Error('Missing button '+label);b.click();if(twice)b.click();},{label,twice});
  const busy=async(page)=>{await page.waitForFunction('window.requests.length>0');assert.equal(await page.evaluate(()=>window.requests.length),1);assert.ok(await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.disabled&&/Procesando|tables.releasing/.test(b.textContent))));};
  try{
    browser=await puppeteer.launch({headless:true});
    const run=async(name,kind,fn)=>{
      const page=await browser.newPage(),errors=[];page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
      await page.setRequestInterception(true);page.on('request',req=>req.url().startsWith(origin+'/')?req.continue():req.abort());
      try{await page.goto(origin);await page.waitForFunction('!!window.renderCase');await page.evaluate(kind=>window.renderCase(kind),kind);await page.waitForSelector('button, [role="button"]');await fn(page);assert.deepEqual(errors,[]);results.push({name,status:'PASS'});}
      catch(error){results.push({name,status:'FAIL',error:error.message,browserErrors:errors});}
      finally{console.log(JSON.stringify(results.at(-1)));await page.close();}
    };
    await run('Completar: doble clic, espera y confirmación','order',async page=>{
      await click(page,'orderCard.actions.complete',true);await busy(page);
      await page.evaluate(()=>window.finish(true));await page.waitForFunction('window.updatedOrder?.orderStatus === "Completado"');
      assert.equal(await page.evaluate(()=>window.requests.length),1);
    });
    await run('Completar: error visible y reintento','order',async page=>{
      await click(page,'orderCard.actions.complete',true);await busy(page);await page.evaluate(()=>window.finish(false));
      await page.waitForFunction('window.messages.some(m=>m.variant==="error")');
      assert.equal(await page.evaluate(()=>window.updatedOrder),undefined);
      await click(page,'orderCard.actions.complete');await page.waitForFunction('window.requests.length === 2');
      await page.evaluate(()=>window.finish(true));await page.waitForFunction('!!window.updatedOrder');
    });
    for(const succeed of [true,false]) await run(`Mover: doble clic y ${succeed?'confirmación e invalidación':'error conserva selección'}`,'move',async page=>{
      await click(page,'Cambiar de mesa');await page.select('select','507f1f77bcf86cd799439012');await page.evaluate(()=>window.seedCaches());
      await click(page,'Confirmar cambio',true);await busy(page);assert.equal(await page.$eval('select',e=>e.disabled),true);
      await page.evaluate(ok=>window.finish(ok),succeed);
      if(succeed){await page.waitForFunction('window.done');assert.ok((await page.evaluate(()=>window.cacheStates())).every(s=>s.stale));}
      else{await page.waitForSelector('[role="alert"]');assert.match(await page.$eval('[role="alert"]',e=>e.textContent),/ocupada/);assert.equal(await page.$eval('select',e=>e.value),'507f1f77bcf86cd799439012');assert.equal(await page.evaluate(()=>window.done),false);}
    });
    for(const succeed of [true,false]) await run(`Desocupar: doble clic y ${succeed?'mesa disponible':'error conserva modal y mesa'}`,'tables',async page=>{
      await page.waitForFunction('[...document.querySelectorAll("[role=button]")].some(b=>b.textContent.includes("GEN-1"))');
      await page.evaluate(()=>[...document.querySelectorAll('[role=button]')].find(b=>b.textContent.includes('GEN-1')).click());
      await click(page,'tables.releaseTable');await click(page,'tables.confirmRelease',true);await busy(page);
      assert.match(await page.evaluate(()=>window.requests[0].url),/\/close-and-vacate$/);
      await page.evaluate(ok=>window.finish(ok),succeed);
      await page.waitForFunction(ok=>window.messages.some(m=>m.variant===(ok?'success':'error')),{},succeed);
      if(succeed)await page.waitForFunction('![...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="tables.confirmRelease")');
      else assert.ok(await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='tables.confirmRelease'&&!b.disabled)));
    });
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'frontend-runtime.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
