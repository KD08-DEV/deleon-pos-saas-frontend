import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import Bill from '../src/components/menu/Bill';
import api from '../src/lib/api';
const params=new URLSearchParams(location.search),changed=params.has('changed'),ncf=params.get('ncf');
const item={lineId:'L',dishId:'507f1f77bcf86cd799439012',name:'Plato QA',quantity:1,unitPrice:100,price:100,addons:[],modifiers:[]};
const tenant={tenantId:'T',plan:'premium',localization:{countryCode:'DO',currencyCode:'DOP',timezone:'America/Santo_Domingo'},features:{tax:{enabled:true,rate:18},tip:{enabled:true},checkout:{chargeMode:'AT_INVOICE'},serviceCharges:{enabled:true,charges:[{id:'legal',code:'LEGAL_TIP',name:'Propina legal',ratePercent:10,active:true}]}},taxConfig:{enabled:true}};
const order={_id:'507f1f77bcf86cd799439011',orderStatus:'En Progreso',paymentStatus:'Pagado',paymentMethod:'Efectivo',invoiceNumber:'QA-001',invoicedAt:'2026-11-04T12:00:00Z',updatedAt:'2026-11-04T12:00:00Z',items:[item],customerDetails:{name:'QA'},bills:{subtotal:100,total:100,taxEnabled:true,legalTipEnabled:true,tax:18,serviceChargeTotal:10,tip:0,tipAmount:0,discount:0,deliveryFee:0,totalWithTax:128},fiscal:ncf?{requested:true,ncfType:ncf,ncfNumber:ncf+'00000001'}:{requested:false}};
if(params.has('credit')){order.paymentMethod='Credito';order.paymentStatus='Pendiente';order.accountReceivableId='AR';}
if(params.has('toCredit'))order.customerId='507f1f77bcf86cd799439013';
if(params.has('toCredit'))order.customerId='507f1f77bcf86cd799439013';
window.requests=[];window.messages=[];
api.defaults.adapter=async config=>{
 const body=config.data?JSON.parse(config.data):{};window.requests.push({method:config.method,url:config.url,body});
 let data={};
 if(config.url===`/api/order/${order._id}`)data=order;
 else if(config.url.endsWith('/payment-method/correction'))data={...order,paymentMethod:body.paymentMethod,paymentStatus:body.paymentMethod==='Credito'?'Pendiente':'Pagado',settledFromCredit:params.has('credit')};
 else if(config.url.includes('tax-preview')){const subtotal=(body.items||[]).reduce((s,i)=>s+Number(i.unitPrice||0)*Number(i.quantity||0),0);const tax=body.taxEnabled?subtotal*.18:0,legal=body.legalTipEnabled===false?0:subtotal*.1;data={subtotal,taxTotal:tax,totalBeforeTip:subtotal+tax+legal,itemsTotalWithTax:subtotal+tax,items:body.items,serviceChargeTotal:legal,serviceChargeBreakdown:legal?[{chargeId:'legal',code:'LEGAL_TIP',name:'Propina legal',ratePercent:10,amount:legal}]:[],taxBreakdown:[]};}
 else if(config.url.includes('correction/catalog'))data=[{_id:item.dishId,name:item.name,price:100,customization:{extras:[]}}];
 else if(config.url.includes('/ecf'))data={enabled:false,prepared:false,exists:false};
 return {config,status:200,data:{success:true,data,exists:false,canCreateCredit:true}};
};
const store=configureStore({reducer:(state={cart:[{...item,quantity:changed?2:1,price:changed?200:100}],customer:{name:'QA',orderSource:'DINE_IN'},store:{tenant},user:{userData:{_id:'U',tenantId:'T',role:'Admin'}}})=>state});
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById('root')).render(<Provider store={store}><QueryClientProvider client={qc}><MemoryRouter><Bill orderId={order._id} order={order} setIsOrderModalOpen={()=>{}}/></MemoryRouter></QueryClientProvider></Provider>);
