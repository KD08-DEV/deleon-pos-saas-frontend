import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api, { getScope, setScope } from "../../lib/api";
import EcfBranchOverview from "./EcfBranchOverview";

// Gestión visual de sucursales. Los datos y permisos se vuelven a validar en backend.
export default function BranchesManagement({ isOwner = false }) {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en");
  const L = (es, en) => english ? en : es;
  const qc = useQueryClient();
  const creating = useRef(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busyId, setBusyId] = useState("");
  const [shareOnCreate, setShareOnCreate] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["branches", getScope().tenantId],
    queryFn: async () => (await api.get("/api/clients")).data,
    retry: 0,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
  });
  const branches = Array.isArray(data?.data) ? data.data : [];
  // The principal location is included in the plan quota.
  const policy = data?.policy;
  const multiClient = !isError && policy?.multiClient === true;
  const maxBranches = policy?.maxBranches;
  const atLimit = policy?.canCreate !== true;
  const branchError = e => ({
    PLAN_MULTI_BRANCH_DENIED: L("Tu plan no permite crear más sucursales. Las existentes se conservan.", "Your plan does not allow new branches. Existing branches are preserved."),
    BRANCH_LIMIT_REACHED: L("Alcanzaste el límite de sucursales de tu plan.", "Your branch quota has been reached."),
    BRANCH_DUPLICATE: L("Ya existe una sucursal con ese nombre.", "A branch with this name already exists."),
    INVALID_BRANCH_NAME: L("Escribe un nombre de sucursal válido.", "Enter a valid branch name."),
  })[e.response?.data?.code] || e.response?.data?.message || e.message;
  const currentBranch = getScope()?.clientId || "default";
  const createMutation = useMutation({
    mutationFn: async () => {
      const created = (await api.post("/api/clients", { name, address, phone, menuMode: "independent" })).data.data;
      if (shareOnCreate) {
        try {
          await api.patch(`/api/clients/${encodeURIComponent(created.clientId)}/menu`, { menuMode: "shared", menuSourceClientId: "default" });
          await api.post(`/api/clients/${encodeURIComponent(created.clientId)}/menu/sync`);
        } catch (e) {
          // No marcar un catálogo como compartido si la sincronización inicial falló.
          await api.patch(`/api/clients/${encodeURIComponent(created.clientId)}/menu`, { menuMode: "independent" }).catch(() => {});
          throw new Error(L("Sucursal creada, pero su menú quedó independiente: ", "Branch created with independent menu: ") + (e.response?.data?.message || e.response?.data?.code || e.message));
        }
      }
      return created;
    },
    onSuccess: () => {
      setName(""); setAddress(""); setPhone(""); setShareOnCreate(false);
      setError(""); setInfo(L("Sucursal creada", "Branch created"));
      qc.invalidateQueries({ queryKey: ["branches"] });
      qc.invalidateQueries({ queryKey: ["header-branches"] });
    },
    onError: e => { setError(branchError(e)); refetch(); },
    onSettled: () => { creating.current = false; },
  });
  async function changeMode(branch, mode) {
    setBusyId(branch.clientId); setError(""); setInfo("");
    try {
      await api.patch(`/api/clients/${encodeURIComponent(branch.clientId)}/menu`, { menuMode: mode, menuSourceClientId: "default" });
      if (mode === "shared") {
        try { await api.post(`/api/clients/${encodeURIComponent(branch.clientId)}/menu/sync`); }
        catch (e) {
          await api.patch(`/api/clients/${encodeURIComponent(branch.clientId)}/menu`, { menuMode: "independent" });
          throw e;
        }
      }
      setInfo(mode === "shared" ? L("Catálogo sincronizado; stock y precios locales son independientes.", "Catalog synced; local stock and prices remain independent.") : L("Menú independiente", "Independent menu"));
      await refetch();
    } catch (e) { setError(e.response?.data?.message || e.response?.data?.code || e.message); }
    finally { setBusyId(""); }
  }
  async function configureBranchEcf(branch) {
    setBusyId(branch.clientId); setError(""); setInfo("");
    try {
      const enabled = branch.ecf?.enabled !== true;
      const result = (await api.patch(`/api/clients/${encodeURIComponent(branch.clientId)}/ecf-config`, { enabled })).data;
      setInfo(result.message || L("Configuración fiscal actualizada", "Fiscal preference updated"));
      qc.invalidateQueries({ queryKey: ["tenant-ecf-status"] });
      qc.invalidateQueries({ queryKey: ["order-ecf-permissions"] });
      await refetch();
    } catch (e) { setError(e.response?.data?.code || e.response?.data?.message || e.message); }
    finally { setBusyId(""); }
  }
  async function syncBranch(branch) {
    setBusyId(branch.clientId); setError(""); setInfo("");
    try {
      const r = (await api.post(`/api/clients/${encodeURIComponent(branch.clientId)}/menu/sync`)).data;
      setInfo(`${L("Platos creados", "Created")}: ${r.created} · ${L("actualizados", "updated")}: ${r.updated}. ${r.note || ""}`);
    } catch (e) { setError(e.response?.data?.message || e.response?.data?.code || e.message); }
    finally { setBusyId(""); }
  }
  function switchTo(branch) {
    if (branch.clientId === currentBranch || !branch.isActive) return;
    setScope({ tenantId: getScope().tenantId, clientId: branch.clientId });
    localStorage.setItem("clientId", branch.clientId);
    qc.clear();
    // Recarga necesaria para renovar Socket.IO, caja y caches legados por sucursal.
    window.location.assign("/");
  }
  return <section className="space-y-5 text-white">
    {isOwner && <EcfBranchOverview />}
    <div>
      <h2 className="text-2xl font-bold">{L("Sucursales", "Branches")}</h2>
      <p className="text-sm text-gray-400">{L("Cada sede conserva sus mesas, ventas, caja e inventario. El menú compartido sincroniza solo platos sin stock ni recetas.", "Each location has separate tables, sales, register and inventory. Shared menu syncs only items without stock or recipes.")}</p>
    </div>
    {error && <div role="alert" className="rounded-lg bg-red-950 border border-red-600 p-3 text-red-200">{error}</div>}
    {info && <div role="status" className="rounded-lg bg-emerald-950 border border-emerald-700 p-3 text-emerald-200">{info}</div>}
    {isLoading && <p>{L("Cargando sucursales…", "Loading branches…")}</p>}
    {isError && <p className="text-red-300">{L("No fue posible cargar las sucursales.", "Could not load branches.")}</p>}
    <p className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-sm text-amber-100">{L("Fase 12.6.2.1: activa e-CF independientemente en la principal o en cada sucursal. El POS puede emitir E31/E32 SOLO en sandbox interno desde sucursales habilitadas, con permisos y perfil fiscal válido. Si se desactiva, el POS permite factura normal y NCF B01/B02 cuando existan rangos NCF válidos y habilitados. Producción DGII permanece bloqueada en secundarias. El RNC, certificado y secuencias son compartidos por contribuyente.", "Phase 12.6.2.1: activate e-CF independently for main and secondary branches. The POS may issue E31/E32 in internal sandbox if the branch and all fiscal controls allow it. Disabled branches can issue normal invoices. Production stays blocked for secondary branches. Taxpayer identity, certificate and sequences stay shared.")}</p>
    <div className="grid gap-3">
      {branches.map(branch => <div key={branch.clientId} className="rounded-xl border border-gray-700 bg-[#171717] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><div className="font-semibold">{branch.name} {branch.clientId === currentBranch && <span className="text-xs text-emerald-400">({L("actual", "current")})</span>}</div>
          <p className="text-xs text-gray-400">{branch.address || "—"} · {branch.phone || "—"}</p>
          <p className="text-xs text-gray-500">{L("Menú", "Menu")}: {branch.menuMode === "shared" ? L("compartido", "shared") : L("independiente", "independent")}</p>
          <p className="text-xs text-amber-300">{branch.ecf?.enabled
            ? L("e-CF: activado para esta sede (sujeto a permisos y sandbox)", "e-CF: enabled for this branch (sandbox controls apply)")
            : L("e-CF: desactivado para esta sede", "e-CF: disabled for this branch")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!branch.isActive || currentBranch === branch.clientId} onClick={() => switchTo(branch)} className="rounded bg-blue-700 px-3 py-2 text-sm disabled:opacity-40">{L("Entrar", "Switch")}</button>
          <button type="button" disabled={Boolean(busyId) || !branch.isActive} onClick={() => configureBranchEcf(branch)} className="rounded border border-amber-600/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-200 disabled:opacity-50">{branch.ecf?.enabled ? L("Desactivar e-CF", "Disable e-CF") : L("Activar e-CF", "Enable e-CF")}</button>
          {multiClient && branch.clientId !== "default" && <>
            <button type="button" disabled={Boolean(busyId)} onClick={() => changeMode(branch, branch.menuMode === "shared" ? "independent" : "shared")} className="rounded bg-gray-700 px-3 py-2 text-sm disabled:opacity-50">{branch.menuMode === "shared" ? L("Usar menú propio", "Use own menu") : L("Compartir menú principal", "Share main menu")}</button>
            {branch.menuMode === "shared" && <button type="button" disabled={Boolean(busyId)} onClick={() => syncBranch(branch)} className="rounded bg-amber-600 px-3 py-2 text-sm disabled:opacity-50">{L("Sincronizar platos", "Sync menu")}</button>}
          </>}
        </div>
      </div>)}
    </div>
    <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300">{L("Sucursales en uso", "Branches in use")}: {policy?.used ?? branches.length}/{!policy ? "—" : maxBranches == null ? L("Sin límite", "Unlimited") : maxBranches} ({L("incluye principal", "including main location")})</p>
    {!policy || isError ? <p>{L("Actualiza la lista para comprobar el plan vigente.", "Refresh the list to check the current plan.")}</p> : !multiClient ? <p className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-amber-200">{L("Para crear varias sucursales necesitas un plan con la función multisucursal.", "A multi-branch plan is needed to create locations.")}</p>
      : atLimit ? <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-amber-200">{L(`Alcanzaste el límite de ${maxBranches} sucursales del plan ${policy.label}.`, `You reached the ${maxBranches}-branch limit for ${policy.label}.`)}</p>
      : <form onSubmit={e => { e.preventDefault(); if (name.trim() && !creating.current && policy?.canCreate && !isError) { creating.current = true; setError(""); createMutation.mutate(); } }} className="rounded-xl border border-gray-700 bg-[#161616] p-4 grid gap-3">
        <h3 className="font-semibold">{L("Crear sucursal", "Create branch")}</h3>
        <input className="rounded bg-gray-800 p-2" required maxLength={120} placeholder={L("Nombre de la sucursal", "Branch name")} value={name} onChange={e=>setName(e.target.value)} />
        <input className="rounded bg-gray-800 p-2" maxLength={200} placeholder={L("Dirección", "Address")} value={address} onChange={e=>setAddress(e.target.value)} />
        <input className="rounded bg-gray-800 p-2" maxLength={40} placeholder={L("Teléfono", "Phone")} value={phone} onChange={e=>setPhone(e.target.value)} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={shareOnCreate} onChange={e=>setShareOnCreate(e.target.checked)} />{L("Compartir platos del menú principal (sin inventario ni recetas)", "Share dishes from main menu (no inventory or recipes)")}</label>
        <button disabled={createMutation.isPending} className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-50">{createMutation.isPending ? L("Guardando…", "Saving…") : L("Crear sucursal", "Create branch")}</button>
      </form>}
  </section>;
}
