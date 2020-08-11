import {IRenderer, RenderingOptions} from '../api/rendering-api';
import {ExtendedWilkinson} from '../labeling/ext-wilkinson';
import {shallowArrayCompare} from '../util/comparison';
import {calcAbscissa, calcOrdinate, calcX, calcY} from '../util/coordinates';

export class ChartBase implements IRenderer<RenderingOptions> {
  private target: IRenderer<RenderingOptions>;

  constructor(container: HTMLElement) {
    this.target = new ChartBaseLocalRenderer(container);
  }

  render(options: RenderingOptions) {
    this.target.render(options);
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.target.resize(width, height, options);
  }

}

class ChartBaseLocalRenderer implements IRenderer<RenderingOptions> {
  private readonly gridCanvas: HTMLCanvasElement;
  private readonly abscissaCanvas: HTMLCanvasElement;
  private readonly ordinateCanvas: HTMLCanvasElement;
  private readonly viewCanvas: HTMLCanvasElement;

  private abscissaFormatter: (number) => string = n => n.toString();
  private ordinatesFormatter: (number) => string = n => n.toString();

  private cachedAbscissaLabels: number[];
  private cachedOrdinateLabels: number[];
  private cachedActualWidth: number;
  private cachedActualHeight: number;
  private cachedStepAbscissa: number;
  private cachedStepOrdinates: number;

  private cachedRenderingOptions: RenderingOptions = new RenderingOptions();

  constructor(container: HTMLElement) {
    this.abscissaCanvas = document.createElement('canvas');
    this.ordinateCanvas = document.createElement('canvas');
    this.gridCanvas = document.createElement('canvas');
    this.viewCanvas = document.createElement('canvas');

    this.abscissaCanvas.className = 'au-abscissa';
    this.ordinateCanvas.className = 'au-ordinates';
    this.gridCanvas.className = 'au-chart-base';
    this.viewCanvas.className = 'au-view';
    this.viewCanvas.style.zIndex = '999';

    container.appendChild(this.viewCanvas);
    container.appendChild(this.abscissaCanvas);
    container.appendChild(this.ordinateCanvas);
    container.appendChild(this.gridCanvas);
  }

  render(options: RenderingOptions) {
    let renderGrid = false;

    if (this.gridCanvas.width !== this.gridCanvas.offsetWidth * options.pixelRatio ||
      this.gridCanvas.height !== this.gridCanvas.offsetHeight * options.pixelRatio) {
      this.gridCanvas.width = this.gridCanvas.offsetWidth * options.pixelRatio;
      this.gridCanvas.height = this.gridCanvas.offsetHeight * options.pixelRatio;
      renderGrid = true;
    }

    if (this.viewCanvas.width !== this.viewCanvas.offsetWidth * options.pixelRatio ||
      this.viewCanvas.height !== this.viewCanvas.offsetHeight * options.pixelRatio) {
      this.viewCanvas.width = this.viewCanvas.offsetWidth * options.pixelRatio;
      this.viewCanvas.height = this.viewCanvas.offsetHeight * options.pixelRatio;
      renderGrid = true;
    }

    if (this.abscissaCanvas.width !== this.abscissaCanvas.offsetWidth * options.pixelRatio ||
      this.abscissaCanvas.height !== this.abscissaCanvas.offsetHeight * options.pixelRatio) {
      this.abscissaCanvas.width = this.abscissaCanvas.offsetWidth * options.pixelRatio;
      this.abscissaCanvas.height = this.abscissaCanvas.offsetHeight * options.pixelRatio;
      renderGrid = true;
    }

    if (this.ordinateCanvas.width !== this.ordinateCanvas.offsetWidth * options.pixelRatio ||
      this.ordinateCanvas.height !== this.ordinateCanvas.offsetHeight * options.pixelRatio) {
      this.ordinateCanvas.width = this.ordinateCanvas.offsetWidth * options.pixelRatio;
      this.ordinateCanvas.height = this.ordinateCanvas.offsetHeight * options.pixelRatio;
      renderGrid = true;
    }

    if (!shallowArrayCompare(options.ordinatesRange, this.cachedRenderingOptions.ordinatesRange) || renderGrid) {
      this.renderOrdinateAxis(options);
      renderGrid = true;
    }

    if (!shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange) || renderGrid) {
      this.renderAbscissaAxis(options);
      renderGrid = true;
    }

    if (!shallowArrayCompare(options.cursorPosition, this.cachedRenderingOptions.cursorPosition) || renderGrid) {
      this.renderCursorCross(options);
    }

    if (renderGrid) {
      this.renderGrid(options);
    }
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.render(options);
  }

  private renderCursorCross(options: RenderingOptions) {
    const ctx = this.viewCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);

    ctx.beginPath();

    if (ctx.getLineDash().length === 0) {
      ctx.setLineDash([3 * options.pixelRatio, 3 * options.pixelRatio]);
      ctx.strokeStyle = 'rgb(0, 0, 0)';
    }

    const ctxGrid = this.gridCanvas.getContext('2d');

    ctxGrid.clearRect(
      0, options.displaySize[1] * options.pixelRatio + 1,
      this.gridCanvas.width * options.pixelRatio,
      (this.gridCanvas.height - this.abscissaCanvas.height) * options.pixelRatio
    );

    ctxGrid.clearRect(
      options.displaySize[0] * options.pixelRatio + 1, 0,
      (this.gridCanvas.width - this.ordinateCanvas.width) * options.pixelRatio,
      this.gridCanvas.height * options.pixelRatio,
    );

    if (options.cursorPosition[0] === 0 || options.cursorPosition[1] === 0) {
      return;
    }

    const xPos = options.cursorPosition[0] * options.pixelRatio;
    const yPos = options.cursorPosition[1] * options.pixelRatio;

    ctx.moveTo(0, yPos);
    ctx.lineTo(options.displaySize[0] * options.pixelRatio, yPos);

    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, options.displaySize[1] * options.pixelRatio);
    ctx.stroke();

    // Draw rectangle on abscissa
    ctxGrid.font = `${12 * options.pixelRatio}px ui-system,sans-serif`;

    const abscissaLabel = this.abscissaFormatter(calcAbscissa(options.cursorPosition[0], options));
    const abscissaLabelMeasures = ctxGrid.measureText(abscissaLabel);

    ctxGrid.fillStyle = 'rgb(0, 0, 0)';
    ctxGrid.fillRect(
      (xPos - abscissaLabelMeasures.width / 2) - 10 * options.pixelRatio,
      options.displaySize[1] * options.pixelRatio + 1,
      abscissaLabelMeasures.width + 20 * options.pixelRatio,
      abscissaLabelMeasures.actualBoundingBoxAscent + 20 * options.pixelRatio,
    );

    ctxGrid.fillStyle = 'rgb(255, 255, 255)';
    ctxGrid.textAlign = 'center';
    ctxGrid.textBaseline = 'top';

    ctxGrid.fillText(abscissaLabel, xPos, (options.displaySize[1] + 5) * options.pixelRatio + 1);

    // Draw rectangle on ordinate
    ctxGrid.font = `${12 * options.pixelRatio}px ui-system,sans-serif`;

    const ordinateLabel = this.ordinatesFormatter(calcOrdinate(options.cursorPosition[1], options));
    const ordinateLabelMeasures = ctxGrid.measureText(ordinateLabel);

    ctxGrid.fillStyle = 'rgb(0, 0, 0)';
    ctxGrid.fillRect(
      options.displaySize[0] * options.pixelRatio + 1,
      (yPos - ordinateLabelMeasures.actualBoundingBoxAscent / 2) - 10 * options.pixelRatio,
      ordinateLabelMeasures.width + 20 * options.pixelRatio,
      ordinateLabelMeasures.actualBoundingBoxAscent + 20 * options.pixelRatio,
    );

    ctxGrid.fillStyle = 'rgb(255, 255, 255)';
    ctxGrid.textAlign = 'left';
    ctxGrid.textBaseline = 'middle';

    ctxGrid.fillText(ordinateLabel,
      (options.displaySize[0] + 10) * options.pixelRatio + 1,
      yPos);

    this.cachedRenderingOptions.cursorPosition = options.cursorPosition;
  }

  private renderAbscissaAxis(options: RenderingOptions) {
    const ctx = this.abscissaCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.abscissaCanvas.width, this.abscissaCanvas.height);
    ctx.beginPath();

    ctx.strokeStyle = 'rgba(87, 87, 87, 1)';

    ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    let maxTextWidth = 0;
    for (let value of ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], 20).labels) {
      const width = ctx.measureText(this.abscissaFormatter(value)).width;
      maxTextWidth = Math.max(maxTextWidth, width);
    }

    const minTextSpacing = 20 * options.pixelRatio;
    const maxLabels = Math.floor((options.displaySize[0] * options.pixelRatio + minTextSpacing) / (maxTextWidth + minTextSpacing));

    const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];

    const labelProps = ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], maxLabels);

    const range = options.abscissaRange[1] - options.abscissaRange[0];
    const step = actualWidth / range;

    labelProps.labels.forEach(value => {
      const label = this.abscissaFormatter(value);

      const xPos = calcX(value, step, options) * options.pixelRatio;

      ctx.fillText(label, xPos, 7 * options.pixelRatio);
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, 5 * options.pixelRatio);
    });

    this.cachedAbscissaLabels = labelProps.labels;
    this.cachedActualWidth = actualWidth;
    this.cachedStepAbscissa = step;
    this.cachedRenderingOptions.abscissaRange = options.abscissaRange;

    ctx.stroke();
  }

  private renderOrdinateAxis(options: RenderingOptions) {
    const ctx = this.ordinateCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.ordinateCanvas.width * options.pixelRatio, this.ordinateCanvas.height * options.pixelRatio);
    ctx.beginPath();

    ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';

    const fontHeight = ctx.measureText('0').actualBoundingBoxAscent;
    const minTextSpacing = 20 * options.pixelRatio;
    const maxLabels = Math.floor((options.displaySize[1] * options.pixelRatio + minTextSpacing) / (fontHeight + minTextSpacing));

    const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];

    const labelProps = ExtendedWilkinson.generate(options.ordinatesRange[0], options.ordinatesRange[1], maxLabels);

    const range = options.ordinatesRange[1] - options.ordinatesRange[0];
    const step = actualHeight / range;

    labelProps.labels.forEach(value => {
      const label = this.ordinatesFormatter(value);

      const xPos = options.pixelRatio;
      const yPos = calcY(value, step, options) * options.pixelRatio;

      ctx.fillText(label, xPos + 7 * options.pixelRatio, yPos, (90 * options.pixelRatio));
      ctx.moveTo(0, yPos);
      ctx.lineTo(5 * options.pixelRatio, yPos);
    });

    this.cachedOrdinateLabels = labelProps.labels;
    this.cachedActualHeight = actualHeight;
    this.cachedStepOrdinates = step;
    this.cachedRenderingOptions.ordinatesRange = options.ordinatesRange;

    ctx.stroke();
  }

  private renderGrid(options: RenderingOptions) {
    const ctx = this.gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    ctx.beginPath();

    // Chart Boundaries
    ctx.strokeStyle = 'rgba(87, 87, 87, 1)';

    ctx.moveTo(options.displaySize[0] * options.pixelRatio, 0);
    ctx.lineTo(options.displaySize[0] * options.pixelRatio, options.displaySize[1] * options.pixelRatio);
    ctx.lineTo(0, options.displaySize[1] * options.pixelRatio);

    ctx.stroke();

    // Grid
    ctx.strokeStyle = 'rgb(186, 186, 186)';

    this.cachedAbscissaLabels.forEach((value, idx) => {
      const xPos = calcX(value, this.cachedStepAbscissa, options) * options.pixelRatio;

      if (
        xPos > options.displaySize[0] * options.pixelRatio ||
        xPos < 0
      ) return;

      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, options.displaySize[1] * options.pixelRatio);
    });

    this.cachedOrdinateLabels.forEach((value, idx) => {
      const yPos = calcY(value, this.cachedStepOrdinates, options) * options.pixelRatio;

      if (
        yPos > options.displaySize[1] * options.pixelRatio ||
        yPos < 0
      ) return;

      ctx.moveTo(0, yPos);
      ctx.lineTo(options.displaySize[0] * options.pixelRatio + 1, yPos);
    });

    ctx.stroke();
  }

}
