import React from 'react';
import {createRoot} from 'react-dom/client';
import {MovementModal} from '../src/pages/admin/Inventory';
import {SnackbarProvider} from 'notistack';
const item={_id:'507f1f77bcf86cd799439012',name:'QA',stockCurrent:20};
window.requests=[]; window.modalClosed=false;
const save=body=>{window.requests.push(body);return new Promise((resolve,reject)=>{window.finish=ok=>ok?resolve({}):reject(Error('QA network'));});};
createRoot(document.getElementById('root')).render(<SnackbarProvider><MovementModal open type="purchase" defaultYield item={item} money={v=>String(v)} onClose={()=>{window.modalClosed=true;}} onSave={save} onSaveYield={save}/></SnackbarProvider>);
