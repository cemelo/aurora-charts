import {ILabelGenerator, ILabelProps, LabelRange} from '../api/labeling-api';

export const ExtendedWilkinson = new class ExtendedWilkinson implements ILabelGenerator {
  private readonly W = [0.2, 0.25, 0.5, 0.05];
  private readonly Q = [1.0, 5.0, 2.0, 2.5, 4.0, 3.0];

  generate(dmin: number, dmax: number, maxLabels: number, labelInclusion: LabelRange = LabelRange.Included): ILabelProps {
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

        kLoop: for (let k = 2; k < Infinity; k++) {
          let dm = this.densityMax(k, maxLabels);

          if ((this.score(1., sm, dm, 1.)) < bestScore) {
            break;
          }

          let delta = (dmax - dmin) / (k + 1.0) / j / q;

          zLoop: for (let z = Math.ceil(Math.log10(delta)); z < Infinity; z++) {
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

              if (!(
                (calculatedScore <= bestScore) ||
                (labelInclusion === LabelRange.Any) ||
                (labelInclusion === LabelRange.Included && ((lmin < dmin) && (lmax > dmax))) ||
                (labelInclusion === LabelRange.Excluded && ((lmin > dmin) && (lmax < dmax)))
              )) {
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

    return {max: outMax, min: outMin, labels: result, step: outStep };
  }

  private flooredMod(a: number, n: number) {
    return Math.floor(a - n * (a / n))
  }

  private simplicity(qpos: number, qlen: number, j: number, lmin: number, lmax: number, lstep: number) {
    let v = 0;

    if (this.flooredMod(lmin, lstep) < 1e-10 && lmin <= 0. && lmax >= 0.) {
      v = 1.0;
    }

    return 1.0 - qpos / (qlen - 1.0) + v - j;
  }

  private simplicityMax(qpos: number, qlen: number, j: number) {
    return 1.0 - qpos / (qlen - 1.0) - j + 1.0;
  }

  private coverage(dmin: number, dmax: number, lmin: number, lmax: number) {
    return 1.0 - 0.5 * (Math.pow(dmax - lmax, 2) + Math.pow(dmin - lmin, 2)) / Math.pow(0.1 * (dmax - dmin), 2);
  }

  private coverageMax(dmin: number, dmax: number, span: number) {
    let range = dmax - dmin;
    if (span > range) {
      let half = (span - range) / 2.0;
      return 1.0 - 0.5 * (Math.pow(half, 2) + Math.pow(half, 2)) / Math.pow(0.1 * range, 2);
    } else {
      return 1.0;
    }
  }

  private density(k: number, m: number, dmin: number, dmax: number, lmin: number, lmax: number) {
    let r = (k - 1.0) / (lmax - lmin);
    let rt = (m - 1.0) / (Math.max(lmax, dmax) - Math.min(lmin, dmin));
    return 2.0 - Math.max(r / rt, rt / r);
  }

  private densityMax(k: number, m: number) {
    if (k >= m) {
      return 2.0 - (k - 1.0) / (m - 1.0);
    } else {
      return 1.0;
    }
  }

  private score(c: number, s: number, g: number, l: number) {
    return this.W[0] * c + this.W[1] * s + this.W[2] * g + this.W[3] * l;
  }
}
