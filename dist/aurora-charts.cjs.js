'use strict';

class RenderingOptions {
    constructor() {
        this.canvasBounds = [0, 0, 0, 0];
        this.pixelRatio = 1;
        this.autoResizeOrdinatesAxis = false;
        this.displaySize = [0, 0];
        this.abscissaRange = [0, 0];
        this.ordinatesRange = [0, 0];
        this.zoomRatio = [0, 0];
        this.displayOffset = [0, 0];
        this.pointDistance = [0, 0];
        this.abscissaLabelGenerator = null;
        this.ordinatesLabelGenerator = null;
    }
}

class TimeSeries extends EventTarget {
    constructor() {
        super(...arguments);
        this.defaultDistance = [10, 10];
        this.minimumDistance = [1, 1];
    }
    getData() {
        return this.data;
    }
    setData(data) {
        this.data = data;
        this.dispatchEvent(new Event('data-updated'));
    }
    getMaxAbscissaValue(ordinatesRange) {
        if (ordinatesRange !== undefined) {
            return Math.max(...this.data.filter(v => (v.y >= ordinatesRange[0] && v.y <= ordinatesRange[1])).map(v => v.x));
        }
        return Math.max(...this.data.map(v => v.x));
    }
    getMaxOrdinateValue(abscissaRange) {
        if (abscissaRange !== undefined) {
            return Math.max(...this.data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1])).map(v => v.y));
        }
        return Math.max(...this.data.map(v => v.y));
    }
    getMinAbscissaValue(ordinatesRange) {
        if (ordinatesRange !== undefined) {
            return Math.min(...this.data.filter(v => (v.y >= ordinatesRange[0] && v.y <= ordinatesRange[1])).map(v => v.x));
        }
        return Math.min(...this.data.map(v => v.x));
    }
    getMinOrdinateValue(abscissaRange) {
        if (abscissaRange !== undefined) {
            return Math.min(...this.data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1])).map(v => v.y));
        }
        return Math.min(...this.data.map(v => v.y));
    }
    render(options) {
    }
    resize(width, height, options) {
    }
}

// When we try to render a chart, we need to calculate the minimum length and pass it along the rendering options
class Chart {
    constructor(container) {
        this.renderingOptions = new RenderingOptions();
        this.dataSources = [];
        this.container = container;
        this.renderingOptions.displaySize = [
            this.container.offsetWidth,
            this.container.offsetHeight,
        ];
    }
    addTimeSeries() {
        let timeSeries = new TimeSeries();
        timeSeries.addEventListener('data-updated', () => {
            this.refreshAxisRangesAndPointDistances();
        });
        this.dataSources.push(timeSeries);
        return timeSeries;
    }
    refreshAxisRangesAndPointDistances() {
        if (this.dataSources.length == 0)
            return;
        // The first chart is the main chart
        let horizontalPointDistance = Math.max(1, ...this.dataSources.map(r => r.defaultDistance[0] * this.renderingOptions.zoomRatio[0]));
        let verticalPointDistance = Math.max(1, ...this.dataSources.map(r => r.defaultDistance[1] * this.renderingOptions.zoomRatio[1]));
        let abscissaRange = [
            Math.min(...this.dataSources.map(r => r.getMinAbscissaValue() || 0)),
            Math.max(...this.dataSources.map(r => r.getMaxAbscissaValue() || 0))
        ];
        let ordinatesRange = [
            Math.min(...this.dataSources.map(r => r.getMinOrdinateValue() || 0)),
            Math.max(...this.dataSources.map(r => r.getMaxOrdinateValue() || 0))
        ];
        let maxHorizontalRange = abscissaRange[1] - abscissaRange[0];
        let maxVerticalRange = ordinatesRange[1] - ordinatesRange[0];
        // Find whether the default distance is enough to display all the data
        if (maxHorizontalRange * horizontalPointDistance > this.renderingOptions.displaySize[0]) {
            horizontalPointDistance = Math.max(1, ...this.dataSources.map(r => r.minimumDistance[0]));
        }
        if (maxVerticalRange * verticalPointDistance > this.renderingOptions.displaySize[1]) {
            verticalPointDistance = Math.max(1, ...this.dataSources.map(r => r.minimumDistance[1]));
        }
        let maxVisibleAbscissaValue = abscissaRange[1] + this.renderingOptions.displayOffset[0] * horizontalPointDistance;
        let minVisibleAbscissaValue = maxVisibleAbscissaValue - Math.ceil(this.renderingOptions.displaySize[0] / horizontalPointDistance);
        abscissaRange = [Math.min(abscissaRange[0], minVisibleAbscissaValue), Math.max(abscissaRange[1], maxVisibleAbscissaValue)];
        if (this.renderingOptions.autoResizeOrdinatesAxis) {
            ordinatesRange = [
                Math.min(...this.dataSources.map(r => r.getMinOrdinateValue(abscissaRange) || Infinity)),
                Math.max(...this.dataSources.map(r => r.getMaxOrdinateValue(abscissaRange) || -Infinity)),
            ];
            if (ordinatesRange[0] > ordinatesRange[1]) {
                ordinatesRange = this.renderingOptions.ordinatesRange;
            }
        }
        else {
            let maxVisibleOrdinateValue = ordinatesRange[1] + this.renderingOptions.displayOffset[1] * verticalPointDistance;
            let minVisibleOrdinateValue = maxVisibleOrdinateValue - Math.ceil(this.renderingOptions.displaySize[1] / verticalPointDistance);
            ordinatesRange = [minVisibleOrdinateValue, maxVisibleOrdinateValue];
        }
        this.renderingOptions.abscissaRange = abscissaRange;
        this.renderingOptions.ordinatesRange = ordinatesRange;
        this.renderingOptions.pointDistance = [horizontalPointDistance, verticalPointDistance];
        console.log('rendering', this.renderingOptions);
    }
}

module.exports = Chart;
//# sourceMappingURL=aurora-charts.cjs.js.map
