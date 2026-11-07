import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/i18n';
import api from '../src/lib/api';
import ExpenseCategories from '../src/pages/admin/ExpenseCategories';
import { financeErrorMessage } from '../src/lib/financeErrorMessage';
window.requests=[];
window.financeErrorMessage=financeErrorMessage;
let rows=[{_id:'a',name:'Alimentación',description:'Prueba',status:'active'}];
api.defaults.adapter=async config=>{
 window.requests.push({method:config.method,url:config.url});
 await new Promise(r=>setTimeout(r,120));
 const body=typeof config.data==='string'?JSON.parse(config.data):config.data;
 const fail=message=>{throw {response:{status:409,data:{message}},config};};
 if(config.method==='post'){
  if(body.name==='Duplicada')fail('CATEGORY_ALREADY_EXISTS');
  rows.push({_id:'b',...body,status:'active'});
 }
 if(config.method==='put')fail('CATEGORY_ALREADY_EXISTS');
 if(config.method==='delete')fail('CATEGORY_IN_USE');
 return {data:{success:true,data:rows},status:200,config,headers:{}};
};
createRoot(document.getElementById('root')).render(<ExpenseCategories/>);
