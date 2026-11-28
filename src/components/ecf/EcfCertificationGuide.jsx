import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import api from "../../lib/api";

// Guía de certificación del negocio como emisor electrónico ante la DGII.
// Los pasos "automáticos" los comprueba el sistema; los del portal DGII se marcan a mano.
const ICONS = {
    done: <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />,
    warning: <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />,
    pending: <Circle size={16} className="mt-0.5 shrink-0 text-gray-500" />,
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString("es-DO") : "");

export default function EcfCertificationGuide() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(true);

    const guideQuery = useQuery({
        queryKey: ["ecf-certification-guide"],
        queryFn: async () => (await api.get("/api/admin/ecf/certification-guide")).data?.data,
        retry: 0,
    });

    const markMutation = useMutation({
        mutationFn: async ({ key, done }) => (await api.post(`/api/admin/ecf/certification-guide/${key}`, { done })).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ecf-certification-guide"] }),
        onError: () => enqueueSnackbar("No se pudo guardar el paso.", { variant: "error" }),
    });

    const guide = guideQuery.data;
    if (guideQuery.isError || !guide) return null;

    const groups = [];
    for (const step of guide.steps) {
        let group = groups.find((g) => g.name === step.group);
        if (!group) groups.push((group = { name: step.group, steps: [] }));
        group.steps.push(step);
    }

    return (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
                <div>
                    <div className="flex items-center gap-2">
                        <ListChecks size={18} className="text-emerald-300" />
                        <h3 className="text-sm font-semibold text-white">Guía de certificación DGII</h3>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                            {guide.done}/{guide.total} · {guide.percent}%
                        </span>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs text-gray-400">
                        Pasos para que este negocio quede autorizado como emisor electrónico usando DeLeonSoft.
                        Los pasos con casilla se hacen en el portal de la DGII: márcalos cuando los completes.
                    </p>
                </div>
                {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${guide.percent}%` }} />
            </div>

            {open && (
                <div className="mt-4 space-y-4">
                    {groups.map((group) => (
                        <div key={group.name}>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.name}</h4>
                            <ol className="space-y-2">
                                {group.steps.map((step) => (
                                    <li key={step.key} className="flex items-start gap-2 rounded-lg border border-gray-800 bg-[#111113] p-3 text-xs">
                                        {ICONS[step.status] || ICONS.pending}
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-semibold ${step.status === "done" ? "text-gray-200" : "text-white"}`}>{step.title}</p>
                                            <p className={step.status === "warning" ? "text-amber-200" : "text-gray-400"}>{step.detail}</p>
                                            {step.manual && step.doneAt && (
                                                <p className="text-gray-500">Marcado el {fmt(step.doneAt)}</p>
                                            )}
                                        </div>
                                        {step.manual && (
                                            <label className="flex shrink-0 cursor-pointer items-center gap-1 text-gray-300">
                                                <input type="checkbox" checked={Boolean(step.doneAt)}
                                                    disabled={markMutation.isPending}
                                                    onChange={(e) => markMutation.mutate({ key: step.key, done: e.target.checked })} />
                                                Hecho
                                            </label>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
