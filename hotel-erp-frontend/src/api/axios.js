import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

const axiosClient = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let pendingRequests = [];

const resolvePendingRequests = (error, token = null) => {
    pendingRequests.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(token);
    });

    pendingRequests = [];
};

const getStoredToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');
const getStoredRefreshToken = () => sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');

const syncAuthSession = async (payload) => {
    const { useAdminAuthStore } = await import('../store/adminAuthStore');
    const updateSession = useAdminAuthStore.getState().updateSession;
    updateSession({
        token: payload?.token,
        refreshToken: payload?.refreshToken,
        user: payload ? {
            id: payload.userId,
            fullName: payload.fullName,
            email: payload.email,
            role: payload.role,
            avatarUrl: payload.avatarUrl ?? null,
        } : null,
        permissions: payload?.permissions || [],
    });
};

const clearClientAuth = async () => {
    const { useAdminAuthStore } = await import('../store/adminAuthStore');
    useAdminAuthStore.getState().clearAuth();
};

const setGlobalLoading = (value) => {
    import('../store/loadingStore').then(({ useLoadingStore }) => {
        useLoadingStore.getState().setLoading(value);
    });
};

const refreshAccessToken = async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
        throw new Error('Missing refresh token');
    }

    const response = await axios.post(`${baseURL}/Auth/refresh-token`, { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
    });

    await syncAuthSession(response.data);
    return response.data?.token;
};

axiosClient.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        setGlobalLoading(true);
        return config;
    },
    (error) => {
        setGlobalLoading(false);
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response) => {
        setGlobalLoading(false);
        return response;
    },
    async (error) => {
        setGlobalLoading(false);

        const status = error.response?.status;
        const originalRequest = error.config || {};

        if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/Auth/refresh-token')) {
            const token = getStoredToken();
            const refreshToken = getStoredRefreshToken();

            if (!token || !refreshToken) {
                await clearClientAuth();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    pendingRequests.push({
                        resolve: (nextToken) => {
                            originalRequest.headers = originalRequest.headers || {};
                            originalRequest.headers.Authorization = `Bearer ${nextToken}`;
                            resolve(axiosClient(originalRequest));
                        },
                        reject,
                    });
                });
            }

            isRefreshing = true;

            try {
                const nextToken = await refreshAccessToken();
                resolvePendingRequests(null, nextToken);
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${nextToken}`;
                return axiosClient(originalRequest);
            } catch (refreshError) {
                resolvePendingRequests(refreshError, null);
                await clearClientAuth();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (status === 403) {
            console.warn('[Axios] 403 Forbidden â€” KhĂ´ng Ä‘á»§ quyá»n thá»±c hiá»‡n thao tĂ¡c nĂ y.');
        }

        return Promise.reject(error);
    }
);

export { refreshAccessToken };
export default axiosClient;
