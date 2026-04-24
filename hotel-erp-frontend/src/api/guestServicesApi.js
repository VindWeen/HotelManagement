import axiosClient from "./axios";

// Guest: Xem catalog dịch vụ (public)
export const getGuestServiceCatalog = () =>
  axiosClient.get("/Services/guest/catalog");
