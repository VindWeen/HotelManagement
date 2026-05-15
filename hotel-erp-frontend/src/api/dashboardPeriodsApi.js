// src/api/dashboardPeriodsApi.js
import axiosClient from "./axios";

/** GET dashboard kỳ hiện tại của role (mặc định MONTHLY) */
export const getCurrentDashboard = (roleName = null, periodType = "MONTHLY") =>
  axiosClient.get("/dashboard-periods/current", {
    params: { ...(roleName ? { roleName } : {}), periodType },
  });

/** GET dashboard theo kỳ cụ thể (periodKey: "2026-05", "2026-W20", ...) */
export const getDashboardByPeriod = (roleName, periodType, periodKey) =>
  axiosClient.get(`/dashboard-periods/${roleName}/${periodType}/${periodKey}`);

/** GET lịch sử kỳ (tối đa 36 kỳ) */
export const getDashboardHistory = (roleName, periodType, take = 12) =>
  axiosClient.get(`/dashboard-periods/${roleName}/${periodType}/history`, {
    params: { take },
  });

/** POST rebuild dashboard 1 role/period */
export const rebuildDashboard = (roleName, periodType, occurredAtUtc = null) =>
  axiosClient.post("/dashboard-periods/rebuild", {
    roleName,
    periodType,
    occurredAtUtc,
  });

/** POST rebuild toàn bộ dashboard kỳ hiện tại (tất cả roles) */
export const rebuildAllCurrent = () =>
  axiosClient.post("/dashboard-periods/rebuild-current");

/** POST trigger rebuild từ sự kiện nghiệp vụ */
export const rebuildAffectedByEvent = (eventType, refId = null, occurredAtUtc = null) =>
  axiosClient.post("/dashboard-periods/events/rebuild-affected", {
    eventType,
    refId,
    occurredAtUtc,
  });
