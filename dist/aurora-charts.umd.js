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
            this.pointDistance = [null, null];
            this.displaySize = [0, 0];
            this.abscissaRange = [0, 0];
            this.ordinatesRange = [0, 0];
            this.zoomRatio = [1, 1];
            this.displayOffset = [0, 0];
            this.abscissaLabelGenerator = null;
            this.ordinatesLabelGenerator = null;
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
    function calcY(value, step, options) {
        const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
        return actualHeight + options.canvasBounds[0] - ((value - options.ordinatesRange[0]) * step);
    }
    function calcAbscissa(pos, options) {
        const range = options.abscissaRange[1] - options.abscissaRange[0];
        const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
        const step = actualWidth / range;
        return ((pos - options.canvasBounds[2]) / step) + options.abscissaRange[0];
    }
    function calcOrdinate(pos, options) {
        const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
        const range = options.ordinatesRange[1] - options.ordinatesRange[0];
        const step = actualHeight / range;
        return options.ordinatesRange[0] - ((pos - actualHeight - options.canvasBounds[0]) / step);
    }

    class TimeSeries extends EventSource {
        constructor(container) {
            super();
            this.defaultDistance = [10, 10];
            this.minimumDistance = [1, 1];
            this.data = [];
            const canvas = document.createElement('canvas');
            canvas.className = 'au-view';
            container.appendChild(canvas);
            this.target = new TimeSeriesLocalRenderer(canvas, 2, 'rgba(255, 0, 0, 1)');
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
                data = this.data.filter(v => (v.x >= abscissaRange[0] && v.x <= abscissaRange[1]));
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
            this.target.render(Object.assign(Object.assign({}, options), { data: this.data }));
        }
        resize(width, height, options) {
            this.target.resize(width, height, Object.assign(Object.assign({}, options), { data: this.data }));
        }
    }
    class TimeSeriesLocalRenderer {
        constructor(canvas, lineWidth, lineColor) {
            this.canvas = canvas;
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
            const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
            const rangeOrdinates = options.ordinatesRange[1] - options.ordinatesRange[0];
            const stepOrdinates = actualHeight / rangeOrdinates;
            const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
            const rangeAbscissa = options.abscissaRange[1] - options.abscissaRange[0];
            const stepAbscissa = actualWidth / rangeAbscissa;
            options.data.filter(({ x, y }) => (x >= options.abscissaRange[0] - stepAbscissa && x <= options.abscissaRange[1] + stepAbscissa)).forEach(({ x, y }, idx) => {
                const yPos = calcY(y, stepOrdinates, options) * options.pixelRatio;
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

    class ChartBase {
        constructor(container) {
            this.target = new ChartBaseLocalRenderer(container);
        }
        render(options) {
            this.target.render(options);
        }
        resize(width, height, options) {
            this.target.resize(width, height, options);
        }
    }
    class ChartBaseLocalRenderer {
        constructor(container) {
            this.abscissaFormatter = n => n.toString();
            this.ordinatesFormatter = n => n.toString();
            this.cachedRenderingOptions = new RenderingOptions();
            this.abscissaCanvas = document.createElement('canvas');
            this.ordinateCanvas = document.createElement('canvas');
            this.gridCanvas = document.createElement('canvas');
            this.viewCanvas = document.createElement('canvas');
            this.abscissaCanvas.className = 'au-abscissa';
            this.ordinateCanvas.className = 'au-ordinates';
            this.gridCanvas.className = 'au-chart-base';
            this.viewCanvas.className = 'au-view';
            this.viewCanvas.style.zIndex = '999';
            container.appendChild(this.viewCanvas);
            container.appendChild(this.abscissaCanvas);
            container.appendChild(this.ordinateCanvas);
            container.appendChild(this.gridCanvas);
        }
        render(options) {
            let renderGrid = false;
            if (this.gridCanvas.width !== this.gridCanvas.offsetWidth * options.pixelRatio ||
                this.gridCanvas.height !== this.gridCanvas.offsetHeight * options.pixelRatio) {
                this.gridCanvas.width = this.gridCanvas.offsetWidth * options.pixelRatio;
                this.gridCanvas.height = this.gridCanvas.offsetHeight * options.pixelRatio;
                renderGrid = true;
            }
            if (this.viewCanvas.width !== this.viewCanvas.offsetWidth * options.pixelRatio ||
                this.viewCanvas.height !== this.viewCanvas.offsetHeight * options.pixelRatio) {
                this.viewCanvas.width = this.viewCanvas.offsetWidth * options.pixelRatio;
                this.viewCanvas.height = this.viewCanvas.offsetHeight * options.pixelRatio;
                renderGrid = true;
            }
            if (this.abscissaCanvas.width !== this.abscissaCanvas.offsetWidth * options.pixelRatio ||
                this.abscissaCanvas.height !== this.abscissaCanvas.offsetHeight * options.pixelRatio) {
                this.abscissaCanvas.width = this.abscissaCanvas.offsetWidth * options.pixelRatio;
                this.abscissaCanvas.height = this.abscissaCanvas.offsetHeight * options.pixelRatio;
                renderGrid = true;
            }
            if (this.ordinateCanvas.width !== this.ordinateCanvas.offsetWidth * options.pixelRatio ||
                this.ordinateCanvas.height !== this.ordinateCanvas.offsetHeight * options.pixelRatio) {
                this.ordinateCanvas.width = this.ordinateCanvas.offsetWidth * options.pixelRatio;
                this.ordinateCanvas.height = this.ordinateCanvas.offsetHeight * options.pixelRatio;
                renderGrid = true;
            }
            if (!shallowArrayCompare(options.ordinatesRange, this.cachedRenderingOptions.ordinatesRange) || renderGrid) {
                this.renderOrdinateAxis(options);
                renderGrid = true;
            }
            if (!shallowArrayCompare(options.abscissaRange, this.cachedRenderingOptions.abscissaRange) || renderGrid) {
                this.renderAbscissaAxis(options);
                renderGrid = true;
            }
            if (!shallowArrayCompare(options.cursorPosition, this.cachedRenderingOptions.cursorPosition) || renderGrid) {
                this.renderCursorCross(options);
            }
            if (renderGrid) {
                this.renderGrid(options);
            }
        }
        resize(width, height, options) {
            this.render(options);
        }
        renderCursorCross(options) {
            const ctx = this.viewCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
            ctx.beginPath();
            if (ctx.getLineDash().length === 0) {
                ctx.setLineDash([3 * options.pixelRatio, 3 * options.pixelRatio]);
                ctx.strokeStyle = 'rgb(0, 0, 0)';
            }
            const ctxGrid = this.gridCanvas.getContext('2d');
            ctxGrid.clearRect(0, options.displaySize[1] * options.pixelRatio + 1, this.gridCanvas.width * options.pixelRatio, (this.gridCanvas.height - this.abscissaCanvas.height) * options.pixelRatio);
            ctxGrid.clearRect(options.displaySize[0] * options.pixelRatio + 1, 0, (this.gridCanvas.width - this.ordinateCanvas.width) * options.pixelRatio, this.gridCanvas.height * options.pixelRatio);
            if (options.cursorPosition[0] === 0 || options.cursorPosition[1] === 0) {
                return;
            }
            const xPos = options.cursorPosition[0] * options.pixelRatio;
            const yPos = options.cursorPosition[1] * options.pixelRatio;
            ctx.moveTo(0, yPos);
            ctx.lineTo(options.displaySize[0] * options.pixelRatio, yPos);
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, options.displaySize[1] * options.pixelRatio);
            ctx.stroke();
            // Draw rectangle on abscissa
            ctxGrid.font = `${12 * options.pixelRatio}px ui-system,sans-serif`;
            const abscissaLabel = this.abscissaFormatter(calcAbscissa(options.cursorPosition[0], options));
            const abscissaLabelMeasures = ctxGrid.measureText(abscissaLabel);
            ctxGrid.fillStyle = 'rgb(0, 0, 0)';
            ctxGrid.fillRect((xPos - abscissaLabelMeasures.width / 2) - 10 * options.pixelRatio, options.displaySize[1] * options.pixelRatio + 1, abscissaLabelMeasures.width + 20 * options.pixelRatio, abscissaLabelMeasures.actualBoundingBoxAscent + 20 * options.pixelRatio);
            ctxGrid.fillStyle = 'rgb(255, 255, 255)';
            ctxGrid.textAlign = 'center';
            ctxGrid.textBaseline = 'top';
            ctxGrid.fillText(abscissaLabel, xPos, (options.displaySize[1] + 5) * options.pixelRatio + 1);
            // Draw rectangle on ordinate
            ctxGrid.font = `${12 * options.pixelRatio}px ui-system,sans-serif`;
            const ordinateLabel = this.ordinatesFormatter(calcOrdinate(options.cursorPosition[1], options));
            const ordinateLabelMeasures = ctxGrid.measureText(ordinateLabel);
            ctxGrid.fillStyle = 'rgb(0, 0, 0)';
            ctxGrid.fillRect(options.displaySize[0] * options.pixelRatio + 1, (yPos - ordinateLabelMeasures.actualBoundingBoxAscent / 2) - 12 * options.pixelRatio, ordinateLabelMeasures.width + 20 * options.pixelRatio, ordinateLabelMeasures.actualBoundingBoxAscent + 24 * options.pixelRatio);
            ctxGrid.fillStyle = 'rgb(255, 255, 255)';
            ctxGrid.textAlign = 'left';
            ctxGrid.textBaseline = 'middle';
            ctxGrid.fillText(ordinateLabel, (options.displaySize[0] + 10) * options.pixelRatio + 1, yPos);
            this.cachedRenderingOptions.cursorPosition = options.cursorPosition;
        }
        renderAbscissaAxis(options) {
            const ctx = this.abscissaCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.abscissaCanvas.width, this.abscissaCanvas.height);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(87, 87, 87, 1)';
            ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.textAlign = 'center';
            let maxTextWidth = 0;
            for (let value of ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], 20).labels) {
                const width = ctx.measureText(this.abscissaFormatter(value)).width;
                maxTextWidth = Math.max(maxTextWidth, width);
            }
            const minTextSpacing = 20 * options.pixelRatio;
            const maxLabels = Math.floor((options.displaySize[0] * options.pixelRatio + minTextSpacing) / (maxTextWidth + minTextSpacing));
            const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
            const labelProps = ExtendedWilkinson.generate(options.abscissaRange[0], options.abscissaRange[1], maxLabels);
            const range = options.abscissaRange[1] - options.abscissaRange[0];
            const step = actualWidth / range;
            labelProps.labels.forEach(value => {
                const label = this.abscissaFormatter(value);
                const xPos = calcX(value, step, options) * options.pixelRatio;
                if (xPos < 0 || xPos > options.displaySize[0] * options.pixelRatio)
                    return;
                ctx.fillText(label, xPos, 7 * options.pixelRatio);
                ctx.moveTo(xPos, 0);
                ctx.lineTo(xPos, 5 * options.pixelRatio);
            });
            this.cachedAbscissaLabels = labelProps.labels;
            this.cachedActualWidth = actualWidth;
            this.cachedStepAbscissa = step;
            this.cachedRenderingOptions.abscissaRange = options.abscissaRange;
            ctx.stroke();
        }
        renderOrdinateAxis(options) {
            const ctx = this.ordinateCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.ordinateCanvas.width * options.pixelRatio, this.ordinateCanvas.height * options.pixelRatio);
            ctx.beginPath();
            ctx.font = `${12 * options.pixelRatio}px system-ui, sans-serif`;
            ctx.textBaseline = 'middle';
            const fontHeight = ctx.measureText('0').actualBoundingBoxAscent;
            const minTextSpacing = 20 * options.pixelRatio;
            const maxLabels = Math.floor((options.displaySize[1] * options.pixelRatio + minTextSpacing) / (fontHeight + minTextSpacing));
            const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
            const labelProps = ExtendedWilkinson.generate(options.ordinatesRange[0], options.ordinatesRange[1], maxLabels);
            const range = options.ordinatesRange[1] - options.ordinatesRange[0];
            const step = actualHeight / range;
            labelProps.labels.forEach(value => {
                const label = this.ordinatesFormatter(value);
                const xPos = options.pixelRatio;
                const yPos = calcY(value, step, options) * options.pixelRatio;
                ctx.fillText(label, xPos + 7 * options.pixelRatio, yPos, (90 * options.pixelRatio));
                ctx.moveTo(0, yPos);
                ctx.lineTo(5 * options.pixelRatio, yPos);
            });
            this.cachedOrdinateLabels = labelProps.labels;
            this.cachedActualHeight = actualHeight;
            this.cachedStepOrdinates = step;
            this.cachedRenderingOptions.ordinatesRange = options.ordinatesRange;
            ctx.stroke();
        }
        renderGrid(options) {
            const ctx = this.gridCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
            ctx.beginPath();
            // Chart Boundaries
            ctx.strokeStyle = 'rgba(87, 87, 87, 1)';
            ctx.moveTo(options.displaySize[0] * options.pixelRatio, 0);
            ctx.lineTo(options.displaySize[0] * options.pixelRatio, options.displaySize[1] * options.pixelRatio);
            ctx.lineTo(0, options.displaySize[1] * options.pixelRatio);
            ctx.stroke();
            // Grid
            ctx.strokeStyle = 'rgb(186, 186, 186)';
            this.cachedAbscissaLabels.forEach((value, idx) => {
                const xPos = calcX(value, this.cachedStepAbscissa, options) * options.pixelRatio;
                if (xPos > options.displaySize[0] * options.pixelRatio ||
                    xPos < 0)
                    return;
                ctx.moveTo(xPos, 0);
                ctx.lineTo(xPos, options.displaySize[1] * options.pixelRatio);
            });
            this.cachedOrdinateLabels.forEach((value, idx) => {
                const yPos = calcY(value, this.cachedStepOrdinates, options) * options.pixelRatio;
                if (yPos > options.displaySize[1] * options.pixelRatio ||
                    yPos < 0)
                    return;
                ctx.moveTo(0, yPos);
                ctx.lineTo(options.displaySize[0] * options.pixelRatio + 1, yPos);
            });
            ctx.stroke();
        }
    }

    class CandleStickSeries extends EventSource {
        constructor(container) {
            super();
            this.defaultDistance = [12, 1];
            this.minimumDistance = [6, 2];
            this.data = [];
            const canvas = document.createElement('canvas');
            canvas.className = 'au-view';
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
            this.target = new CandleStickSeriesLocalRenderer(canvas, defaultOptions.strokeStyle, defaultOptions.candleFillStyle);
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
            if (ordinatesRange !== undefined) {
                return Math.max(...this.data.filter(v => (v.low >= ordinatesRange[0] && v.high <= ordinatesRange[1])).map(v => v.timestamp));
            }
            return Math.max(...this.data.map(v => v.timestamp));
        }
        getMaxOrdinateValue(abscissaRange) {
            if (abscissaRange !== undefined) {
                return Math.max(...this.data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1])).map(v => v.high));
            }
            return Math.max(...this.data.map(v => v.high));
        }
        getMinAbscissaValue(ordinatesRange) {
            if (ordinatesRange !== undefined) {
                return Math.min(...this.data.filter(v => (v.low >= ordinatesRange[0] && v.high <= ordinatesRange[1])).map(v => v.timestamp));
            }
            return Math.min(...this.data.map(v => v.timestamp));
        }
        getMinOrdinateValue(abscissaRange) {
            if (abscissaRange !== undefined) {
                return Math.min(...this.data.filter(v => (v.timestamp >= abscissaRange[0] && v.timestamp <= abscissaRange[1])).map(v => v.low));
            }
            return Math.min(...this.data.map(v => v.low));
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
        constructor(canvas, strokeStyle, candleFillStyle) {
            this.strokeStyle = () => '#000000';
            this.candleFillStyle = () => '#000000';
            this.canvas = canvas;
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
            const actualHeight = options.displaySize[1] - options.canvasBounds[0] - options.canvasBounds[1];
            const rangeOrdinates = options.ordinatesRange[1] - options.ordinatesRange[0];
            const stepOrdinates = actualHeight / rangeOrdinates;
            const actualWidth = options.displaySize[0] - options.canvasBounds[2] - options.canvasBounds[3];
            const rangeAbscissa = options.abscissaRange[1] - options.abscissaRange[0];
            const stepAbscissa = actualWidth / rangeAbscissa;
            options.data.filter(({ timestamp }) => (timestamp >= options.abscissaRange[0] - stepAbscissa && timestamp <= options.abscissaRange[1] + stepAbscissa)).forEach((record, idx) => {
                const { timestamp, high, low, open, close } = record;
                const lowPos = calcY(low, stepOrdinates, options) * options.pixelRatio;
                const highPos = calcY(high, stepOrdinates, options) * options.pixelRatio;
                const openPos = calcY(open, stepOrdinates, options) * options.pixelRatio;
                const closePos = calcY(close, stepOrdinates, options) * options.pixelRatio;
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

    class Chart {
        constructor(container) {
            this.renderingOptions = new RenderingOptions();
            this.dataSources = [];
            const wrapper = document.createElement('div');
            wrapper.classList.add('au-chart');
            container.appendChild(wrapper);
            this.container = wrapper;
            this.view = document.createElement('div');
            this.view.className = 'au-view';
            this.view.style.zIndex = '99999';
            this.abscissaContainer = document.createElement('div');
            this.abscissaContainer.classList.add('au-abscissa');
            this.abscissaContainer.classList.add('au-container');
            this.abscissaContainer.classList.add('au-resizeable');
            this.ordinatesContainer = document.createElement('div');
            this.ordinatesContainer.classList.add('au-ordinates');
            this.ordinatesContainer.classList.add('au-container');
            this.baseRenderer = new ChartBase(this.container);
            this.container.appendChild(this.abscissaContainer);
            this.container.appendChild(this.ordinatesContainer);
            this.container.appendChild(this.view);
            this.renderingOptions.autoResizeOrdinatesAxis = true;
            this.renderingOptions.canvasBounds = [10, 10, 0, 0];
            this.renderingOptions.displaySize = [
                this.view.offsetWidth,
                this.view.offsetHeight,
            ];
            this.addEventListeners();
        }
        addEventListeners() {
            let chartMoveStarted = false;
            this.view.addEventListener('mousedown', (e) => {
                chartMoveStarted = true;
                this.view.classList.add('au-moving');
                this.renderingOptions.cursorPosition = [0, 0];
                requestAnimationFrame(() => this.refreshViews());
                e.preventDefault();
            });
            this.view.addEventListener('mousemove', (e) => {
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
            this.view.addEventListener('mouseup', (e) => {
                chartMoveStarted = false;
                this.view.classList.remove('au-moving');
                this.renderingOptions.cursorPosition = [
                    e.offsetX,
                    e.offsetY,
                ];
                requestAnimationFrame(() => this.refreshViews());
            });
            this.view.addEventListener('mouseleave', (e) => {
                chartMoveStarted = false;
                this.view.classList.remove('au-moving');
                this.renderingOptions.cursorPosition = [0, 0];
                requestAnimationFrame(() => this.refreshViews());
            });
            this.view.addEventListener('wheel', (e) => {
                this.renderingOptions.displayOffset[0] += e.deltaX;
                requestAnimationFrame(() => this.refreshViews());
                e.preventDefault();
            });
            let abscissaResizeStarted = false;
            this.abscissaContainer.addEventListener('mousedown', (event) => {
                abscissaResizeStarted = true;
                event.cancelBubble = true;
            });
            this.abscissaContainer.addEventListener('mousemove', (event) => {
                if (abscissaResizeStarted) {
                    let zoomOffset = (event.movementX / (this.abscissaContainer.offsetWidth / this.renderingOptions.pixelRatio));
                    this.renderingOptions.zoomRatio[0] -= zoomOffset;
                    requestAnimationFrame(() => this.refreshViews());
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
                    requestAnimationFrame(() => this.refreshViews());
                }
            });
            this.ordinatesContainer.addEventListener('mouseup', () => ordinatesResizeStarted = false);
            this.ordinatesContainer.addEventListener('mouseleave', () => ordinatesResizeStarted = false);
        }
        addTimeSeries() {
            let timeSeries = new TimeSeries(this.container);
            timeSeries.addEventListener('data-updated', () => {
                requestAnimationFrame(() => this.refreshViews());
            });
            this.dataSources.push(timeSeries);
            timeSeries.resize(this.view.offsetWidth, this.view.offsetHeight, this.renderingOptions);
            return timeSeries;
        }
        addCandleStickSeries() {
            let candleStickSeries = new CandleStickSeries(this.container);
            candleStickSeries.addEventListener('data-updated', () => {
                requestAnimationFrame(() => this.refreshViews());
            });
            this.dataSources.push(candleStickSeries);
            candleStickSeries.resize(this.view.offsetWidth, this.view.offsetHeight, this.renderingOptions);
            return candleStickSeries;
        }
        refreshViews(fitAbscissaAxis = false, fitOrdinateAxis = true) {
            if (Math.max(...this.dataSources.map(v => v.getData().length)) === 0) {
                return;
            }
            this.refreshAxisRanges(fitAbscissaAxis, fitOrdinateAxis);
            this.baseRenderer.render(this.renderingOptions);
            this.dataSources.forEach(s => s.render(this.renderingOptions));
        }
        refreshAxisRanges(fitAbscissaAxis = false, fitOrdinateAxis = false) {
            if (this.dataSources.length == 0)
                return;
            let abscissaPrecision = Math.max(...this.dataSources.map(r => r.getMaxAbscissaPrecision()));
            let ordinatePrecision = Math.max(...this.dataSources.map(r => r.getMaxOrdinatePrecision()));
            let minHorizontalPointDistance = Math.max(0, ...this.dataSources.map(r => r.minimumDistance[0]));
            let minVerticalPointDistance = Math.max(0, ...this.dataSources.map(r => r.minimumDistance[1]));
            let horizontalPointDistance = this.renderingOptions.pointDistance[0];
            let verticalPointDistance = this.renderingOptions.pointDistance[1];
            let abscissaRange = [
                Math.min(...this.dataSources.map(r => r.getMinAbscissaValue() || 0)),
                Math.max(...this.dataSources.map(r => r.getMaxAbscissaValue() || 0))
            ];
            let ordinatesRange = [
                Math.min(...this.dataSources.map(r => r.getMinOrdinateValue() || 0)),
                Math.max(...this.dataSources.map(r => r.getMaxOrdinateValue() || 0))
            ];
            let abscissaStep = Math.min(...this.dataSources.map(r => r.getMinAbscissaDiff())) || Math.pow(10, -abscissaPrecision);
            let ordinateStep = Math.min(...this.dataSources.map(r => r.getMinOrdinateDiff())) || Math.pow(10, -ordinatePrecision);
            if (horizontalPointDistance == null || fitAbscissaAxis) {
                horizontalPointDistance = Math.max(minHorizontalPointDistance, ...this.dataSources.map(r => r.defaultDistance[0] * this.renderingOptions.zoomRatio[0]));
                let maxTotalAbscissaValues = (abscissaRange[1] - abscissaRange[0]) * abscissaStep;
                if (fitAbscissaAxis && horizontalPointDistance * maxTotalAbscissaValues < this.renderingOptions.displaySize[0]) {
                    horizontalPointDistance = Math.floor(this.renderingOptions.displaySize[0] / maxTotalAbscissaValues);
                }
                // Prevents the zoom from reducing past the minimum distance
                this.renderingOptions.zoomRatio[0] = horizontalPointDistance / Math.max(...this.dataSources.map(r => r.defaultDistance[0]));
            }
            if (horizontalPointDistance > 0) {
                let maxHorizontalPoints = this.renderingOptions.displaySize[0] / horizontalPointDistance;
                let horizontalPointOffset = this.renderingOptions.displayOffset[0] / horizontalPointDistance;
                abscissaRange[1] = abscissaRange[1] + horizontalPointOffset;
                abscissaRange[0] = abscissaRange[1] - abscissaStep * maxHorizontalPoints;
            }
            this.renderingOptions.abscissaRange = abscissaRange;
            if (this.renderingOptions.autoResizeOrdinatesAxis) {
                ordinatesRange = [
                    Math.min(...this.dataSources.map(r => r.getMinOrdinateValue(abscissaRange) || Infinity)),
                    Math.max(...this.dataSources.map(r => r.getMaxOrdinateValue(abscissaRange) || -Infinity))
                ];
                this.renderingOptions.zoomRatio[1] = 1;
                ordinatePrecision = Math.max(...this.dataSources.map(r => r.getMaxOrdinatePrecision(abscissaRange)));
                ordinateStep = Math.min(...this.dataSources.map(r => r.getMinOrdinateDiff())) || Math.pow(10, -ordinatePrecision);
            }
            if (Math.abs(ordinatesRange[0]) === Infinity || Math.abs(ordinatesRange[1]) === -Infinity) {
                return;
            }
            if (verticalPointDistance == null || fitOrdinateAxis) {
                verticalPointDistance = (this.renderingOptions.autoResizeOrdinatesAxis) ? minVerticalPointDistance :
                    Math.max(minVerticalPointDistance, ...this.dataSources.map(r => r.defaultDistance[1] * this.renderingOptions.zoomRatio[1]));
                let maxTotalOrdinateValues = (ordinatesRange[1] - ordinatesRange[0]) * ordinateStep;
                if (fitOrdinateAxis && verticalPointDistance * maxTotalOrdinateValues < this.renderingOptions.displaySize[1]) {
                    verticalPointDistance = Math.floor(this.renderingOptions.displaySize[1] / maxTotalOrdinateValues);
                }
                // Prevents the zoom from reducing past the minimum distance
                this.renderingOptions.zoomRatio[1] = verticalPointDistance / Math.max(...this.dataSources.map(r => r.defaultDistance[1]));
            }
            if (verticalPointDistance > 0 && !this.renderingOptions.autoResizeOrdinatesAxis) {
                // Zooming in the ordinates axis is always from the center
                let maxVerticalPoints = this.renderingOptions.displaySize[1] / verticalPointDistance;
                let half = (ordinatesRange[1] - ordinatesRange[0]) / 2;
                ordinatesRange[1] = half + (ordinateStep * maxVerticalPoints / 2);
                ordinatesRange[0] = half - (ordinateStep * maxVerticalPoints / 2);
            }
            this.renderingOptions.ordinatesRange = ordinatesRange;
        }
    }

    return Chart;

})));
//# sourceMappingURL=aurora-charts.umd.js.map
