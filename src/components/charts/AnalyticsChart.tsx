import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface AnalyticsChartProps {
  title: string;
  data: any[];
  type: 'line' | 'area' | 'bar' | 'pie';
  dataKey: string;
  xAxisKey?: string;
  secondaryDataKey?: string;
  color?: string;
  height?: number;
  glassmorphism?: boolean;
  /** Optional small caption/eyebrow over the title */
  kicker?: string;
}

const CHART_PALETTE = {
  primary: '#2356d6',
  cyan: '#00e0ff',
  gold: '#ffc66d',
  danger: '#ff5a6a',
  emerald: '#34d399',
  violet: '#a78bfa',
};

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  data,
  type,
  dataKey,
  xAxisKey = 'name',
  secondaryDataKey,
  color = CHART_PALETTE.cyan,
  height = 300,
  kicker,
}) => {
  const axisStroke = 'rgba(154,163,192,0.5)';
  const gridStroke = 'rgba(255,255,255,0.06)';
  const tickStyle = {
    fill: 'rgb(154,163,192)',
    fontSize: 11,
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  };

  const tooltip = (
    <Tooltip
      cursor={{
        fill: 'rgba(0,224,255,0.04)',
        stroke: 'rgba(0,224,255,0.2)',
        strokeDasharray: '3 3',
      }}
      contentStyle={{
        background: 'rgba(10,14,28,0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        boxShadow: '0 12px 40px -12px rgba(0,0,0,0.7)',
        color: 'rgb(233,236,246)',
        fontSize: 12,
      }}
      labelStyle={{
        color: 'rgb(154,163,192)',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        marginBottom: 4,
      }}
      itemStyle={{ color: 'rgb(233,236,246)' }}
    />
  );

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 8, right: 24, left: 4, bottom: 4 },
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey={xAxisKey}
              stroke={axisStroke}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisStroke}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
            />
            {tooltip}
            <Legend
              wrapperStyle={{
                fontSize: 11,
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                color: 'rgb(154,163,192)',
                paddingTop: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={{ fill: color, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#05070f' }}
            />
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={CHART_PALETTE.primary}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey={xAxisKey}
              stroke={axisStroke}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisStroke}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
            />
            {tooltip}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill="url(#areaFill)"
              strokeWidth={2.5}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke={axisStroke}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisStroke}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
            />
            {tooltip}
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        );

      case 'pie': {
        const palette = [
          CHART_PALETTE.cyan,
          CHART_PALETTE.primary,
          CHART_PALETTE.gold,
          CHART_PALETTE.emerald,
          CHART_PALETTE.violet,
          CHART_PALETTE.danger,
        ];
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={92}
              innerRadius={48}
              paddingAngle={2}
              dataKey={dataKey}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              stroke="rgb(5,7,15)"
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            {tooltip}
          </PieChart>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-themed surface-card p-6 shadow-glass">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px
          bg-gradient-to-r from-transparent via-line/15 to-transparent"
      />
      <div className="mb-5">
        {kicker && <span className="kicker mb-2">{kicker}</span>}
        <h3 className="serif-display text-[20px] text-text">{title}</h3>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default AnalyticsChart;
