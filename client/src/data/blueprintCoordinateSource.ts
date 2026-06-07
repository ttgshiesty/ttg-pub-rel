import {
  type BlueprintHeatmapPoint,
  blueprintHeatmapPoints,
} from './blueprintHeatmapPoints';

export type BlueprintCoordinatePoint = BlueprintHeatmapPoint & {
  x: number;
  y: number;
};

export type BlueprintCoordinateSource = {
  allData: BlueprintCoordinatePoint[];
};

export const blueprintCoordinateSource: BlueprintCoordinateSource = {
  allData: blueprintHeatmapPoints.map((point) => ({
    ...point,
    x: point.lng,
    y: point.lat,
  })),
};

export const blueprintCoordinates = blueprintCoordinateSource.allData;
