export const stripMoneyFormatting = (value) => {
  if (value == null) return "";
  return String(value).replace(/[^\d]/g, "");
};

export const formatMoneyInput = (value) => {
  const digits = stripMoneyFormatting(value);
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
};

export const parseMoneyInput = (value) => {
  const digits = stripMoneyFormatting(value);
  return digits ? Number(digits) : 0;
};

export const clampMoneyInput = (value, { min = 0, max } = {}) => {
  if (!stripMoneyFormatting(value)) return "";

  let numericValue = parseMoneyInput(value);
  if (Number.isFinite(min)) {
    numericValue = Math.max(min, numericValue);
  }
  if (Number.isFinite(max)) {
    numericValue = Math.min(max, numericValue);
  }

  return String(numericValue);
};
