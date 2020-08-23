import {IAxisRenderer, IChart, IChartRenderer, IDataSource} from './api/chart-api';
import {IGridOptions, IRenderer, RenderingOptions} from './api/rendering-api';
import {TimeSeries} from './views/time-series';
import {CandleStickSeries} from './views/candle-stick';
import {AbscissaAxisRenderer} from './axes/abscissa';
import {OrdinatesAxisRenderer} from './axes/ordinates';
import {createId} from './util/hash';
import {GridRenderer} from './axes/grid';

// One ordinate range per row
export class Chart implements IChart {
  readonly abscissaRenderer: IAxisRenderer<RenderingOptions>;
  readonly ordinatesRenderers: IAxisRenderer<RenderingOptions>[];
  readonly gridRenderers: IRenderer<RenderingOptions & IGridOptions>[];

  private container: HTMLElement;
  private abscissaContainer: HTMLElement;
  private views: HTMLElement[];

  private renderingOptions: RenderingOptions = new RenderingOptions();
  private rows: HTMLElement[] = [];

  private componentId: string = createId();

  private dataSources: (IDataSource<any> & IChartRenderer<RenderingOptions>)[] = [];

  constructor(container: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('au-chart', this.componentId);

    container.appendChild(wrapper);
    this.container = wrapper;

    this.abscissaContainer = document.createElement('div');
    this.abscissaContainer.classList.add('au-abscissa', 'au-container', 'au-resizeable');
    this.container.appendChild(this.abscissaContainer);

    this.abscissaRenderer = new AbscissaAxisRenderer(this.abscissaContainer);
    this.ordinatesRenderers = [];
    this.gridRenderers = [];
    this.views = [];

    this.addMainEventListeners();
    this.addRow('auto');

    this.renderingOptions.autoResizeOrdinatesAxis = true;
    this.renderingOptions.canvasBounds = [12, 12, 0, 0];
    this.renderingOptions.displaySize = [
      this.views[0].offsetWidth,
      this.views[0].offsetHeight,
    ];
  }

  private addViewEventListeners(view: HTMLElement) {
    let chartMoveStarted = false;

    view.addEventListener('mousedown', (e) => {
      chartMoveStarted = true;

      view.classList.add('au-moving');
      this.renderingOptions.cursorPosition = [0, 0];
      requestAnimationFrame(() => this.refreshViews());

      e.preventDefault();
    });

    view.addEventListener('mousemove', (e) => {
      if (chartMoveStarted) {
        this.renderingOptions.displayOffset[0] -= e.movementX;
        requestAnimationFrame(() => this.refreshViews());
      } else {
        this.renderingOptions.cursorPosition = [
          e.offsetX,
          e.offsetY,
        ];

        requestAnimationFrame(() => this.refreshViews());
      }
    });

    view.addEventListener('mouseup', (e) => {
      chartMoveStarted = false;
      view.classList.remove('au-moving');

      this.renderingOptions.cursorPosition = [
        e.offsetX,
        e.offsetY,
      ];
      requestAnimationFrame(() => this.refreshViews());
    });

    view.addEventListener('mouseleave', (e) => {
      chartMoveStarted = false;
      view.classList.remove('au-moving');

      this.renderingOptions.cursorPosition = [0, 0];
      requestAnimationFrame(() => this.refreshViews());
    });

    view.addEventListener('wheel', (e) => {
      this.renderingOptions.displayOffset[0] += e.deltaX;
      requestAnimationFrame(() => this.refreshViews());
      e.preventDefault();
    });
  }

  private addMainEventListeners() {
    let abscissaResizeStarted = false;

    this.abscissaContainer.addEventListener('mousedown', (event) => {
      abscissaResizeStarted = true;
      event.cancelBubble = true;
    });

    this.abscissaContainer.addEventListener('mousemove', (event) => {
      if (abscissaResizeStarted) {
        let zoomOffset = (event.movementX / (this.abscissaContainer.offsetWidth / this.renderingOptions.pixelRatio));
        this.renderingOptions.zoomRatios[0] -= zoomOffset;
        requestAnimationFrame(() => this.refreshViews());
      }
    });

    this.abscissaContainer.addEventListener('mouseup', () => abscissaResizeStarted = false);
    this.abscissaContainer.addEventListener('mouseleave', () => abscissaResizeStarted = false);

    // let ordinatesResizeStarted = false;
    //
    // this.ordinatesContainer.addEventListener('mousedown', (event) => {
    //   ordinatesResizeStarted = true;
    //   event.cancelBubble = true;
    // });
    //
    // this.ordinatesContainer.addEventListener('mousemove', (event) => {
    //   if (ordinatesResizeStarted) {
    //     let zoomOffset = ((event.movementY * 8) / this.ordinatesContainer.offsetHeight);
    //     this.renderingOptions.zoomRatio[1] += zoomOffset;
    //     requestAnimationFrame(() => this.refreshViews());
    //   }
    // });
    //
    // this.ordinatesContainer.addEventListener('mouseup', () => ordinatesResizeStarted = false);
    // this.ordinatesContainer.addEventListener('mouseleave', () => ordinatesResizeStarted = false);
  }

  addRow(height: 'auto' | string) {
    const rowElement = this.createRow();

    if (height === 'auto')
      rowElement.style.height = '100%';
    else rowElement.style.height = height;

    this.rows.push(rowElement);
    this.container.insertBefore(rowElement, this.abscissaContainer);

    const row = this.rows.length - 1;

    const newView = document.createElement('div');
    newView.className = 'au-view';
    newView.style.zIndex = '999';
    this.views.push(newView);
    this.rows[row].appendChild(newView);
    this.addViewEventListeners(newView);

    this.ordinatesRenderers.push(new OrdinatesAxisRenderer(this.rows[row], row));
    this.renderingOptions.ordinatesRanges.push([0, 0]);
    this.renderingOptions.zoomRatios[1].push(1);
    this.renderingOptions.pointDistances[1].push(1);

    this.gridRenderers.push(new GridRenderer(this.rows[row], row));
  }

  addTimeSeries(row: number = 0): TimeSeries {
    if (this.views.length - 1 < row)
      throw new Error("Invalid row number");

    let timeSeries = new TimeSeries(this.rows[row], row);
    timeSeries.addEventListener('data-updated', () => {
      requestAnimationFrame(() => this.refreshViews());
    });

    this.dataSources.push(timeSeries);

    timeSeries.resize(this.views[row].offsetWidth, this.views[row].offsetHeight, this.renderingOptions);
    return timeSeries;
  }

  addCandleStickSeries(row: number = 0): CandleStickSeries {
    if (this.views.length - 1 < row)
      throw new Error("Invalid row number");

    let candleStickSeries = new CandleStickSeries(this.rows[row], row);
    candleStickSeries.addEventListener('data-updated', () => {
      requestAnimationFrame(() => this.refreshViews());
    });

    this.dataSources.push(candleStickSeries);

    candleStickSeries.resize(this.views[row].offsetWidth, this.views[row].offsetHeight, this.renderingOptions);
    return candleStickSeries;
  }

  private refreshViews(fitAbscissaAxis: boolean = false, fitOrdinateAxis: boolean = true) {
    if (this.rows.length === 0) return;

    if (Math.max(...this.dataSources.map(v => v.getData().length)) === 0) {
      return;
    }

    this.refreshAbscissaRanges(fitAbscissaAxis);
    const abscissaLabelProps = this.abscissaRenderer.render(this.renderingOptions);

    this.rows.forEach((_, row) => {
      const ordinatesRenderer = this.ordinatesRenderers[row];
      const gridRenderer = this.gridRenderers[row];

      this.refreshOrdinateRanges(row, fitOrdinateAxis);
      const ordinatesLabelProps = ordinatesRenderer.render(this.renderingOptions);

      gridRenderer.render({...this.renderingOptions, abscissaLabelProps, ordinatesLabelProps});
    });

    this.dataSources.forEach(s => s.render(this.renderingOptions));
  }

  private refreshAbscissaRanges(fitToWidth: boolean = false) {
    if (this.dataSources.length == 0) return;

    let abscissaPrecision = Math.max(...this.dataSources.map(r => r.getMaxAbscissaPrecision()));
    let minHorizontalPointDistance = Math.max(0, ...this.dataSources.map(r => r.minimumDistance[0]));
    let horizontalPointDistance = this.renderingOptions.pointDistances[0];

    let abscissaRange: [number, number] = [
      Math.min(...this.dataSources.map(r => r.getMinAbscissaValue() || 0)),
      Math.max(...this.dataSources.map(r => r.getMaxAbscissaValue() || 0))
    ];

    let abscissaStep = Math.min(...this.dataSources.map(r => r.getMinAbscissaDiff())) || Math.pow(10, -abscissaPrecision);

    if (horizontalPointDistance == null || fitToWidth) {
      horizontalPointDistance = Math.max(
        minHorizontalPointDistance,
        ...this.dataSources.map(r => r.defaultDistance[0] * this.renderingOptions.zoomRatios[0])
      );

      let maxTotalAbscissaValues = (abscissaRange[1] - abscissaRange[0]) * abscissaStep;
      if (fitToWidth && horizontalPointDistance * maxTotalAbscissaValues < this.views[0].offsetWidth) {
        horizontalPointDistance = Math.floor(this.views[0].offsetWidth / maxTotalAbscissaValues);
      }

      // Prevents the zoom from reducing past the minimum distance
      this.renderingOptions.zoomRatios[0] = horizontalPointDistance / Math.max(...this.dataSources.map(r => r.defaultDistance[0]));
    }

    if (horizontalPointDistance > 0) {
      let maxHorizontalPoints = this.views[0].offsetWidth / horizontalPointDistance;
      let horizontalPointOffset = this.renderingOptions.displayOffset[0] / horizontalPointDistance;

      abscissaRange[1] = abscissaRange[1] + horizontalPointOffset;
      abscissaRange[0] = abscissaRange[1] - abscissaStep * maxHorizontalPoints;
    }

    this.renderingOptions.abscissaRange = abscissaRange;
  }

  private refreshOrdinateRanges(row: number, fitToHeight: boolean = false) {
    const sources = this.dataSources.filter(ds => ds.row === row);

    if (sources.length == 0) return;

    let ordinatePrecision = Math.max(...sources.map(r => r.getMaxOrdinatePrecision()));
    let minVerticalPointDistance = Math.max(0, ...sources.map(r => r.minimumDistance[1]));
    let verticalPointDistance = this.renderingOptions.pointDistances[1][row];

    let ordinatesRange: [number, number] = [
      Math.min(...sources.map(r => r.getMinOrdinateValue() || 0)),
      Math.max(...sources.map(r => r.getMaxOrdinateValue() || 0))
    ];

    let ordinateStep = Math.min(...sources.map(r => r.getMinOrdinateDiff())) || Math.pow(10, -ordinatePrecision);

    if (this.renderingOptions.autoResizeOrdinatesAxis) {
      ordinatesRange = [
        Math.min(...sources.map(r => r.getMinOrdinateValue(this.renderingOptions.abscissaRange))),
        Math.max(...sources.map(r => r.getMaxOrdinateValue(this.renderingOptions.abscissaRange)))
      ];

      this.renderingOptions.zoomRatios[1][row] = 1;
      ordinatePrecision = Math.max(...sources.map(r => r.getMaxOrdinatePrecision(this.renderingOptions.abscissaRange)));
      ordinateStep = Math.min(...sources.map(r => r.getMinOrdinateDiff())) || Math.pow(10, -ordinatePrecision);
    }

    if (Math.abs(ordinatesRange[0]) === null || Math.abs(ordinatesRange[1]) === null) {
      return;
    }

    if (!verticalPointDistance || fitToHeight) {
      verticalPointDistance = (this.renderingOptions.autoResizeOrdinatesAxis) ? minVerticalPointDistance :
        Math.max(
          minVerticalPointDistance,
          ...sources.map(r => r.defaultDistance[1] * this.renderingOptions.zoomRatios[1][row])
        );

      let maxTotalOrdinateValues = (ordinatesRange[1] - ordinatesRange[0]) * ordinateStep;
      if (fitToHeight && verticalPointDistance * maxTotalOrdinateValues < this.views[row].offsetHeight) {
        verticalPointDistance = Math.floor(this.views[row].offsetHeight / maxTotalOrdinateValues);
      }

      // Prevents the zoom from reducing past the minimum distance
      this.renderingOptions.zoomRatios[1][row] = verticalPointDistance / Math.max(...sources.map(r => r.defaultDistance[1]));
    }

    if (verticalPointDistance > 0 && !this.renderingOptions.autoResizeOrdinatesAxis) {
      // Zooming in the ordinates axis is always from the center

      let maxVerticalPoints = this.views[row].offsetHeight / verticalPointDistance;

      let half = (ordinatesRange[1] - ordinatesRange[0]) / 2;
      ordinatesRange[1] = half + (ordinateStep * maxVerticalPoints / 2);
      ordinatesRange[0] = half - (ordinateStep * maxVerticalPoints / 2);
    }

    this.renderingOptions.ordinatesRanges[row] = ordinatesRange;
  }

  private createRow(): HTMLElement {
    const row = document.createElement('div');
    row.classList.add('au-row');
    return row;
  }
}
