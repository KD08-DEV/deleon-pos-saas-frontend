import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import '../src/i18n';
import api from '../src/lib/api';
import BranchesManagement from '../src/pages/admin/BranchesManagement';
const qc=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
let branches=[{clientId:'default',name:'Principal',isActive:true,ecf:{enabled:false}}];
let policy={plan:'premium',label:'Premium',multiClient:true,maxBranches:2,used:1,canCreate:true};
window.requests=[];
window.changePolicy=async patch=>{policy={...policy,...patch};await qc.invalidateQueries({queryKey:['branches']});};
api.defaults.adapter=async config=>{
 window.requests.push({method:config.method,url:config.url});await new Promise(r=>setTimeout(r,120));
 if(config.method==='post'){
  branches.push({clientId:'east',name:'Secundaria',isActive:true,ecf:{enabled:false}});policy={...policy,used:2,canCreate:false};
  return {data:{success:true,data:branches[1]},status:201,config,headers:{}};
 }
 return {data:{success:true,data:branches,policy},status:200,config,headers:{}};
};
createRoot(document.getElementById('root')).render(<QueryClientProvider client={qc}><BranchesManagement/></QueryClientProvider>);
