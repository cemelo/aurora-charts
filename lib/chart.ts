import {IAxisRenderer, IChart, IChartRenderer, IDataSource} from './api/chart-api';
import {RenderingOptions} from './api/rendering-api';
import {TimeSeries} from './views/time-series';
import {CandleStickSeries} from './views/candle-stick';
import {AbscissaAxisRenderer} from './axes/abscissa';
import {OrdinatesAxisRenderer} from './axes/ordinates';
import {createId} from './util/hash';

// One ordinate range per row
export class Chart implements IChart {
  readonly abscissaRenderer: IAxisRenderer<RenderingOptions>;
  readonly ordinatesRenderers: IAxisRenderer<RenderingOptions>[];

  private container: HTMLElement;
  private abscissaContainer: HTMLElement;
  private ordinatesContainer: HTMLElement;
  private views: HTMLElement[];

  private renderingOptions: RenderingOptions = new RenderingOptions();
  private rowHeights: string[] = ['auto'];

  private componentId: string = createId();

  private dataSources: (IDataSource<any> & IChartRenderer<RenderingOptions>)[] = [];

  constructor(container: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('au-chart', this.componentId);

    container.appendChild(wrapper);
    this.container = wrapper;

    this.views = [];
    this.views.push(document.createElement('div'));
    this.views[0].className = 'au-view';
    this.views[0].style.zIndex = '999';

    this.abscissaContainer = document.createElement('div');
    this.abscissaContainer.classList.add('au-abscissa', 'au-container', 'au-resizeable');

    this.ordinatesContainer = document.createElement('div');
    this.ordinatesContainer.classList.add('au-ordinates', 'au-container');

    // this.baseRenderer = new ChartBase(this.container);
    this.abscissaRenderer = new AbscissaAxisRenderer(this.container);
    this.ordinatesRenderers = [];
    this.ordinatesRenderers.push(new OrdinatesAxisRenderer(this.container, 0));

    this.container.appendChild(this.abscissaContainer);
    this.container.appendChild(this.ordinatesContainer);
    this.container.appendChild(this.views[0]);

    this.renderingOptions.autoResizeOrdinatesAxis = true;
    this.renderingOptions.canvasBounds = [12, 12, 0, 0];
    this.renderingOptions.displaySize = [
      this.views[0].offsetWidth,
      this.views[0].offsetHeight,
    ];

    this.addEventListeners();
  }

  private addEventListeners() {
    let chartMoveStarted = false;

    this.views.forEach(view => {
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
    });

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

  addRow(height: string) {
    const newView = document.createElement('div');
    newView.className = 'au-view';
    newView.style.zIndex = '999';

    this.container.appendChild(newView);
    this.views.push(newView);
    this.rowHeights.push(height);

    const row = this.rowHeights.length - 1;
    this.ordinatesRenderers.push(new OrdinatesAxisRenderer(this.container, row));
    this.renderingOptions.ordinatesRanges.push([0, 0]);
    this.renderingOptions.zoomRatios[1].push(1);
    this.renderingOptions.pointDistances[1].push(1);

    newView.style.setProperty('--au-chart-row', (row + 1).toString());
    this.container.style.setProperty('--au-row-count', (row + 2).toString());

    const heightsProperty = this.rowHeights.reduce((prev, next) => `${prev} ${next}`);
    this.container.style.setProperty('--au-row-heights', `${heightsProperty} 50px`);
  }

  addTimeSeries(row: number = 0): TimeSeries {
    if (this.views.length - 1 < row)
      throw new Error("Invalid row number");

    let timeSeries = new TimeSeries(this.container, row);
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

    let candleStickSeries = new CandleStickSeries(this.container, row);
    candleStickSeries.addEventListener('data-updated', () => {
      requestAnimationFrame(() => this.refreshViews());
    });

    this.dataSources.push(candleStickSeries);

    candleStickSeries.resize(this.views[row].offsetWidth, this.views[row].offsetHeight, this.renderingOptions);
    return candleStickSeries;
  }

  private refreshViews(fitAbscissaAxis: boolean = false, fitOrdinateAxis: boolean = true) {
    if (this.rowHeights.length === 0) return;

    if (Math.max(...this.dataSources.map(v => v.getData().length)) === 0) {
      return;
    }

    this.refreshAbscissaRanges(fitAbscissaAxis);
    const abscissaLabels = this.abscissaRenderer.render(this.renderingOptions);

    this.ordinatesRenderers.forEach((renderer, row) => {
      this.refreshOrdinateRanges(row, fitOrdinateAxis);
      renderer.render(this.renderingOptions);
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
      if (fitToWidth && horizontalPointDistance * maxTotalAbscissaValues < this.renderingOptions.displaySize[0]) {
        horizontalPointDistance = Math.floor(this.renderingOptions.displaySize[0] / maxTotalAbscissaValues);
      }

      // Prevents the zoom from reducing past the minimum distance
      this.renderingOptions.zoomRatios[0] = horizontalPointDistance / Math.max(...this.dataSources.map(r => r.defaultDistance[0]));
    }

    if (horizontalPointDistance > 0) {
      let maxHorizontalPoints = this.renderingOptions.displaySize[0] / horizontalPointDistance;
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
}
