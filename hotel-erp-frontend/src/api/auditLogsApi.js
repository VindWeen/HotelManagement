import axiosClient from "./axios";

export const getAuditLogHistory = (params = {}) =>
  axiosClient.get("/AuditLogs/history", { params });

export const getAuditLogFilterOptions = () =>
  axiosClient.get("/AuditLogs/filter-options");

export const exportAuditLogs = (params = {}) =>
  axiosClient.get("/AuditLogs/export", {
    params,
    responseType: "blob",
  });

export const exportAllAuditLogs = () =>
  axiosClient.get("/AuditLogs/export-all", {
    responseType: "blob",
  });
