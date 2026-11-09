import {useRef,useState} from 'react';
import PropTypes from 'prop-types';
import {createPortal} from 'react-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import api from '../../lib/api';

export default function DeleteCustomerAction({customer,onDeleted}) {
 const qc=useQueryClient(),lock=useRef(false);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const access=useQuery({queryKey:['customers','access'],queryFn:async()=>(await api.get('/api/customer/access')).data,staleTime:0,gcTime:0});
 if(!customer?._id||access.data?.canDelete!==true)return null;
 const remove=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
   await api.delete(`/api/customer/${customer._id}`);
   setOpen(false);await qc.invalidateQueries({queryKey:['customers']});onDeleted?.(customer);
 }catch(e){setError(e.response?.status===403?'Solo un administrador puede eliminar clientes.':'No se pudo eliminar. Puedes volver a intentarlo.');}finally{setBusy(false);lock.current=false;}};
 return <><button type="button" className="text-xs text-red-300 hover:text-red-200 px-2 py-2" onClick={e=>{e.stopPropagation();setOpen(true);setError('');}}>Eliminar</button>{open&&createPortal(<div className="fixed inset-0 z-[2147483002] bg-black/75 flex items-center justify-center p-4" onClick={e=>e.stopPropagation()}><section role="dialog" aria-modal="true" aria-label="Eliminar cliente" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-5 text-white space-y-4"><h3 className="font-bold">¿Eliminar a {customer.name}?</h3><p className="text-sm text-white/60">Dejará de aparecer en clientes guardados. Sus ventas, facturas y datos históricos se conservarán.</p>{error&&<p role="alert" className="text-red-300">{error}</p>}<div className="flex justify-end gap-4"><button type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button><button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-red-700 px-4 py-2">{busy?'Eliminando…':'Confirmar eliminación'}</button></div></section></div>,document.body)}</>;
}
DeleteCustomerAction.propTypes={customer:PropTypes.object,onDeleted:PropTypes.func};
