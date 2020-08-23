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

    class TimeSeries extends EventSource {
        constructor(container, row) {
            super();
            this.defaultDistance = [10, 10];
            this.minimumDistance = [1, 1];
            this.data = [];
            const canvas = document.createElement('canvas');
            canvas.className = 'au-view';
            canvas.style.setProperty('--au-chart-row', (row + 1).toString());
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
            const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
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
            const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
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
                return;
            this.canvas.width = this.canvas.offsetWidth * options.pixelRatio;
            this.canvas.height = this.canvas.offsetHeight * options.pixelRatio;
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(87, 87, 87, 1)';
            ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.textAlign = 'center';
            let maxTextWidth = 0;
            for (let value of this.labelGenerator.generate(options.abscissaRange[0], options.abscissaRange[1], 20).labels) {
                const width = ctx.measureText(this.formatter(value)).width;
                maxTextWidth = Math.max(maxTextWidth, width);
            }
            const minTextSpacing = 20 * options.pixelRatio;
            const maxLabels = Math.floor((options.displaySize[0] * options.pixelRatio + minTextSpacing) / (maxTextWidth + minTextSpacing));
            const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
            const labelProps = ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], maxLabels);
            const range = options.abscissaRange[1] - options.abscissaRange[0];
            const step = actualWidth / range;
            labelProps.labels.forEach(value => {
                const label = this.formatter(value);
                const xPos = calcX(value, step, options) * options.pixelRatio;
                if (xPos < 0 || xPos > options.displaySize[0] * options.pixelRatio)
                    return;
                ctx.fillText(label, xPos, 7 * options.pixelRatio);
                ctx.moveTo(xPos, 0);
                ctx.lineTo(xPos, 5 * options.pixelRatio);
            });
            this.cachedLabels = labelProps.labels;
            this.cachedActualWidth = actualWidth;
            this.cachedStep = step;
            this.cachedRenderingOptions.abscissaRange = options.abscissaRange;
            ctx.stroke();
            return labelProps.labels;
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
        constructor(container, rowNumber) {
            this.canvas = document.createElement('canvas');
            this.canvas.classList.add('au-ordinates');
            this.canvas.style.setProperty('--au-chart-row', (rowNumber + 1).toString());
            container.appendChild(this.canvas);
            this.target = new OrdinatesLocalAxisRenderer(this.canvas, ExtendedWilkinson, rowNumber);
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
        }
        render(options) {
            const shouldRedraw = this.canvas.width !== this.canvas.offsetWidth * options.pixelRatio ||
                this.canvas.height !== this.canvas.offsetHeight * options.pixelRatio ||
                !shallowArrayCompare(options.ordinatesRanges[this.row], this.cachedRenderingOptions.ordinatesRanges[this.row]);
            if (!shouldRedraw)
                return;
            this.canvas.width = this.canvas.offsetWidth * options.pixelRatio;
            this.canvas.height = this.canvas.offsetHeight * options.pixelRatio;
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width * options.pixelRatio, this.canvas.height * options.pixelRatio);
            ctx.beginPath();
            ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
            ctx.textBaseline = 'middle';
            const fontHeight = ctx.measureText('0').actualBoundingBoxAscent;
            const minTextSpacing = 50 * options.pixelRatio;
            const maxLabels = Math.floor((this.canvas.height * options.pixelRatio + minTextSpacing) / (fontHeight + minTextSpacing));
            const actualHeight = this.canvas.offsetHeight - options.canvasBounds[0] - options.canvasBounds[1];
            const labelProps = ExtendedWilkinson.generate(options.ordinatesRanges[this.row][0], options.ordinatesRanges[this.row][1], maxLabels);
            const range = options.ordinatesRanges[this.row][1] - options.ordinatesRanges[this.row][0];
            const step = actualHeight / range;
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
            ctx.stroke();
            return labelProps.labels;
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

    // One ordinate range per row
    class Chart {
        constructor(container) {
            this.renderingOptions = new RenderingOptions();
            this.rowHeights = ['auto'];
            this.componentId = createId();
            this.dataSources = [];
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
        addEventListeners() {
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
        addRow(height) {
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
        addTimeSeries(row = 0) {
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
        addCandleStickSeries(row = 0) {
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
        refreshViews(fitAbscissaAxis = false, fitOrdinateAxis = true) {
            if (this.rowHeights.length === 0)
                return;
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
    }

    return Chart;

})));
//# sourceMappingURL=aurora-charts.umd.js.map
