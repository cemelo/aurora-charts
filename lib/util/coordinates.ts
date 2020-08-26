import {RenderingOptions} from '../api/rendering-api';

export function calcX(value: number, step: number, options: RenderingOptions): number {
  return options.canvasBounds[2] + (value - options.abscissaRange[0]) * step;
}

export function calcY(row: number, height: number, value: number, step: number, options: RenderingOptions): number {
  return height + options.canvasBounds[0] - ((value - options.ordinatesRanges[row][0]) * step);
}

export function calcAbscissa(pos: number, width: number, options: RenderingOptions): number {
  const range = options.abscissaRange[1] - options.abscissaRange[0];
  const step = width / range;

  return ((pos - options.canvasBounds[2]) / step) + options.abscissaRange[0];
}

export function calcOrdinate(pos: number, row: number, height: number, options: RenderingOptions): number {
  const range = options.ordinatesRanges[row][1] - options.ordinatesRanges[row][0];
  const step = height / range;

  return options.ordinatesRanges[row][0] + ((height + options.canvasBounds[0]) - pos) / step;
}
