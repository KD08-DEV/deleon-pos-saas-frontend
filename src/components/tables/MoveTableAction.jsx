import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { refreshTableViews, tableOperationMessage } from "../../lib/tableOperations";

export default function MoveTableAction({ table, tables, onDone, onBusyChange }) {
    const qc = useQueryClient();
    const lock = useRef(false);
    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const orderId = table?.currentOrder?._id || table?.currentOrder;
    if (!orderId || table.status === "Disponible") return null;
    const available = tables.filter(item => !item.isVirtual && item._id !== table._id && item.status === "Disponible" && !item.currentOrder && !item.tableSessionId);
    const move = async () => {
        if (lock.current || !target) return;
        lock.current = true;
        setBusy(true);
        onBusyChange?.(true);
        setError("");
        try {
            await api.post(`/api/table/${encodeURIComponent(table._id)}/move`, { orderId: String(orderId), targetTableId: target });
            await refreshTableViews(qc);
            setOpen(false);
            onBusyChange?.(false);
            onDone?.();
        } catch (err) { setError(tableOperationMessage(err)); }
        finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
    };
    return <>
        <button type="button" aria-expanded={open} disabled={busy} className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#38bdf8]/60 text-[#38bdf8] bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10 whitespace-nowrap shadow-sm disabled:opacity-50" onClick={() => setOpen(!open)}>Cambiar de mesa</button>
        {open && <div className="order-last w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
            <label className="block text-sm text-white" htmlFor="move-target-table">Mesa de destino</label>
            <select id="move-target-table" value={target} disabled={busy} onChange={e => setTarget(e.target.value)} className="mt-2 w-full rounded-lg bg-[#242424] p-3 text-white">
                <option value="">Selecciona una mesa disponible</option>
                {available.map(item => <option key={item._id} value={item._id}>{item.area || "General"} — Mesa {item.tableNo}</option>)}
            </select>
            {!available.length && <p className="mt-2 text-sm text-white/70">No hay mesas disponibles.</p>}
            {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
            <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-white/20 p-2 text-white disabled:opacity-50">Cancelar</button>
                <button type="button" disabled={busy || !target} aria-busy={busy} onClick={move} className="flex-1 rounded-lg bg-[#38bdf8] p-2 font-semibold text-black disabled:opacity-50">{busy ? "Procesando..." : "Confirmar cambio"}</button>
            </div>
        </div>}
    </>;
}

const tableShape = PropTypes.shape({
    _id: PropTypes.string.isRequired,
    status: PropTypes.string,
    currentOrder: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({ _id: PropTypes.string })]),
    tableSessionId: PropTypes.string,
    tableNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    area: PropTypes.string,
    isVirtual: PropTypes.bool,
});
MoveTableAction.propTypes = {
    table: tableShape.isRequired,
    tables: PropTypes.arrayOf(tableShape).isRequired,
    onDone: PropTypes.func,
    onBusyChange: PropTypes.func,
};
