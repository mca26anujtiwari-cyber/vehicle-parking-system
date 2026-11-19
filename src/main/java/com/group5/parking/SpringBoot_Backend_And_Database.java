package com.group5.parking;

/*
 * ============================================================================
 * GROUP 5: SPRING BOOT BACKEND + SPRING JDBC DATABASE
 * (WITH LOGIN + PARKING SLOTS + ANPR CAMERA + PAYMENT GATEWAY)
 * ============================================================================
 */

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.InetAddress;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@SpringBootApplication
public class SpringBoot_Backend_And_Database {

    public static void main(String[] args) {
        SpringApplication.run(SpringBoot_Backend_And_Database.class, args);
        String ip = "localhost";
        try {
            ip = InetAddress.getLocalHost().getHostAddress();
        } catch (Exception ignored) {}

        System.out.println("\n==============================================================");
        System.out.println("  EASYPARK SPRING BOOT + SPRING JDBC BACKEND IS RUNNING!");
        System.out.println("  1. Put this URL in React Native (api.ts):");
        System.out.println("     http://" + ip + ":8080/api/parking");
        System.out.println("  2. Android Emulator URL:");
        System.out.println("     http://10.0.2.2:8080/api/parking");
        System.out.println("  3. View Live SQL Database Tables (APP_USERS, PARKING_RECORDS, PAYMENTS):");
        System.out.println("     http://localhost:8080/h2-console");
        System.out.println("     (JDBC URL: jdbc:h2:mem:parkingdb | User: sa | Password: empty)");
        System.out.println("==============================================================\n");
    }
}

// ============================================================================
// PART 2: DATABASE CONNECTIVITY LAYER (Spring JDBC + 3 SQL Tables)
// 1) app_users       2) parking_records       3) payments
// ============================================================================
@Repository
class ParkingRepository {

    private final JdbcTemplate jdbcTemplate;

    public ParkingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<ParkingTicket> ticketRowMapper = (rs, rowNum) -> {
        Timestamp entryTs = rs.getTimestamp("entry_time");
        Timestamp exitTs = rs.getTimestamp("exit_time");
        return new ParkingTicket(
                rs.getInt("ticket_id"),
                rs.getString("vehicle_number"),
                rs.getString("vehicle_type"),
                rs.getString("slot_id"),
                rs.getString("parking_zone"),
                entryTs != null ? entryTs.toLocalDateTime() : null,
                exitTs != null ? exitTs.toLocalDateTime() : null,
                rs.getDouble("charges"),
                rs.getString("parking_status")
        );
    };

    private final RowMapper<AppUser> userRowMapper = (rs, rowNum) -> new AppUser(
            rs.getInt("user_id"),
            rs.getString("username"),
            rs.getString("email"),
            rs.getString("phone"),
            rs.getString("user_role"),
            rs.getString("vehicle_type"),
            rs.getString("vehicle_number")
    );

    private final RowMapper<PaymentRecord> paymentRowMapper = (rs, rowNum) -> {
        Timestamp paidTs = rs.getTimestamp("paid_at");
        return new PaymentRecord(
                rs.getInt("payment_id"),
                rs.getString("transaction_ref"),
                rs.getInt("ticket_id"),
                rs.getString("vehicle_number"),
                rs.getDouble("amount"),
                rs.getString("payment_method"),
                rs.getString("payment_status"),
                paidTs != null ? paidTs.toLocalDateTime() : null
        );
    };

    public void createTablesAndDefaultUsers() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS payments");
        jdbcTemplate.execute("DROP TABLE IF EXISTS parking_records");
        jdbcTemplate.execute("DROP TABLE IF EXISTS app_users");

        jdbcTemplate.execute(
                "CREATE TABLE app_users (" +
                "user_id INT AUTO_INCREMENT PRIMARY KEY, " +
                "username VARCHAR(50) NOT NULL, " +
                "email VARCHAR(120), " +
                "phone VARCHAR(20), " +
                "user_password VARCHAR(100) NOT NULL, " +
                "user_role VARCHAR(20) NOT NULL, " +
                "vehicle_type VARCHAR(20), " +
                "vehicle_number VARCHAR(20))"
        );

        jdbcTemplate.execute(
                "CREATE TABLE parking_records (" +
                "ticket_id INT AUTO_INCREMENT PRIMARY KEY, " +
                "vehicle_number VARCHAR(20) NOT NULL, " +
                "vehicle_type VARCHAR(20) NOT NULL, " +
                "slot_id VARCHAR(20) NOT NULL, " +
                "parking_zone VARCHAR(30) NOT NULL, " +
                "entry_time TIMESTAMP NOT NULL, " +
                "exit_time TIMESTAMP, " +
                "charges DOUBLE DEFAULT 0.0, " +
                "parking_status VARCHAR(12) DEFAULT 'PARKED')"
        );

        jdbcTemplate.execute(
                "CREATE TABLE payments (" +
                "payment_id INT AUTO_INCREMENT PRIMARY KEY, " +
                "transaction_ref VARCHAR(40) NOT NULL, " +
                "ticket_id INT, " +
                "vehicle_number VARCHAR(20) NOT NULL, " +
                "amount DOUBLE NOT NULL, " +
                "payment_method VARCHAR(20) NOT NULL, " +
                "payment_status VARCHAR(20) NOT NULL, " +
                "paid_at TIMESTAMP NOT NULL)"
        );

        jdbcTemplate.update(
                "INSERT INTO app_users (username, email, phone, user_password, user_role, vehicle_type, vehicle_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                "admin", "admin@easypark.com", "9999999999", "Admin@123", "ADMIN", null, null
        );
        jdbcTemplate.update(
                "INSERT INTO app_users (username, email, phone, user_password, user_role, vehicle_type, vehicle_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                "user", "user@easypark.com", "9876543210", "User@123", "USER", "4 Wheeler", "MH02AB1234"
        );

        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO parking_records (vehicle_number, vehicle_type, slot_id, parking_zone, entry_time, charges, parking_status) VALUES (?, ?, ?, ?, ?, 0.0, 'PARKED')",
                "MH01XY1111", "4 Wheeler", "A2", "Zone A", Timestamp.valueOf(now.minusHours(1))
        );
        jdbcTemplate.update(
                "INSERT INTO parking_records (vehicle_number, vehicle_type, slot_id, parking_zone, entry_time, charges, parking_status) VALUES (?, ?, ?, ?, ?, 0.0, 'PARKED')",
                "MH02CD2222", "4 Wheeler", "B1", "Zone B", Timestamp.valueOf(now.minusMinutes(45))
        );
        jdbcTemplate.update(
                "INSERT INTO parking_records (vehicle_number, vehicle_type, slot_id, parking_zone, entry_time, charges, parking_status) VALUES (?, ?, ?, ?, ?, 0.0, 'PARKED')",
                "MH04BK3333", "2 Wheeler", "F1-03", "Floor 1", Timestamp.valueOf(now.minusHours(2))
        );
    }

    public Optional<AppUser> authenticateUser(String username, String password) {
        String sql = "SELECT * FROM app_users WHERE LOWER(username) = LOWER(?) AND user_password = ?";
        List<AppUser> list = jdbcTemplate.query(sql, userRowMapper, username.trim(), password);
        return list.stream().findFirst();
    }

    public boolean existsByUsernameOrEmail(String username, String email) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM app_users WHERE LOWER(username) = LOWER(?) OR (email IS NOT NULL AND LOWER(email) = LOWER(?))",
                Integer.class, username.trim(), email != null ? email.trim() : ""
        );
        return count != null && count > 0;
    }

    public AppUser registerNewUser(String username, String email, String phone, String password,
                                   String role, String vehicleType, String vehicleNumber) {
        String sql = "INSERT INTO app_users (username, email, phone, user_password, user_role, vehicle_type, vehicle_number) VALUES (?, ?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        String cleanRole = (role == null || role.isBlank()) ? "USER" : role.trim().toUpperCase();
        String cleanPlate = vehicleNumber != null ? vehicleNumber.replaceAll("[\\s-]", "").toUpperCase() : null;

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, username.trim());
            ps.setString(2, email != null ? email.trim().toLowerCase() : null);
            ps.setString(3, phone != null ? phone.trim() : null);
            ps.setString(4, password);
            ps.setString(5, cleanRole);
            ps.setString(6, vehicleType);
            ps.setString(7, cleanPlate);
            return ps;
        }, keyHolder);

        int id = keyHolder.getKey() != null ? keyHolder.getKey().intValue() : 0;
        return new AppUser(id, username.trim(), email, phone, cleanRole, vehicleType, cleanPlate);
    }

    public boolean resetUserPassword(String username, String emailOrPhone, String newPassword) {
        String sql = "UPDATE app_users SET user_password = ? WHERE LOWER(username) = LOWER(?) AND (LOWER(email) = LOWER(?) OR phone = ?)";
        String idCheck = emailOrPhone != null ? emailOrPhone.trim() : "";
        int updated = jdbcTemplate.update(sql, newPassword, username.trim(), idCheck, idCheck);
        return updated > 0;
    }

    public ParkingTicket saveEntry(ParkingTicket ticket) {
        String sql = "INSERT INTO parking_records (vehicle_number, vehicle_type, slot_id, parking_zone, entry_time, charges, parking_status) VALUES (?, ?, ?, ?, ?, 0.0, 'PARKED')";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, ticket.getVehicleNumber());
            ps.setString(2, ticket.getVehicleType());
            ps.setString(3, ticket.getSlotId());
            ps.setString(4, ticket.getZone());
            ps.setTimestamp(5, Timestamp.valueOf(ticket.getEntryTime()));
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() != null) {
            ticket.setTicketId(keyHolder.getKey().intValue());
        }
        return ticket;
    }

    public void updateExit(int ticketId, LocalDateTime exitTime, double charges) {
        String sql = "UPDATE parking_records SET exit_time = ?, charges = ?, parking_status = 'EXITED' WHERE ticket_id = ?";
        jdbcTemplate.update(sql, Timestamp.valueOf(exitTime), charges, ticketId);
    }

    public PaymentRecord savePayment(PaymentRecord payment) {
        String sql = "INSERT INTO payments (transaction_ref, ticket_id, vehicle_number, amount, payment_method, payment_status, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, payment.getTransactionRef());
            ps.setInt(2, payment.getTicketId());
            ps.setString(3, payment.getVehicleNumber());
            ps.setDouble(4, payment.getAmount());
            ps.setString(5, payment.getPaymentMethod());
            ps.setString(6, payment.getPaymentStatus());
            ps.setTimestamp(7, Timestamp.valueOf(payment.getPaidAt()));
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() != null) {
            payment.setPaymentId(keyHolder.getKey().intValue());
        }
        return payment;
    }

    public List<PaymentRecord> findAllPayments() {
        String sql = "SELECT * FROM payments ORDER BY payment_id DESC";
        return jdbcTemplate.query(sql, paymentRowMapper);
    }

    public List<ParkingTicket> findActiveParkedVehicles() {
        String sql = "SELECT * FROM parking_records WHERE parking_status = 'PARKED' ORDER BY ticket_id ASC";
        return jdbcTemplate.query(sql, ticketRowMapper);
    }

    public List<ParkingTicket> findAllRecords() {
        String sql = "SELECT * FROM parking_records ORDER BY ticket_id DESC";
        return jdbcTemplate.query(sql, ticketRowMapper);
    }
}

// ============================================================================
// PART 3: BACKEND REST API CONTROLLER
// ============================================================================
@RestController
@RequestMapping("/api/parking")
@CrossOrigin(origins = "*")
class ParkingController {

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "");
        String password = body.getOrDefault("password", "");
        String vehicleType = body.getOrDefault("vehicleType", "");
        String vehicleNumber = body.getOrDefault("vehicleNumber", "");

        Optional<AppUser> userOpt = parkingService.loginUser(username, password);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "Invalid username or password."
            ));
        }

        AppUser user = userOpt.get();
        if ("USER".equalsIgnoreCase(user.getRole()) && !vehicleNumber.isBlank()) {
            String cleanReqPlate = vehicleNumber.replaceAll("[\\s-]", "").toUpperCase();
            if (user.getVehicleNumber() != null && !user.getVehicleNumber().equalsIgnoreCase(cleanReqPlate)) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "error", "Vehicle number does not match your registered account (" + user.getVehicleNumber() + ")."
                ));
            }
            if (!vehicleType.isBlank() && user.getVehicleType() != null && !user.getVehicleType().equalsIgnoreCase(vehicleType)) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "error", "Vehicle type does not match your registered account (" + user.getVehicleType() + ")."
                ));
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "Welcome, " + user.getUsername() + "!");
        res.put("user", user);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        try {
            AppUser newUser = parkingService.registerUser(
                    body.get("username"),
                    body.get("email"),
                    body.get("phone"),
                    body.get("password"),
                    body.getOrDefault("role", "USER"),
                    body.get("vehicleType"),
                    body.get("vehicleNumber")
            );
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", true);
            res.put("message", "Registration Successful! Welcome to EasyPark.");
            res.put("user", newUser);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        try {
            parkingService.resetPassword(
                    body.get("username"),
                    body.getOrDefault("emailOrPhone", body.getOrDefault("email", body.get("phone"))),
                    body.get("newPassword")
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password reset successful! You can now sign in with your new password."
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/slots")
    public Map<String, Object> getSlots(@RequestParam(required = false) String vehicleType) {
        return parkingService.getSlotsForApp(vehicleType);
    }

    @PostMapping("/book")
    public ResponseEntity<Map<String, Object>> bookSlot(@RequestBody Map<String, Object> body) {
        try {
            String vehicleNumber = String.valueOf(body.getOrDefault("vehicleNumber", ""));
            String vehicleType = String.valueOf(body.getOrDefault("vehicleType", "4 Wheeler"));
            String slotId = String.valueOf(body.getOrDefault("slotId", ""));
            String zone = String.valueOf(body.getOrDefault("zone", "Zone A"));
            double estimatedFee = body.get("estimatedFee") != null ? Double.parseDouble(String.valueOf(body.get("estimatedFee"))) : 0.0;

            ParkingTicket ticket = parkingService.bookSpecificSlot(vehicleNumber, vehicleType, slotId, zone, estimatedFee);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Slot " + ticket.getSlotId() + " booked successfully!",
                    "ticket", ticket
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@RequestBody Map<String, Object> body) {
        try {
            String vehicleNumber = String.valueOf(body.getOrDefault("vehicleNumber", ""));
            double finalAmount = body.get("finalAmount") != null ? Double.parseDouble(String.valueOf(body.get("finalAmount"))) : -1.0;

            ParkingTicket ticket = parkingService.checkoutVehicle(vehicleNumber, finalAmount);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Checkout complete! Total Fee: Rs. " + ticket.getCharges(),
                    "ticket", ticket
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // PAYMENT GATEWAY ENDPOINT -> POST /api/parking/pay
    // Accepts: { "ticketId": 1, "vehicleNumber": "MH02AB1234", "amount": 60, "paymentMethod": "UPI" }
    @PostMapping("/pay")
    public ResponseEntity<Map<String, Object>> processPayment(@RequestBody Map<String, Object> body) {
        try {
            int ticketId = body.get("ticketId") != null ? Integer.parseInt(String.valueOf(body.get("ticketId"))) : 0;
            String vehicleNumber = String.valueOf(body.getOrDefault("vehicleNumber", ""));
            double amount = body.get("amount") != null ? Double.parseDouble(String.valueOf(body.get("amount"))) : 0.0;
            String method = String.valueOf(body.getOrDefault("paymentMethod", "UPI"));

            PaymentRecord receipt = parkingService.recordPayment(ticketId, vehicleNumber, amount, method);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Payment of Rs. " + receipt.getAmount() + " successful via " + receipt.getPaymentMethod(),
                    "payment", receipt
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ALL PAYMENTS LIST -> GET /api/parking/payments
    @GetMapping("/payments")
    public List<PaymentRecord> getPayments() {
        return parkingService.getAllPayments();
    }

    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> handlePlateScan(@RequestBody Map<String, Object> body) {
        try {
            String plate = String.valueOf(body.getOrDefault("plateNumber", body.getOrDefault("vehicleNumber", "")));
            String vehicleType = String.valueOf(body.getOrDefault("vehicleType", "4 Wheeler"));
            return ResponseEntity.ok(parkingService.processAnprScan(plate, vehicleType));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping(value = "/anpr-scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> handleAnprImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "vehicleType", defaultValue = "4 Wheeler") String vehicleType) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "plate.jpg";
                }
            };

            MultiValueMap<String, Object> multipartBody = new LinkedMultiValueMap<>();
            multipartBody.add("file", fileResource);

            @SuppressWarnings("unchecked")
            Map<String, Object> anprResponse = restTemplate.postForObject(
                    "http://127.0.0.1:8000/anpr/recognize",
                    new HttpEntity<>(multipartBody, headers),
                    Map.class
            );

            if (anprResponse == null || !Boolean.TRUE.equals(anprResponse.get("success"))) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", anprResponse != null ? anprResponse.get("message") : "ANPR failed"
                ));
            }

            String plateNumber = String.valueOf(anprResponse.get("plateNumber"));
            Map<String, Object> result = parkingService.processAnprScan(plateNumber, vehicleType);
            result.put("detectionConfidence", anprResponse.get("detectionConfidence"));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/admin/summary")
    public Map<String, Object> getAdminDashboard() {
        return parkingService.getAdminDashboardData();
    }

    @GetMapping("/history")
    public List<ParkingTicket> getHistory() {
        return parkingService.getAllParkingRecords();
    }
}

// ============================================================================
// PART 4: BUSINESS LOGIC
// ============================================================================
@Service
class ParkingService {

    private final ParkingRepository repository;

    private final TreeSet<String> availableFourWheelerSlots = new TreeSet<>();
    private final TreeSet<String> availableTwoWheelerSlots = new TreeSet<>();
    private final Map<String, ParkingTicket> activeByPlate = new HashMap<>();
    private final Map<String, ParkingTicket> activeBySlotId = new TreeMap<>();

    public ParkingService(ParkingRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public synchronized void initializeSystem() {
        repository.createTablesAndDefaultUsers();
        availableFourWheelerSlots.clear();
        availableTwoWheelerSlots.clear();
        activeByPlate.clear();
        activeBySlotId.clear();

        for (String zonePrefix : List.of("A", "B", "C")) {
            for (int i = 1; i <= 6; i++) {
                availableFourWheelerSlots.add(zonePrefix + i);
            }
        }
        for (int f = 1; f <= 3; f++) {
            for (int i = 1; i <= 24; i++) {
                availableTwoWheelerSlots.add(String.format("F%d-%02d", f, i));
            }
        }

        for (ParkingTicket ticket : repository.findActiveParkedVehicles()) {
            availableFourWheelerSlots.remove(ticket.getSlotId());
            availableTwoWheelerSlots.remove(ticket.getSlotId());
            activeByPlate.put(ticket.getVehicleNumber().toUpperCase(), ticket);
            activeBySlotId.put(ticket.getSlotId(), ticket);
        }
    }

    public Optional<AppUser> loginUser(String username, String password) {
        return repository.authenticateUser(username, password);
    }

    private void validateStrongPassword(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least 1 uppercase letter (A-Z).");
        }
    }

    public AppUser registerUser(String username, String email, String phone, String password,
                                String role, String vehicleType, String vehicleNumber) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password are required.");
        }
        validateStrongPassword(password);
        if (repository.existsByUsernameOrEmail(username, email)) {
            throw new IllegalStateException("Username or Email is already registered.");
        }
        return repository.registerNewUser(username, email, phone, password, role, vehicleType, vehicleNumber);
    }

    public void resetPassword(String username, String emailOrPhone, String newPassword) {
        if (username == null || username.isBlank() || emailOrPhone == null || emailOrPhone.isBlank()) {
            throw new IllegalArgumentException("Username and registered Email or Mobile are required.");
        }
        validateStrongPassword(newPassword);
        boolean ok = repository.resetUserPassword(username, emailOrPhone, newPassword);
        if (!ok) {
            throw new IllegalArgumentException("No matching account found for that username and email/mobile.");
        }
    }

    private boolean isTwoWheeler(String vehicleType) {
        if (vehicleType == null) return false;
        String t = vehicleType.toUpperCase();
        return t.contains("2") || t.contains("BIKE") || t.contains("TWO");
    }

    public synchronized ParkingTicket bookSpecificSlot(String vehicleNumber, String vehicleType,
                                                       String slotId, String zone, double estimatedFee) {
        String cleanPlate = vehicleNumber.replaceAll("[\\s-]", "").toUpperCase();
        if (cleanPlate.isBlank()) {
            throw new IllegalArgumentException("Vehicle number is required.");
        }
        if (activeByPlate.containsKey(cleanPlate)) {
            throw new IllegalStateException("Vehicle " + cleanPlate + " already has an active booking in Slot " + activeByPlate.get(cleanPlate).getSlotId());
        }
        if (activeBySlotId.containsKey(slotId)) {
            throw new IllegalStateException("Slot " + slotId + " is already occupied.");
        }

        String normalizedType = isTwoWheeler(vehicleType) ? "2 Wheeler" : "4 Wheeler";
        String chosenSlot = slotId;
        if (chosenSlot == null || chosenSlot.isBlank()) {
            TreeSet<String> pool = isTwoWheeler(normalizedType) ? availableTwoWheelerSlots : availableFourWheelerSlots;
            if (pool.isEmpty()) throw new IllegalStateException("No available slots!");
            chosenSlot = pool.pollFirst();
        } else {
            availableFourWheelerSlots.remove(chosenSlot);
            availableTwoWheelerSlots.remove(chosenSlot);
        }

        ParkingTicket newTicket = new ParkingTicket(0, cleanPlate, normalizedType, chosenSlot, zone, LocalDateTime.now(), null, estimatedFee, "PARKED");
        ParkingTicket saved = repository.saveEntry(newTicket);
        activeByPlate.put(cleanPlate, saved);
        activeBySlotId.put(chosenSlot, saved);
        return saved;
    }

    public synchronized ParkingTicket checkoutVehicle(String vehicleNumber, double overrideFee) {
        String cleanPlate = vehicleNumber.replaceAll("[\\s-]", "").toUpperCase();
        ParkingTicket ticket = activeByPlate.get(cleanPlate);
        if (ticket == null) {
            throw new IllegalStateException("No active parked vehicle found for " + cleanPlate);
        }

        LocalDateTime exitTime = LocalDateTime.now();
        double fee = overrideFee >= 0 ? overrideFee : calculateFee(ticket.getVehicleType(), ticket.getEntryTime(), exitTime);

        repository.updateExit(ticket.getTicketId(), exitTime, fee);
        ticket.setExitTime(exitTime);
        ticket.setCharges(fee);
        ticket.setStatus("EXITED");

        activeByPlate.remove(cleanPlate);
        activeBySlotId.remove(ticket.getSlotId());
        if (isTwoWheeler(ticket.getVehicleType())) {
            availableTwoWheelerSlots.add(ticket.getSlotId());
        } else {
            availableFourWheelerSlots.add(ticket.getSlotId());
        }
        return ticket;
    }

    public synchronized PaymentRecord recordPayment(int ticketId, String vehicleNumber, double amount, String method) {
        String cleanPlate = vehicleNumber.replaceAll("[\\s-]", "").toUpperCase();
        if (cleanPlate.isBlank()) {
            throw new IllegalArgumentException("Vehicle number is required for payment.");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than 0.");
        }
        String cleanMethod = (method == null || method.isBlank()) ? "UPI" : method.trim().toUpperCase();

        // If vehicle is still marked PARKED, automatically check it out on payment!
        int resolvedTicketId = ticketId;
        if (activeByPlate.containsKey(cleanPlate)) {
            ParkingTicket exited = checkoutVehicle(cleanPlate, amount);
            resolvedTicketId = exited.getTicketId();
        }

        String txnRef = "EP_TXN_" + System.currentTimeMillis();
        PaymentRecord payment = new PaymentRecord(0, txnRef, resolvedTicketId, cleanPlate, amount, cleanMethod, "PAID", LocalDateTime.now());
        return repository.savePayment(payment);
    }

    public List<PaymentRecord> getAllPayments() {
        return repository.findAllPayments();
    }

    public synchronized Map<String, Object> processAnprScan(String scannedPlate, String vehicleType) {
        String cleanPlate = scannedPlate.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (cleanPlate.isBlank()) {
            throw new IllegalArgumentException("Plate number cannot be empty.");
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("plateNumber", cleanPlate);

        if (activeByPlate.containsKey(cleanPlate)) {
            ParkingTicket exited = checkoutVehicle(cleanPlate, -1.0);
            res.put("action", "EXIT");
            res.put("message", "ANPR Exit: Slot " + exited.getSlotId() + " freed. Fee: Rs. " + exited.getCharges());
            res.put("ticket", exited);
        } else {
            String zone = isTwoWheeler(vehicleType) ? "Floor 1" : "Zone A";
            ParkingTicket entered = bookSpecificSlot(cleanPlate, vehicleType, "", zone, 0.0);
            res.put("action", "ENTRY");
            res.put("message", "ANPR Entry: Assigned Slot " + entered.getSlotId() + " to " + cleanPlate);
            res.put("ticket", entered);
        }
        return res;
    }

    private double calculateFee(String vehicleType, LocalDateTime entry, LocalDateTime exit) {
        long mins = Math.max(1, Duration.between(entry, exit).toMinutes());
        long hours = (long) Math.ceil(mins / 60.0);
        double ratePerHour = isTwoWheeler(vehicleType) ? 20.0 : 30.0;
        return hours * ratePerHour;
    }

    public synchronized Map<String, Object> getSlotsForApp(String vehicleType) {
        List<Map<String, Object>> fourWheelerList = new ArrayList<>();
        for (String z : List.of("Zone A", "Zone B", "Zone C")) {
            String prefix = z.substring(z.length() - 1);
            for (int i = 1; i <= 6; i++) {
                String id = prefix + i;
                fourWheelerList.add(Map.of(
                        "id", id,
                        "zone", z,
                        "available", !activeBySlotId.containsKey(id)
                ));
            }
        }

        List<Map<String, Object>> twoWheelerList = new ArrayList<>();
        for (int f = 1; f <= 3; f++) {
            for (int i = 1; i <= 24; i++) {
                String id = String.format("F%d-%02d", f, i);
                twoWheelerList.add(Map.of(
                        "id", id,
                        "floor", f,
                        "available", !activeBySlotId.containsKey(id)
                ));
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("fourWheelerSlots", fourWheelerList);
        res.put("twoWheelerSlots", twoWheelerList);
        res.put("occupiedCount", activeBySlotId.size());
        res.put("availableFourWheelerCount", availableFourWheelerSlots.size());
        res.put("availableTwoWheelerCount", availableTwoWheelerSlots.size());
        return res;
    }

    public synchronized Map<String, Object> getAdminDashboardData() {
        List<ParkingTicket> all = repository.findAllRecords();
        List<PaymentRecord> payments = repository.findAllPayments();
        double totalRevenue = all.stream()
                .filter(t -> "EXITED".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(ParkingTicket::getCharges)
                .sum();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalRevenue", totalRevenue);
        data.put("activeParkedCount", activeByPlate.size());
        data.put("availableFourWheelerCount", availableFourWheelerSlots.size());
        data.put("availableTwoWheelerCount", availableTwoWheelerSlots.size());
        data.put("totalTransactions", all.size());
        data.put("totalPaymentsCount", payments.size());
        data.put("records", all);
        data.put("payments", payments);
        return data;
    }

    public List<ParkingTicket> getAllParkingRecords() {
        return repository.findAllRecords();
    }
}

// ============================================================================
// PART 5: ENTITY MODEL CLASSES (`ParkingTicket`, `AppUser`, `PaymentRecord`)
// ============================================================================
class ParkingTicket {
    private int ticketId;
    private String vehicleNumber;
    private String vehicleType;
    private String slotId;
    private String zone;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private double charges;
    private String status;

    public ParkingTicket() {}

    public ParkingTicket(int ticketId, String vehicleNumber, String vehicleType, String slotId,
                         String zone, LocalDateTime entryTime, LocalDateTime exitTime,
                         double charges, String status) {
        this.ticketId = ticketId;
        this.vehicleNumber = vehicleNumber;
        this.vehicleType = vehicleType;
        this.slotId = slotId;
        this.zone = zone;
        this.entryTime = entryTime;
        this.exitTime = exitTime;
        this.charges = charges;
        this.status = status;
    }

    public int getTicketId() { return ticketId; }
    public void setTicketId(int ticketId) { this.ticketId = ticketId; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }
    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }
    public LocalDateTime getEntryTime() { return entryTime; }
    public void setEntryTime(LocalDateTime entryTime) { this.entryTime = entryTime; }
    public LocalDateTime getExitTime() { return exitTime; }
    public void setExitTime(LocalDateTime exitTime) { this.exitTime = exitTime; }
    public double getCharges() { return charges; }
    public void setCharges(double charges) { this.charges = charges; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

class AppUser {
    private int userId;
    private String username;
    private String email;
    private String phone;
    private String role;
    private String vehicleType;
    private String vehicleNumber;

    public AppUser() {}

    public AppUser(int userId, String username, String email, String phone,
                   String role, String vehicleType, String vehicleNumber) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
    }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
}

class PaymentRecord {
    private int paymentId;
    private String transactionRef;
    private int ticketId;
    private String vehicleNumber;
    private double amount;
    private String paymentMethod; // UPI, CARD, CASH
    private String paymentStatus; // PAID
    private LocalDateTime paidAt;

    public PaymentRecord() {}

    public PaymentRecord(int paymentId, String transactionRef, int ticketId, String vehicleNumber,
                         double amount, String paymentMethod, String paymentStatus, LocalDateTime paidAt) {
        this.paymentId = paymentId;
        this.transactionRef = transactionRef;
        this.ticketId = ticketId;
        this.vehicleNumber = vehicleNumber;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.paidAt = paidAt;
    }

    public int getPaymentId() { return paymentId; }
    public void setPaymentId(int paymentId) { this.paymentId = paymentId; }
    public String getTransactionRef() { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }
    public int getTicketId() { return ticketId; }
    public void setTicketId(int ticketId) { this.ticketId = ticketId; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}