import React from 'react';
import {createRoot} from 'react-dom/client';
import OrderCorrectionEditor from '../src/components/orders/OrderCorrectionEditor';
import api from '../src/lib/api';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
const order={_id:'507f1f77bcf86cd799439011',updatedAt:'2026-11-04T12:00:00Z',items:[{lineId:'L',dishId:'507f1f77bcf86cd799439012',name:'QA',quantity:1,unitPrice:100}],bills:{tipEnabled:true,tipAmount:0,tip:25,taxEnabled:true,totalWithTax:128}};
window.requests=[];
let pending;
api.defaults.adapter=config=>{
 if(config.method==='get')return Promise.resolve({config,status:200,data:{data:[{_id:order.items[0].dishId,name:'QA',price:100,customization:{extras:[{_id:'extra',name:'Queso',price:20}],removableIngredients:[{_id:'onion',name:'Cebolla'}]}}],taxes:[]}});
 window.requests.push({method:config.method,body:JSON.parse(config.data)});
 return new Promise((resolve,reject)=>{pending={config,resolve,reject};});
};
window.finish=ok=>{
 const {config,resolve,reject}=pending;
 if(!ok)return reject({response:{data:{code:'ORDER_CHANGED_RELOAD'}}});
 const data=config.method==='patch'?order:{canApply:true,previousTotal:128,newTotal:143,delta:15,bills:{subtotal:100,tax:18,tipAmount:15,serviceChargeBreakdown:[{chargeId:'legal',name:'Propina legal',ratePercent:10,amount:10,addToTotal:true}]}};
 resolve({config,status:200,data:{success:true,data}});
};
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><OrderCorrectionEditor order={order} onClose={()=>{window.closeCount=(window.closeCount||0)+1;}} onSaved={()=>{window.saved=true;}}/></QueryClientProvider>);
