import {RenderingOptions} from '../api/rendering-api';

export function calcX(value: number, step: number, options: RenderingOptions): number {
  return options.canvasBounds[2] + (value - options.abscissaRange[0]) * step;
}

export function calcY(row: number, height: number, value: number, step: number, options: RenderingOptions): number {
  return height + options.canvasBounds[0] - ((value - options.ordinatesRanges[row][0]) * step);
}

export function calcAbscissa(pos: number, options: RenderingOptions): number {
  const range = options.abscissaRange[1] - options.abscissaRange[0];
  const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
  const step = actualWidth / range;

  return ((pos - options.canvasBounds[2]) / step) + options.abscissaRange[0];
}

export function calcOrdinate(pos: number, row: number, height: number, options: RenderingOptions): number {
  const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
  const range = options.ordinatesRanges[row][1] - options.ordinatesRanges[row][0];
  const step = actualHeight / range;

  return options.ordinatesRanges[row][0] - ((pos - actualHeight - options.canvasBounds[0]) / step);
}
