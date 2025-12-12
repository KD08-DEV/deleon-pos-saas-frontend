import { useDispatch } from "react-redux";
import { getUserData, getTenant } from "@https";
import { useEffect, useState } from "react";
import { removeUser, setUser } from "../redux/slices/userSlice";
import { setTenant } from "../redux/slices/storeSlice";

const useLoadData = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await getUserData();
                const data = res.data?.data;

                if (!data?.role) {
                    dispatch(removeUser());
                    return;
                }

                dispatch(setUser(data));
                if (data?.tenantId) {
                    const tRes = await getTenant(data.tenantId);
                    dispatch(setTenant(tRes.data.data));
                }

            } catch (err) {
                dispatch(removeUser());
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, []);

    return isLoading;
};

export default useLoadData;
