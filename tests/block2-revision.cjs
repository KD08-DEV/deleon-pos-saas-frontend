const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const esbuild=require('../node_modules/esbuild'),puppeteer=require('puppeteer');
const root=path.resolve(__dirname,'..');
(async()=>{
 const bundle=await esbuild.build({entryPoints:[path.join(__dirname,'block2-revision.fixture.jsx')],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':'{}'},plugins:[{name:'local',setup(b){
  b.onResolve({filter:/^(react-i18next|notistack)$|\/(Invoice|Ticket)$/},a=>({path:a.path.split('/').pop(),namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({loader:'jsx',resolveDir:root,contents:a.path==='react-i18next'?'export const useTranslation=()=>({t:(key,o)=>typeof o==="string"?o:o?.defaultValue||key,i18n:{language:"es"}});':a.path==='notistack'?'export const enqueueSnackbar=(text)=>window.messages.push(text); export const useSnackbar=()=>({enqueueSnackbar});':a.path==='Invoice'?'export default function Invoice(props){window.invoiceProps=props;return <div id="invoice-preview">Factura</div>}':'export default function Ticket(){return null}'}));
  b.onResolve({filter:/^@\//},a=>({path:path.join(root,'src',a.path.slice(2)+'.js')}));
 }}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/app.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;const results=[];
 try{browser=await puppeteer.launch({headless:true});
  const run=async(name,query,fn)=>{const page=await browser.newPage(),errors=[];page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin+'/')?r.continue():r.abort());try{await page.goto(origin+'/'+query);await page.waitForSelector('button');await fn(page);assert.deepEqual(errors,[]);results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message,errors,diagnostic:await page.evaluate(()=>({messages:window.messages,requests:window.requests}))});}finally{await page.close();}};
  const invoice=page=>page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='bill.invoice');b.click();b.click();});
  for(const kind of ['', 'B01','B02'])await run('Reimpresión '+(kind||'consumidor final')+' sin PUT ni cobro',kind?'?ncf='+kind:'',async p=>{await invoice(p);await p.waitForSelector('#invoice-preview');const reqs=await p.evaluate(()=>window.requests);assert.equal(reqs.filter(r=>r.method==='put'||r.method==='patch').length,0);assert.equal(reqs.filter(r=>r.url.endsWith('507f1f77bcf86cd799439011')).length,1);});
  await run('Cambios en B02 abren corrección auditada con el carrito actual','?ncf=B02&changed=1',async p=>{await invoice(p);await p.waitForSelector('[role="dialog"][aria-label="Corregir orden completa"]');assert.equal(await p.$eval('[role="dialog"] input[type="number"]',e=>e.value),'2');assert.equal(await p.evaluate(()=>window.requests.filter(r=>r.method==='put').length),0);});
  for(const kind of ['', 'B01','B02'])await run('Cambiar crédito cobra saldo sin editor completo '+kind,'?credit=1'+(kind?'&ncf='+kind:''),async p=>{

   await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='bill.paymentMethods.card').click());
   await invoice(p);await p.waitForSelector('[data-credit-confirm]');await p.click('[data-credit-confirm]');await p.waitForSelector('#invoice-preview');
   const writes=await p.evaluate(()=>window.requests.filter(r=>r.method==='patch'));
   assert.equal(writes.length,1);assert.equal(writes[0].body.paymentMethod,'Tarjeta');assert.equal(writes[0].body.creditPaymentConfirmed,true);
   assert.equal(await p.$('[aria-label="Corregir orden completa"]'),null);
  });
  await run('Cancelar confirmación de crédito conserva la deuda','?credit=1',async p=>{await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='bill.paymentMethods.card').click());await invoice(p);await p.waitForSelector('[data-credit-confirm]');await p.keyboard.press('Escape');await p.waitForSelector('[data-credit-confirm]',{hidden:true});assert.equal(await p.evaluate(()=>window.requests.filter(r=>r.method==='patch').length),0);});
  for(const kind of ['', 'B01','B02'])await run('Pasar a credito sin editor completo '+kind,'?toCredit=1'+(kind?'&ncf='+kind:''),async p=>{

   await p.waitForFunction('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="bill.paymentMethods.credit")');
   await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='bill.paymentMethods.credit').click());
   await invoice(p);await p.waitForSelector('[data-credit-confirm]');
   if(process.env.CREDIT_VISUAL_QA==='1'&&!kind){
    const css=fs.readdirSync(path.join(root,'dist/assets')).find(f=>f.endsWith('.css'));
    await p.addStyleTag({content:fs.readFileSync(path.join(root,'dist/assets',css),'utf8').replace(/@import"[^"]*";/g,'')});
    await p.setViewport({width:390,height:844});
    for(const theme of ['dark','light']){
     await p.evaluate(t=>{document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');},theme);
     await new Promise(resolve=>setTimeout(resolve,400));
     const size=await p.$eval('.credit-payment-confirmation',e=>({width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}));
     await p.screenshot({path:path.join(root,'../tmp/credit-confirm-'+theme+'.png')});assert(size.width<=366);assert(size.scroll<=size.client);
    }
   }
   await p.click('[data-credit-confirm]');await p.waitForSelector('#invoice-preview');
   const writes=await p.evaluate(()=>window.requests.filter(r=>r.method==='patch'));
   assert.equal(writes.length,1);assert.equal(writes[0].body.paymentMethod,'Credito');assert.equal(writes[0].body.creditConversionConfirmed,true);
   assert.equal(await p.$('[aria-label="Corregir orden completa"]'),null);
  });
  await run('Credito sin cambios reimprime sin cobro ni correccion','?credit=1',async p=>{await invoice(p);await p.waitForSelector('#invoice-preview');assert.equal(await p.evaluate(()=>window.requests.filter(r=>r.method==='patch'||r.method==='put').length),0);});
  await run('Propina legal e ITBIS tienen controles independientes','',async p=>{await p.waitForFunction('window.requests.some(r=>r.url.includes("tax-preview"))');const controls=await p.evaluate(()=>[...document.querySelectorAll('button[role="switch"]')].length);assert.ok(controls>=2,'Expected two independent switches');await p.click('[aria-label="Propina legal"]');await p.waitForFunction('window.requests.some(r=>r.url.includes("tax-preview")&&r.body.legalTipEnabled===false&&r.body.taxEnabled===true)');await p.click('[aria-label="ITBIS"]');await p.waitForFunction('window.requests.some(r=>r.url.includes("tax-preview")&&r.body.legalTipEnabled===false&&r.body.taxEnabled===false)');});
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
 console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
