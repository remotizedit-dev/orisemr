"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  format?: "CODE128" | "CODE39";
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function BarcodeSvg({
  value,
  format = "CODE128",
  width = 1.8,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className = "",
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          font: "monospace",
          fontSize,
          margin: 0,
        });
      } catch (err) {
        console.warn("Barcode rendering error:", err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}
