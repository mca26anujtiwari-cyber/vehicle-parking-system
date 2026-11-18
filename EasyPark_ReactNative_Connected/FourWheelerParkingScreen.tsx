
import React, { useEffect, useMemo, useState } from "react";
import { apiGetSlots, apiBookSlot, apiMakePayment } from "../app/api";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Slot = {
  id: string;
  zone: string;
  available: boolean;
};

type Booking = {
  slotId: string;
  zone: string;
  date: Date;
  entryTime: Date;
  exitTime: Date;
  duration: number;
  parkingCharge: number;
};

type Receipt = {
  slotId: string;
  zone: string;
  duration: number;
  parkingCharge: number;
  overdueMinutes: number;
  fine: number;
  total: number;
};

type Props = {
  vehicleNumber?: string;
  onBack?: () => void;
};

const GREEN = "#16A34A";
const RED = "#DC2626";
const YELLOW = "#F5C400";
const DARK = "#242424";
const WHITE = "#FFFFFF";

const RATE = 30;
const FINE_RATE = 70;
const FINE_INTERVAL = 20;

const initialSlots: Slot[] = [
  { id: "A1", zone: "Zone A", available: true },
  { id: "A2", zone: "Zone A", available: false },
  { id: "A3", zone: "Zone A", available: true },
  { id: "A4", zone: "Zone A", available: true },
  { id: "A5", zone: "Zone A", available: false },
  { id: "A6", zone: "Zone A", available: true },

  { id: "B1", zone: "Zone B", available: false },
  { id: "B2", zone: "Zone B", available: true },
  { id: "B3", zone: "Zone B", available: true },
  { id: "B4", zone: "Zone B", available: false },
  { id: "B5", zone: "Zone B", available: true },
  { id: "B6", zone: "Zone B", available: true },

  { id: "C1", zone: "Zone C", available: true },
  { id: "C2", zone: "Zone C", available: false },
  { id: "C3", zone: "Zone C", available: true },
  { id: "C4", zone: "Zone C", available: true },
  { id: "C5", zone: "Zone C", available: false },
  { id: "C6", zone: "Zone C", available: true },
];

const getInitialEntryTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30, 0, 0);
  return date;
};

const getInitialExitTime = () => {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  return date;
};

export default function FourWheelerParkingScreen({
  vehicleNumber = "",
  onBack,
}: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);

  useEffect(() => {
    apiGetSlots()
      .then((data) => {
        if (Array.isArray(data.fourWheelerSlots)) {
          setSlots(data.fourWheelerSlots);
        }
      })
      .catch(() => {});
  }, []);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState("Zone A");

  const [bookingDate, setBookingDate] = useState(new Date());
  const [entryTime, setEntryTime] = useState(getInitialEntryTime);
  const [exitTime, setExitTime] = useState(getInitialExitTime);

  const [picker, setPicker] = useState<
    null | "date" | "entry" | "exit"
  >(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "CASH">("UPI");

  const zoneSlots = useMemo(
    () => slots.filter(slot => slot.zone === activeZone),
    [slots, activeZone]
  );

  const selectedSlotData = slots.find(
    slot => slot.id === selectedSlot
  );

  const availableCount = zoneSlots.filter(
    slot => slot.available
  ).length;

  const occupiedCount = zoneSlots.length - availableCount;

  const totalAvailable = slots.filter(
    slot => slot.available
  ).length;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const createDateTime = (date: Date, time: Date) => {
    const result = new Date(date);
    result.setHours(
      time.getHours(),
      time.getMinutes(),
      0,
      0
    );
    return result;
  };

  const entryDate = createDateTime(bookingDate, entryTime);
  const exitDate = createDateTime(bookingDate, exitTime);

  const durationMinutes =
    (exitDate.getTime() - entryDate.getTime()) / 60000;

  const durationHours =
    durationMinutes > 0 ? Math.ceil(durationMinutes / 60) : 0;

  const estimatedAmount = durationHours * RATE;

  const changePickerValue = (value?: Date) => {
    if (!value || !picker) {
      setPicker(null);
      return;
    }

    if (picker === "date") {
      setBookingDate(value);
    }

    if (picker === "entry") {
      setEntryTime(value);
    }

    if (picker === "exit") {
      setExitTime(value);
    }

    setPicker(null);
  };

  const selectZone = (zone: string) => {
    setActiveZone(zone);
    setSelectedSlot(null);
  };

  // BOOK PARKING (Connected to Spring Boot + JDBC)
  const bookParking = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert(
        "Vehicle Number Missing",
        "Please complete your vehicle details first."
      );
      return;
    }

    if (!selectedSlot || !selectedSlotData) {
      Alert.alert(
        "Select a Slot",
        "Please select an available parking slot."
      );
      return;
    }

    if (!selectedSlotData.available) {
      Alert.alert(
        "Unavailable",
        "This parking slot is occupied."
      );
      return;
    }

    if (exitDate <= entryDate) {
      Alert.alert(
        "Invalid Time",
        "Exit time must be later than entry time."
      );
      return;
    }

    if (entryDate < new Date()) {
      Alert.alert(
        "Invalid Entry",
        "Please select a future entry time."
      );
      return;
    }

    const hours = Math.ceil(durationMinutes / 60);
    const charge = hours * RATE;

    const newBooking: Booking = {
      slotId: selectedSlot,
      zone: selectedSlotData.zone,
      date: bookingDate,
      entryTime: entryDate,
      exitTime: exitDate,
      duration: hours,
      parkingCharge: charge,
    };

    try {
      await apiBookSlot({
        vehicleNumber,
        vehicleType: "4 Wheeler",
        slotId: selectedSlot,
        zone: selectedSlotData.zone,
        estimatedFee: charge,
      });
    } catch (err: any) {
      Alert.alert("Booking Failed", err.message || "Could not save booking to database.");
      return;
    }

    setSlots(previous =>
      previous.map(slot =>
        slot.id === selectedSlot
          ? { ...slot, available: false }
          : slot
      )
    );

    setBooking(newBooking);
    setSelectedSlot(null);
    setReceipt(null);

    Alert.alert(
      "Booking Successful!",
      `Vehicle: ${vehicleNumber}\n` +
        `Zone: ${newBooking.zone}\n` +
        `Slot: ${newBooking.slotId}\n` +
        `Date: ${formatDate(newBooking.date)}\n` +
        `Entry: ${formatTime(newBooking.entryTime)}\n` +
        `Exit: ${formatTime(newBooking.exitTime)}\n` +
        `Duration: ${hours} hour(s)\n` +
        `Parking Fee: ₹${charge}`
    );
  };

  // CHECKOUT (Connected to Spring Boot + JDBC)
  const finishParking = async () => {
    if (!booking) return;

    const actualExit = new Date();

    const overdueMilliseconds = Math.max(
      0,
      actualExit.getTime() - booking.exitTime.getTime()
    );

    const overdueMinutes = Math.ceil(
      overdueMilliseconds / 60000
    );

    const fineBlocks =
      overdueMinutes > 0
        ? Math.ceil(overdueMinutes / FINE_INTERVAL)
        : 0;

    const fine = fineBlocks * FINE_RATE;
    const total = booking.parkingCharge + fine;

    try {
      await apiMakePayment({
        vehicleNumber,
        amount: total,
        paymentMethod,
      });
    } catch (err: any) {
      Alert.alert("Payment Error", err.message || "Could not process payment in database.");
      return;
    }

    setReceipt({
      slotId: booking.slotId,
      zone: booking.zone,
      duration: booking.duration,
      parkingCharge: booking.parkingCharge,
      overdueMinutes,
      fine,
      total,
    });

    setSlots(previous =>
      previous.map(slot =>
        slot.id === booking.slotId
          ? { ...slot, available: true }
          : slot
      )
    );

    setBooking(null);
  };

  // RESET
  const resetBooking = () => {
    setReceipt(null);
    setSelectedSlot(null);
    setActiveZone("Zone A");
    setBookingDate(new Date());
    setEntryTime(getInitialEntryTime());
    setExitTime(getInitialExitTime());
  };

  const renderReceiptRow = (label: string, value: string) => (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={styles.receiptValue}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>
              Four-Wheeler Parking
            </Text>
            <Text style={styles.headerSubtitle}>
              Find and reserve your parking slot
            </Text>
          </View>

          <Text style={styles.headerIcon}>🚗</Text>
        </View>

        {/* VEHICLE DETAILS */}
        <View style={styles.vehicleCard}>
          <Text style={styles.smallLabel}>
            YOUR VEHICLE
          </Text>

          <Text style={styles.vehicleNumber}>
            {vehicleNumber || "Vehicle number not provided"}
          </Text>

          <Text style={styles.vehicleType}>
            Four Wheeler
          </Text>

          <Text style={styles.rate}>₹30 / hour</Text>
        </View>

        {/* PARKING ZONES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Parking Zone
          </Text>

          <View style={styles.zoneRow}>
            {["Zone A", "Zone B", "Zone C"].map(zone => (
              <TouchableOpacity
                key={zone}
                onPress={() => selectZone(zone)}
                style={[
                  styles.zoneButton,
                  activeZone === zone && styles.activeZone,
                ]}
              >
                <Text
                  style={[
                    styles.zoneText,
                    activeZone === zone && styles.activeZoneText,
                  ]}
                >
                  {zone}
                </Text>

                <Text
                  style={[
                    styles.zoneSubText,
                    activeZone === zone && styles.activeZoneText,
                  ]}
                >
                  Parking zone
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* LEGEND */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: GREEN },
                ]}
              />
              <Text style={styles.legendText}>Available</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: RED },
                ]}
              />
              <Text style={styles.legendText}>Occupied</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: YELLOW },
                ]}
              />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>

          {/* SLOT INFORMATION */}
          <View style={styles.slotInfo}>
            <Text style={styles.slotInfoText}>
              {availableCount} slots available in {activeZone}
            </Text>

            <Text style={styles.slotInfoText}>
              Entrance ↓
            </Text>
          </View>

          {/* PARKING SLOTS */}
          <View style={styles.slotGrid}>
            {zoneSlots.map(slot => {
              const isSelected = selectedSlot === slot.id;

              const backgroundColor = isSelected
                ? YELLOW
                : slot.available
                ? GREEN
                : RED;

              return (
                <TouchableOpacity
                  key={slot.id}
                  disabled={!slot.available || !!booking}
                  onPress={() => setSelectedSlot(slot.id)}
                  style={[
                    styles.slot,
                    { backgroundColor },
                    isSelected && styles.selectedSlot,
                  ]}
                >
                  <Text style={styles.slotIcon}>🚗</Text>

                  <Text
                    style={[
                      styles.slotName,
                      isSelected && styles.selectedSlotText,
                    ]}
                  >
                    {slot.id}
                  </Text>

                  <Text
                    style={[
                      styles.slotStatus,
                      isSelected && styles.selectedSlotText,
                    ]}
                  >
                    {isSelected
                      ? "SELECTED"
                      : slot.available
                      ? "AVAILABLE"
                      : "OCCUPIED"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.zoneSummary}>
            Total available parking slots: {totalAvailable} / {slots.length}
          </Text>
        </View>

        {/* BOOKING DETAILS */}
        {!booking && !receipt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Booking Details
            </Text>

            <Text style={styles.inputLabel}>
              Parking Date
            </Text>

            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setPicker("date")}
            >
              <Text style={styles.selectValue}>
                📅  {formatDate(bookingDate)}
              </Text>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>
              Entry Time
            </Text>

            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setPicker("entry")}
            >
              <Text style={styles.selectValue}>
                🕒  {formatTime(entryTime)}
              </Text>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>
              Exit Time
            </Text>

            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setPicker("exit")}
            >
              <Text style={styles.selectValue}>
                🕒  {formatTime(exitTime)}
              </Text>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>

            {picker && (
              <DateTimePicker
                value={
                  picker === "date"
                    ? bookingDate
                    : picker === "entry"
                    ? entryTime
                    : exitTime
                }
                mode={picker === "date" ? "date" : "time"}
                minimumDate={
                  picker === "date" ? new Date() : undefined
                }
                onChange={(_, value) => changePickerValue(value)}
              />
            )}

            {/* PRICE CALCULATION */}
            <View style={styles.priceCard}>
              <Text style={styles.calculationTitle}>
                Parking Cost Estimate
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Parking rate
                </Text>
                <Text style={styles.priceValue}>
                  ₹30 / hour
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Duration
                </Text>
                <Text style={styles.priceValue}>
                  {durationMinutes > 0
                    ? `${Math.floor(durationMinutes / 60)} hr ${Math.round(
                        durationMinutes % 60
                      )} min`
                    : "--"}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Billable hours
                </Text>
                <Text style={styles.priceValue}>
                  {durationHours} hour(s)
                </Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  Estimated total
                </Text>
                <Text style={styles.totalValue}>
                  ₹{estimatedAmount}
                </Text>
              </View>
            </View>

            {/* LATE FINE */}
            <View style={styles.fineCard}>
              <Text style={styles.fineTitle}>
                Late Exit Fine
              </Text>

              <Text style={styles.fineText}>
                If you leave after your booked exit time,
                an additional fine of ₹70 will apply for
                every 20 minutes late.
              </Text>

              <Text style={styles.fineExample}>
                Example: 21 minutes late = ₹140 fine.
              </Text>
            </View>

            <Text style={styles.selectedInfo}>
              {selectedSlot
                ? `Selected Slot: ${selectedSlot} (${selectedSlotData?.zone})`
                : "Please select an available parking slot above."}
            </Text>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={bookParking}
            >
              <Text style={styles.confirmText}>
                CONFIRM PARKING SLOT
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Please arrive at your selected parking zone on time.
            </Text>
          </View>
        )}

        {/* CONFIRMED BOOKING */}
        {booking && (
          <View style={styles.section}>
            <View style={styles.bookingCard}>
              <View style={styles.successHeader}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>
                  Parking Confirmed!
                </Text>
              </View>

              <Text style={styles.bookingMessage}>
                Your parking slot has been reserved successfully.
              </Text>

              {renderReceiptRow("Vehicle Number", vehicleNumber)}
              {renderReceiptRow("Parking Zone", booking.zone)}
              {renderReceiptRow("Parking Slot", booking.slotId)}
              {renderReceiptRow("Date", formatDate(booking.date))}
              {renderReceiptRow("Entry Time", formatTime(booking.entryTime))}
              {renderReceiptRow("Exit Time", formatTime(booking.exitTime))}
              {renderReceiptRow("Duration", `${booking.duration} hour(s)`)}

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  Parking Fee
                </Text>
                <Text style={styles.totalValue}>
                  ₹{booking.parkingCharge}
                </Text>
              </View>

              <View style={styles.fineCard}>
                <Text style={styles.fineTitle}>
                  Late Exit Fine
                </Text>
                <Text style={styles.fineText}>
                  ₹70 for every 20 minutes after your scheduled exit time.
                </Text>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Select Payment Method</Text>
                <View style={styles.zoneRow}>
                  {(["UPI", "CARD", "CASH"] as const).map(method => (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setPaymentMethod(method)}
                      style={[
                        styles.zoneButton,
                        paymentMethod === method && styles.activeZone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.zoneText,
                          paymentMethod === method && styles.activeZoneText,
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={finishParking}
              >
                <Text style={styles.confirmText}>
                  PAY &amp; CHECKOUT ({paymentMethod})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FINAL RECEIPT */}
        {receipt && (
          <View style={styles.section}>
            <View style={styles.bookingCard}>
              <Text style={styles.sectionTitle}>
                Parking Receipt
              </Text>

              {renderReceiptRow("Parking Zone", receipt.zone)}
              {renderReceiptRow("Parking Slot", receipt.slotId)}
              {renderReceiptRow("Billable Hours", `${receipt.duration} hour(s)`)}
              {renderReceiptRow("Parking Fee", `₹${receipt.parkingCharge}`)}
              {renderReceiptRow("Overtime", `${receipt.overdueMinutes} minutes`)}
              {renderReceiptRow("Late Fine", `₹${receipt.fine}`)}

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  Final Amount
                </Text>
                <Text style={styles.totalValue}>
                  ₹{receipt.total}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={resetBooking}
              >
                <Text style={styles.confirmText}>
                  BOOK ANOTHER PARKING SLOT
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    backgroundColor: YELLOW,
    paddingTop: 48,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 32,
    color: DARK,
    lineHeight: 35,
  },

  headerTitleArea: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#514600",
    marginTop: 3,
  },

  headerIcon: {
    fontSize: 30,
    marginLeft: 8,
  },

  vehicleCard: {
    backgroundColor: WHITE,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },

  smallLabel: {
    fontSize: 11,
    color: "#777777",
    fontWeight: "700",
  },

  vehicleNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
    marginTop: 5,
  },

  vehicleType: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },

  rate: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
    marginBottom: 14,
  },

  zoneRow: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 12,
    overflow: "hidden",
  },

  zoneButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },

  activeZone: {
    backgroundColor: YELLOW,
    borderBottomColor: "#9A7900",
  },

  zoneText: {
    color: DARK,
    fontWeight: "700",
    fontSize: 13,
  },

  zoneSubText: {
    fontSize: 10,
    color: "#777777",
    marginTop: 4,
  },

  activeZoneText: {
    color: "#302700",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },

  legendText: {
    fontSize: 12,
    color: "#555555",
  },

  slotInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  slotInfoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555555",
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#E6EAF0",
    borderRadius: 14,
    padding: 10,
  },

  slot: {
    width: "31%",
    minHeight: 91,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  selectedSlot: {
    borderWidth: 3,
    borderColor: "#8A6A00",
  },

  slotIcon: {
    fontSize: 24,
  },

  slotName: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 3,
  },

  slotStatus: {
    color: WHITE,
    fontSize: 8,
    fontWeight: "800",
    marginTop: 3,
  },

  selectedSlotText: {
    color: DARK,
  },

  zoneSummary: {
    fontSize: 11,
    color: "#666666",
    marginTop: 10,
    textAlign: "right",
  },

  inputLabel: {
    fontSize: 13,
    color: "#555555",
    fontWeight: "700",
    marginTop: 13,
    marginBottom: 7,
  },

  selectField: {
    minHeight: 51,
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectValue: {
    color: DARK,
    fontSize: 14,
    fontWeight: "600",
  },

  changeText: {
    color: "#987500",
    fontSize: 12,
    fontWeight: "800",
  },

  priceCard: {
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 13,
    marginTop: 20,
  },

  calculationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
    marginBottom: 12,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },

  priceLabel: {
    color: "#666666",
    fontSize: 13,
  },

  priceValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: "700",
  },

  priceDivider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 10,
  },

  totalLabel: {
    color: DARK,
    fontSize: 15,
    fontWeight: "800",
  },

  totalValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },

  fineCard: {
    backgroundColor: "#FFF4D6",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },

  fineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#765600",
  },

  fineText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#604D20",
    marginTop: 5,
  },

  fineExample: {
    fontSize: 12,
    fontWeight: "800",
    color: "#604D20",
    marginTop: 5,
  },

  selectedInfo: {
    textAlign: "center",
    fontSize: 12,
    color: DARK,
    fontWeight: "700",
    marginTop: 16,
  },

  confirmButton: {
    backgroundColor: "#12B76A",
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },

  checkoutButton: {
    backgroundColor: GREEN,
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },

  confirmText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  footerText: {
    textAlign: "center",
    fontSize: 11,
    color: "#777777",
    marginTop: 13,
    marginBottom: 12,
  },

  bookingCard: {
    backgroundColor: WHITE,
    padding: 18,
    borderRadius: 16,
    elevation: 2,
  },

  successHeader: {
    alignItems: "center",
    marginBottom: 10,
  },

  successIcon: {
    backgroundColor: GREEN,
    color: WHITE,
    width: 45,
    height: 45,
    borderRadius: 25,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 27,
    overflow: "hidden",
    fontWeight: "900",
  },

  successTitle: {
    fontSize: 20,
    color: GREEN,
    fontWeight: "900",
    marginTop: 10,
  },

  bookingMessage: {
    color: "#777777",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 15,
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  receiptLabel: {
    color: "#777777",
    fontSize: 12,
  },

  receiptValue: {
    color: DARK,
    fontWeight: "800",
    fontSize: 12,
  },
});
