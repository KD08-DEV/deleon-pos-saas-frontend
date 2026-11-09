import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import BottomNav from '../src/components/shared/BottomNav';
import CustomerInfo from '../src/components/menu/CustomerInfo';
import customer from '../src/redux/slices/customerSlice';
import cart from '../src/redux/slices/cartSlice';
import api from '../src/lib/api';
const params=new URLSearchParams(location.search),role=params.has('cashier')?'Cajera':'Admin';
const saved={_id:'507f1f77bcf86cd799439012',name:'David QA',phone:'8095550101',address:'QA',taxIdentity:{countryCode:'DO',type:'RNC',value:'123456789'}};
window.requests=[];window.messages=[];window.customers=[saved];window.failCode='';window.defer=false;
api.defaults.adapter=async config=>{
 const body=config.data?JSON.parse(config.data):{};window.requests.push({method:config.method,url:config.url,body});
 if(config.url==='/api/customer/access')return {config,status:200,data:{canDelete:role==='Admin'}};
 if(config.url.includes('/dgii/'))return {config,status:200,data:{data:{nombre:'DGII QA'}}};
 if(config.method==='get')return {config,status:200,data:{data:window.customers}};
 if(window.defer)await new Promise(r=>{window.release=r;});
 if(window.failCode)throw {response:{status:409,data:{code:window.failCode}}};
 if(config.method==='delete')window.customers=[];
 const result={...saved,...body};return {config,status:200,data:{data:result}};
};
const store=configureStore({reducer:{customer,cart,user:(state={userData:{_id:'U',tenantId:'T',role}})=>state,store:(state={tenant:{tenantId:'T',localization:{countryCode:'DO'}}})=>state}});
window.store=store;
function App(){const l=useLocation();window.currentPath=l.pathname;return params.has('info')?<CustomerInfo order={{_id:'507f1f77bcf86cd799439011',customerId:saved._id,customerDetails:saved,items:[]}}/>:<BottomNav/>;}
createRoot(document.getElementById('root')).render(<Provider store={store}><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/orders']}><App/></MemoryRouter></QueryClientProvider></Provider>);
