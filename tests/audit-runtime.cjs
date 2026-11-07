// Real React/Chromium regression tests; no backend, database or physical printer.
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('../node_modules/esbuild');
const postcss = require('../node_modules/postcss');
const tailwind = require('../node_modules/tailwindcss');
const puppeteer = require('../../pos-backend/node_modules/puppeteer');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../AUDIT_2026-11-04');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const mocks = {
    'react-i18next': 'export const useTranslation = () => ({t: key => key, i18n: {language:"es"}});',
    'usePrinterOptions': 'const printer={_id:"mock",mode:"network",name:"QA"}; export default () => ({printers:[printer],defaultPrinter:printer,isLoadingPrinters:false});',
    'tenantPrint': 'export async function printWithTenantConfig(args) {window.printPayload=args.payload; return {message:"MOCK_SENT"};}',
    'react-to-print': 'export const useReactToPrint = () => () => {};',
  };
  const bundle = await esbuild.build({ entryPoints: [path.join(__dirname, 'audit-runtime.fixture.jsx')], bundle: true, write: false, format: 'iife', define: {'import.meta.env':'{}'}, plugins: [{name:'isolated-fixture', setup(build) {
    build.onResolve({filter: /^(react-i18next|react-to-print)$|\/usePrinterOptions$|\/tenantPrint$/}, args => ({path: args.path.split('/').pop(), namespace:'mock'}));
    build.onLoad({filter:/.*/, namespace:'mock'}, args => ({contents:mocks[args.path],loader:'js'}));
    build.onResolve({filter:/^@\//}, args => ({path:path.join(root,'src',args.path.slice(2)+'.js')}));
  }}] });
  const css = await postcss([tailwind({content:[path.join(root,'src/**/*.{js,jsx}')],theme:{extend:{}},plugins:[]})]).process('@tailwind base; @tailwind components; @tailwind utilities;', {from:undefined});
  const server = http.createServer((req,res) => {
    res.setHeader('Content-Type',req.url === '/app.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? bundle.outputFiles[0].text : `<html><head><style>${css.css}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  const results = [];
  try {
    browser = await puppeteer.launch({headless:true});
    const run = async (name, fn) => {
      const page = await browser.newPage();
      const errors=[];
      page.on('pageerror', e => errors.push(e.message));
      await page.setRequestInterception(true);
      page.on('request', req => req.url().startsWith(`http://127.0.0.1:${server.address().port}/`) ? req.continue() : req.abort());
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.waitForFunction('!!window.renderCase');
        await fn(page,errors);
        results.push({name,status:'PASS'});
      } catch (error) { results.push({name,status:'FAIL',error:error.message, browserErrors:errors}); }
      finally { await page.close(); }
    };
    await run('useTenant: empty store -> loaded tenant', async (page,errors) => {
      await page.evaluate(() => window.renderCase('tenant'));
      await page.waitForSelector('#tenant');
      await page.evaluate(() => window.replaceState({user:{userData:{}},store:{tenant:{name:'QA'}}}));
      await page.waitForFunction('document.querySelector("#tenant")?.textContent === "QA"', {timeout:2000});
      assert.deepEqual(errors,[]);
    });
    await run('BottomNav: role transition keeps hook order', async (page,errors) => {
      await page.evaluate(() => window.renderCase('nav'));
      await page.waitForSelector('button');
      await page.evaluate(() => window.replaceState({user:{userData:{role:'Cajera'}},store:{tenant:null}}));
      await new Promise(resolve=>setTimeout(resolve,100));
      assert.deepEqual(errors,[]);
      assert.ok(await page.$('button'));
    });
    await run('EcfConfig: null -> loaded configuration', async (page,errors) => {
      await page.evaluate(() => window.renderCase('ecf'));
      await new Promise(resolve=>setTimeout(resolve,100));
      await page.evaluate(() => window.renderCase('ecf',true));
      await page.waitForSelector('section',{timeout:2000});
      assert.deepEqual(errors,[]);
    });
    await run('Ticket: sends customer fiscal identity to mock printer', async page => {
      await page.evaluate(() => window.renderCase('ticket'));
      await page.waitForSelector('button');
      await page.evaluate(() => { const buttons=[...document.querySelectorAll('button')]; buttons[buttons.length-2].click(); });
      await page.waitForFunction('!!window.printPayload',{timeout:2000});
      const payload=await page.evaluate(()=>window.printPayload);
      assert.equal(payload.clientTaxIdentity.value,'123456789');
    });
    await run('late 401 cannot log out newer session', async page => {
      assert.deepEqual(await page.evaluate(()=>window.apiRace(false)),{token:'new',events:0});
    });
    await run('current session 401 still logs out', async page => {
      assert.deepEqual(await page.evaluate(()=>window.apiRace(true)),{token:null,events:1});
    });
    for (const width of [1920,1440,1366,1024,768]) await run(`Modal: visible close button and scroll at ${width}px`, async page => {
      await page.setViewport({width,height:768});
      await page.evaluate(()=>window.renderCase('modal'));
      await page.waitForSelector('#last-field');
      await new Promise(resolve=>setTimeout(resolve,400));
      const geometry = await page.evaluate(()=>{
        const close=[...document.querySelectorAll('button')][0];
        const rect=close.getBoundingClientRect();
        const content=document.querySelector('#last-field').parentElement;
        return {top:rect.top,bottom:rect.bottom,scrolls:content.scrollHeight>content.clientHeight && ['auto','scroll'].includes(getComputedStyle(content).overflowY)};
      });
      await page.screenshot({path:path.join(output,`modal-${width}.png`)});
      assert.ok(geometry.top>=0 && geometry.bottom<=768,JSON.stringify(geometry));
      assert.ok(geometry.scrolls,'Long content needs an internal scroll area');
      await page.evaluate(()=>document.querySelector('button').click());
      assert.equal(await page.evaluate(()=>window.closedModal),true);
    });
  } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
  fs.writeFileSync(path.join(output,process.env.AUDIT_BASELINE ? 'runtime-before.json' : 'runtime-after.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
  if(results.some(result=>result.status==='FAIL')) process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
