export function precision(n: number) {
  let e = 1;
  while (Math.round(n * e) / e !== n) e *= 10;
  return Math.log(e) / Math.LN10;
}
