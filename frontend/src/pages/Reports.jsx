import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarChart3, MapPin, Briefcase, Shield, Download } from 'lucide-react';
import { exportPetitionsToExcel } from '../lib/exportExcel';
import { useToast } from '../components/ui/ToastProvider';

const PALETTE = ['#7E2A34', '#A97B33', '#3C6E4F', '#1F2C48', '#A85A20', '#4B5878', '#6E6248', '#AA3A2E'];

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center flex-shrink-0 border border-white/10 shadow-md">
        <Icon className="w-5 h-5 text-[#C9A15E]" />
      </div>
      <div>
        <h3 className="text-[16px] font-serif font-semibold text-ink-text">{title}</h3>
        {subtitle && <p className="text-[12.5px] text-ink-text-soft mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const SkeletonChart = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-5 skeleton-line w-40 rounded" />
    <div className="h-[220px] skeleton-card rounded-xl" />
  </div>
);

const EmptyChart = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-14 text-ink-text-faint">
    <BarChart3 className="w-10 h-10 mb-3 opacity-40" strokeWidth={1.5} />
    <p className="text-[13px] italic">{label || 'No data available'}</p>
  </div>
);

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink border border-white/15 rounded-xl px-4 py-3 shadow-deep text-[12.5px]">
      <div className="font-semibold text-[#F5EFE1] mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[#C9A15E]">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink border border-white/15 rounded-xl px-4 py-3 shadow-deep text-[12.5px]">
      <div className="font-semibold text-[#F5EFE1] mb-1">{payload[0].name}</div>
      <div className="text-[#C9A15E]">Count: <strong>{payload[0].value}</strong></div>
      <div className="text-[#8590A8]">{(payload[0].percent * 100).toFixed(1)}%</div>
    </div>
  );
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    apiFetch('/dashboard/reports')
      .then(r => r.json())
      .then(setData)
      .catch(err => console.error('Failed to load reports', err))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      await exportPetitionsToExcel();
      showSuccess('Report exported to Excel successfully.');
    } catch (err) {
      showError('Export failed. Please try again.');
    }
  };

  const districtData = (data?.petitionsByDistrict || []).map(r => ({ name: r.district || 'Unknown', count: r.count })).slice(0, 15);
  const peStatusData = (data?.petitionsByPeStatus || []).map(r => ({ name: r.status || 'Not Set', count: r.count }));
  const officerDistData = (data?.officersByDistrict || []).map(r => ({ name: r.district, count: r.count })).slice(0, 12);

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">Reports &amp; Analytics</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">
            Aggregate breakdowns across petitions and officer deployment.
          </p>
        </div>
        <button type="button" className="btn btn-excel no-print" onClick={handleExport}>
          <Download className="w-[15px] h-[15px]" />
          Export Excel
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* District-wise Petitions Bar Chart */}
        <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft col-span-1 xl:col-span-2">
          <SectionHeader
            icon={MapPin}
            title="Petitions by District"
            subtitle="Number of Section 17-A petitions registered per district"
          />
          {loading ? <SkeletonChart /> : districtData.length === 0 ? <EmptyChart label="No district data found." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={districtData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,24,38,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6E6248' }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" name="Petitions" radius={[5, 5, 0, 0]} maxBarSize={40}>
                  {districtData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PE Status Pie Chart */}
        <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft">
          <SectionHeader
            icon={Shield}
            title="Preliminary Enquiry Status"
            subtitle="Distribution of PE outcomes"
          />
          {loading ? <SkeletonChart /> : peStatusData.length === 0 ? <EmptyChart label="No PE status data." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={peStatusData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {peStatusData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  formatter={(v) => <span className="text-[12px] text-ink-text-soft">{v}</span>}
                  iconSize={10}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Officers by District */}
        <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft">
          <SectionHeader
            icon={Briefcase}
            title="Officers Deployed by District"
            subtitle="Active vigilance officer headcount per district"
          />
          {loading ? <SkeletonChart /> : officerDistData.length === 0 ? <EmptyChart label="No officer data found." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={officerDistData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,24,38,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6E6248' }} width={55} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" name="Officers" fill="#A97B33" radius={[0, 5, 5, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
