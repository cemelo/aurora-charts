import {IAxisRenderer} from '../api/chart-api';
import {RenderingOptions} from '../api/rendering-api';
import {ExtendedWilkinson} from '../labeling/ext-wilkinson';
import {calcOrdinate, calcY} from '../util/coordinates';
import {shallowArrayCompare} from '../util/comparison';
import {ILabelGenerator, ILabelProps} from '../api/labeling-api';

export class OrdinatesAxisRenderer implements IAxisRenderer<RenderingOptions> {
  readonly canvas: HTMLCanvasElement;

  private target: IAxisRenderer<RenderingOptions>;

  constructor(container: HTMLElement, row: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('au-ordinates');

    if (row > 0) this.canvas.setAttribute('data-secondary-row', 'true');

    container.appendChild(this.canvas);

    this.target = new OrdinatesLocalAxisRenderer(this.canvas, ExtendedWilkinson, row);
  }

  render(options: RenderingOptions): ILabelProps {
    return this.target.render(options);
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.target.resize(width, height, options);
  }

  setLabelFormatter(f: (n: number) => string) {
    this.target.setLabelFormatter(f);
  }

  setLabelGenerator(generator: ILabelGenerator) {
    this.target.setLabelGenerator(generator);
  }
}

class OrdinatesLocalAxisRenderer implements IAxisRenderer<RenderingOptions> {
  readonly canvas: HTMLCanvasElement;

  private labelGenerator: ILabelGenerator;
  private formatter: (number) => string = n => n.toString();

  private row: number = 0;

  private cachedActualHeight: number;
  private cachedStep: number;
  private cachedRenderingOptions: RenderingOptions = new RenderingOptions();
  private cachedLabelProps: ILabelProps;

  constructor(canvas: HTMLCanvasElement, labelGenerator: ILabelGenerator, rowNumber: number) {
    this.canvas = canvas;
    this.row = rowNumber;

    this.labelGenerator = labelGenerator;
    this.cachedLabelProps = {labels: [], max: 0, min: 0, step: 0};
  }

  render(options: RenderingOptions): ILabelProps {
    const ctx = this.canvas.getContext('2d');

    const shouldRedraw =
      this.canvas.width !== this.canvas.offsetWidth * options.pixelRatio ||
      this.canvas.height !== this.canvas.offsetHeight * options.pixelRatio ||
      !shallowArrayCompare(options.ordinatesRanges[this.row], this.cachedRenderingOptions.ordinatesRanges[this.row]) ||
      options.cursorPosition[1] === 0 ||
      options.cursorPosition[1] !== this.cachedRenderingOptions.cursorPosition[1];

    if (!shouldRedraw) return this.cachedLabelProps;

    this.canvas.width = this.canvas.offsetWidth * options.pixelRatio;
    this.canvas.height = this.canvas.offsetHeight * options.pixelRatio;

    ctx.clearRect(0, 0, this.canvas.width * options.pixelRatio, this.canvas.height * options.pixelRatio);
    ctx.beginPath();

    ctx.font = options.style.axisFont;
    ctx.strokeStyle = options.style.axisStrokeStyle;
    ctx.textBaseline = 'middle';

    const fontHeight = ctx.measureText('0').actualBoundingBoxAscent;
    const minTextSpacing = 50 * options.pixelRatio;
    const maxLabels = Math.floor((this.canvas.height * options.pixelRatio + minTextSpacing) / (fontHeight + minTextSpacing));

    const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];

    const labelProps = ExtendedWilkinson.generate(options.ordinatesRanges[this.row][0], options.ordinatesRanges[this.row][1], maxLabels);
    const range = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
    const step = actualHeight / range;

    // Boundary
    ctx.moveTo(options.pixelRatio, 0);
    ctx.lineTo(options.pixelRatio, this.canvas.height + 2);

    labelProps.labels.forEach(value => {
      const label = this.formatter(value);

      const xPos = options.pixelRatio;
      const yPos = calcY(this.row, actualHeight, value, step, options) * options.pixelRatio;

      if ((yPos + fontHeight / 2) > this.canvas.height || (yPos - fontHeight / 2) < 0) return;

      ctx.fillText(label, xPos + 7 * options.pixelRatio, yPos, (90 * options.pixelRatio));
      ctx.moveTo(0, yPos);
      ctx.lineTo(5 * options.pixelRatio, yPos);
    });

    this.cachedActualHeight = actualHeight;
    this.cachedStep = step;
    this.cachedRenderingOptions.ordinatesRanges[this.row] = options.ordinatesRanges[this.row];
    this.cachedLabelProps = labelProps;

    ctx.stroke();

    // Draw reference
    if (options.cursorHoveredRow === this.row && options.cursorPosition[1] !== 0) {
      const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
      const currValue = calcOrdinate(options.cursorPosition[1], this.row, actualHeight, options);

      const labelWidth = ctx.measureText(this.formatter(currValue)).width;

      const rectTopY = Math.max(
        0,
        Math.min(
          (this.canvas.offsetHeight - fontHeight - 10) * options.pixelRatio,
          (options.cursorPosition[1] - fontHeight / 2 - 5) * options.pixelRatio
        )
      );

      const rectMiddleY = Math.max(
        (fontHeight / 2 + 5) * options.pixelRatio,
        Math.min(
          (this.canvas.offsetHeight - fontHeight / 2 - 5) * options.pixelRatio,
          options.cursorPosition[1] * options.pixelRatio,
        )
      );

      const rectBottomY = Math.max(
        (fontHeight + 10) * options.pixelRatio,
        Math.min(
          (this.canvas.offsetHeight - 1) * options.pixelRatio,
          (options.cursorPosition[1] + fontHeight / 2 + 5) * options.pixelRatio
        )
      );

      ctx.beginPath();
      ctx.moveTo(0, options.cursorPosition[1] * options.pixelRatio);
      ctx.lineTo(5 * options.pixelRatio, rectTopY);
      ctx.lineTo(labelWidth + 15 * options.pixelRatio, rectTopY);
      ctx.lineTo(labelWidth + 15 * options.pixelRatio, rectBottomY);
      ctx.lineTo(5 * options.pixelRatio, rectBottomY);
      ctx.closePath();

      ctx.fillStyle = 'rgb(41, 100, 148)';

      ctx.fill('nonzero');
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';

      ctx.fillText(
        this.formatter(currValue),
        10 * options.pixelRatio,
        rectMiddleY,
        this.canvas.width - 15 * options.pixelRatio,
      );
    }

    return this.cachedLabelProps;
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.render(options);
  }

  setLabelFormatter(f: (n: number) => string) {
    this.formatter = f;
  }

  setLabelGenerator(generator: ILabelGenerator) {
    this.labelGenerator = generator;
  }

}
