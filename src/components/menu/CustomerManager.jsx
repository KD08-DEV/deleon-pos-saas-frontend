import DeleteCustomerAction from "./DeleteCustomerAction";
import {useRef,useState} from 'react';
import PropTypes from 'prop-types';
import {createPortal} from 'react-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import api from '../../lib/api';
import useRncLookup from '../../hooks/useRncLookup';

const empty={name:'',phone:'',address:'',country:'DO',taxType:'RNC',taxValue:''};
const formFor=c=>c?{name:c.name,phone:c.phone||'',address:c.address||'',country:c.taxIdentity?.countryCode||'DO',taxType:c.taxIdentity?.type||'RNC',taxValue:c.taxIdentity?.value||''}:{...empty};
const errors={NAME_ALREADY_EXISTS:'Ya existe ese nombre. Para registrar otra persona, ambos clientes deben tener identificaciones fiscales distintas.',HOMONYM_CONFIRMATION_REQUIRED:'Existe el mismo nombre con otra identificación. Confirma que es otra persona para continuar.',PHONE_ALREADY_EXISTS:'Ese teléfono ya pertenece a un cliente.',TAX_ID_ALREADY_EXISTS:'Esa identificación fiscal ya pertenece a un cliente.',NAME_REQUIRED:'Escribe el nombre del cliente.',CUSTOMER_INACTIVE:'Este cliente fue desactivado. Actualiza la lista.'};
export default function CustomerManager({onClose,initialCustomer,onSaved}) {
 const qc=useQueryClient(),lock=useRef(false);
 const [q,setQ]=useState(''),[form,setForm]=useState(()=>initialCustomer?formFor(initialCustomer):null),[id,setId]=useState(initialCustomer?._id||null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [needsConfirmation,setNeedsConfirmation]=useState(false),[distinctConfirmed,setDistinctConfirmed]=useState(false);
 const list=useQuery({queryKey:['customers','manager',q],queryFn:async()=> (await api.get('/api/customer',{params:{q,limit:50}})).data.data});
 const rnc=useRncLookup({value:form?.taxValue,name:form?.name,enabled:!!form&&form.country==='DO'&&['RNC','CEDULA'].includes(form.taxType),onName:name=>{setDistinctConfirmed(false);setForm(f=>({...f,name}));}});
 const edit=c=>{setNeedsConfirmation(false);setDistinctConfirmed(false);setId(c?._id||null);setForm(c?{name:c.name,phone:c.phone||'',address:c.address||'',country:c.taxIdentity?.countryCode||'DO',taxType:c.taxIdentity?.type||'RNC',taxValue:c.taxIdentity?.value||''}:{...empty});setError('');};
 const send=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
   {const body={confirmDistinctPerson:distinctConfirmed,name:form.name,phone:form.phone,address:form.address,taxIdentity:form.taxValue?{countryCode:form.country,type:form.taxType,value:form.taxValue}:null};const response=id?await api.patch(`/api/customer/${id}`,body):await api.post('/api/customer',body);onSaved?.(response.data?.data);}
   setForm(null);await qc.invalidateQueries({queryKey:['customers']});
 }catch(e){setNeedsConfirmation(e.response?.data?.code==='HOMONYM_CONFIRMATION_REQUIRED');setDistinctConfirmed(false);setError(errors[e.response?.data?.code]||(e.response?.status===403?'No tienes permiso para esta operación.':'No se pudo guardar. Revisa los datos y vuelve a intentarlo.'));}finally{setBusy(false);lock.current=false;}};
 const field=(key,label,type='text')=><label className="block text-sm" key={key}>{label}<input type={type} value={form[key]} onChange={e=>{setDistinctConfirmed(false);setForm(f=>({...f,[key]:e.target.value}));}} className="mt-1 mb-3 w-full rounded border border-white/20 bg-[#252525] p-2"/></label>;
 return createPortal(<div className="fixed inset-0 z-[2147483001] bg-black/75 flex items-center justify-center p-4" onClick={e=>e.stopPropagation()}><section role="dialog" aria-modal="true" aria-label="Administrar clientes" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#151515] text-white p-5 space-y-4">
 <header className="flex justify-between"><h2>Administrar clientes</h2><button type="button" disabled={busy} onClick={onClose}>Cerrar</button></header>
 {error&&<p role="alert" className="text-red-300">{error}</p>}
 {form?<form onSubmit={e=>{e.preventDefault();send();}}><fieldset disabled={busy}>{field('name','Nombre')}{field('phone','Teléfono')}{field('address','Dirección')}{field('country','País (DO, US…)')}{field('taxType','Tipo de identificación (RNC, CEDULA…)')}{field('taxValue','Identificación fiscal')}<p role="status">{{LOADING:'Consultando RNC…',FOUND:'Encontrado. Se conserva cualquier nombre escrito manualmente.',NOT_FOUND:'No encontrado; puedes completar el nombre manualmente.',ERROR:'Error de consulta; puedes completar el nombre manualmente.'}[rnc.status]}</p>{needsConfirmation&&<label className="block mt-3 text-sky-200"><input type="checkbox" checked={distinctConfirmed} onChange={e=>setDistinctConfirmed(e.target.checked)}/> Confirmo que es otra persona con una identificación fiscal distinta.</label>}<div className="flex gap-4 mt-4"><button type="button" onClick={()=>setForm(null)}>Cancelar</button><button type="submit">{busy?'Guardando…':'Guardar cliente'}</button></div></fieldset></form>:<>
 <button type="button" onClick={()=>edit(null)}>Nuevo cliente</button><input aria-label="Buscar clientes" placeholder="Nombre, teléfono o identificación" value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-[#252525] p-2 rounded"/>
 {list.isError&&<p role="alert">No se pudo cargar la lista. <button onClick={()=>list.refetch()}>Reintentar</button></p>}
 {list.isLoading?<p>Cargando…</p>:<ul className="space-y-3">{(list.data||[]).map(c=><li key={c._id} className="border-b border-white/10 pb-3"><p>{c.name}</p><p className="text-xs text-gray-400">{c.phone} {c.taxIdentity?.value}</p><div className="flex gap-4"><button disabled={busy} onClick={()=>edit(c)}>Editar</button><DeleteCustomerAction customer={c}/></div></li>)}</ul>}
 </>}
 </section></div>,document.body);
}
CustomerManager.propTypes={onClose:PropTypes.func.isRequired,initialCustomer:PropTypes.object,onSaved:PropTypes.func};
