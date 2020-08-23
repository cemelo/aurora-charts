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
  private cachedLabelProps: ILabelProps;

  constructor(canvas: HTMLCanvasElement, labelGenerator: ILabelGenerator) {
    this.canvas = canvas;
    this.labelGenerator = labelGenerator;
    this.cachedLabelProps = {labels: [], max: 0, min: 0, step: 0};
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
    for (let value of this.labelGenerator.generate(options.abscissaRange[0], options.abscissaRange[1], 20).labels) {
      const width = ctx.measureText(this.formatter(value)).width;
      maxTextWidth = Math.max(maxTextWidth, width);
    }

    const minTextSpacing = 20 * options.pixelRatio;
    const maxLabels = Math.floor((options.displaySize[0] * options.pixelRatio + minTextSpacing) / (maxTextWidth + minTextSpacing));

    const labelProps = ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], maxLabels);

    const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
    const range = options.abscissaRange[1] - options.abscissaRange[0];
    const step = actualWidth / range;

    // Boundary
    ctx.moveTo(0, options.pixelRatio);
    ctx.lineTo(this.canvas.width, options.pixelRatio);

    labelProps.labels.forEach(value => {
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
    this.cachedLabelProps = labelProps;

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
