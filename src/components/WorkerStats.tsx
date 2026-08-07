import { Card } from './ui/Card';
import type { Appointment, Attendance, SimpleRating } from '../types';

interface WorkerStatsProps {
  appointments: (Appointment & { firebaseId: string })[];
  todayAttendance?: Attendance & { firebaseId: string };
  ratings?: SimpleRating[];
}

export function WorkerStats({ appointments, todayAttendance, ratings }: WorkerStatsProps) {
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = today.getTime() + 24 * 60 * 60 * 1000;

  const todayAppointments = appointments.filter(
    (apt) => apt.dateTime >= today.getTime() && apt.dateTime < todayEnd
  );

  const pendingAppointments = appointments.filter((apt) => apt.status === 'pending');

  const dailyEarnings = todayAppointments
    .filter((apt) => apt.status === 'completed')
    .reduce((sum, apt) => sum + apt.totalPrice, 0);

  // Calculate today's status
  let todayStatus = 'Absent';
  if (todayAttendance?.arrivalTime) {
    if (todayAttendance?.departureTime) {
      todayStatus = 'Done';
    } else {
      todayStatus = 'Working';
    }
  }

  // Calculate worked time in hours and minutes
  let workedHours = 0;
  let workedMinutes = 0;
  if (todayAttendance?.arrivalTime) {
    const departureTime = todayAttendance.departureTime || now;
    const totalMinutes = (departureTime - todayAttendance.arrivalTime) / (1000 * 60);
    workedHours = Math.floor(totalMinutes / 60);
    workedMinutes = Math.floor(totalMinutes % 60);
  }

  // Calculate average rating
  const averageRating = ratings && ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : 0;
  const hasRating = averageRating > 0;

  const statusColor =
    todayStatus === 'Working' ? 'text-blue-600' :
    todayStatus === 'Done' ? 'text-green-600' :
    'text-red-600';

  const statCards = [
    {
      label: "Today's Status",
      value: todayStatus,
      icon: todayStatus === 'Working' ? '⏳' : todayStatus === 'Done' ? '✅' : '❌',
      color: statusColor,
    },
    {
      label: "Working Time",
      value: workedHours > 0 || workedMinutes > 0 ? `${workedHours}h ${workedMinutes}m` : '-',
      icon: '⏱️',
      color: 'text-orange-600',
    },
    {
      label: "Apts Today",
      value: todayAppointments.length,
      icon: '📅',
      color: 'text-purple-600',
    },
    {
      label: 'Pending Approval',
      value: pendingAppointments.length,
      icon: '⏳',
      color: 'text-pink-600',
    },
    {
      label: 'My Rating',
      value: hasRating ? `${averageRating.toFixed(1)} ⭐` : 'No rating',
      icon: '⭐',
      color: 'text-yellow-600',
    },
    {
      label: "Today's Earnings",
      value: `${dailyEarnings.toFixed(2)} LE`,
      icon: '💰',
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-4 border-0 bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">{stat.label}</p>
              <p className={`text-xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            </div>
            <div className="text-3xl opacity-20">{stat.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
