import {IAxisRenderer, IChart, IChartRenderer, IDataSource} from './api/chart-api';
import {RenderingOptions} from './api/rendering-api';
import {TimeSeries} from './views/time-series';
import {ChartBase} from './views/chart-base';

export class Chart implements IChart {
  readonly abscissaRenderer: IAxisRenderer<RenderingOptions>;
  readonly ordinatesRenderer: IAxisRenderer<RenderingOptions>;

  private container: HTMLElement;
  private abscissaContainer: HTMLElement;
  private ordinatesContainer: HTMLElement;
  private view: HTMLElement;

  private renderingOptions: RenderingOptions = new RenderingOptions();
  private baseRenderer: ChartBase;

  private dataSources: (IDataSource<any> & IChartRenderer<RenderingOptions>)[] = [];

  constructor(container: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'au-chart';

    container.appendChild(wrapper);
    this.container = wrapper;

    this.view = document.createElement('div');
    this.view.className = 'au-view';
    this.view.style.zIndex = '99999';

    this.abscissaContainer = document.createElement('div');
    this.abscissaContainer.className = 'au-abscissa';

    this.ordinatesContainer = document.createElement('div');
    this.ordinatesContainer.className = 'au-ordinates';

    this.baseRenderer = new ChartBase(this.container);

    this.container.appendChild(this.abscissaContainer);
    this.container.appendChild(this.ordinatesContainer);
    this.container.appendChild(this.view);

    this.renderingOptions.autoResizeOrdinatesAxis = false;
    this.renderingOptions.canvasBounds = [10, 10, 0, 0];
    this.renderingOptions.displaySize = [
      this.view.offsetWidth,
      this.view.offsetHeight,
    ];

    this.addEventListeners();
  }

  private addEventListeners() {
    this.view.addEventListener('mousemove', (e) => {
      this.renderingOptions.cursorPosition = [
        e.offsetX,
        e.offsetY,
      ];

      requestAnimationFrame(() => this.refreshViews());
    });

    this.view.addEventListener('mouseleave', (e) => {
      this.renderingOptions.cursorPosition = [0, 0];
      requestAnimationFrame(() => this.refreshViews());
    });

    let abscissaResizeStarted = false;

    this.abscissaContainer.addEventListener('mousedown', (event) => {
      abscissaResizeStarted = true;
      event.cancelBubble = true;
    });

    this.abscissaContainer.addEventListener('mousemove', (event) => {
      if (abscissaResizeStarted) {
        let zoomOffset = (event.movementX / this.abscissaContainer.offsetWidth);
        this.renderingOptions.zoomRatio[0] -= zoomOffset;
        this.refreshViews();
      }
    });

    this.abscissaContainer.addEventListener('mouseup', () => abscissaResizeStarted = false);
    this.abscissaContainer.addEventListener('mouseleave', () => abscissaResizeStarted = false);

    let ordinatesResizeStarted = false;

    this.ordinatesContainer.addEventListener('mousedown', (event) => {
      ordinatesResizeStarted = true;
      event.cancelBubble = true;
    });

    this.ordinatesContainer.addEventListener('mousemove', (event) => {
      if (ordinatesResizeStarted) {
        let zoomOffset = ((event.movementY * 8) / this.ordinatesContainer.offsetHeight);
        this.renderingOptions.zoomRatio[1] += zoomOffset;
        this.refreshViews();
      }
    });

    this.ordinatesContainer.addEventListener('mouseup', () => ordinatesResizeStarted = false);
    this.ordinatesContainer.addEventListener('mouseleave', () => ordinatesResizeStarted = false);
  }

  addTimeSeries(): TimeSeries {
    let timeSeries = new TimeSeries(this.container);
    timeSeries.addEventListener('data-updated', () => {
      requestAnimationFrame(() => this.refreshViews(false, true));
    });

    this.dataSources.push(timeSeries);

    timeSeries.resize(this.view.offsetWidth, this.view.offsetHeight, this.renderingOptions);
    return timeSeries;
  }

  private refreshViews(fitAbscissaAxis: boolean = false, fitOrdinateAxis: boolean = false) {
    if (Math.max(...this.dataSources.map(v => v.getData().length)) === 0) {
      return;
    }

    this.refreshAxisRanges(fitAbscissaAxis, fitOrdinateAxis);
    this.baseRenderer.render(this.renderingOptions);
    this.dataSources.forEach(s => s.render(this.renderingOptions));
  }

  private refreshAxisRanges(fitAbscissaAxis: boolean = false, fitOrdinateAxis: boolean = false) {
    if (this.dataSources.length == 0) return;

    let abscissaPrecision = Math.max(...this.dataSources.map(r => r.getMaxAbscissaPrecision()));
    let ordinatePrecision = Math.max(...this.dataSources.map(r => r.getMaxOrdinatePrecision()));

    let minHorizontalPointDistance = Math.max(0, ...this.dataSources.map(r => r.minimumDistance[0]));
    let minVerticalPointDistance = Math.max(0, ...this.dataSources.map(r => r.minimumDistance[1]));

    let horizontalPointDistance = this.renderingOptions.pointDistance[0];
    let verticalPointDistance = this.renderingOptions.pointDistance[1];

    let abscissaRange: [number, number] = [
      Math.min(...this.dataSources.map(r => r.getMinAbscissaValue() || 0)),
      Math.max(...this.dataSources.map(r => r.getMaxAbscissaValue() || 0))
    ];

    let ordinatesRange: [number, number] = [
      Math.min(...this.dataSources.map(r => r.getMinOrdinateValue() || 0)),
      Math.max(...this.dataSources.map(r => r.getMaxOrdinateValue() || 0))
    ];

    let abscissaStep = Math.min(...this.dataSources.map(r => r.getMinAbscissaDiff())) || Math.pow(10, -abscissaPrecision);
    let ordinateStep = Math.min(...this.dataSources.map(r => r.getMinOrdinateDiff())) || Math.pow(10, -ordinatePrecision);

    if (horizontalPointDistance == null || fitAbscissaAxis) {
      horizontalPointDistance = Math.max(
        minHorizontalPointDistance,
        ...this.dataSources.map(r => r.defaultDistance[0] * this.renderingOptions.zoomRatio[0])
      );

      let maxTotalAbscissaValues = (abscissaRange[1] - abscissaRange[0]) * abscissaStep;
      if (fitAbscissaAxis && horizontalPointDistance * maxTotalAbscissaValues < this.renderingOptions.displaySize[0]) {
        horizontalPointDistance = Math.floor(this.renderingOptions.displaySize[0] / maxTotalAbscissaValues);
      }

      // Prevents the zoom from reducing past the minimum distance
      this.renderingOptions.zoomRatio[0] = horizontalPointDistance / Math.max(...this.dataSources.map(r => r.defaultDistance[0]));
    }

    if (verticalPointDistance == null || fitOrdinateAxis) {
      verticalPointDistance = Math.max(
        minVerticalPointDistance,
        ...this.dataSources.map(r => r.defaultDistance[1] * this.renderingOptions.zoomRatio[1])
      );

      let maxTotalOrdinateValues = (ordinatesRange[1] - ordinatesRange[0]) * ordinateStep;
      if (fitOrdinateAxis && verticalPointDistance * maxTotalOrdinateValues < this.renderingOptions.displaySize[1]) {
        verticalPointDistance = Math.floor(this.renderingOptions.displaySize[1] / maxTotalOrdinateValues);
      }

      // Prevents the zoom from reducing past the minimum distance
      this.renderingOptions.zoomRatio[1] = verticalPointDistance / Math.max(...this.dataSources.map(r => r.defaultDistance[1]));
    }

    if (horizontalPointDistance > 0) {
      let maxHorizontalPoints = this.renderingOptions.displaySize[0] / horizontalPointDistance;
      let horizontalPointOffset = Math.floor(this.renderingOptions.displayOffset[0] / abscissaStep);

      abscissaRange[1] = abscissaRange[1] + horizontalPointOffset;
      abscissaRange[0] = abscissaRange[1] - abscissaStep * maxHorizontalPoints;
    }

    if (this.renderingOptions.autoResizeOrdinatesAxis) {
      ordinatesRange = [
        Math.min(...this.dataSources.map(r => r.getMinOrdinateValue(abscissaRange) || 0)),
        Math.max(...this.dataSources.map(r => r.getMaxOrdinateValue(abscissaRange) || 0))
      ];
    }

    if (verticalPointDistance > 0) {
      // Zooming in the ordinates axis is always from the center

      let maxVerticalPoints = this.renderingOptions.displaySize[1] / verticalPointDistance;

      let half = (ordinatesRange[1] - ordinatesRange[0]) / 2;
      ordinatesRange[1] = half + (ordinateStep * maxVerticalPoints / 2);
      ordinatesRange[0] = half - (ordinateStep * maxVerticalPoints / 2);
    }

    this.renderingOptions.abscissaRange = abscissaRange;
    this.renderingOptions.ordinatesRange = ordinatesRange;
  }
}
