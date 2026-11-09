import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import MenuManagement from '../src/pages/admin/MenuManagement';
import api from '../src/lib/api';
const cheese={_id:'507f1f77bcf86cd799439013',name:'Queso QA',price:0,inventoryType:'ingredient',isInventoryItem:true};
const dish={_id:'507f1f77bcf86cd799439012',name:'Hamburguesa QA',price:100,category:'Comida',inventoryType:'none',sellMode:'unit',customization:{enabled:true,removableIngredients:[{_id:'507f1f77bcf86cd799439014',name:'Queso',active:true}],extras:[{_id:'507f1f77bcf86cd799439015',name:'Extra',price:0,maxQuantity:5,active:true}]}};
window.requests=[];window.messages=[];window.saved=null;window.newIngredient=false;
dish.inventoryCategoryId='507f1f77bcf86cd799439017';
api.defaults.adapter=async config=>{
 window.requests.push({url:config.url,params:config.params,method:config.method});
 let data=[];
 if(config.url==='/api/admin/inventory/categories')data=[{_id:dish.inventoryCategoryId,name:'Comida'}];
 if(config.url==='/api/dishes')data={items:config.params?.includeInventory?[dish,cheese,...(window.newIngredient?[{...cheese,_id:'507f1f77bcf86cd799439016',name:'Nuevo ingrediente'}]:[])]:[dish],total:1,totalPages:1};
 if(config.method==='put'){window.saved=Object.fromEntries(config.data.entries());data=dish;}
 return {config,status:200,headers:{},data:{success:true,data}};
};
const state={user:{userData:{_id:'user',tenantId:'QA',role:'Admin'}},tenant:{tenantId:'QA',plan:'pro',features:{productCustomization:{enabled:true}}}};
const store=configureStore({reducer:(s=state)=>s});const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById('root')).render(<Provider store={store}><QueryClientProvider client={qc}><MenuManagement/></QueryClientProvider></Provider>);
