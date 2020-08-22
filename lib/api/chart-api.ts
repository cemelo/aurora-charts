import {Horizontal, IAxisProperties, IRenderer, Max, Min, RenderingOptions, Vertical} from './rendering-api';

export interface IChart {
  readonly abscissaRenderer: IAxisRenderer<RenderingOptions>;
  readonly ordinatesRenderer: IAxisRenderer<RenderingOptions>;
}

export interface IDataSource<Data> extends EventSource<DataSourceEvent> {
  getData(): Data[];

  setData(data: Data[]);

  getMaxAbscissaPrecision(): number;

  getMaxOrdinatePrecision(abscissaRange?: [Min, Max]): number;

  getMinAbscissaDiff(ordinatesRange?: [Min, Max]): number;

  getMinOrdinateDiff(abscissaRange?: [Min, Max]): number;

  getMinAbscissaValue(ordinatesRange?: [Min, Max]): number | null;

  getMinOrdinateValue(abscissaRange?: [Min, Max]): number | null;

  getMaxAbscissaValue(ordinatesRange?: [Min, Max]): number | null;

  getMaxOrdinateValue(abscissaRange?: [Min, Max]): number | null;

}

export interface IChartRenderer<T> extends IRenderer<T> {
  minimumDistance: [Horizontal, Vertical];
  defaultDistance: [Horizontal, Vertical];
}

export interface IAxisRenderer<T> extends IRenderer<T> {
  setLabelFormatter(f: (n: number) => string);
}

export type DataSourceEvent = 'data-updated';

export class EventSource<E> {

  private eventListeners: Map<E, ((data?: any) => void)[]> = new Map();

  addEventListener(event: E, callback: (data?: any) => void) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).push(callback);
    } else {
      this.eventListeners.set(event, [callback]);
    }
  }

  protected dispatchEvent(event: E, data?: any) {
    for (let listener of this.eventListeners.get(event)) {
      listener(data);
    }
  }
}
