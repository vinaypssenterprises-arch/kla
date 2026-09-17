import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Building2, MapPin, Calendar, PieChart as PieIcon, ShieldAlert } from 'lucide-react';

const PERMISSION_COLORS = {
  'Permission Obtained': '#10B981', // Emerald
  'Awaiting Sanction (Pending)': '#F59E0B', // Amber
  'Permission Rejected': '#EF4444', // Red
  'Under Review': '#6366F1',
  Obtain: '#10B981',
  Pending: '#F59E0B',
  Reject: '#EF4444'
};

const PE_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#64748B'];

export default function AnalyticsCharts({
  districtBreakdown = [],
  monthlyTrends = [],
  permissionChartData = [],
  peChartData = [],
  topDepartments = [],
  onSelectDistrict
}) {
  const [activeTab, setActiveTab] = useState('all');

  // Format custom tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ink text-[#F5EFE1] p-3 rounded-lg border border-white/20 shadow-deep text-xs">
          <div className="font-serif font-bold text-sm text-[#C9A15E] mb-1">{label}</div>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-[#A0B0CB]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format custom tooltip for Area Chart
  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ink text-[#F5EFE1] p-3 rounded-lg border border-white/20 shadow-deep text-xs">
          <div className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#C9A15E]" />
            {label}
          </div>
          {payload.map((entry, index) => (
            <div key={`area-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-[#A0B0CB]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Row: District Analysis and Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* District Vigilance Bar Chart (7 cols) - Horizontal layout for neat non-clipped labels */}
        <div className="lg:col-span-7 bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-rule/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brass" />
                <h4 className="text-[15px] font-serif font-bold text-ink-text">
                  District Vigilance Activity & Enforcement Coverage
                </h4>
              </div>
              <span className="text-[11px] text-ink-text-soft bg-parchment-2 px-2.5 py-0.5 rounded border border-rule/40">
                Active Jurisdictions
              </span>
            </div>
            <p className="text-[12px] text-ink-text-soft mb-3">
              Comparison between registered corruption petitions and active Lokayukta investigative officers deployed.
            </p>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={districtBreakdown}
                  margin={{ top: 10, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3DEC7" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6248' }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130}
                    tick={{ fontSize: 11.5, fill: '#241E14', fontWeight: 600 }} 
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }} 
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="petitions" 
                    name="Petitions Registered" 
                    fill="#3B82F6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={16} 
                  />
                  <Bar 
                    dataKey="officers" 
                    name="Officers Deployed" 
                    fill="#C9A15E" 
                    radius={[0, 4, 4, 0]} 
                    barSize={16} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-rule/30 flex items-center justify-between text-[11px] text-ink-text-faint">
            <span>Jurisdictions with active cases or deployed officers</span>
            <span className="font-mono text-ink-text-soft">{districtBreakdown.length} active units</span>
          </div>
        </div>

        {/* Monthly Influx Area Chart (5 cols) */}
        <div className="lg:col-span-5 bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-rule/30">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brass" />
                <h4 className="text-[15px] font-serif font-bold text-ink-text">
                  6-Month Timeline Trends
                </h4>
              </div>
              <span className="text-[11px] font-mono text-ink-text-soft bg-parchment-2 px-2.5 py-0.5 rounded border border-rule/40">
                Monthly Influx
              </span>
            </div>
            <p className="text-[12px] text-ink-text-soft mb-4">
              Petitions filed vs statutory CA sanctions granted over the past 6 months.
            </p>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPetitions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorSanctions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3DEC7" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6248' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="petitions"
                    name="Petitions Received"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPetitions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sanctions"
                    name="Sanctions Granted"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSanctions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-rule/30 flex items-center justify-between text-[11px] text-ink-text-faint">
            <span>Tracked from official proposal dispatch logs</span>
            <span className="text-emerald-700 font-semibold font-mono">Enforcement Active</span>
          </div>
        </div>
      </div>

      {/* Second Row: 17-A Sanction Status Donut + PE Outcomes + Top Departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* 17-A Sanction Donut (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-rule/30">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-brass" />
                <h4 className="text-[14.5px] font-serif font-bold text-ink-text">
                  17-A CA Sanction Status
                </h4>
              </div>
              <span className="text-[10.5px] text-ink-text-soft bg-parchment-2 px-2 py-0.5 rounded border border-rule/40">
                Respondents
              </span>
            </div>
            <p className="text-[12px] text-ink-text-soft mb-2">
              Statutory decision breakdown across all accused public servants.
            </p>

            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={permissionChartData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {permissionChartData.map((entry, index) => {
                      const color = PERMISSION_COLORS[entry.name] || PE_COLORS[index % PE_COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} Respondents`, name]}
                    contentStyle={{ backgroundColor: '#101826', borderRadius: 8, color: '#fff', border: 'none', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center count overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-serif font-bold text-ink-text">
                  {permissionChartData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className="text-[9.5px] text-ink-text-faint uppercase tracking-wider">Total Resps</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-rule/30 text-xs">
              {permissionChartData.map((item, idx) => {
                const color = PERMISSION_COLORS[item.name] || PE_COLORS[idx % PE_COLORS.length];
                return (
                  <div key={item.name} className="flex items-center justify-between p-1.5 rounded bg-parchment-2/40 border border-rule/30">
                    <span className="flex items-center gap-1.5 text-ink-text-soft truncate text-[11px]" title={item.name}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-bold text-ink-text text-[11.5px] ml-1">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PE Outcomes Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-rule/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-maroon" />
                <h4 className="text-[14.5px] font-serif font-bold text-ink-text">
                  Preliminary Enquiry (PE) Outcomes
                </h4>
              </div>
              <span className="text-[10.5px] text-ink-text-soft bg-parchment-2 px-2 py-0.5 rounded border border-rule/40">
                Disposal
              </span>
            </div>
            <p className="text-[12px] text-ink-text-soft mb-2">
              Action taken upon conclusion of preliminary investigation.
            </p>

            <div className="space-y-2.5 mt-4">
              {peChartData.map((item, idx) => {
                const total = peChartData.reduce((acc, curr) => acc + curr.value, 0) || 1;
                const pct = Math.round((item.value / total) * 100);
                const color = PE_COLORS[idx % PE_COLORS.length];
                const isFir = item.name.toLowerCase().includes('fir');

                return (
                  <div key={item.name} className="p-2.5 rounded-lg bg-white border border-rule/40 hover:border-rule transition-all">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-ink-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {item.name}
                      </span>
                      <span className="font-mono font-bold text-ink-text">
                        {item.value} <span className="text-[10px] text-ink-text-faint">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-parchment-2 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(5, pct)}%`, backgroundColor: color }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-rule/30 flex items-center justify-between text-[11px] text-ink-text-faint">
            <span>Legal prosecution conversion:</span>
            <span className="font-semibold text-rose-700">Highest Priority</span>
          </div>
        </div>

        {/* Top Departments Under Scrutiny (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-rule/30">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brass" />
                <h4 className="text-[14.5px] font-serif font-bold text-ink-text">
                  Departments Under Scrutiny
                </h4>
              </div>
              <span className="text-[10.5px] text-ink-text-soft bg-parchment-2 px-2 py-0.5 rounded border border-rule/40">
                Ranking
              </span>
            </div>
            <p className="text-[12px] text-ink-text-soft mb-3">
              Government departments with the highest accused respondent volume.
            </p>

            <div className="space-y-2">
              {topDepartments.slice(0, 5).map((dept, index) => {
                const maxCount = topDepartments[0]?.count || 1;
                const pct = Math.round((dept.count / maxCount) * 100);

                return (
                  <div key={dept.name} className="p-2 rounded-lg bg-white border border-rule/40">
                    <div className="flex items-start justify-between gap-2 text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-parchment-2 text-ink-text font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-medium text-ink-text truncate text-[11.5px]" title={dept.name}>
                          {dept.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-ink-text text-[11px] flex-shrink-0 bg-parchment-2/80 px-1.5 py-0.2 rounded">
                        {dept.count} {dept.count === 1 ? 'case' : 'cases'}
                      </span>
                    </div>
                    <div className="w-full bg-parchment-2 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-maroon transition-all duration-500"
                        style={{ width: `${Math.max(10, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-rule/30 flex items-center justify-between text-[11px] text-ink-text-faint">
            <span>Source: Respondent registry records</span>
            <span className="text-ink-text-soft font-mono font-medium">Karnataka State</span>
          </div>
        </div>
      </div>
    </div>
  );
}
