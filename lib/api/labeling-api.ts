export enum LabelRange {
  Any, Included, Excluded
}

export interface ILabelGenerator {
  generate(dmin: number, dmax: number, maxLabels: number, labelInclusion?: LabelRange): ILabelProps;
}

export interface ILabelProps {
  labels: number[]
  step: number
  min: number
  max: number
}
