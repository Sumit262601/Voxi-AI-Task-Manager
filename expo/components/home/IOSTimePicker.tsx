import { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

interface IOSTimePickerProps {
  initialHour?: number;
  initialMinute?: number;
  initialPeriod?: 'AM' | 'PM';
  onTimeChange: (hour: number, minute: number, period: 'AM' | 'PM') => void;
}

interface WheelColumnProps<T> {
  data: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem: (item: T) => string;
  width: number;
}

function WheelColumn<T>({ data, selectedIndex, onSelect, formatItem, width }: WheelColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedIndex]);

  useEffect(() => {
    if (mounted && !isScrollingRef.current) {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true });
    }
  }, [selectedIndex, mounted]);

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    isScrollingRef.current = false;
    if (clampedIndex !== selectedIndex) {
      onSelect(clampedIndex);
    }
  }, [data.length, selectedIndex, onSelect]);

  const handleScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  const paddingVertical = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <View style={[wheelStyles.columnContainer, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingTop: paddingVertical, paddingBottom: paddingVertical }}
        scrollEventThrottle={16}
        overScrollMode="never"
        bounces={Platform.OS === 'ios'}
      >
        {data.map((item, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8;

          return (
            <View
              key={`${formatItem(item)}-${index}`}
              style={[
                wheelStyles.itemContainer,
                { height: ITEM_HEIGHT, opacity, transform: [{ scale }] },
              ]}
            >
              <Text
                style={[
                  wheelStyles.itemText,
                  isSelected && wheelStyles.itemTextSelected,
                ]}
              >
                {formatItem(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function IOSTimePicker({
  initialHour = 1,
  initialMinute = 0,
  initialPeriod = 'AM',
  onTimeChange,
}: IOSTimePickerProps) {
  const hourIndex = HOURS.indexOf(initialHour) >= 0 ? HOURS.indexOf(initialHour) : 0;
  const minuteIndex = initialMinute >= 0 && initialMinute < 60 ? initialMinute : 0;
  const periodIndex = PERIODS.indexOf(initialPeriod) >= 0 ? PERIODS.indexOf(initialPeriod) : 0;

  const [selectedHourIdx, setSelectedHourIdx] = useState(hourIndex);
  const [selectedMinuteIdx, setSelectedMinuteIdx] = useState(minuteIndex);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(periodIndex);

  const handleHourSelect = useCallback((idx: number) => {
    setSelectedHourIdx(idx);
    onTimeChange(HOURS[idx], MINUTES[selectedMinuteIdx], PERIODS[selectedPeriodIdx]);
  }, [selectedMinuteIdx, selectedPeriodIdx, onTimeChange]);

  const handleMinuteSelect = useCallback((idx: number) => {
    setSelectedMinuteIdx(idx);
    onTimeChange(HOURS[selectedHourIdx], MINUTES[idx], PERIODS[selectedPeriodIdx]);
  }, [selectedHourIdx, selectedPeriodIdx, onTimeChange]);

  const handlePeriodSelect = useCallback((idx: number) => {
    setSelectedPeriodIdx(idx);
    onTimeChange(HOURS[selectedHourIdx], MINUTES[selectedMinuteIdx], PERIODS[idx]);
  }, [selectedHourIdx, selectedMinuteIdx, onTimeChange]);

  const formatHour = useCallback((h: number) => h.toString(), []);
  const formatMinute = useCallback((m: number) => m.toString().padStart(2, '0'), []);
  const formatPeriod = useCallback((p: 'AM' | 'PM') => p, []);

  return (
    <View style={wheelStyles.container}>
      <View style={wheelStyles.pickerRow}>
        <WheelColumn
          data={HOURS}
          selectedIndex={selectedHourIdx}
          onSelect={handleHourSelect}
          formatItem={formatHour}
          width={80}
        />
        <WheelColumn
          data={MINUTES}
          selectedIndex={selectedMinuteIdx}
          onSelect={handleMinuteSelect}
          formatItem={formatMinute}
          width={80}
        />
        <WheelColumn
          data={PERIODS}
          selectedIndex={selectedPeriodIdx}
          onSelect={handlePeriodSelect}
          formatItem={formatPeriod}
          width={70}
        />
      </View>
      <View style={wheelStyles.selectionOverlay} pointerEvents="none">
        <View style={wheelStyles.selectionBar} />
      </View>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    position: 'relative',
    height: PICKER_HEIGHT,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
  },
  columnContainer: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 22,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    textAlign: 'center',
  },
  itemTextSelected: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBar: {
    height: ITEM_HEIGHT,
    width: '88%',
    borderRadius: 10,
    backgroundColor: 'rgba(120, 120, 128, 0.36)',
  },
});
