====================================================================
GROUP 5: SPRING BOOT + SPRING JDBC BACKEND FOR REACT NATIVE APP
Roll Numbers: 114 (Leader), 87, 120, 16, 11
====================================================================

HOW YOUR BACKEND CONNECTS TO YOUR TEAMMATES' REACT NATIVE APP:
--------------------------------------------------------------------
1. Connect your laptop and your teammates' phones to the SAME Wi-Fi
   (or your phone's Mobile Hotspot).

2. Find your laptop's IPv4 address:
   - Open VS Code Terminal and run: ipconfig (Windows) or ifconfig (Mac)
   - Look for "IPv4 Address", e.g., 192.168.1.15
   - (If using Android Studio Emulator on the same laptop, use 10.0.2.2)

3. Start your Spring Boot Backend in VS Code Terminal:
   .\mvnw spring-boot:run   (or mvn spring-boot:run)

4. Give your React Native teammates the file:
   "ReactNative_ParkingAPI_Helper.js" (included in this folder!)
   They just put your IPv4 address in BASE_URL:
   const BASE_URL = "http://192.168.1.15:8080/api/parking";

YOUR 4 BACKEND & DATABASE FILES FOR VIVA:
--------------------------------------------------------------------
1) src/main/resources/application.properties  (Database & Network Config)
2) src/main/resources/schema.sql              (SQL Table Structure)
3) src/main/java/com/group5/parking/ParkingRepository.java  (Spring JDBC)
4) src/main/java/com/group5/parking/ParkingController.java  (REST APIs for React Native)
