import {ILabelGenerator} from './labeling-api';

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
