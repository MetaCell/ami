import { Matrix4, Vector3 } from 'three';

/**
 * Structural shapes shared across core/ - kept here (rather than importing
 * between core.validators.ts and core.intersections.ts directly) since those
 * two already import each other and a third cross-import would risk a cycle.
 */

export interface Ray {
  position: Vector3;
  direction: Vector3;
}

export interface Plane {
  position: Vector3;
  direction: Vector3;
}

export interface AABB {
  center: Vector3;
  halfDimensions: Vector3;
  toAABB: Matrix4;
}

export interface Box {
  center: Vector3;
  halfDimensions: Vector3;
}
