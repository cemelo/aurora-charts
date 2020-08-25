import {IGridOptions, IRenderer, RenderingOptions} from '../api/rendering-api';
import {calcX, calcY} from '../util/coordinates';
import {shallowArrayCompare} from '../util/comparison';
import {ILabelProps} from '../api/labeling-api';

export class GridRenderer implements IRenderer<RenderingOptions & IGridOptions> {
  private readonly crossCanvas: HTMLCanvasElement;
  private readonly gridCanvas: HTMLCanvasElement;

  private target: IRenderer<RenderingOptions & IGridOptions>;
  private row: number;

  constructor(container: HTMLElement, row: number) {
    this.crossCanvas = document.createElement('canvas');
    this.crossCanvas.classList.add('au-grid', 'au-cross');

    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.classList.add('au-grid');

    container.appendChild(this.crossCanvas);
    container.appendChild(this.gridCanvas);

    this.target = new GridLocalRenderer(this.crossCanvas, this.gridCanvas, row);
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
  private readonly gridCanvas: HTMLCanvasElement;
  private readonly crossCanvas: HTMLCanvasElement;

  private row: number;

  private cachedAbscissaLabels: ILabelProps;
  private cachedOrdinateLabels: ILabelProps;

  private cachedActualWidth: number;
  private cachedStep: number;
  private cachedRenderingOptions: RenderingOptions = new RenderingOptions();

  constructor(crossCanvas: HTMLCanvasElement, gridCanvas: HTMLCanvasElement, row: number) {
    this.crossCanvas = crossCanvas;
    this.gridCanvas = gridCanvas;
    this.row = row;
  }

  render(options: RenderingOptions & IGridOptions) {
    const shouldRedrawGrid =
      this.gridCanvas.width !== this.gridCanvas.offsetWidth * options.pixelRatio ||
      this.gridCanvas.height !== this.gridCanvas.offsetHeight * options.pixelRatio ||
      !shallowArrayCompare(options.cursorPosition, this.cachedRenderingOptions.cursorPosition) ||
      !shallowArrayCompare(options.abscissaLabelProps?.labels, this.cachedAbscissaLabels?.labels) ||
      !shallowArrayCompare(options.ordinatesLabelProps?.labels, this.cachedOrdinateLabels?.labels) ||
      !shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange) ||
      !shallowArrayCompare(options.ordinatesRanges[this.row], this.cachedRenderingOptions.ordinatesRanges[this.row]);

    if (!shouldRedrawGrid) return;

    this.gridCanvas.height = this.gridCanvas.offsetHeight * options.pixelRatio;
    this.gridCanvas.width = this.gridCanvas.offsetWidth * options.pixelRatio;

    this.crossCanvas.height = this.crossCanvas.offsetHeight * options.pixelRatio;
    this.crossCanvas.width = this.crossCanvas.offsetWidth * options.pixelRatio;

    const ctxGrid = this.gridCanvas.getContext('2d');
    ctxGrid.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    ctxGrid.beginPath();

    this.cachedAbscissaLabels = options.abscissaLabelProps;
    this.cachedOrdinateLabels = options.ordinatesLabelProps;

    // Grid
    ctxGrid.strokeStyle = options.style.gridStrokeStyle;

    const actualWidth = this.gridCanvas.width - options.canvasBounds[2] - options.canvasBounds[3];
    const aRange = options.abscissaRange[1] - options.abscissaRange[0];
    const aStep = actualWidth / aRange;

    this.cachedAbscissaLabels?.labels.forEach(value => {
      const xPos = calcX(value, aStep, options);

      if (
        xPos > this.gridCanvas.width ||
        xPos < 0
      ) return;

      ctxGrid.moveTo(xPos, 0);
      ctxGrid.lineTo(xPos, this.gridCanvas.height);
    });

    const actualHeight = this.gridCanvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
    const oRange = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
    const oStep = actualHeight / oRange;

    this.cachedOrdinateLabels?.labels.forEach(value => {
      const yPos = calcY(this.row, actualHeight, value, oStep, options) * options.pixelRatio;

      if (
        yPos > this.gridCanvas.height ||
        yPos < 0
      ) return;

      ctxGrid.moveTo(0, yPos);
      ctxGrid.lineTo(this.gridCanvas.width + 1, yPos);
    });

    ctxGrid.stroke();

    // Cross
    if (options.cursorPosition[0] === 0 || options.cursorPosition[1] === 0) {
      return;
    }

    const ctxCross = this.crossCanvas.getContext('2d');
    ctxCross.clearRect(0, 0, this.crossCanvas.width, this.crossCanvas.height);
    ctxCross.beginPath();

    if (ctxCross.getLineDash().length === 0) {
      ctxCross.setLineDash([3 * options.pixelRatio, 3 * options.pixelRatio]);
      ctxCross.strokeStyle = options.style.crossStrokeStyle;
      ctxCross.lineWidth = options.style.crossLineWidth;
    }

    if (options.cursorHoveredRow === this.row) {
      // Draw horizontal line
      const yPos = options.cursorPosition[1] * options.pixelRatio;
      ctxCross.moveTo(0, yPos);
      ctxCross.lineTo(this.gridCanvas.width, yPos);
    }

    // Draw vertical line
    const xPos = options.cursorPosition[0] * options.pixelRatio;
    ctxCross.moveTo(xPos, 0);
    ctxCross.lineTo(xPos, this.gridCanvas.height);

    ctxCross.stroke();
  }

  resize(width: number, height: number, options: RenderingOptions & IGridOptions) {
    this.render(options);
  }
}
