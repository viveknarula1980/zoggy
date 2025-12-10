// "use client";

// import React, { useEffect, useRef, useMemo } from "react";
// import * as d3 from "d3";

// interface CrashChartProps {
//     isPlaying: boolean;
//     roundId: number;
//     autoCashout: number | null;
//     cashOutSignal: number;
//     onTick: (multiplier: number, elapsedMs: number) => void;
//     onCrash: (finalMultiplier: number) => void;
//     onCashOut: (cashoutMultiplier: number) => void;
//     onMultiplierUpdate: (multiplier: number) => void;
// }

// const CrashChart = ({ isPlaying, roundId, autoCashout, cashOutSignal, onTick, onCrash, onCashOut, onMultiplierUpdate }: CrashChartProps) => {
//     const containerRef = useRef<HTMLDivElement | null>(null);
//     const svgRef = useRef<SVGSVGElement | null>(null);
//     const pathRef = useRef<SVGPathElement | null>(null);
//     const rocketRef = useRef<SVGTextElement | null>(null);
//     const currentMultiplierRef = useRef<number>(1);
//     const crashedRef = useRef<boolean>(false);
//     const cashedOutRef = useRef<boolean>(false);
//     const timerRef = useRef<d3.Timer | null>(null);
//     const scalesRef = useRef<{
//         xScale: d3.ScaleLinear<number, number>;
//         yScale: d3.ScaleLinear<number, number>;
//         innerWidth: number;
//         innerHeight: number;
//         margin: { top: number; right: number; bottom: number; left: number };
//     } | null>(null);
//     console.log("Playing : ", isPlaying);
//     // Deterministic-ish crash target for demo (heavy-tailed like common crash distribution)
//     const crashTarget = useMemo(() => {
//         // Pareto-like: M = 1 / U, U in (0,1], clamp to [1.05, 100]
//         const u = Math.min(0.9999, Math.max(0.0001, Math.random()));
//         const m = 1 / u;
//         return Math.max(1.05, Math.min(100, m));
//     }, [roundId]);

//     // Build static SVG scene on mount and on resize
//     useEffect(() => {
//         const container = containerRef.current;
//         if (!container) return;

//         const resize = () => {
//             const width = container.clientWidth;
//             const height = container.clientHeight;

//             // Create or select svg
//             let svg = d3.select(svgRef.current);
//             if (svg.empty()) {
//                 svg = d3
//                     .select(container)
//                     .append("svg")
//                     .attr("ref", (node: any) => (svgRef.current = node)) as any;
//             }
//             svg.attr("width", width).attr("height", height);

//             // Clear and rebuild base groups
//             svg.selectAll("g.root").remove();
//             const root = svg.append("g").attr("class", "root");

//             const margin = { top: 24, right: 24, bottom: 36, left: 44 };
//             const innerWidth = width - margin.left - margin.right;
//             const innerHeight = height - margin.top - margin.bottom;

//             const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

//             // Background grid
//             const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
//             const yScale = d3.scaleLinear().domain([1, 5]).range([innerHeight, 0]).nice();

//             const xAxis = d3.axisBottom(xScale).ticks(5).tickSizeOuter(0);
//             const yAxis = d3
//                 .axisLeft(yScale)
//                 .ticks(6)
//                 .tickFormat((d: any) => `${Number(d).toFixed(0)}x`)
//                 .tickSizeOuter(0);

//             g.append("g")
//                 .attr("class", "x-axis")
//                 .attr("transform", `translate(0,${innerHeight})`)
//                 .call(xAxis as any)
//                 .selectAll("text")
//                 .attr("fill", "#8b8b9b");

//             g.append("g")
//                 .attr("class", "y-axis")
//                 .call(yAxis as any)
//                 .selectAll("text")
//                 .attr("fill", "#8b8b9b");

//             // Grid lines
//             g.selectAll(".x-axis .tick line").attr("stroke", "#333").attr("stroke-opacity", 0.3).attr("y2", -innerHeight);

//             g.selectAll(".y-axis .tick line").attr("stroke", "#333").attr("stroke-opacity", 0.3).attr("x2", innerWidth);

//             // Path for the curve
//             const path = g.append("path").attr("class", "curve-path").attr("fill", "none").attr("stroke", "#ff6b9d").attr("stroke-width", 3);
//             pathRef.current = path.node();

//             // Rocket emoji
//             const rocket = g.append("text").attr("class", "rocket").attr("font-size", "24px").text("🚀").attr("opacity", 0);
//             rocketRef.current = rocket.node();

//             // Store scales for animation
//             scalesRef.current = { xScale, yScale, innerWidth, innerHeight, margin };
//         };

//         resize();
//         window.addEventListener("resize", resize);
//         return () => window.removeEventListener("resize", resize);
//     }, []);

//     // Game animation loop
//     useEffect(() => {
//         if (!isPlaying) {
//             timerRef.current?.stop();
//             return;
//         }

//         // Reset state for new round
//         currentMultiplierRef.current = 1;
//         crashedRef.current = false;
//         cashedOutRef.current = false;

//         // Clear previous path and reset rocket
//         if (pathRef.current) {
//             d3.select(pathRef.current).attr("d", "");
//         }
//         if (rocketRef.current) {
//             d3.select(rocketRef.current).attr("opacity", 1).text("🚀");
//         }

//         const startTime = Date.now();
//         const points: [number, number][] = [];

//         timerRef.current = d3.timer((elapsed) => {
//             if (!scalesRef.current) return;

//             const { xScale, yScale } = scalesRef.current;

//             // Use seconds, not 1/100th seconds
//             const elapsedSeconds = elapsed / 1000;

//             // Smooth exponential growth: ~4.2x at 8s, adjust 0.18 to taste
//             const growthRate = 0.18;
//             const m = Math.max(1, Math.exp(growthRate * elapsedSeconds));

//             currentMultiplierRef.current = m;
//             onMultiplierUpdate(m);
//             onTick(m, elapsed);
//             points.push([elapsedSeconds, m]);

//             // Update curve path
//             const line = d3
//                 .line<[number, number]>()
//                 .x((d) => xScale(d[0]))
//                 .y((d) => yScale(d[1]))
//                 .curve(d3.curveMonotoneX);

//             if (pathRef.current) {
//                 d3.select(pathRef.current).attr("d", line(points) || "");
//             }

//             // Update rocket position
//             if (rocketRef.current && points.length > 0) {
//                 const lastPoint = points[points.length - 1];
//                 const rocketNode = rocketRef.current;
//                 d3.select(rocketNode)
//                     .attr("x", xScale(lastPoint[0]) - 12)
//                     .attr("y", yScale(lastPoint[1]) + 8);
//             }

//             // Auto cashout
//             if (autoCashout && m >= autoCashout && !cashedOutRef.current && !crashedRef.current) {
//                 cashedOutRef.current = true;
//                 timerRef.current?.stop();
//                 d3.select(rocketRef.current).attr("opacity", 0.7).text("✅");
//                 onCashOut(m);
//                 return;
//             }

//             // Crash
//             if (m >= crashTarget && !crashedRef.current && !cashedOutRef.current) {
//                 crashedRef.current = true;
//                 timerRef.current?.stop();
//                 d3.select(rocketRef.current).text("💥");
//                 onCrash(m);
//                 return;
//             }
//         });

//         return () => {
//             timerRef.current?.stop();
//             timerRef.current = null;
//         };
//     }, [isPlaying, roundId, autoCashout, onTick, onCrash, onCashOut, crashTarget, onMultiplierUpdate]);

//     // Manual cashout signal listener
//     useEffect(() => {
//         if (!isPlaying) return;
//         if (cashedOutRef.current || crashedRef.current) return;
//         // Consume signal
//         if (cashOutSignal > 0) {
//             cashedOutRef.current = true;
//             timerRef.current?.stop();
//             d3.select(rocketRef.current).attr("opacity", 0.7).text("✅");
//             onCashOut(currentMultiplierRef.current);
//         }
//     }, [cashOutSignal, isPlaying, onCashOut]);

//     return <div ref={containerRef} className="w-full h-full" />;
// };

// export default CrashChart;



"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface CrashChartProps {
  isPlaying: boolean;
  startTs: number | null;  // ms since epoch when the server started the round
  multiplier: number;      // live from server: crash:tick.multiplier
  crashed: boolean;        // true when crash:crashed received
  onMultiplierUpdate: (m: number) => void;
}

const CrashChart: React.FC<CrashChartProps> = ({
  isPlaying,
  startTs,
  multiplier,
  crashed,
  onMultiplierUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const rocketRef = useRef<SVGTextElement | null>(null);

  // persistent series
  const pointsRef = useRef<[number, number][]>([]);
  const lastPlottedRef = useRef<number>(0);

  const scalesRef = useRef<{
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    innerWidth: number;
    innerHeight: number;
    margin: { top: number; right: number; bottom: number; left: number };
  } | null>(null);

  // build baseline scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const build = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      let svg = d3.select(svgRef.current);
      if (svg.empty()) {
        svg = d3
          .select(container)
          .append("svg")
          .attr("ref", (node: any) => (svgRef.current = node)) as any;
      }
      svg.attr("width", width).attr("height", height);

      svg.selectAll("g.root").remove();
      const root = svg.append("g").attr("class", "root");

      const margin = { top: 24, right: 24, bottom: 36, left: 44 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = root
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, 8]).range([0, innerWidth]);
      const yScale = d3.scaleLinear().domain([1, 4]).range([innerHeight, 0]).nice();

      const xAxis = d3.axisBottom(xScale).ticks(5).tickSizeOuter(0);
      const yAxis = d3
        .axisLeft(yScale)
        .ticks(6)
        .tickFormat((d: any) => `${Number(d).toFixed(0)}x`)
        .tickSizeOuter(0);

      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis as any)
        .selectAll("text")
        .attr("fill", "#8b8b9b");

      g.append("g")
        .attr("class", "y-axis")
        .call(yAxis as any)
        .selectAll("text")
        .attr("fill", "#8b8b9b");

      g.selectAll(".x-axis .tick line")
        .attr("stroke", "#333")
        .attr("stroke-opacity", 0.3)
        .attr("y2", -innerHeight);

      g.selectAll(".y-axis .tick line")
        .attr("stroke", "#333")
        .attr("stroke-opacity", 0.3)
        .attr("x2", innerWidth);

      const path = g
        .append("path")
        .attr("class", "curve-path")
        .attr("fill", "none")
        .attr("stroke", "#ff6b9d")
        .attr("stroke-width", 3);
      pathRef.current = path.node();

      const rocket = g
        .append("text")
        .attr("class", "rocket")
        .attr("font-size", "24px")
        .text("🚀")
        .attr("opacity", 0);
      rocketRef.current = rocket.node();

      scalesRef.current = { xScale, yScale, innerWidth, innerHeight, margin };
    };

    build();
    const onResize = () => build();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // reset when round starts
  useEffect(() => {
    if (!isPlaying || !startTs) return;
    pointsRef.current = [[0, 1]];
    lastPlottedRef.current = 1;
    if (pathRef.current) d3.select(pathRef.current).attr("d", "");
    if (rocketRef.current) d3.select(rocketRef.current).attr("opacity", 1).text("🚀");
  }, [isPlaying, startTs]);

  // plot each server tick (multiplier)
  useEffect(() => {
    if (!isPlaying || !startTs || !scalesRef.current) return;

    const now = Date.now();
    const elapsedSec = (now - startTs) / 1000;
    const m = Math.max(1, Number(multiplier) || 1);

    // avoid over-plotting on same multiplier
    if (m === lastPlottedRef.current && pointsRef.current.length > 1) return;
    lastPlottedRef.current = m;
    pointsRef.current.push([elapsedSec, m]);
    onMultiplierUpdate(m);

    const { xScale, yScale, innerWidth, innerHeight } = scalesRef.current;

    // dynamic domains to keep rocket visible
    const maxX = Math.max(8, elapsedSec + 1);
    const maxY = Math.max(4, m + 0.5);
    xScale.domain([0, maxX]);
    yScale.domain([1, maxY]).nice();

    // redraw axes grid
    const svg = d3.select(svgRef.current)!;
    const g = svg.select("g.root > g");
    (g.select<SVGGElement>("g.x-axis") as any)
      .call(d3.axisBottom(xScale).ticks(5).tickSizeOuter(0));
    (g.select<SVGGElement>("g.y-axis") as any)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(6)
          .tickFormat((d: any) => `${Number(d).toFixed(0)}x`)
          .tickSizeOuter(0)
      );

    g.selectAll(".x-axis .tick line")
      .attr("stroke", "#333")
      .attr("stroke-opacity", 0.3)
      .attr("y2", -innerHeight);
    g.selectAll(".y-axis .tick line")
      .attr("stroke", "#333")
      .attr("stroke-opacity", 0.3)
      .attr("x2", innerWidth);

    // line
    const line = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    if (pathRef.current) {
      d3.select(pathRef.current).attr("d", line(pointsRef.current) || "");
    }

    // rocket
    if (rocketRef.current) {
      const last = pointsRef.current[pointsRef.current.length - 1];
      d3.select(rocketRef.current)
        .attr("x", xScale(last[0]) - 12)
        .attr("y", yScale(last[1]) + 8);
    }
  }, [multiplier, isPlaying, startTs, onMultiplierUpdate]);

  // show crash icon when crashed
  useEffect(() => {
    if (!crashed || !rocketRef.current) return;
    d3.select(rocketRef.current).text("💥");
  }, [crashed]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default CrashChart;
