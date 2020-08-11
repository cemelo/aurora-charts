import {DataSourceEvent, EventSource, IChartRenderer, IDataSource} from '../api/chart-api';
import {Horizontal, IRenderer, Max, Min, RenderingOptions, Vertical} from '../api/rendering-api';
import {precision} from '../util/numbers';
import {calcX, calcY} from '../util/coordinates';

type TimeSeriesData = { data: { x: number, y: number }[] }

export class TimeSeries extends EventSource<DataSourceEvent> implements IDataSource<{ x: number, y: number }>, IChartRenderer<RenderingOptions> {
  defaultDistance: [Horizontal, Vertical] = [10, 10];
  minimumDistance: [Horizontal, Vertical] = [1, 1];

  private data: { x: number, y: number }[] = [];
  private target: IRenderer<RenderingOptions & TimeSeriesData>;

  constructor(container: HTMLElement) {
    super();

    const canvas = document.createElement('canvas');
    canvas.className = 'au-view';

    container.appendChild(canvas);

    this.target = new TimeSeriesLocalRenderer(canvas, 2, 'rgba(255, 0, 0, 1)');
  }

  getData(): { x: number; y: number }[] {
    return this.data;
  }

  setData(data: { x: number; y: number }[]) {
    this.data = data;
    this.dispatchEvent('data-updated');
  }

  getMaxAbscissaPrecision(): number {
    return Math.max(...this.data.map(v => precision(v.x)));
  }

  getMaxOrdinatePrecision(): number {
    return Math.max(...this.data.map(v => precision(v.y)));
  }

  getMinAbscissaDiff(): number {
    return Math.min(...this
      .data
      .reduce((acc, _, index, arr) => {
        if (index + 2 > arr.length) {
          return acc;
        }

        return acc.concat(
          [[arr[index].x, arr[index + 1].x]]
        );
      }, [])
      .map(v => Math.abs(v[1] - v[0])));
  }

  getMinOrdinateDiff(): number {
    return Math.min(...this.data
      .reduce((acc, _, index, arr) => {
        if (index + 2 > arr.length) {
          return acc;
        }

        return acc.concat(
          [[arr[index].y, arr[index + 1].y]]
        );
      }, [])
      .map(v => Math.abs(v[1] - v[0])));
  }

  getMaxAbscissaValue(ordinatesRange?: [Min, Max]): number | null {
    if (ordinatesRange !== undefined) {
      return Math.max(...this.data.filter(v => (v.y >= ordinatesRange[0] && v.y <= ordinatesRange[1])).map(v => v.x));
    }

    return Math.max(...this.data.map(v => v.x));
  }

  getMaxOrdinateValue(abscissaRange?: [Min, Max]): number | null {
    if (abscissaRange !== undefined) {
      return Math.max(...this.data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1])).map(v => v.y));
    }

    return Math.max(...this.data.map(v => v.y));
  }

  getMinAbscissaValue(ordinatesRange?: [Min, Max]): number | null {
    if (ordinatesRange !== undefined) {
      return Math.min(...this.data.filter(v => (v.y >= ordinatesRange[0] && v.y <= ordinatesRange[1])).map(v => v.x));
    }

    return Math.min(...this.data.map(v => v.x));
  }

  getMinOrdinateValue(abscissaRange?: [Min, Max]): number | null {
    if (abscissaRange !== undefined) {
      return Math.min(...this.data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1])).map(v => v.y));
    }

    return Math.min(...this.data.map(v => v.y));
  }

  render(options: RenderingOptions) {
    this.target.render({...options, data: this.data});
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.target.resize(width, height, {...options, data: this.data});
  }

}

class TimeSeriesLocalRenderer implements IRenderer<RenderingOptions & TimeSeriesData> {
  private canvas: HTMLCanvasElement;
  private lineWidth: number;
  private strokeStyle: string | CanvasGradient | CanvasPattern;

  constructor(canvas: HTMLCanvasElement, lineWidth: number, lineColor: string | CanvasGradient | CanvasPattern) {
    this.canvas = canvas;
    this.lineWidth = lineWidth;
    this.strokeStyle = lineColor;
  }

  render(options: RenderingOptions & TimeSeriesData) {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.beginPath();

    ctx.strokeStyle = this.strokeStyle;
    ctx.lineWidth = this.lineWidth * options.pixelRatio;
    ctx.lineJoin = 'round';

    const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
    const rangeOrdinates = options.ordinatesRange[1] - options.ordinatesRange[0];
    const stepOrdinates = actualHeight / rangeOrdinates;

    const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
    const rangeAbscissa = options.abscissaRange[1] - options.abscissaRange[0];
    const stepAbscissa = actualWidth / rangeAbscissa;

    options.data.filter(({x, y}) => (
      x >= options.abscissaRange[0] - stepAbscissa && x <= options.abscissaRange[1] + stepAbscissa
    )).forEach(({x, y}, idx) => {
      const yPos = calcY(y, stepOrdinates, options) * options.pixelRatio;
      const xPos = calcX(x, stepAbscissa, options) * options.pixelRatio;

      if (idx === 0) {
        ctx.moveTo(xPos, yPos);
      } else {
        ctx.lineTo(xPos, yPos);
      }
    });

    ctx.stroke();
  }

  resize(width: number, height: number, options: RenderingOptions & TimeSeriesData) {
    this.canvas.width = width * options.pixelRatio;
    this.canvas.height = height * options.pixelRatio;
    this.render(options);
  }

}
