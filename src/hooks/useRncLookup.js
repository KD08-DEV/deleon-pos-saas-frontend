import {useEffect,useRef,useState} from 'react';
import api from '../lib/api';

export default function useRncLookup({value,enabled=true,name,onName}) {
    const digits=String(value||'').replace(/\D/g,'');
    const latest=useRef({name,onName}); latest.current={name,onName};
    const automatic=useRef(null);
    const [result,setResult]=useState({status:'',record:null});
    useEffect(()=>{
        let active=true;
        setResult({status:'',record:null});
        if (!enabled || !/^(\d{9}|\d{11})$/.test(digits)) return;
        const timer=setTimeout(async()=>{
            setResult({status:'LOADING',record:null});
            try {
                const response=await api.get(`/api/dgii/rnc/${digits}`);
                if (!active) return;
                const record=response.data?.data?.data??response.data?.data??response.data;
                const found=record?.name||record?.nombre||record?.razonSocial||record?.razon_social;
                if (!found || (record.rnc && String(record.rnc).replace(/\D/g,'')!==digits)) {setResult({status:'NOT_FOUND',record:null});return;}
                const current=String(latest.current.name||'').trim();
                if (!current || current===automatic.current || ['consumidor final','final consumer'].includes(current.toLowerCase())) {
                    automatic.current=found;
                    latest.current.onName(found);
                }
                setResult({status:'FOUND',record});
            } catch(e) {if(active)setResult({status:e?.response?.status===404?'NOT_FOUND':'ERROR',record:null});}
        },450);
        return ()=>{active=false;clearTimeout(timer);};
    },[digits,enabled]);
    return {...result,loading:result.status==='LOADING'};
}
