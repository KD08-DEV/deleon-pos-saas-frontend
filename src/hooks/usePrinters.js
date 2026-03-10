import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
    listPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    setDefaultPrinter,
} from "../services/tenantPrintApi.js";

export default function usePrinters(category = "") {
    const qc = useQueryClient();

    const printersQuery = useQuery({
        queryKey: ["printers", category],
        queryFn: () => listPrinters(category ? { category } : {}),
        staleTime: 0,
        refetchOnMount: "always",
    });

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: ["printers"] });
    };

    const createMutation = useMutation({
        mutationFn: createPrinter,
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora creada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error creando impresora",
                { variant: "error" }
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => updatePrinter(id, payload),
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora actualizada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error actualizando impresora",
                { variant: "error" }
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePrinter,
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora eliminada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error eliminando impresora",
                { variant: "error" }
            );
        },
    });

    const defaultMutation = useMutation({
        mutationFn: setDefaultPrinter,
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora por defecto actualizada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error marcando impresora por defecto",
                { variant: "error" }
            );
        },
    });

    return {
        printers: printersQuery.data || [],
        isLoadingPrinters: printersQuery.isLoading,
        refetchPrinters: printersQuery.refetch,

        createPrinter: createMutation.mutateAsync,
        creatingPrinter: createMutation.isPending,

        updatePrinter: updateMutation.mutateAsync,
        updatingPrinter: updateMutation.isPending,

        deletePrinter: deleteMutation.mutateAsync,
        deletingPrinter: deleteMutation.isPending,

        setDefaultPrinter: defaultMutation.mutateAsync,
        settingDefaultPrinter: defaultMutation.isPending,
    };
}