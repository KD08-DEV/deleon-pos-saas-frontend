import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import CustomerManager from '../src/components/menu/CustomerManager';
import useRncLookup from '../src/hooks/useRncLookup';
import api from '../src/lib/api';
window.requests=[];window.pending=[];window.customers=[];window.failSave=false;
api.defaults.adapter=config=>{
 const body=config.data?JSON.parse(config.data):null;window.requests.push({url:config.url,method:config.method,body});
 if(config.url==='/api/customer/access')return Promise.resolve({config,status:200,data:{canDelete:!location.search.includes('cashier')}});
 if(config.url.includes('/dgii/'))return new Promise((resolve,reject)=>window.pending.push({resolve:data=>resolve({config,status:200,data:{data}}),reject:status=>reject({response:{status}})}));
 if(config.method==='get')return Promise.resolve({config,status:200,data:{data:window.customers}});
 if(window.failSave)return Promise.reject({response:{status:409,data:{code:window.failCode||'NAME_ALREADY_EXISTS'}}});
 if(config.method==='post')window.customers.push({...body,_id:'C'});
 if(config.method==='patch')window.customers=window.customers.map(c=>c._id==='C'?{...c,...body}:c);
 if(config.method==='delete')window.customers=[];
 return Promise.resolve({config,status:200,data:{success:true}});
};
function Lookup(){const [value,setValue]=useState(''),[name,setName]=useState('');const r=useRncLookup({value,name,onName:setName});return <><input aria-label="RNC" value={value} onChange={e=>setValue(e.target.value)}/><input aria-label="Nombre" value={name} onChange={e=>setName(e.target.value)}/><p role="status">{r.status}</p></>;}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{location.search.includes('manager')?<CustomerManager onClose={()=>{window.didClose=true;}}/>:<Lookup/>}</QueryClientProvider>);
