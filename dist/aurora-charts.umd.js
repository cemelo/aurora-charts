(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.auroraCharts = factory());
}(this, (function () { 'use strict';

    class RenderingOptions {
        constructor() {
            this.canvasBounds = [0, 0, 0, 0];
            this.pixelRatio = (window === null || window === void 0 ? void 0 : window.devicePixelRatio) || 1;
            this.autoResizeOrdinatesAxis = false;
            this.pointDistances = [null, []];
            this.displaySize = [0, 0];
            this.abscissaRange = [0, 0];
            this.ordinatesRanges = [[0, 0]];
            this.zoomRatios = [1, [1]];
            this.displayOffset = [0, 0];
            this.cursorPosition = [0, 0];
            this.cursorHoveredRow = -1;
            this.style = {
                axisFont: `${12 * this.pixelRatio}px system-ui, sans-serif`,
                axisStrokeStyle: 'rgba(87, 87, 87, 1)',
                gridStrokeStyle: 'rgba(146, 146, 146, 1)',
                crossStrokeStyle: 'rgb(0, 0, 0)',
                crossLineWidth: 1 * this.pixelRatio,
            };
        }
    }

    class EventSource {
        constructor() {
            this.eventListeners = new Map();
        }
        addEventListener(event, callback) {
            if (this.eventListeners.has(event)) {
                this.eventListeners.get(event).push(callback);
            }
            else {
                this.eventListeners.set(event, [callback]);
            }
        }
        dispatchEvent(event, data) {
            for (let listener of this.eventListeners.get(event)) {
                listener(data);
            }
        }
    }

    function precision(n) {
        let e = 1;
        while (Math.round(n * e) / e !== n)
            e *= 10;
        return Math.log(e) / Math.LN10;
    }

    function calcX(value, step, options) {
        return options.canvasBounds[2] + (value - options.abscissaRange[0]) * step;
    }
    function calcY(row, height, value, step, options) {
        return height + options.canvasBounds[0] - ((value - options.ordinatesRanges[row][0]) * step);
    }
    function calcOrdinate(pos, row, height, options) {
        const range = options.ordinatesRanges[row][1] - options.ordinatesRanges[row][0];
        const step = height / range;
        return options.ordinatesRanges[row][0] + ((height + options.canvasBounds[0]) - pos) / step;
    }

    class TimeSeries extends EventSource {
        constructor(container, row) {
            super();
            this.defaultDistance = [10, 10];
            this.minimumDistance = [1, 1];
            this.data = [];
            const canvas = document.createElement('canvas');
            canvas.className = 'au-view';
            if (row > 0)
                canvas.setAttribute('data-secondary-row', 'true');
            container.appendChild(canvas);
            this.row = row;
            this.target = new TimeSeriesLocalRenderer(canvas, row, 2, 'rgba(255, 0, 0, 1)');
        }
        getData() {
            return this.data;
        }
        setData(data) {
            this.data = data;
            this.dispatchEvent('data-updated');
        }
        getMaxAbscissaPrecision() {
            return Math.max(...this.data.map(v => precision(v.x)));
        }
        getMaxOrdinatePrecision(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1]));
            }
            return Math.max(...data.map(v => precision(v.y)));
        }
        getMinAbscissaDiff(ordinatesRange) {
            return Math.min(...this
                .data
                .reduce((acc, _, index, arr) => {
                if (index + 2 > arr.length) {
                    return acc;
                }
                return acc.concat([[arr[index].x, arr[index + 1].x]]);
            }, [])
                .map(v => Math.abs(v[1] - v[0])));
        }
        getMinOrdinateDiff(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = this.data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1]));
            }
            return Math.min(...data.reduce((acc, _, index, arr) => {
                if (index + 2 > arr.length) {
                    return acc;
                }
                return acc.concat([[arr[index].y, arr[index + 1].y]]);
            }, [])
                .map(v => Math.abs(v[1] - v[0])));
        }
        getMaxAbscissaValue(ordinatesRange) {
            let data = this.data;
            if (ordinatesRange !== undefined) {
                data = data.filter(v => (v.y >= ordinatesRange[0] && v.y <= ordinatesRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.max(...data.map(v => v.x));
        }
        getMaxOrdinateValue(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.max(...data.map(v => v.y));
        }
        getMinAbscissaValue(ordinatesRange) {
            let data = this.data;
            if (ordinatesRange !== undefined) {
                data = data.filter(v => (v.y >= ordinatesRange[0] && v.y <= ordinatesRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.min(...data.map(v => v.x));
        }
        getMinOrdinateValue(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.min(...data.map(v => v.y));
        }
        render(options) {
            this.target.render(Object.assign(Object.assign({}, options), { data: this.data }));
        }
        resize(width, height, options) {
            this.target.resize(width, height, Object.assign(Object.assign({}, options), { data: this.data }));
        }
    }
    class TimeSeriesLocalRenderer {
        constructor(canvas, row, lineWidth, lineColor) {
            this.canvas = canvas;
            this.row = row;
            this.lineWidth = lineWidth;
            this.strokeStyle = lineColor;
        }
        render(options) {
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.beginPath();
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth * options.pixelRatio;
            ctx.lineJoin = 'round';
            const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
            const rangeOrdinates = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
            const stepOrdinates = actualHeight / rangeOrdinates;
            const actualWidth = this.canvas.offsetWidth - options.canvasBounds[2] - options.canvasBounds[3];
            const rangeAbscissa = options.abscissaRange[1] - options.abscissaRange[0];
            const stepAbscissa = actualWidth / rangeAbscissa;
            options.data.filter(({ x, y }) => (x >= options.abscissaRange[0] - stepAbscissa && x <= options.abscissaRange[1] + stepAbscissa)).forEach(({ x, y }, idx) => {
                const yPos = calcY(this.row, actualHeight, y, stepOrdinates, options) * options.pixelRatio;
                const xPos = calcX(x, stepAbscissa, options) * options.pixelRatio;
                if (idx === 0) {
                    ctx.moveTo(xPos, yPos);
                }
                else {
                    ctx.lineTo(xPos, yPos);
                }
            });
            ctx.stroke();
        }
        resize(width, height, options) {
            this.canvas.width = width * options.pixelRatio;
            this.canvas.height = height * options.pixelRatio;
            this.render(options);
        }
    }

    class CandleStickSeries extends EventSource {
        constructor(container, row) {
            super();
            this.defaultDistance = [12, 1];
            this.minimumDistance = [6, 2];
            this.data = [];
            const canvas = document.createElement('canvas');
            canvas.className = 'au-view';
            canvas.style.setProperty('--au-chart-row', (row + 1).toString());
            if (row > 0)
                canvas.setAttribute('data-secondary-row', 'true');
            container.appendChild(canvas);
            const defaultOptions = {
                strokeStyle: (record) => {
                    if (record.open > record.close) {
                        return "#FF0000";
                    }
                    else if (record.open < record.close) {
                        return "#00FF00";
                    }
                    else {
                        return "#000000";
                    }
                },
                candleFillStyle: (record) => {
                    if (record.open > record.close) {
                        return "#FF0000";
                    }
                    else if (record.open < record.close) {
                        return "#00FF00";
                    }
                    else {
                        return "#000000";
                    }
                }
            };
            this.row = row;
            this.target = new CandleStickSeriesLocalRenderer(canvas, row, defaultOptions.strokeStyle, defaultOptions.candleFillStyle);
        }
        getData() {
            return this.data;
        }
        setData(data) {
            this.data = data;
            this.dispatchEvent('data-updated');
        }
        setOptions(options) {
            this.target.setOptions(options);
            if (this.cachedRenderingOptions) {
                requestAnimationFrame(() => this.render(this.cachedRenderingOptions));
            }
        }
        getMaxAbscissaPrecision() {
            return Math.max(...this.data.map(v => precision(v.timestamp)));
        }
        getMaxOrdinatePrecision(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = this.data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]));
            }
            return Math.max(...data.map(v => Math.max(precision(v.open), precision(v.close), precision(v.high), precision(v.low))));
        }
        getMinAbscissaDiff() {
            return Math.min(...this
                .data
                .reduce((acc, _, index, arr) => {
                if (index + 2 > arr.length) {
                    return acc;
                }
                return acc.concat([[arr[index].timestamp, arr[index + 1].timestamp]]);
            }, [])
                .map(v => Math.abs(v[1] - v[0])));
        }
        getMinOrdinateDiff(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = this.data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]));
            }
            let flatData = data.flatMap(record => [record.low, record.high, record.open, record.close]);
            flatData.sort();
            return Math.min(...flatData.reduce((acc, _, index, arr) => {
                if (index + 2 > arr.length) {
                    return acc;
                }
                return acc.concat([[arr[index], arr[index + 1]]]);
            }, []).map(v => Math.abs(v[1] - v[0])));
        }
        getMaxAbscissaValue(ordinatesRange) {
            let data = this.data;
            if (ordinatesRange !== undefined) {
                data = data.filter(v => (v.low >= ordinatesRange[0] && v.high <= ordinatesRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.max(...data.map(v => v.timestamp));
        }
        getMaxOrdinateValue(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.max(...data.map(v => v.high));
        }
        getMinAbscissaValue(ordinatesRange) {
            let data = this.data;
            if (ordinatesRange !== undefined) {
                data = data.filter(v => (v.low >= ordinatesRange[0] && v.high <= ordinatesRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.min(...data.map(v => v.timestamp));
        }
        getMinOrdinateValue(abscissaRange) {
            let data = this.data;
            if (abscissaRange !== undefined) {
                data = data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1]));
            }
            if (data.length === 0)
                return null;
            return Math.min(...data.map(v => v.low));
        }
        render(options) {
            this.cachedRenderingOptions = options;
            this.target.render(Object.assign(Object.assign({}, options), { data: this.data }));
        }
        resize(width, height, options) {
            this.target.resize(width, height, Object.assign(Object.assign({}, options), { data: this.data }));
        }
    }
    class CandleStickSeriesLocalRenderer {
        constructor(canvas, row, strokeStyle, candleFillStyle) {
            this.strokeStyle = () => '#000000';
            this.candleFillStyle = () => '#000000';
            this.canvas = canvas;
            this.row = row;
            this.candleFillStyle = candleFillStyle || this.candleFillStyle;
            this.strokeStyle = strokeStyle || this.strokeStyle;
        }
        setOptions(options) {
            this.strokeStyle = options.strokeStyle || this.strokeStyle;
            this.candleFillStyle = options.candleFillStyle || this.candleFillStyle;
        }
        render(options) {
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
            options.data.filter(({ timestamp }) => (timestamp >= options.abscissaRange[0] - stepAbscissa && timestamp <= options.abscissaRange[1] + stepAbscissa)).forEach((record, idx) => {
                const { timestamp, high, low, open, close } = record;
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
                }
                else {
                    ctx.fillStyle = this.candleFillStyle(record);
                    ctx.fillRect(xPos - stepAbscissa / 2, Math.min(openPos, closePos), stepAbscissa, Math.abs(openPos - closePos));
                }
                ctx.stroke();
            });
        }
        resize(width, height, options) {
            this.canvas.width = width * options.pixelRatio;
            this.canvas.height = height * options.pixelRatio;
            this.render(options);
        }
    }

    var LabelRange;
    (function (LabelRange) {
        LabelRange[LabelRange["Any"] = 0] = "Any";
        LabelRange[LabelRange["Included"] = 1] = "Included";
        LabelRange[LabelRange["Excluded"] = 2] = "Excluded";
    })(LabelRange || (LabelRange = {}));

    const ExtendedWilkinson = new class ExtendedWilkinson {
        constructor() {
            this.W = [0.2, 0.25, 0.5, 0.05];
            this.Q = [1.0, 5.0, 2.0, 2.5, 4.0, 3.0];
        }
        generate(dmin, dmax, maxLabels, labelInclusion = LabelRange.Included) {
            if (dmin === dmax) {
                return { max: dmax, min: dmin, labels: [dmin], step: 1 };
            }
            let outMin = 1;
            let outMax = 1;
            let outStep = 1;
            let bestScore = -2;
            jLoop: for (let j = 1; j < Infinity; j++) {
                for (let qpos = 0; qpos < this.Q.length; qpos++) {
                    let q = this.Q[qpos];
                    let sm = this.simplicityMax(qpos, this.Q.length, j);
                    if ((this.score(1., sm, 1., 1.)) < bestScore) {
                        break jLoop;
                    }
                     for (let k = 2; k < Infinity; k++) {
                        let dm = this.densityMax(k, maxLabels);
                        if ((this.score(1., sm, dm, 1.)) < bestScore) {
                            break;
                        }
                        let delta = (dmax - dmin) / (k + 1.0) / j / q;
                         for (let z = Math.ceil(Math.log10(delta)); z < Infinity; z++) {
                            let step = j * q * Math.pow(10.0, z);
                            let cm = this.coverageMax(dmin, dmax, step * (k - 1.0));
                            let scrt = this.score(cm, sm, dm, 1.);
                            if (scrt < bestScore) {
                                break;
                            }
                            let min_start = Math.floor(dmax / step) * j - (k - 1.0) * j;
                            let max_start = Math.ceil(dmin / step) * j;
                            if (min_start > max_start) {
                                break;
                            }
                            let start = min_start;
                            while (start <= max_start) {
                                let lmin = start * (step / j);
                                let lmax = lmin + step * (k - 1.0);
                                let lstep = step;
                                let c = this.coverage(dmin, dmax, lmin, lmax);
                                let s = this.simplicity(qpos, this.Q.length, j, lmin, lmax, lstep);
                                let g = this.density(k, maxLabels, dmin, dmax, lmin, lmax);
                                let l = 1.0;
                                let calculatedScore = this.score(c, s, g, l);
                                start += 1.0;
                                if (!((calculatedScore <= bestScore) ||
                                    (labelInclusion === LabelRange.Any) ||
                                    (labelInclusion === LabelRange.Included && ((lmin < dmin) && (lmax > dmax))) ||
                                    (labelInclusion === LabelRange.Excluded && ((lmin > dmin) && (lmax < dmax))))) {
                                    bestScore = calculatedScore;
                                    outMin = lmin;
                                    outMax = lmax;
                                    outStep = lstep;
                                }
                            }
                        }
                    }
                }
            }
            let result = [];
            while (outMin <= outMax) {
                result.push(outMin);
                // TODO maybe optimize this by transforming the number into an integer, then dividing it back into its decimal form
                outMin = Number((outMin + outStep).toPrecision(10));
            }
            return { max: outMax, min: outMin, labels: result, step: outStep };
        }
        flooredMod(a, n) {
            return Math.floor(a - n * (a / n));
        }
        simplicity(qpos, qlen, j, lmin, lmax, lstep) {
            let v = 0;
            if (this.flooredMod(lmin, lstep) < 1e-10 && lmin <= 0. && lmax >= 0.) {
                v = 1.0;
            }
            return 1.0 - qpos / (qlen - 1.0) + v - j;
        }
        simplicityMax(qpos, qlen, j) {
            return 1.0 - qpos / (qlen - 1.0) - j + 1.0;
        }
        coverage(dmin, dmax, lmin, lmax) {
            return 1.0 - 0.5 * (Math.pow(dmax - lmax, 2) + Math.pow(dmin - lmin, 2)) / Math.pow(0.1 * (dmax - dmin), 2);
        }
        coverageMax(dmin, dmax, span) {
            let range = dmax - dmin;
            if (span > range) {
                let half = (span - range) / 2.0;
                return 1.0 - 0.5 * (Math.pow(half, 2) + Math.pow(half, 2)) / Math.pow(0.1 * range, 2);
            }
            else {
                return 1.0;
            }
        }
        density(k, m, dmin, dmax, lmin, lmax) {
            let r = (k - 1.0) / (lmax - lmin);
            let rt = (m - 1.0) / (Math.max(lmax, dmax) - Math.min(lmin, dmin));
            return 2.0 - Math.max(r / rt, rt / r);
        }
        densityMax(k, m) {
            if (k >= m) {
                return 2.0 - (k - 1.0) / (m - 1.0);
            }
            else {
                return 1.0;
            }
        }
        score(c, s, g, l) {
            return this.W[0] * c + this.W[1] * s + this.W[2] * g + this.W[3] * l;
        }
    };

    function shallowArrayCompare(a, b) {
        if (a === undefined || b === undefined)
            return false;
        if (a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i])
                return false;
        }
        return true;
    }

    class AbscissaAxisRenderer {
        constructor(container) {
            this.canvas = document.createElement('canvas');
            this.canvas.classList.add('au-abscissa');
            container.appendChild(this.canvas);
            this.target = new AbscissaLocalAxisRenderer(this.canvas, ExtendedWilkinson);
        }
        render(options) {
            return this.target.render(options);
        }
        resize(width, height, options) {
            this.target.resize(width, height, options);
        }
        setLabelFormatter(f) {
            this.target.setLabelFormatter(f);
        }
        setLabelGenerator(generator) {
            this.target.setLabelGenerator(generator);
        }
    }
    class AbscissaLocalAxisRenderer {
        constructor(canvas, labelGenerator) {
            this.formatter = n => n.toString();
            this.cachedRenderingOptions = new RenderingOptions();
            this.canvas = canvas;
            this.labelGenerator = labelGenerator;
        }
        render(options) {
            const shouldRedraw = this.canvas.width !== this.canvas.offsetWidth * options.pixelRatio ||
                this.canvas.height !== this.canvas.offsetHeight * options.pixelRatio ||
                !shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange);
            if (!shouldRedraw)
                return this.cachedLabelProps;
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
            }
            else {
                this.cachedLabelProps.labels = [];
                // This ugly branch is necessary to avoid float point overflow
                if (options.abscissaRange[0] < this.cachedLabelProps.min) {
                    let currLabel = options.abscissaRange[0] + Math.abs(options.abscissaRange[0] - this.cachedLabelProps.min) % this.cachedLabelProps.step - this.cachedLabelProps.step;
                    while (currLabel <= options.abscissaRange[1]) {
                        this.cachedLabelProps.labels.push(currLabel);
                        currLabel = Number((currLabel + this.cachedLabelProps.step).toPrecision(10));
                    }
                }
                else {
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
                if (xPos < 0 || xPos > options.displaySize[0] * options.pixelRatio)
                    return;
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
        resize(width, height, options) {
            this.render(options);
        }
        setLabelFormatter(f) {
            this.formatter = f;
        }
        setLabelGenerator(generator) {
            this.labelGenerator = generator;
        }
    }

    class OrdinatesAxisRenderer {
        constructor(container, row) {
            this.canvas = document.createElement('canvas');
            this.canvas.classList.add('au-ordinates');
            if (row > 0)
                this.canvas.setAttribute('data-secondary-row', 'true');
            container.appendChild(this.canvas);
            this.target = new OrdinatesLocalAxisRenderer(this.canvas, ExtendedWilkinson, row);
        }
        render(options) {
            return this.target.render(options);
        }
        resize(width, height, options) {
            this.target.resize(width, height, options);
        }
        setLabelFormatter(f) {
            this.target.setLabelFormatter(f);
        }
        setLabelGenerator(generator) {
            this.target.setLabelGenerator(generator);
        }
    }
    class OrdinatesLocalAxisRenderer {
        constructor(canvas, labelGenerator, rowNumber) {
            this.formatter = n => n.toString();
            this.row = 0;
            this.cachedRenderingOptions = new RenderingOptions();
            this.canvas = canvas;
            this.row = rowNumber;
            this.labelGenerator = labelGenerator;
            this.cachedLabelProps = { labels: [], max: 0, min: 0, step: 0 };
        }
        render(options) {
            const ctx = this.canvas.getContext('2d');
            const shouldRedraw = this.canvas.width !== this.canvas.offsetWidth * options.pixelRatio ||
                this.canvas.height !== this.canvas.offsetHeight * options.pixelRatio ||
                !shallowArrayCompare(options.ordinatesRanges[this.row], this.cachedRenderingOptions.ordinatesRanges[this.row]) ||
                options.cursorPosition[1] === 0 ||
                options.cursorPosition[1] !== this.cachedRenderingOptions.cursorPosition[1];
            if (!shouldRedraw)
                return this.cachedLabelProps;
            this.canvas.width = this.canvas.offsetWidth * options.pixelRatio;
            this.canvas.height = this.canvas.offsetHeight * options.pixelRatio;
            ctx.clearRect(0, 0, this.canvas.width * options.pixelRatio, this.canvas.height * options.pixelRatio);
            ctx.beginPath();
            ctx.font = options.style.axisFont;
            ctx.strokeStyle = options.style.axisStrokeStyle;
            ctx.textBaseline = 'middle';
            const fontHeight = ctx.measureText('0').actualBoundingBoxAscent;
            const minTextSpacing = 50 * options.pixelRatio;
            const maxLabels = Math.floor((this.canvas.height * options.pixelRatio + minTextSpacing) / (fontHeight + minTextSpacing));
            const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
            const labelProps = ExtendedWilkinson.generate(options.ordinatesRanges[this.row][0], options.ordinatesRanges[this.row][1], maxLabels);
            const range = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
            const step = actualHeight / range;
            // Boundary
            ctx.moveTo(options.pixelRatio, 0);
            ctx.lineTo(options.pixelRatio, this.canvas.height + 2);
            labelProps.labels.forEach(value => {
                const label = this.formatter(value);
                const xPos = options.pixelRatio;
                const yPos = calcY(this.row, actualHeight, value, step, options) * options.pixelRatio;
                if ((yPos + fontHeight / 2) > this.canvas.height || (yPos - fontHeight / 2) < 0)
                    return;
                ctx.fillText(label, xPos + 7 * options.pixelRatio, yPos, (90 * options.pixelRatio));
                ctx.moveTo(0, yPos);
                ctx.lineTo(5 * options.pixelRatio, yPos);
            });
            this.cachedActualHeight = actualHeight;
            this.cachedStep = step;
            this.cachedRenderingOptions.ordinatesRanges[this.row] = options.ordinatesRanges[this.row];
            this.cachedLabelProps = labelProps;
            ctx.stroke();
            // Draw reference
            if (options.cursorHoveredRow === this.row && options.cursorPosition[1] !== 0) {
                const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
                const currValue = calcOrdinate(options.cursorPosition[1], this.row, actualHeight, options);
                const labelWidth = ctx.measureText(this.formatter(currValue)).width;
                const rectTopY = Math.max(0, Math.min((this.canvas.offsetHeight - fontHeight - 10) * options.pixelRatio, (options.cursorPosition[1] - fontHeight / 2 - 5) * options.pixelRatio));
                const rectMiddleY = Math.max((fontHeight / 2 + 5) * options.pixelRatio, Math.min((this.canvas.offsetHeight - fontHeight / 2 - 5) * options.pixelRatio, options.cursorPosition[1] * options.pixelRatio));
                const rectBottomY = Math.max((fontHeight + 10) * options.pixelRatio, Math.min((this.canvas.offsetHeight - 1) * options.pixelRatio, (options.cursorPosition[1] + fontHeight / 2 + 5) * options.pixelRatio));
                ctx.beginPath();
                ctx.moveTo(0, options.cursorPosition[1] * options.pixelRatio);
                ctx.lineTo(5 * options.pixelRatio, rectTopY);
                ctx.lineTo(labelWidth + 15 * options.pixelRatio, rectTopY);
                ctx.lineTo(labelWidth + 15 * options.pixelRatio, rectBottomY);
                ctx.lineTo(5 * options.pixelRatio, rectBottomY);
                ctx.closePath();
                ctx.fillStyle = 'rgb(41, 100, 148)';
                ctx.fill('nonzero');
                ctx.stroke();
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(this.formatter(currValue), 10 * options.pixelRatio, rectMiddleY, this.canvas.width - 15 * options.pixelRatio);
            }
            return this.cachedLabelProps;
        }
        resize(width, height, options) {
            this.render(options);
        }
        setLabelFormatter(f) {
            this.formatter = f;
        }
        setLabelGenerator(generator) {
            this.labelGenerator = generator;
        }
    }

    function createId() {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 8; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    class GridRenderer {
        constructor(container, row) {
            this.crossCanvas = document.createElement('canvas');
            this.crossCanvas.classList.add('au-grid', 'au-cross');
            this.gridCanvas = document.createElement('canvas');
            this.gridCanvas.classList.add('au-grid');
            container.appendChild(this.crossCanvas);
            container.appendChild(this.gridCanvas);
            this.target = new GridLocalRenderer(this.crossCanvas, this.gridCanvas, row);
            this.row = row;
        }
        render(options) {
            return this.target.render(options);
        }
        resize(width, height, options) {
            this.target.resize(width, height, options);
        }
    }
    class GridLocalRenderer {
        constructor(crossCanvas, gridCanvas, row) {
            this.cachedRenderingOptions = new RenderingOptions();
            this.crossCanvas = crossCanvas;
            this.gridCanvas = gridCanvas;
            this.row = row;
        }
        render(options) {
            var _a, _b, _c, _d, _e, _f;
            const shouldRedrawGrid = this.gridCanvas.width !== this.gridCanvas.offsetWidth * options.pixelRatio ||
                this.gridCanvas.height !== this.gridCanvas.offsetHeight * options.pixelRatio ||
                !shallowArrayCompare(options.cursorPosition, this.cachedRenderingOptions.cursorPosition) ||
                !shallowArrayCompare((_a = options.abscissaLabelProps) === null || _a === void 0 ? void 0 : _a.labels, (_b = this.cachedAbscissaLabels) === null || _b === void 0 ? void 0 : _b.labels) ||
                !shallowArrayCompare((_c = options.ordinatesLabelProps) === null || _c === void 0 ? void 0 : _c.labels, (_d = this.cachedOrdinateLabels) === null || _d === void 0 ? void 0 : _d.labels) ||
                !shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange) ||
                !shallowArrayCompare(options.ordinatesRanges[this.row], this.cachedRenderingOptions.ordinatesRanges[this.row]);
            if (!shouldRedrawGrid)
                return;
            this.gridCanvas.height = this.gridCanvas.offsetHeight * options.pixelRatio;
            this.gridCanvas.width = this.gridCanvas.offsetWidth * options.pixelRatio;
            this.crossCanvas.height = this.crossCanvas.offsetHeight * options.pixelRatio;
            this.crossCanvas.width = this.crossCanvas.offsetWidth * options.pixelRatio;
            const ctxGrid = this.gridCanvas.getContext('2d');
            ctxGrid.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
            ctxGrid.beginPath();
            this.cachedAbscissaLabels = options.abscissaLabelProps;
            this.cachedOrdinateLabels = options.ordinatesLabelProps;
            // Grid
            ctxGrid.strokeStyle = options.style.gridStrokeStyle;
            const actualWidth = this.gridCanvas.width - options.canvasBounds[2] - options.canvasBounds[3];
            const aRange = options.abscissaRange[1] - options.abscissaRange[0];
            const aStep = actualWidth / aRange;
            (_e = this.cachedAbscissaLabels) === null || _e === void 0 ? void 0 : _e.labels.forEach(value => {
                const xPos = calcX(value, aStep, options);
                if (xPos > this.gridCanvas.width ||
                    xPos < 0)
                    return;
                ctxGrid.moveTo(xPos, 0);
                ctxGrid.lineTo(xPos, this.gridCanvas.height);
            });
            const actualHeight = this.gridCanvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
            const oRange = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
            const oStep = actualHeight / oRange;
            (_f = this.cachedOrdinateLabels) === null || _f === void 0 ? void 0 : _f.labels.forEach(value => {
                const yPos = calcY(this.row, actualHeight, value, oStep, options) * options.pixelRatio;
                if (yPos > this.gridCanvas.height ||
                    yPos < 0)
                    return;
                ctxGrid.moveTo(0, yPos);
                ctxGrid.lineTo(this.gridCanvas.width + 1, yPos);
            });
            ctxGrid.stroke();
            // Cross
            if (options.cursorPosition[0] === 0 || options.cursorPosition[1] === 0) {
                return;
            }
            const ctxCross = this.crossCanvas.getContext('2d');
            ctxCross.clearRect(0, 0, this.crossCanvas.width, this.crossCanvas.height);
            ctxCross.beginPath();
            if (ctxCross.getLineDash().length === 0) {
                ctxCross.setLineDash([3 * options.pixelRatio, 3 * options.pixelRatio]);
                ctxCross.strokeStyle = options.style.crossStrokeStyle;
                ctxCross.lineWidth = options.style.crossLineWidth;
            }
            if (options.cursorHoveredRow === this.row) {
                // Draw horizontal line
                const yPos = options.cursorPosition[1] * options.pixelRatio;
                ctxCross.moveTo(0, yPos);
                ctxCross.lineTo(this.gridCanvas.width, yPos);
            }
            // Draw vertical line
            const xPos = options.cursorPosition[0] * options.pixelRatio;
            ctxCross.moveTo(xPos, 0);
            ctxCross.lineTo(xPos, this.gridCanvas.height);
            ctxCross.stroke();
        }
        resize(width, height, options) {
            this.render(options);
        }
    }

    // One ordinate range per row
    class Chart {
        constructor(container) {
            this.renderingOptions = new RenderingOptions();
            this.rows = [];
            this.componentId = createId();
            this.dataSources = [];
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
        addRow(height, title) {
            const rowElement = this.createRow();
            if (height === 'auto')
                rowElement.style.height = '100%';
            else
                rowElement.style.height = height;
            this.rows.push(rowElement);
            this.container.insertBefore(rowElement, this.abscissaContainer);
            const row = this.rows.length - 1;
            const newView = document.createElement('div');
            newView.className = 'au-view';
            newView.style.zIndex = '1001';
            this.views.push(newView);
            this.rows[row].appendChild(newView);
            this.addViewEventListeners(newView, row);
            this.ordinatesRenderers.push(new OrdinatesAxisRenderer(this.rows[row], row));
            this.renderingOptions.ordinatesRanges.push([0, 0]);
            this.renderingOptions.zoomRatios[1].push(1);
            this.renderingOptions.pointDistances[1].push(1);
            this.gridRenderers.push(new GridRenderer(this.rows[row], row));
            if (title !== undefined) {
                const titleWrapper = document.createElement('div');
                const titleElement = document.createElement('h2');
                titleElement.innerText = title;
                titleWrapper.classList.add('au-section-title');
                titleWrapper.appendChild(titleElement);
                this.rows[row].prepend(titleWrapper);
                this.rows[row].style.setProperty('--au-chart-row', '2');
                this.rows[row].classList.add('au-title-visible');
            }
        }
        addTimeSeries(row = 0) {
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
        addCandleStickSeries(row = 0) {
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
        setAbscissaLabelFormatter(f) {
            this.abscissaRenderer.setLabelFormatter(f);
        }
        setOrdinatesLabelFormatter(f, row) {
            if (row == null) {
                this.ordinatesRenderers.forEach(r => r.setLabelFormatter(f));
            }
            else if (this.ordinatesRenderers.length > row) {
                this.ordinatesRenderers[row].setLabelFormatter(f);
            }
        }
        refreshViews(fitAbscissaAxis = false, fitOrdinateAxis = true) {
            if (this.rows.length === 0)
                return;
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
                gridRenderer.render(Object.assign(Object.assign({}, this.renderingOptions), { abscissaLabelProps, ordinatesLabelProps }));
            });
            this.dataSources.forEach(s => s.render(this.renderingOptions));
        }
        refreshAbscissaRanges(fitToWidth = false) {
            if (this.dataSources.length == 0)
                return;
            let abscissaPrecision = Math.max(...this.dataSources.map(r => r.getMaxAbscissaPrecision()));
            let minHorizontalPointDistance = Math.max(0, ...this.dataSources.map(r => r.minimumDistance[0]));
            let horizontalPointDistance = this.renderingOptions.pointDistances[0];
            let abscissaRange = [
                Math.min(...this.dataSources.map(r => r.getMinAbscissaValue() || 0)),
                Math.max(...this.dataSources.map(r => r.getMaxAbscissaValue() || 0))
            ];
            let abscissaStep = Math.min(...this.dataSources.map(r => r.getMinAbscissaDiff())) || Math.pow(10, -abscissaPrecision);
            if (horizontalPointDistance == null || fitToWidth) {
                horizontalPointDistance = Math.max(minHorizontalPointDistance, ...this.dataSources.map(r => r.defaultDistance[0] * this.renderingOptions.zoomRatios[0]));
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
        refreshOrdinateRanges(row, fitToHeight = false) {
            const sources = this.dataSources.filter(ds => ds.row === row);
            if (sources.length == 0)
                return;
            let ordinatePrecision = Math.max(...sources.map(r => r.getMaxOrdinatePrecision()));
            let minVerticalPointDistance = Math.max(0, ...sources.map(r => r.minimumDistance[1]));
            let verticalPointDistance = this.renderingOptions.pointDistances[1][row];
            let ordinatesRange = [
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
                    Math.max(minVerticalPointDistance, ...sources.map(r => r.defaultDistance[1] * this.renderingOptions.zoomRatios[1][row]));
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
        createRow() {
            let row = document.createElement('div');
            row.classList.add('au-row');
            return row;
        }
        addViewEventListeners(view, row) {
            let chartMoveStarted = false;
            view.addEventListener('mousedown', (e) => {
                chartMoveStarted = true;
                view.classList.add('au-moving');
                this.renderingOptions.cursorPosition = [0, 0];
                this.renderingOptions.cursorHoveredRow = -1;
                requestAnimationFrame(() => this.refreshViews());
                e.preventDefault();
            });
            view.addEventListener('mousemove', (e) => {
                this.renderingOptions.cursorHoveredRow = row;
                if (chartMoveStarted) {
                    this.renderingOptions.displayOffset[0] -= e.movementX;
                    requestAnimationFrame(() => this.refreshViews());
                }
                else {
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
                this.renderingOptions.cursorHoveredRow = row;
                requestAnimationFrame(() => this.refreshViews());
            });
            view.addEventListener('mouseleave', (e) => {
                chartMoveStarted = false;
                view.classList.remove('au-moving');
                this.renderingOptions.cursorPosition = [0, 0];
                this.renderingOptions.cursorHoveredRow = -1;
                requestAnimationFrame(() => this.refreshViews());
            });
            view.addEventListener('wheel', (e) => {
                this.renderingOptions.displayOffset[0] += e.deltaX;
                requestAnimationFrame(() => this.refreshViews());
                e.preventDefault();
            });
        }
        addMainEventListeners() {
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
        }
    }

    return Chart;

})));
//# sourceMappingURL=aurora-charts.umd.js.map
