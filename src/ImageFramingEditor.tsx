import type { RefObject } from "react";
import { Slider } from "./controls";
import { clampZoom } from "./image-model";
import { FRAME } from "./image-framing";

export function ImageFramingEditor({
  shape,
  zoom,
  offsetX,
  offsetY,
  canvasRef,
  zoomWrapRef,
  onZoomChange,
  onOffsetXChange,
  onOffsetYChange,
  onApply,
  onCancel,
}: {
  shape: "circle" | "square";
  zoom: number;
  offsetX: number;
  offsetY: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  zoomWrapRef: RefObject<HTMLDivElement | null>;
  onZoomChange: (value: number) => void;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="iu-editor">
      <canvas
        ref={canvasRef}
        width={FRAME}
        height={FRAME}
        className={`iu-canvas iu-${shape}`}
        aria-label="Enquadramento da imagem"
      />
      <div className="iu-sliders" ref={zoomWrapRef}>
        <Slider
          id="iu-zoom"
          label="Zoom"
          value={zoom}
          min={1}
          max={4}
          step={0.1}
          format={(value) => `${value.toFixed(1)}×`}
          onChange={(value) => onZoomChange(clampZoom(value))}
        />
        <Slider
          id="iu-x"
          label="Posição horizontal"
          value={offsetX}
          min={-1}
          max={1}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={onOffsetXChange}
        />
        <Slider
          id="iu-y"
          label="Posição vertical"
          value={offsetY}
          min={-1}
          max={1}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={onOffsetYChange}
        />
        <div className="iu-actions">
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={onApply}
          >
            Aplicar ajuste
          </button>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
