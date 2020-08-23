import {IGridOptions, IRenderer, RenderingOptions} from '../api/rendering-api';
import {calcX, calcY} from '../util/coordinates';
import {shallowArrayCompare} from '../util/comparison';
import {ILabelProps} from '../api/labeling-api';

export class GridRenderer implements IRenderer<RenderingOptions & IGridOptions> {
  readonly canvas: HTMLCanvasElement;

  private target: IRenderer<RenderingOptions & IGridOptions>;
  private row: number;

  constructor(container: HTMLElement, row: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('au-grid');
    container.appendChild(this.canvas);

    this.target = new GridLocalRenderer(this.canvas, row);
    this.row = row;
  }

  render(options: RenderingOptions & IGridOptions): number[] {
    return this.target.render(options);
  }

  resize(width: number, height: number, options: RenderingOptions & IGridOptions) {
    this.target.resize(width, height, options);
  }
}

class GridLocalRenderer implements IRenderer<RenderingOptions & IGridOptions> {
  readonly canvas: HTMLCanvasElement;

  private row: number;

  private cachedAbscissaLabels: ILabelProps;
  private cachedOrdinateLabels: ILabelProps;

  private cachedActualWidth: number;
  private cachedStep: number;
  private cachedRenderingOptions: RenderingOptions = new RenderingOptions();

  constructor(canvas: HTMLCanvasElement, row: number) {
    this.canvas = canvas;
    this.row = row;
  }

  render(options: RenderingOptions & IGridOptions) {
    const shouldRedrawGrid =
      this.canvas.width !== this.canvas.offsetWidth * options.pixelRatio ||
      this.canvas.height !== this.canvas.offsetHeight * options.pixelRatio ||
      !shallowArrayCompare(options.cursorPosition, this.cachedRenderingOptions.cursorPosition) ||
      !shallowArrayCompare(options.abscissaLabelProps?.labels, this.cachedAbscissaLabels?.labels) ||
      !shallowArrayCompare(options.ordinatesLabelProps?.labels, this.cachedOrdinateLabels?.labels) ||
      !shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange) ||
      !shallowArrayCompare(options.ordinatesRanges[this.row], this.cachedRenderingOptions.ordinatesRanges[this.row]);

    if (!shouldRedrawGrid) return;

    this.canvas.height = this.canvas.offsetHeight * options.pixelRatio;
    this.canvas.width = this.canvas.offsetWidth * options.pixelRatio;

    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.beginPath();

    // ctx.font = '48px system-ui, sans-serif';
    // ctx.fillText("TEST", 40, 40);

    this.cachedAbscissaLabels = options.abscissaLabelProps;
    this.cachedOrdinateLabels = options.ordinatesLabelProps;

    // Grid
    ctx.strokeStyle = options.style.gridStrokeStyle;

    const actualWidth = this.canvas.width - options.canvasBounds[2] - options.canvasBounds[3];
    const aRange = options.abscissaRange[1] - options.abscissaRange[0];
    const aStep = actualWidth / aRange;

    this.cachedAbscissaLabels?.labels.forEach(value => {
      const xPos = calcX(value, aStep, options);

      if (
        xPos > this.canvas.width ||
        xPos < 0
      ) return;

      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, this.canvas.height);
    });

    const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
    const oRange = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
    const oStep = actualHeight / oRange;

    this.cachedOrdinateLabels?.labels.forEach(value => {
      const yPos = calcY(this.row, actualHeight, value, oStep, options) * options.pixelRatio;

      if (
        yPos > this.canvas.height ||
        yPos < 0
      ) return;

      ctx.moveTo(0, yPos);
      ctx.lineTo(this.canvas.width + 1, yPos);
    });

    ctx.stroke();
  }

  resize(width: number, height: number, options: RenderingOptions & IGridOptions) {
    this.render(options);
  }
}
