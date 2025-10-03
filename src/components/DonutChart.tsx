import React from 'react';
import { View } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';

export interface DonutSlice {
  value: number;
  color: string;
}

interface DonutChartProps {
  size?: number;
  stroke?: number;
  backgroundColor?: string;
  slices: DonutSlice[];
}

const DonutChart: React.FC<DonutChartProps> = ({
  size = 220,
  stroke = 26,
  backgroundColor = 'rgba(255,255,255,0.08)',
  slices,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(0.0001, slices.reduce((s, d) => s + Math.max(0, d.value), 0));

  let offsetAcc = 0;
  const ordered = slices.slice().sort((a, b) => b.value - a.value);

  return (
    <View>
      <Svg width={size} height={size}>
        <G rotation="-90" originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={stroke}
            fill="transparent"
          />
          {ordered.map((slice, index) => {
            const dash = (slice.value / total) * circumference;
            const gap = circumference - dash;
            const c = (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offsetAcc}
                strokeLinecap="round"
                fill="transparent"
              />
            );
            offsetAcc -= dash;
            return c;
          })}
        </G>
      </Svg>
    </View>
  );
};

export default DonutChart;


