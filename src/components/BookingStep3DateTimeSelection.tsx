import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface BookingStep3DateTimeSelectionProps {
  selectedDate: string;
  selectedTime: string;
  availableTimes: string[];
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
  totalDuration: number;
}

export function BookingStep3DateTimeSelection({
  selectedDate,
  selectedTime,
  availableTimes,
  onSelectDate,
  onSelectTime,
  onNext,
  onBack,
  isLoading = false,
  totalDuration,
}: BookingStep3DateTimeSelectionProps) {

  // Generate dates for next 30 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Date & Time</h2>
        <p className="text-gray-600">Duration: {totalDuration} minutes</p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Select Date</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {dates.map((date) => {
            const dateStr = formatDate(date);
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`p-3 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <div className="text-sm font-medium">{formatDateDisplay(date)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && availableTimes.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Select Time</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {availableTimes.map((time) => {
              const isSelected = selectedTime === time;

              return (
                <button
                  key={time}
                  onClick={() => onSelectTime(time)}
                  className={`p-2 rounded-lg text-center text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {formatTime(time)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDate && availableTimes.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">No available time slots for this date. Please select another date.</p>
        </Card>
      )}

      {selectedDate && selectedTime && (
        <Card className="bg-green-50 border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Appointment Scheduled For:</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatDateDisplay(new Date(selectedDate))} at {formatTime(selectedTime)}
              </p>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Ready</span>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedDate || !selectedTime || isLoading}>
          Next: Review Booking
        </Button>
      </div>
    </div>
  );
}
