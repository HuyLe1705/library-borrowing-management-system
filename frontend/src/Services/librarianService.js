const API_BASE_URL = "http://localhost:5000/api";

export async function librarianApi(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (${response.status}).`);
  }

  if (response.status === 401) {
    throw new Error("Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.");
  }

  if (response.status === 403) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || `Yêu cầu thất bại (${response.status}).`
    );
  }

  return result?.data ?? result;
}

export function getBorrows(filters = {}) {
  const params = new URLSearchParams();

  if (filters.userCode?.trim()) {
    params.set("userCode", filters.userCode.trim());
  }

  if (filters.barcode?.trim()) {
    params.set("barcode", filters.barcode.trim());
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return librarianApi(`/borrows${query ? `?${query}` : ""}`);
}

export function checkoutBook(payload) {
  return librarianApi("/borrows/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function returnBook(payload) {
  return librarianApi("/borrows/return", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function renewBorrow(borrowId) {
  return librarianApi(`/borrows/${borrowId}/renew`, {
    method: "POST",
  });
}

export function payFine(fineId) {
  return librarianApi(`/borrows/fines/${fineId}/pay`, {
    method: "PATCH",
  });
}