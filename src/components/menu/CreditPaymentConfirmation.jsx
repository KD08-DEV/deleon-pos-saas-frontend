import React, {useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {ArrowRight, CreditCard, X} from "lucide-react";

export default function CreditPaymentConfirmation({conversion, method, onConfirm, onCancel}) {
    const panel = useRef(null);
    const cancel = useRef(null);
    const cancelAction = useRef(onCancel);
    cancelAction.current = onCancel;
    useEffect(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        cancel.current?.focus();
        const keyboard = event => {
            if (event.key === "Escape") {event.preventDefault();event.stopPropagation();cancelAction.current();}
            if (event.key !== "Tab") return;
            const buttons = [...panel.current.querySelectorAll("button:not([disabled])")];
            const first = buttons[0], last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
            else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
        };
        document.addEventListener("keydown", keyboard, true);
        return () => {document.removeEventListener("keydown", keyboard, true);document.body.style.overflow=overflow;previous?.focus?.();};
    }, []);
    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <section ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="credit-confirm-title" aria-describedby="credit-confirm-description"
                className="credit-payment-confirmation w-full max-w-md overflow-y-auto rounded-3xl border border-sky-500/30 bg-[#171717] p-5 text-[#f5f5f5] shadow-2xl sm:p-7" style={{maxHeight:"calc(100dvh - 2rem)"}}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400"><CreditCard size={24} aria-hidden="true"/></div>
                    <button type="button" aria-label="Cerrar confirmación de crédito" onClick={onCancel} className="rounded-xl p-2 text-gray-400 hover:bg-sky-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"><X size={20}/></button>
                </div>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-sky-400">Cuentas por cobrar</p>
                <h2 id="credit-confirm-title" className="text-2xl font-semibold tracking-tight">{conversion ? "Cambiar a crédito" : "Confirmar cobro"}</h2>
                <p id="credit-confirm-description" className="mt-3 text-sm leading-relaxed text-gray-300">{conversion
                    ? "La factura quedará pendiente y se creará una cuenta por cobrar para el cliente guardado."
                    : "Se registrará el saldo pendiente como recibido. Los abonos anteriores se conservarán y la cuenta quedará saldada."}</p>
                <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-sky-500/5 p-4 text-sm font-medium">
                    <span>{conversion ? "Pago registrado" : "Crédito"}</span><ArrowRight size={18} className="shrink-0 text-sky-400" aria-hidden="true"/><span className="break-words text-right">{conversion ? "Crédito" : method}</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-300">{conversion ? "Confirma que no recibiste el dinero del cobro anterior o que ya lo devolviste." : "Confirma que recibiste el saldo pendiente mediante el método elegido."}</p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                    <button ref={cancel} type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-sky-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">Cancelar</button>
                    <button type="button" data-credit-confirm onClick={onConfirm} className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400">{conversion ? "Confirmar crédito" : "Confirmar cobro"}</button>
                </div>
            </section>
        </div>, document.body);
}
