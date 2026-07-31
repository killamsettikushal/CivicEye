import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
);

export function MonthlyReportsChart({ data }: { data: { month: string; infrastructure: number; traffic: number }[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.month),
        datasets: [
          { label: 'Infrastructure', data: data.map((d) => d.infrastructure), backgroundColor: '#3b82f6', borderRadius: 8 },
          { label: 'Traffic', data: data.map((d) => d.traffic), backgroundColor: '#10b981', borderRadius: 8 },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { position: 'top' as const } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } } },
      }}
    />
  );
}

export function DepartmentPerformanceChart({ data }: { data: { department: string; resolved: number; pending: number }[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.department),
        datasets: [
          { label: 'Resolved', data: data.map((d) => d.resolved), backgroundColor: '#10b981', borderRadius: 8 },
          { label: 'Pending', data: data.map((d) => d.pending), backgroundColor: '#f59e0b', borderRadius: 8 },
        ],
      }}
      options={{
        responsive: true,
        indexAxis: 'y' as const,
        plugins: { legend: { position: 'top' as const } },
        scales: { x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } } },
      }}
    />
  );
}

export function CategoryBreakdownChart({ data }: { data: { category: string; count: number }[] }) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
  return (
    <Doughnut
      data={{
        labels: data.map((d) => d.category),
        datasets: [{ data: data.map((d) => d.count), backgroundColor: colors, borderWidth: 0 }],
      }}
      options={{
        responsive: true,
        plugins: { legend: { position: 'right' as const, labels: { padding: 12, font: { size: 11 } } } },
      }}
    />
  );
}

export function ResponseTimeChart({ data }: { data: { department: string; avgDays: number }[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.department),
        datasets: [{ label: 'Avg Response (days)', data: data.map((d) => d.avgDays), backgroundColor: '#8b5cf6', borderRadius: 8 }],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } } },
      }}
    />
  );
}

export function CitizenParticipationChart({ data }: { data: { month: string; activeCitizens: number; newReports: number }[] }) {
  return (
    <Line
      data={{
        labels: data.map((d) => d.month),
        datasets: [
          { label: 'Active Citizens', data: data.map((d) => d.activeCitizens), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
          { label: 'New Reports', data: data.map((d) => d.newReports), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { position: 'top' as const } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } } },
      }}
    />
  );
}

export function TrustScoreChart({ data }: { data: { month: string; score: number; acceptanceRate: number }[] }) {
  return (
    <Line
      data={{
        labels: data.map((d) => d.month),
        datasets: [
          { label: 'Trust Score', data: data.map((d) => d.score), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
          { label: 'Acceptance Rate %', data: data.map((d) => d.acceptanceRate), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { position: 'top' as const } },
        scales: { y: { beginAtZero: false, min: 50, grid: { color: 'rgba(148,163,184,0.1)' } } },
      }}
    />
  );
}
