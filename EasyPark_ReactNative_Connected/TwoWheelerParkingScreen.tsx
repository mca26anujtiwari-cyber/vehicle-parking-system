
import React, { useEffect, useMemo, useState } from 'react';
import { apiGetSlots, apiBookSlot } from '../app/api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export const calculateLateFine = (
  bookedExitTime: Date,
  actualExitTime: Date
) => {
  const lateMinutes =
    (actualExitTime.getTime() - bookedExitTime.getTime()) / 60000;

  if (lateMinutes <= 0) return 0;

  return Math.ceil(lateMinutes / 20) * 50;
};

type Props = {
  vehicleNumber?: string;
  onBack?: () => void;
};

type Slot = {
  id: string;
  available: boolean;
};

const GREEN = '#16A34A';
const RED = '#DC2626';
const YELLOW = '#F5C400';
const DARK = '#242424';

const createSlots = (floor: number): Slot[] =>
  Array.from({ length: 24 }, (_, index) => ({
    id: `F${floor}-${String(index + 1).padStart(2, '0')}`,
    // Demo data only. Replace with backend slot status later.
    available: ![2, 3, 6, 9, 12, 16, 19, 22].includes(index),
  }));

export default function TwoWheelerParkingScreen({
  vehicleNumber = '',
  onBack,
}: Props) {
  const [floor, setFloor] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState('F1-01');

  const [bookingDate, setBookingDate] = useState(new Date());

  const [entryTime, setEntryTime] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 30, 0, 0);
    return date;
  });

  const [exitTime, setExitTime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 2, 0, 0, 0);
    return date;
  });

  const [picker, setPicker] = useState<
    null | 'date' | 'entry' | 'exit'
  >(null);

  const [allBackendSlots, setAllBackendSlots] = useState<any[]>([]);

  useEffect(() => {
    apiGetSlots()
      .then((data) => {
        if (Array.isArray(data.twoWheelerSlots)) {
          setAllBackendSlots(data.twoWheelerSlots);
        }
      })
      .catch(() => {});
  }, []);

  const slots = useMemo(() => {
    const floorSlots = allBackendSlots.filter((s) => s.floor === floor);
    return floorSlots.length > 0 ? floorSlots : createSlots(floor);
  }, [floor, allBackendSlots]);

  const selectedSlotData = slots.find(
    slot => slot.id === selectedSlot
  );

  const durationHours = Math.max(
    0,
    (exitTime.getTime() - entryTime.getTime()) / 3600000
  );

  const estimatedAmount = Math.ceil(durationHours * 20);

  const availableCount = slots.filter(
    slot => slot.available
  ).length;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const changePickerValue = (value?: Date) => {
    if (!value || !picker) {
      setPicker(null);
      return;
    }

    if (picker === 'date') {
      setBookingDate(value);
    }

    if (picker === 'entry') {
      setEntryTime(value);
    }

    if (picker === 'exit') {
      setExitTime(value);
    }

    setPicker(null);
  };

  const selectFloor = (newFloor: number) => {
    setFloor(newFloor);
    setSelectedSlot('');
  };

  const confirmBooking = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert(
        'Vehicle number missing',
        'Please complete your vehicle details first.'
      );
      return;
    }

    if (!selectedSlot || !selectedSlotData?.available) {
      Alert.alert(
        'Select a slot',
        'Please select an available green parking slot.'
      );
      return;
    }

    if (exitTime <= entryTime) {
      Alert.alert(
        'Invalid time',
        'Exit time must be later than entry time.'
      );
      return;
    }

    const now = new Date();

    const selectedEntry = new Date(bookingDate);
    selectedEntry.setHours(
      entryTime.getHours(),
      entryTime.getMinutes(),
      0,
      0
    );

    if (selectedEntry < now) {
      Alert.alert(
        'Invalid entry time',
        'Please select a future entry time.'
      );
      return;
    }

    const selectedExit = new Date(bookingDate);
    selectedExit.setHours(
      exitTime.getHours(),
      exitTime.getMinutes(),
      0,
      0
    );

    if (selectedExit <= selectedEntry) {
      Alert.alert(
        'Invalid exit time',
        'Exit time must be later than entry time.'
      );
      return;
    }

    const hours =
      (selectedExit.getTime() - selectedEntry.getTime()) /
      3600000;

    const amount = Math.ceil(hours * 20);

    try {
      await apiBookSlot({
        vehicleNumber,
        vehicleType: '2 Wheeler',
        slotId: selectedSlot,
        zone: `Floor ${floor}`,
        estimatedFee: amount,
      });

      setAllBackendSlots((prev) =>
        prev.map((s) => (s.id === selectedSlot ? { ...s, available: false } : s))
      );

      Alert.alert(
        'Booking Confirmed & Saved!',
        `Slot: ${selectedSlot}\n` +
          `Vehicle: ${vehicleNumber}\n` +
          `Date: ${formatDate(bookingDate)}\n` +
          `Entry: ${formatTime(selectedEntry)}\n` +
          `Exit: ${formatTime(selectedExit)}\n` +
          `Duration: ${hours.toFixed(2)} hours\n` +
          `Estimated amount: ₹${amount}\n\n` +
          'Saved in Spring Boot SQL Database!',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message || 'Could not connect to backend.');
    }
  };

  return (
    <View style={styles.container}>
     <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>Two-Wheeler Parking</Text>
            <Text style={styles.headerSubtitle}>
              Find and reserve your parking slot
            </Text>
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <Text style={styles.smallLabel}>YOUR VEHICLE</Text>
          <Text style={styles.vehicleNumber}>
            {vehicleNumber || 'Vehicle number not provided'}
          </Text>
          <Text style={styles.rate}>₹20 / hour</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Parking Zone</Text>

          <View style={styles.floorRow}>
            {[1, 2, 3].map(item => (
              <TouchableOpacity
                key={item}
                onPress={() => selectFloor(item)}
                style={[
                  styles.floorButton,
                  floor === item && styles.activeFloor,
                ]}
              >
                <Text
                  style={[
                    styles.floorText,
                    floor === item && styles.activeFloorText,
                  ]}
                >
                  Floor {item}
                </Text>
                <Text
                  style={[
                    styles.floorSubText,
                    floor === item && styles.activeFloorText,
                  ]}
                >
                  {item === 2 ? 'Popular zone' : 'Parking zone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RED }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: YELLOW }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>

          <View style={styles.slotInfo}>
            <Text style={styles.slotInfoText}>
              {availableCount} slots available on Floor {floor}
            </Text>
            <Text style={styles.slotInfoText}>Entrance ↓</Text>
          </View>

          <View style={styles.slotGrid}>
            {slots.map(slot => {
              const isSelected = selectedSlot === slot.id;
              const backgroundColor = isSelected
                ? YELLOW
                : slot.available
                ? GREEN
                : RED;

              return (
                <TouchableOpacity
                  key={slot.id}
                  disabled={!slot.available}
                  onPress={() => setSelectedSlot(slot.id)}
                  style={[
                    styles.slot,
                    { backgroundColor },
                    isSelected && styles.selectedSlot,
                  ]}
                >
                  <Text style={styles.slotIcon}>🛵</Text>
                  <Text style={styles.slotName}>{slot.id}</Text>
                  <Text style={styles.slotStatus}>
                    {isSelected
                      ? 'SELECTED'
                      : slot.available
                      ? 'AVAILABLE'
                      : 'BOOKED'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <Text style={styles.inputLabel}>Parking Date</Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setPicker('date')}
          >
            <Text style={styles.selectValue}>📅  {formatDate(bookingDate)}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Entry Time</Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setPicker('entry')}
          >
            <Text style={styles.selectValue}>🕒  {formatTime(entryTime)}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Exit Time</Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setPicker('exit')}
          >
            <Text style={styles.selectValue}>🕒  {formatTime(exitTime)}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          {picker && (
            <DateTimePicker
              value={
                picker === 'date'
                  ? bookingDate
                  : picker === 'entry'
                  ? entryTime
                  : exitTime
              }
              mode={picker === 'date' ? 'date' : 'time'}
              minimumDate={picker === 'date' ? new Date() : undefined}
              onChange={(_, value) => changePickerValue(value)}
            />
          )}

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Parking rate</Text>
              <Text style={styles.priceValue}>₹20 / hour</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Duration</Text>
              <Text style={styles.priceValue}>
                {durationHours.toFixed(2)} hours
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalValue}>₹{estimatedAmount}</Text>
            </View>
          </View>

          <View style={styles.fineCard}>
            <Text style={styles.fineTitle}>Late Exit Fine</Text>
            <Text style={styles.fineText}>
              If you leave after your booked exit time, an additional fine
              of ₹50 will apply for every 20 minutes late.
            </Text>
            <Text style={styles.fineExample}>
              Example: 21 minutes late = ₹100 fine.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmBooking}
          >
            <Text style={styles.confirmText}>CONFIRM PARKING SLOT</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Please arrive at your selected parking zone on time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: YELLOW,
    paddingTop: 48,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    color: DARK,
    lineHeight: 35,
  },
  headerTitleArea: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#514600',
    marginTop: 3,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  smallLabel: {
    fontSize: 11,
    color: '#777777',
    fontWeight: '700',
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    marginTop: 5,
  },
  rate: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DARK,
    marginBottom: 14,
  },
  floorRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  floorButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeFloor: {
    backgroundColor: YELLOW,
    borderBottomColor: '#9A7900',
  },
  floorText: {
    color: DARK,
    fontWeight: '700',
  },
  floorSubText: {
    fontSize: 10,
    color: '#777777',
    marginTop: 4,
  },
  activeFloorText: {
    color: '#302700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#555555',
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slotInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#E6EAF0',
    borderRadius: 14,
    padding: 10,
  },
  slot: {
    width: '31%',
    minHeight: 91,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  selectedSlot: {
    borderWidth: 3,
    borderColor: '#8A6A00',
  },
  slotIcon: {
    fontSize: 24,
  },
  slotName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 3,
  },
  slotStatus: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
  },
  inputLabel: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '700',
    marginTop: 13,
    marginBottom: 7,
  },
  selectField: {
    minHeight: 51,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    color: DARK,
    fontSize: 14,
    fontWeight: '600',
  },
  changeText: {
    color: '#987500',
    fontSize: 12,
    fontWeight: '800',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 13,
    marginTop: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  priceLabel: {
    color: '#666666',
    fontSize: 13,
  },
  priceValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 10,
  },
  totalLabel: {
    color: DARK,
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: '900',
  },
  fineCard: {
    backgroundColor: '#FFF4D6',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  fineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#765600',
  },
  fineText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#604D20',
    marginTop: 5,
  },
  fineExample: {
    fontSize: 12,
    fontWeight: '800',
    color: '#604D20',
    marginTop: 5,
  },
  confirmButton: {
    backgroundColor: '#12B76A',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#777777',
    marginTop: 13,
    marginBottom: 12,
  },
});
