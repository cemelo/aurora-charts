import {IAxisRenderer} from '../api/chart-api';
import {RenderingOptions} from '../api/rendering-api';
import {ExtendedWilkinson} from '../labeling/ext-wilkinson';
import {calcX} from '../util/coordinates';
import {shallowArrayCompare} from '../util/comparison';
import {ILabelGenerator, ILabelProps} from '../api/labeling-api';

export class AbscissaAxisRenderer implements IAxisRenderer<RenderingOptions> {
  readonly canvas: HTMLCanvasElement;

  private target: IAxisRenderer<RenderingOptions>;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('au-abscissa');
    container.appendChild(this.canvas);

    this.target = new AbscissaLocalAxisRenderer(this.canvas, ExtendedWilkinson);
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

class AbscissaLocalAxisRenderer implements IAxisRenderer<RenderingOptions> {
  readonly canvas: HTMLCanvasElement;

  private labelGenerator: ILabelGenerator;
  private formatter: (number) => string = n => n.toString();

  private cachedActualWidth: number;
  private cachedStep: number;
  private cachedRenderingOptions: RenderingOptions = new RenderingOptions();
  private cachedLabelProps: ILabelProps | undefined;

  constructor(canvas: HTMLCanvasElement, labelGenerator: ILabelGenerator) {
    this.canvas = canvas;
    this.labelGenerator = labelGenerator;
  }

  render(options: RenderingOptions): ILabelProps {
    const shouldRedraw =
      this.canvas.width !== this.canvas.offsetWidth * options.pixelRatio ||
      this.canvas.height !== this.canvas.offsetHeight * options.pixelRatio ||
      !shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange);

    if (!shouldRedraw) return this.cachedLabelProps;

    this.canvas.width = this.canvas.offsetWidth * options.pixelRatio;
    this.canvas.height = this.canvas.offsetHeight * options.pixelRatio;

    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.beginPath();

    ctx.strokeStyle = options.style.axisStrokeStyle;
    ctx.font = options.style.axisFont;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    let maxTextWidth = 0;
    for (let value of (this.cachedLabelProps || this.labelGenerator.generate(options.abscissaRange[0], options.abscissaRange[1], 20)).labels) {
      const width = ctx.measureText(this.formatter(value)).width;
      maxTextWidth = Math.max(maxTextWidth, width);
    }

    const minTextSpacing = 20 * options.pixelRatio;
    const maxLabels = Math.floor((options.displaySize[0] * options.pixelRatio + minTextSpacing) / (maxTextWidth + minTextSpacing));

    // We only update cached labels if the zoom factor is changed. Otherwise, just use the properties to generate
    // from whatever we have cached.
    if (this.cachedLabelProps === undefined || this.cachedRenderingOptions.zoomRatios[0] != options.zoomRatios[0]) {
      this.cachedLabelProps = ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], maxLabels);
    } else {
      this.cachedLabelProps.labels = [];

      // This ugly branch is necessary to avoid float point overflow
      if (options.abscissaRange[0] < this.cachedLabelProps.min) {
        let currLabel = options.abscissaRange[0] + Math.abs(options.abscissaRange[0] - this.cachedLabelProps.min) % this.cachedLabelProps.step - this.cachedLabelProps.step;
        while (currLabel <= options.abscissaRange[1]) {
          this.cachedLabelProps.labels.push(currLabel);
          currLabel = Number((currLabel + this.cachedLabelProps.step).toPrecision(10));
        }
      } else {
        let currLabel = this.cachedLabelProps.min;
        while (currLabel <= options.abscissaRange[1]) {
          if (currLabel >= options.abscissaRange[0])
            this.cachedLabelProps.labels.push(currLabel);

          currLabel = Number((currLabel + this.cachedLabelProps.step).toPrecision(10));
        }
      }
    }

    const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
    const range = options.abscissaRange[1] - options.abscissaRange[0];
    const step = actualWidth / range;

    // Boundary
    ctx.moveTo(0, options.pixelRatio);
    ctx.lineTo(this.canvas.width, options.pixelRatio);

    this.cachedLabelProps.labels.forEach(value => {
      const label = this.formatter(value);

      const xPos = calcX(value, step, options) * options.pixelRatio;
      if (xPos < 0 || xPos > options.displaySize[0] * options.pixelRatio) return;

      ctx.fillText(label, xPos, 7 * options.pixelRatio);
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, 5 * options.pixelRatio);
    });

    this.cachedActualWidth = actualWidth;
    this.cachedStep = step;
    this.cachedRenderingOptions.abscissaRange = options.abscissaRange;
    this.cachedRenderingOptions.zoomRatios[0] = options.zoomRatios[0];

    ctx.stroke();

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
