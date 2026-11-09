import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OrderCard from '../src/components/orders/OrderCard';
import MoveTableAction from '../src/components/tables/MoveTableAction';
import Tables from '../src/pages/Tables';
import api, { setScope } from '../src/lib/api';
import { QK } from '../src/queryKeys';

const source='507f1f77bcf86cd799439011', target='507f1f77bcf86cd799439012', orderId='507f1f77bcf86cd799439013';
const order={_id:orderId, table:source, orderStatus:'En Progreso', paymentStatus:'Pendiente', items:[{name:'QA',quantity:1,price:100}], bills:{total:100,totalWithTax:100}, customerDetails:{name:'QA'}, createdAt:new Date().toISOString(),updatedAt:'2026-11-01T10:00:00Z'};
let tables=[{_id:source,tableNo:1,status:'Ocupada',currentOrder:orderId,area:'General'},{_id:target,tableNo:2,status:'Disponible',currentOrder:null,area:'General'}];
setScope({tenantId:'T',clientId:'east'});
const store=configureStore({reducer:(state={user:{userData:{_id:'U',tenantId:'T',role:'Admin'}},store:{tenant:{tenantId:'T',features:{}}}})=>state});
const qc=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
const root=createRoot(document.getElementById('root'));
window.requests=[]; window.messages=[];
window.done=false;
let pending;
const response=(config,data)=>({config,status:200,statusText:'OK',headers:{},data:{success:true,data}});
api.defaults.adapter=config=>{
  if(config.method==='get') return Promise.resolve(response(config,config.url==='/api/table'?tables:config.url.endsWith('/access')?{canEdit:false}:order));
  window.requests.push({method:config.method,url:config.url,data:config.data});
  return new Promise((resolve,reject)=>{pending={config,resolve,reject};});
};
window.finish=success=>{
  const {config,resolve,reject}=pending;
  if(!success) return reject({config,response:{status:409,data:{code:config.url.endsWith('/move')?'TARGET_TABLE_OCCUPIED':'ORDER_NOT_INVOICED'}}});
  if(config.url.endsWith('/close-and-vacate')) tables=tables.map(t=>t._id===source?{...t,status:'Disponible',currentOrder:null}:t);
  resolve(response(config,{...order,orderStatus:'Completado',updatedAt:'2026-11-04T10:00:00Z'}));
};
window.seedCaches=()=>{
  for(const key of [QK.ORDERS,['order',orderId],['table-accounts-12842','T','east',source]]) qc.setQueryData(key,{seed:true});
};
window.cacheStates=()=>qc.getQueryCache().getAll().filter(q=>q.state.data?.seed).map(q=>({key:q.queryKey,stale:q.state.isInvalidated}));
window.renderCase=name=>root.render(<Provider store={store}><QueryClientProvider client={qc}><MemoryRouter>
  {name==='order'?<OrderCard order={order} onStatusChanged={next=>{window.updatedOrder=next;}}/>:name==='move'?<MoveTableAction table={tables[0]} tables={tables} onDone={()=>{window.done=true;}}/>:<Tables/>}
</MemoryRouter></QueryClientProvider></Provider>);
