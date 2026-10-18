import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function parseDate(value: string): { year: number; month: number; day: number } {
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        return { year: y, month: m, day: d };
      }
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function formatDisplay(value: string): string {
  const { year, month, day } = parseDate(value);
  return `${MONTHS_SHORT[month]} ${day}, ${year}`;
}

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD or empty string
  onChange: (date: string) => void;
  placeholder?: string;
  minimumYear?: number;
  maximumYear?: number;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function DatePickerInput({
  value,
  onChange,
  placeholder = 'Select date',
  minimumYear = 2000,
  maximumYear = CURRENT_YEAR + 10,
}: DatePickerInputProps) {
  const { width: screenWidth } = useWindowDimensions();
  const initial = parseDate(value);
  const [visible, setVisible] = useState(false);
  const [tempYear, setTempYear] = useState(initial.year);
  const [tempMonth, setTempMonth] = useState(initial.month);
  const [tempDay, setTempDay] = useState(initial.day);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const daysInMonth = getDaysInMonth(tempMonth, tempYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maximumYear; y >= minimumYear; y--) arr.push(y);
    return arr;
  }, [minimumYear, maximumYear]);

  // Responsive 7-column day grid
  const gridMetrics = useMemo(() => {
    const containerMaxWidth = Math.min(screenWidth, 420);
    const horizontalPadding = 16 * 2; // matches dayGrid paddingHorizontal
    const gap = 6; // space between cells
    const available = containerMaxWidth - horizontalPadding - gap * 6;
    const cell = Math.floor(available / 7);
    return { cellSize: Math.max(34, cell), gap };
  }, [screenWidth]);

  const handleOpen = () => {
    const parsed = parseDate(value);
    setTempYear(parsed.year);
    setTempMonth(parsed.month);
    setTempDay(parsed.day);
    setVisible(true);
  };

  const handleConfirm = () => {
    const clampedDay = Math.min(tempDay, getDaysInMonth(tempMonth, tempYear));
    const m = String(tempMonth + 1).padStart(2, '0');
    const d = String(clampedDay).padStart(2, '0');
    onChange(`${tempYear}-${m}-${d}`);
    setVisible(false);
  };

  const handleCancel = () => {
    setVisible(false);
  };

  const prevMonth = () => {
    if (tempMonth === 0) {
      if (tempYear > minimumYear) {
        setTempMonth(11);
        setTempYear((y) => y - 1);
      }
    } else {
      setTempMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (tempMonth === 11) {
      if (tempYear < maximumYear) {
        setTempMonth(0);
        setTempYear((y) => y + 1);
      }
    } else {
      setTempMonth((m) => m + 1);
    }
  };

  const prevYear = () => {
    if (tempYear > minimumYear) setTempYear((y) => y - 1);
  };

  const nextYear = () => {
    if (tempYear < maximumYear) setTempYear((y) => y + 1);
  };

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={handleOpen} activeOpacity={0.7}>
        <Calendar size={18} color="#6b7280" />
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={handleCancel} />
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
                <Text style={styles.confirmText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Month navigator */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <ChevronLeft size={22} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMonthPickerVisible(true)}
                style={styles.labelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.monthLabel}>{MONTHS[tempMonth]}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <ChevronRight size={22} color="#2563eb" />
              </TouchableOpacity>
            </View>

            {/* Year navigator */}
            <View style={styles.yearNavRow}>
              <TouchableOpacity
                onPress={prevYear}
                style={styles.navBtn}
                disabled={tempYear <= minimumYear}
              >
                <ChevronLeft size={20} color={tempYear <= minimumYear ? '#d1d5db' : '#2563eb'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearPickerVisible(true)}
                style={styles.labelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.yearLabel}>{tempYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={nextYear}
                style={styles.navBtn}
                disabled={tempYear >= maximumYear}
              >
                <ChevronRight size={20} color={tempYear >= maximumYear ? '#d1d5db' : '#2563eb'} />
              </TouchableOpacity>
            </View>

            {/* Day grid */}
            <View style={styles.dayGrid}>
              {days.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayCell,
                    {
                      width: gridMetrics.cellSize,
                      height: gridMetrics.cellSize,
                      marginRight: (d % 7) === 0 ? 0 : gridMetrics.gap,
                      marginBottom: gridMetrics.gap,
                    },
                    tempDay === d && styles.dayCellSelected,
                  ]}
                  onPress={() => setTempDay(d)}
                >
                  <Text style={[styles.dayText, tempDay === d && styles.dayTextSelected]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selected summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {MONTHS_SHORT[tempMonth]} {Math.min(tempDay, daysInMonth)}, {tempYear}
              </Text>
            </View>

            {/* Month picker */}
            <Modal
              visible={monthPickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setMonthPickerVisible(false)}
            >
              <View style={styles.pickerOverlay}>
                <TouchableOpacity
                  style={styles.pickerOverlayBg}
                  onPress={() => setMonthPickerVisible(false)}
                />
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Select month</Text>
                  <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                    {MONTHS.map((m, idx) => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => {
                          setTempMonth(idx);
                          setMonthPickerVisible(false);
                        }}
                        style={[styles.pickerItem, idx === tempMonth && styles.pickerItemSelected]}
                      >
                        <Text style={[styles.pickerItemText, idx === tempMonth && styles.pickerItemTextSelected]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Year picker */}
            <Modal
              visible={yearPickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setYearPickerVisible(false)}
            >
              <View style={styles.pickerOverlay}>
                <TouchableOpacity
                  style={styles.pickerOverlayBg}
                  onPress={() => setYearPickerVisible(false)}
                />
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Select year</Text>
                  <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                    {years.map((y) => (
                      <TouchableOpacity
                        key={y}
                        onPress={() => {
                          setTempYear(y);
                          setYearPickerVisible(false);
                        }}
                        style={[styles.pickerItem, y === tempYear && styles.pickerItemSelected]}
                      >
                        <Text style={[styles.pickerItemText, y === tempYear && styles.pickerItemTextSelected]}>
                          {y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholder: {
    color: '#9ca3af',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerBtn: {
    minWidth: 60,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cancelText: {
    fontSize: 15,
    color: '#6b7280',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'right',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  yearNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  labelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 120,
    textAlign: 'center',
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    minWidth: 60,
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  dayCell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#2563eb',
  },
  dayText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  summary: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },

  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  pickerOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerListContent: {
    paddingBottom: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerItemSelected: {
    backgroundColor: '#eff6ff',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  pickerItemTextSelected: {
    color: '#2563eb',
  },
});
