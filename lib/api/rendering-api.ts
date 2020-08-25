import {ILabelGenerator, ILabelProps} from './labeling-api';

export type Vertical = number;
export type Horizontal = number;

export type Min = number;
export type Max = number;

export type Width = number;
export type Height = number;

export type Top = number;
export type Right = number;
export type Bottom = number;
export type Left = number;

export interface IRenderer<T> {
  resize(width: number, height: number, options: T);

  render(options: T);
}

export interface RenderingStyle {
  axisStrokeStyle: string | CanvasPattern | CanvasGradient;
  axisFont: string;
  gridStrokeStyle: string | CanvasPattern | CanvasGradient;
  crossStrokeStyle: string | CanvasPattern | CanvasGradient;
  crossLineWidth: number;
}

export class RenderingOptions {
  canvasBounds: [Top, Bottom, Left, Right];
  pixelRatio: number;
  autoResizeOrdinatesAxis: boolean;

  abscissaRange: [Min, Max];
  ordinatesRanges: [Min, Max][];

  pointDistances: [Horizontal | null, Vertical[]];

  zoomRatios: [Horizontal, Vertical[]];

  displayOffset: [Horizontal, Vertical];
  displaySize: [Width, Height];

  cursorPosition: [Horizontal, Vertical];
  cursorHoveredRow: number;

  style: RenderingStyle;

  constructor() {
    this.canvasBounds = [0, 0, 0, 0];
    this.pixelRatio = window?.devicePixelRatio || 1;
    this.autoResizeOrdinatesAxis = false;
    this.pointDistances = [null, []];
    this.displaySize = [0, 0];
    this.abscissaRange = [0, 0];
    this.ordinatesRanges = [[0, 0]];
    this.zoomRatios = [1, [1]];
    this.displayOffset = [0, 0];
    this.cursorPosition = [0, 0];
    this.cursorHoveredRow = -1;
    this.style = {
      axisFont: `${12 * this.pixelRatio}px system-ui, sans-serif`,
      axisStrokeStyle: 'rgba(87, 87, 87, 1)',
      gridStrokeStyle: 'rgba(146, 146, 146, 1)',
      crossStrokeStyle: 'rgb(0, 0, 0)',
      crossLineWidth: 1 * this.pixelRatio,
    };
  }
}

export interface IAxisProperties {
  length: number;
  offset: number;
  bounds: [Min, Max];
  displayRatio: number;
  labels: number[];
  step: number;
}

export interface IGridOptions {
  abscissaLabelProps: ILabelProps,
  ordinatesLabelProps: ILabelProps
}
