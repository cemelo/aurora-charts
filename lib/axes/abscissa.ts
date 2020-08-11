import {IAxisRenderer} from '../api/chart-api';
import {IAxisProperties, IRenderer, RenderingOptions} from '../api/rendering-api';
import {ExtendedWilkinson} from '../labeling/ext-wilkinson';

export class AbscissaAxisRenderer implements IAxisRenderer<RenderingOptions> {
  readonly canvas: HTMLCanvasElement;

  private target: IAxisRenderer<RenderingOptions>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.target = new AbscissaLocalAxisRenderer(canvas);
  }

  render(options: RenderingOptions) {
    this.target.render(options);
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.target.resize(width, height, options);
  }

  setLabelFormatter(f: (n: number) => string) {
    this.target.setLabelFormatter(f);
  }

}

class AbscissaLocalAxisRenderer implements IAxisRenderer<RenderingOptions> {
  readonly canvas: HTMLCanvasElement;

  private formatter: (number) => string = n => n.toString();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  render(options: RenderingOptions) {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    let maxTextWidth = 0;
    for (let value of ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], 20).labels) {
      const width = ctx.measureText(this.formatter(value)).width;
      maxTextWidth = Math.max(maxTextWidth, width);
    }

    const minTextSpacing = 20 * options.pixelRatio;
    const maxLabels = Math.floor((options.displaySize[0] * options.pixelRatio + minTextSpacing) / (maxTextWidth + minTextSpacing));

    const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];

    const labelProps = ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], maxLabels);

    const range = options.abscissaRange[1] - options.abscissaRange[0];
    const step = actualWidth / range;

    const calcX = (value) => {
      return (value - options.abscissaRange[0]) * step;
    };

    labelProps.labels.forEach(value => {
      const label = this.formatter(value);

      const xPos = calcX(value) * options.pixelRatio;
      const yPos = options.displaySize[1] * options.pixelRatio;

      ctx.fillText(label, xPos, yPos + 10 * options.pixelRatio);
      ctx.moveTo(xPos, yPos);
      ctx.lineTo(xPos, yPos + 5 * options.pixelRatio);
    });

    ctx.stroke();
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.canvas.width = width * options.pixelRatio;
    this.canvas.height = height * options.pixelRatio;
    this.render(options);
  }

  setLabelFormatter(f: (n: number) => string) {
    this.formatter = f;
  }

}
