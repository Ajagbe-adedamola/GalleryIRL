import type { Neighbourhood } from "../neighbourhoods";
import type { Place } from "../types";

export interface CameraOptions {
  zoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
}

export interface MapHandle {
  flyToPlace(place: Place): void;
  flyToCoords(lng: number, lat: number, options?: CameraOptions): void;
  flyToNeighbourhood(neighbourhood: Neighbourhood): void;
  fitRoute(stops: Place[]): void;
}
