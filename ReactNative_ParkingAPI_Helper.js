/**
 * GIVE THIS FILE TO YOUR REACT NATIVE TEAMMATES!
 * Complete API helper for connecting their React Native screens:
 * 1) Admin & User Login Screen   -> loginUser(username, password)
 * 2) User Signup Screen          -> registerUser(username, password, fullName, role, vehicleNumber)
 * 3) Camera Scanner Screen       -> scanVehicleWithCamera(scannedText, vehicleType)
 * 4) Admin Dashboard Screen      -> fetchAdminDashboard()
 * 5) User Parking Slots Screen   -> fetchParkingSlots()
 *
 * IMPORTANT FOR REACT NATIVE:
 * Replace 10.0.2.2 with your laptop's Wi-Fi IPv4 address (printed when you run Spring Boot)
 * if testing on a real phone!
 */

export const BASE_URL = 'http://10.0.2.2:8080/api/parking';

// 1. Admin & User Login (Default Admin: admin / admin123 | Default User: user / user123)
export async function loginUser(username, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  return data; // returns { success: true, user: { userId, username, fullName, role, vehicleNumber } }
}

// 2. Register New User / Admin
export async function registerUser(username, password, fullName, role = 'USER', vehicleNumber = '') {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, fullName, role, vehicleNumber }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

// 3. Camera Scanner (Pass the scanned QR or License Plate string!)
// Automatically PARKS the vehicle if outside, or CHECKS IT OUT & calculates bill if already inside!
export async function scanVehicleWithCamera(scannedText, vehicleType = 'CAR') {
  const response = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scannedText, vehicleType }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Camera scan failed');
  return data; // returns { success: true, action: "ENTRY" | "EXIT", message, ticket }
}

// 4. Admin Dashboard Summary (Available/Occupied Slots + Total Revenue + All Records)
export async function fetchAdminDashboard() {
  const response = await fetch(`${BASE_URL}/admin/summary`);
  if (!response.ok) throw new Error('Failed to load Admin Dashboard');
  return await response.json();
}

// 5. User Slots View
export async function fetchParkingSlots() {
  const response = await fetch(`${BASE_URL}/slots`);
  if (!response.ok) throw new Error('Failed to fetch parking slots');
  return await response.json();
}