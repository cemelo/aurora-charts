import {RenderingOptions} from '../api/rendering-api';

export function calcX(value: number, step: number, options: RenderingOptions): number {
  return options.canvasBounds[2] + (value - options.abscissaRange[0]) * step;
}

export function calcY(value: number, step: number, options: RenderingOptions): number {
  const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
  return actualHeight + options.canvasBounds[0] - ((value - options.ordinatesRange[0]) * step);
}

export function calcAbscissa(pos: number, options: RenderingOptions): number {
  const range = options.abscissaRange[1] - options.abscissaRange[0];
  const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
  const step = actualWidth / range;

  return ((pos - options.canvasBounds[2]) / step) + options.abscissaRange[0];
}

export function calcOrdinate(pos: number, options: RenderingOptions): number {
  const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
  const range = options.ordinatesRange[1] - options.ordinatesRange[0];
  const step = actualHeight / range;

  return options.ordinatesRange[0] - ((pos - actualHeight - options.canvasBounds[0]) / step);
}
