import { useDispatch } from "react-redux";
import { getUserData, getTenant } from "@https";
import { useEffect, useState } from "react";
import { removeUser, setUser } from "../redux/slices/userSlice";
import { clearTenant, setTenant } from "../redux/slices/storeSlice";
import { getScope, setScope } from "../lib/api";
import { scopeForAuthenticatedUser } from "../lib/sessionScope.mjs";

// Descarta respuestas de una sesión anterior que terminen después de otro login.
const useLoadData = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const loginToken = localStorage.getItem("token");
        const belongsToCurrentLogin = () =>
            !cancelled && Boolean(loginToken) && localStorage.getItem("token") === loginToken;

        const fetchUser = async () => {
            if (!loginToken) {
                setIsLoading(false);
                return;
            }
            try {
                const res = await getUserData();
                const data = res.data?.data;
                if (!belongsToCurrentLogin()) return;
                if (!data?.role) {
                    dispatch(removeUser());
                    dispatch(clearTenant());
                    return;
                }
                if (data.role !== "SuperAdmin") {
                    const nextScope = scopeForAuthenticatedUser(data, getScope());
                    setScope(nextScope);
                    localStorage.setItem("tenantId", nextScope.tenantId);
                    localStorage.setItem("clientId", nextScope.clientId);
                }
                dispatch(setUser(data));
                if (data?.tenantId) {
                    const tRes = await getTenant(data.tenantId);
                    if (belongsToCurrentLogin()) dispatch(setTenant(tRes.data.data));
                }
            } catch (err) {
                if (belongsToCurrentLogin()) {
                    dispatch(removeUser());
                    dispatch(clearTenant());
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        fetchUser();
        return () => { cancelled = true; };
    }, [dispatch]);
    return isLoading;
};
export default useLoadData;
