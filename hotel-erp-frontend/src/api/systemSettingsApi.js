import axiosClient from "./axios";

export const getSystemSettings = () => axiosClient.get("/SystemSettings");

export const updateDepositSettings = (data) =>
  axiosClient.put("/SystemSettings/deposit", data);

export const updateLocationSettings = (data) =>
  axiosClient.put("/SystemSettings/location", data);
