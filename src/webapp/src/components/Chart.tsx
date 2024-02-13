import { createChart, ColorType, UTCTimestamp } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { Candlestick, Trade } from './WebsocketDemo';

interface ChartProps {
  data: Candlestick[]; // Adjust the type according to the data structure you're passing
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export const ChartComponent: React.FC<ChartProps> = (props) => {
  const {
    data,
    colors: {
      backgroundColor = 'white',
      lineColor = '#2962FF',
      textColor = 'black',
      areaTopColor = '#2962FF',
      areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Guard clause to exit early if the ref isn't attached to an element yet
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 900, // Consider making this a prop too, for flexibility
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    chart.timeScale().fitContent();
    chart.timeScale().applyOptions({ timeVisible: true, secondsVisible: true });
    chart.applyOptions({
      grid: {
        vertLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
        horzLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
      },
      layout: {
        background: {
          type: ColorType.Solid,
          color: "rgb(11, 11, 11)",
        }, // Dark background color
        textColor: '#D9D9D9', // Light text color
      },
    });
    const newSeries = chart.addCandlestickSeries({
      upColor: 'rgb(0, 221, 31)',
      borderUpColor: '#FFFFFFAA',
      wickUpColor: 'rgb(0, 221, 31)',
      downColor: 'red',
      borderDownColor: '#FFFFFFAA',
      wickDownColor: 'rgb(255, 50, 50)',
      borderVisible: false,
      wickVisible: true,
    });

    for (const d of data) {
      newSeries.update({ ...d, time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp });
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Cleanup the chart to prevent memory leaks
      chart.remove();
    };
  }, [data, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

  return <div ref={chartContainerRef} style={{ display: 'flex', alignContent: 'center', justifyContent: 'center', margin: 'auto', position: 'relative', width: '100%', height: '100%' }} />;
};
