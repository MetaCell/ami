import { Matrix4, Vector3 } from 'three';
import type { Box, Ray } from './core.types';

/**
 * Validate basic structures.
 *
 * @example
 * //Returns true
 * VJS.Core.Validators.matrix4(new THREE.Matrix4());
 *
 * //Returns false
 * VJS.Core.Validators.matrix4(new THREE.Vector3());
 *
 * @module core/validators
 */

export default class Validators {
  /**
   * Validates a matrix as a THREEJS.Matrix4
   * link
   * @param {Object} objectToTest - The object to be tested.
   * @return {boolean} True if valid Matrix4, false if NOT.
   */
  static matrix4(objectToTest: unknown): objectToTest is Matrix4 {
    const candidate = objectToTest as Matrix4 | null | undefined;
    if (
      !(
        candidate !== null &&
        typeof candidate !== 'undefined' &&
        Object.hasOwn(candidate, 'elements') &&
        candidate.elements.length === 16 &&
        typeof candidate.identity === 'function' &&
        typeof candidate.copy === 'function' &&
        typeof candidate.determinant === 'function'
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validates a vector as a THREEJS.Vector3
   * @param {Object} objectToTest - The object to be tested.
   * @return {boolean} True if valid Vector3, false if NOT.
   */
  static vector3(objectToTest: unknown): objectToTest is Vector3 {
    const candidate = objectToTest as Vector3 | null | undefined;
    if (
      !(
        candidate !== null &&
        typeof candidate !== 'undefined' &&
        Object.hasOwn(candidate, 'x') &&
        Object.hasOwn(candidate, 'y') &&
        Object.hasOwn(candidate, 'z') &&
        !Object.hasOwn(candidate, 'w')
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validates a box.
   *
   * @example
   * // a box is defined as
   * let box = {
   *   center: THREE.Vector3,
   *   halfDimensions: THREE.Vector3
   * }
   *
   * @param {Object} objectToTest - The object to be tested.
   * @return {boolean} True if valid box, false if NOT.
   */
  static box(objectToTest: unknown): objectToTest is Box {
    const candidate = objectToTest as Box | null | undefined;
    if (
      !(
        candidate !== null &&
        typeof candidate !== 'undefined' &&
        Object.hasOwn(candidate, 'center') &&
        Validators.vector3(candidate.center) &&
        Object.hasOwn(candidate, 'halfDimensions') &&
        Validators.vector3(candidate.halfDimensions) &&
        candidate.halfDimensions.x >= 0 &&
        candidate.halfDimensions.y >= 0 &&
        candidate.halfDimensions.z >= 0
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validates a ray.
   *
   * @example
   * // a ray is defined as
   * let ray = {
   *   postion: THREE.Vector3,
   *   direction: THREE.Vector3
   * }
   *
   * @param {Object} objectToTest - The object to be tested.
   * @return {boolean} True if valid ray, false if NOT.
   */
  static ray(objectToTest: unknown): objectToTest is Ray {
    const candidate = objectToTest as Ray | null | undefined;
    if (
      !(
        candidate !== null &&
        typeof candidate !== 'undefined' &&
        Object.hasOwn(candidate, 'position') &&
        Validators.vector3(candidate.position) &&
        Object.hasOwn(candidate, 'direction') &&
        Validators.vector3(candidate.direction)
      )
    ) {
      return false;
    }

    return true;
  }
}
