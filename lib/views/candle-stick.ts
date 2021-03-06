import {DataSourceEvent, EventSource, IChartRenderer, IDataSource} from '../api/chart-api';
import {Horizontal, IRenderer, Max, Min, RenderingOptions, Vertical} from '../api/rendering-api';
import {precision} from '../util/numbers';
import {calcX, calcY} from '../util/coordinates';

type CandleStickRecord = { timestamp: number, open: number, close: number, low: number, high: number };
type CandleStickData = { data: CandleStickRecord[] }

export interface CandleStickOptions {
  strokeStyle: (CandleStickRecord) => string | CanvasGradient | CanvasPattern | undefined
  candleFillStyle: (CandleStickRecord) => string | CanvasGradient | CanvasPattern | undefined
}

export class CandleStickSeries extends EventSource<DataSourceEvent> implements IDataSource<CandleStickRecord>, IChartRenderer<RenderingOptions> {
  readonly row: number;

  defaultDistance: [Horizontal, Vertical] = [12, 1];
  minimumDistance: [Horizontal, Vertical] = [6, 2];

  private data: CandleStickRecord[] = [];
  private target: IRenderer<RenderingOptions & CandleStickData> & { setOptions(options: CandleStickOptions): void };

  private cachedRenderingOptions: RenderingOptions | null;

  constructor(container: HTMLElement, row: number) {
    super();

    const canvas = document.createElement('canvas');
    canvas.className = 'au-view';
    canvas.style.setProperty('--au-chart-row', (row + 1).toString());

    if (row > 0) canvas.setAttribute('data-secondary-row', 'true');

    container.appendChild(canvas);

    const defaultOptions: CandleStickOptions = {
      strokeStyle: (record) => {
        if (record.open > record.close) {
          return "#FF0000";
        } else if (record.open < record.close) {
          return "#00FF00";
        } else {
          return "#000000";
        }
      },
      candleFillStyle: (record) => {
        if (record.open > record.close) {
          return "#FF0000";
        } else if (record.open < record.close) {
          return "#00FF00";
        } else {
          return "#000000";
        }
      }
    };

    this.row = row;
    this.target = new CandleStickSeriesLocalRenderer(canvas, row, defaultOptions.strokeStyle, defaultOptions.candleFillStyle);
  }

  getData(): CandleStickRecord[] {
    return this.data;
  }

  setData(data: CandleStickRecord[]) {
    this.data = data;
    this.dispatchEvent('data-updated');
  }

  setOptions(options: CandleStickOptions) {
    this.target.setOptions(options);

    if (this.cachedRenderingOptions) {
      requestAnimationFrame(() => this.render(this.cachedRenderingOptions));
    }
  }

  getMaxAbscissaPrecision(): number {
    return Math.max(...this.data.map(v => precision(v.timestamp)));
  }

  getMaxOrdinatePrecision(abscissaRange?: [Min, Max]): number {
    let data = this.data;
    if (abscissaRange !== undefined) {
      data = this.data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]))
    }

    return Math.max(...data.map(v => Math.max(precision(v.open), precision(v.close), precision(v.high), precision(v.low))));
  }

  getMinAbscissaDiff(): number {
    return Math.min(...this
      .data
      .reduce((acc, _, index, arr) => {
        if (index + 2 > arr.length) {
          return acc;
        }

        return acc.concat(
          [[arr[index].timestamp, arr[index + 1].timestamp]]
        );
      }, [])
      .map(v => Math.abs(v[1] - v[0])));
  }

  getMinOrdinateDiff(abscissaRange?: [Min, Max]): number {
    let data = this.data;
    if (abscissaRange !== undefined) {
      data = this.data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]))
    }

    let flatData = data.flatMap(record => [record.low, record.high, record.open, record.close]);
    flatData.sort();

    return Math.min(...flatData.reduce((acc, _, index, arr) => {
      if (index + 2 > arr.length) {
        return acc;
      }

      return acc.concat(
        [[arr[index], arr[index + 1]]]
      );
    }, []).map(v => Math.abs(v[1] - v[0])));
  }

  getMaxAbscissaValue(ordinatesRange?: [Min, Max]): number | null {
    let data = this.data;

    if (ordinatesRange !== undefined) {
      data = data.filter(v => (v.low >= ordinatesRange[0] && v.high <= ordinatesRange[1]));
    }

    if (data.length === 0) return null;
    return Math.max(...data.map(v => v.timestamp));
  }

  getMaxOrdinateValue(abscissaRange?: [Min, Max]): number | null {
    let data = this.data;

    if (abscissaRange !== undefined) {
      data = data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]));
    }

    if (data.length === 0) return null;
    return Math.max(...data.map(v => v.high));
  }

  getMinAbscissaValue(ordinatesRange?: [Min, Max]): number | null {
    let data = this.data;

    if (ordinatesRange !== undefined) {
      data = data.filter(v => (v.low >= ordinatesRange[0] && v.high <= ordinatesRange[1]));
    }

    if (data.length === 0) return null;
    return Math.min(...data.map(v => v.timestamp));
  }

  getMinOrdinateValue(abscissaRange?: [Min, Max]): number | null {
    let data = this.data;

    if (abscissaRange !== undefined) {
      data = data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]));
    }

    if (data.length === 0) return null;
    return Math.min(...data.map(v => v.low));
  }

  render(options: RenderingOptions) {
    this.cachedRenderingOptions = options;
    this.target.render({...options, data: this.data});
  }

  resize(width: number, height: number, options: RenderingOptions) {
    this.target.resize(width, height, {...options, data: this.data});
  }

}

class CandleStickSeriesLocalRenderer implements IRenderer<RenderingOptions & CandleStickData> {
  private canvas: HTMLCanvasElement;
  private row: number;
  private strokeStyle: (CandleStickRecord) => string | CanvasGradient | CanvasPattern = () => '#000000';
  private candleFillStyle: (CandleStickRecord) => string | CanvasGradient | CanvasPattern = () => '#000000';

  constructor(canvas: HTMLCanvasElement,
              row: number,
              strokeStyle: (CandleStickRecord) => string | CanvasGradient | CanvasPattern,
              candleFillStyle: (CandleStickRecord) => string | CanvasGradient | CanvasPattern) {
    this.canvas = canvas;
    this.row = row;
    this.candleFillStyle = candleFillStyle || this.candleFillStyle;
    this.strokeStyle = strokeStyle || this.strokeStyle;
  }

  setOptions(options: CandleStickOptions) {
    this.strokeStyle = options.strokeStyle || this.strokeStyle;
    this.candleFillStyle = options.candleFillStyle || this.candleFillStyle;
  }

  render(options: RenderingOptions & CandleStickData) {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.beginPath();

    ctx.lineWidth = options.pixelRatio;

    const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];

    const rangeOrdinates = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
    const stepOrdinates = actualHeight / rangeOrdinates;

    const actualWidth = this.canvas.offsetWidth - options.canvasBounds[2] - options.canvasBounds[3];
    const rangeAbscissa = options.abscissaRange[1] - options.abscissaRange[0];
    const stepAbscissa = actualWidth / rangeAbscissa;

    options.data.filter(({timestamp}) => (
      timestamp >= options.abscissaRange[0] - stepAbscissa && timestamp <= options.abscissaRange[1] + stepAbscissa
    )).forEach((record, idx) => {
      const {timestamp, high, low, open, close} = record;

      const lowPos = calcY(this.row, actualHeight, low, stepOrdinates, options) * options.pixelRatio;
      const highPos = calcY(this.row, actualHeight, high, stepOrdinates, options) * options.pixelRatio;
      const openPos = calcY(this.row, actualHeight, open, stepOrdinates, options) * options.pixelRatio;
      const closePos = calcY(this.row, actualHeight, close, stepOrdinates, options) * options.pixelRatio;

      const xPos = calcX(timestamp, stepAbscissa, options) * options.pixelRatio;

      ctx.strokeStyle = this.strokeStyle(record);

      // Draw high line
      ctx.beginPath();
      ctx.moveTo(xPos, highPos);
      ctx.lineTo(xPos, Math.min(openPos, closePos));

      // Draw low line
      ctx.moveTo(xPos, Math.max(openPos, closePos));
      ctx.lineTo(xPos, lowPos);

      // Draw candle
      if (Math.abs(openPos - closePos) <= options.pixelRatio) {
        ctx.moveTo(xPos - stepAbscissa / 2, openPos);
        ctx.lineTo(xPos + stepAbscissa / 2, openPos);
      } else {
        ctx.fillStyle = this.candleFillStyle(record);
        ctx.fillRect(
          xPos - stepAbscissa / 2,
          Math.min(openPos, closePos),
          stepAbscissa,
          Math.abs(openPos - closePos),
        );
      }

      ctx.stroke();
    });
  }

  resize(width: number, height: number, options: RenderingOptions & CandleStickData) {
    this.canvas.width = width * options.pixelRatio;
    this.canvas.height = height * options.pixelRatio;
    this.render(options);
  }

}
