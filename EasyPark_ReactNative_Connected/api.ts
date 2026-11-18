/**
 * Central API Configuration for EasyPark React Native App
 *
 * CHANGE ONLY THIS LINE TO YOUR BACKEND LAPTOP'S WI-FI IP ADDRESS:
 * - On Android Studio Emulator : "http://10.0.2.2:8080/api/parking"
 * - On Physical Phone (Expo Go): "http://192.168.1.X:8080/api/parking" (printed in VS Code console!)
 */
export const API_BASE_URL = "http://10.0.2.2:8080/api/parking";

export async function apiLogin(payload: {
  username: string;
  password: string;
  vehicleType?: string;
  vehicleNumber?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Login failed");
  }
  return data;
}

export async function apiRegister(payload: {
  username: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: string;
  vehicleNumber: string;
}) {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, role: "USER" }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Registration failed");
  }
  return data;
}

export async function apiGetSlots() {
  const res = await fetch(`${API_BASE_URL}/slots`);
  if (!res.ok) throw new Error("Could not fetch slots from backend");
  return await res.json();
}

export async function apiBookSlot(payload: {
  vehicleNumber: string;
  vehicleType: string;
  slotId: string;
  zone: string;
  estimatedFee?: number;
}) {
  const res = await fetch(`${API_BASE_URL}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Booking failed");
  }
  return data;
}

export async function apiCheckoutVehicle(payload: {
  vehicleNumber: string;
  finalAmount?: number;
}) {
  const res = await fetch(`${API_BASE_URL}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Checkout failed");
  }
  return data;
}

export async function apiGetAdminSummary() {
  const res = await fetch(`${API_BASE_URL}/admin/summary`);
  if (!res.ok) throw new Error("Could not fetch admin summary");
  return await res.json();
}

export async function apiMakePayment(payload: {
  ticketId?: number;
  vehicleNumber: string;
  amount: number;
  paymentMethod?: "UPI" | "CARD" | "CASH";
}) {
  const res = await fetch(`${API_BASE_URL}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Payment failed");
  }
  return data;
}

export async function apiGetPayments() {
  const res = await fetch(`${API_BASE_URL}/payments`);
  if (!res.ok) throw new Error("Could not fetch payments");
  return await res.json();
}
