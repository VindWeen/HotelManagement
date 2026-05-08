import axiosClient from "./axios";

export const getDashboardOverview = () => axiosClient.get("/Dashboard/overview");
export const getMyDashboard = () => axiosClient.get("/Dashboard/my");
export const refreshDashboardSnapshot = (roles = []) => axiosClient.post("/Dashboard/refresh", { roles });
