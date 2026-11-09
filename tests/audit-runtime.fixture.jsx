import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from '../src/components/shared/BottomNav';
import EcfConfig from '../src/pages/admin/EcfConfig';
import Ticket from '../src/components/ticket/Ticket';
import Modal from '../src/components/shared/Modal';
import useTenant from '../src/hooks/useTenant';
import api from '../src/lib/api';

const initial = { user: { userData: { role: 'SuperAdmin' } }, store: { tenant: null } };
const store = configureStore({ reducer: (state = initial, action) => action.type === 'replace' ? action.payload : state });
const root = createRoot(document.getElementById('root'));
const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const Section = ({ children }) => <section>{children}</section>;
function TenantProbe() { return <div id="tenant">{useTenant().name || 'empty'}</div>; }
window.renderCase = (name, loaded = false) => {
  const content = name === 'nav' ? <BottomNav /> : name === 'tenant' ? <TenantProbe /> :
    name === 'ecf' ? <EcfConfig form={loaded ? { ecf: { enabled: false } } : null} setForm={() => {}} Section={Section} Switch={Section} ToggleRow={Section} /> :
    name === 'ticket' ? <Ticket order={{ _id: 'mock-order', customerDetails: { name: 'QA', rnc: '123456789' }, items: [] }} onClose={() => {}} /> :
    <Modal title={'Formulario de prueba '.repeat(8)} onClose={() => { window.closedModal = true; }}><div style={{ height: 1400 }}>Contenido largo</div><button id="last-field">Guardar</button></Modal>;
  root.render(<Provider store={store}><QueryClientProvider client={qc}><MemoryRouter>{content}</MemoryRouter></QueryClientProvider></Provider>);
};
window.replaceState = state => store.dispatch({ type: 'replace', payload: state });
window.apiRace = async (sameToken) => {
  localStorage.setItem('token', 'old');
  let rejectRequest;
  let ready;
  const started = new Promise(resolve => { ready = resolve; });
  const request = api.get('/mock', { adapter: config => new Promise((resolve, reject) => {
    rejectRequest = () => reject({ config, response: { status: 401, data: { message: 'Session expired. Your account is active on another device.' } } });
    ready();
  }) }).catch(() => {});
  await started;
  if (!sameToken) localStorage.setItem('token', 'new');
  let events = 0;
  const listener = () => events++;
  window.addEventListener('auth:forceLogout', listener);
  rejectRequest();
  await request;
  window.removeEventListener('auth:forceLogout', listener);
  return { token: localStorage.getItem('token'), events };
};
