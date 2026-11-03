import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, Quaternion, Vector3 } from 'three/webgpu';
import { applyGroupRigidDelta, applyGroupScale, groupCenter } from './multi-transform';

const member = (id: string, x: number, z: number) => ({ id, position: new Vector3(x, 0, z), quaternion: new Quaternion() });

describe('multi-transform', () => {
  it('finds the centre of several objects', () => {
    const a = new Mesh(new BoxGeometry(2, 2, 2));
    const b = new Mesh(new BoxGeometry(2, 2, 2));
    b.position.set(10, 0, 0);
    b.updateMatrixWorld();
    a.updateMatrixWorld();
    expect(groupCenter([a, b])?.toArray()).toEqual([5, 0, 0]);
  });

  it('translates and rotates members around the pivot', () => {
    const members = [member('a', -1, 0), member('b', 1, 0)];
    const quarter = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const [a, b] = applyGroupRigidDelta(members, new Vector3(), new Quaternion(), new Vector3(0, 2, 0), quarter);
    expect(a.position.x).toBeCloseTo(0);
    expect(a.position.y).toBeCloseTo(2);
    expect(a.position.z).toBeCloseTo(1);
    expect(b.position.z).toBeCloseTo(-1);
    expect(a.quaternion.angleTo(quarter)).toBeCloseTo(0);
  });

  it('spreads positions when scaling', () => {
    const [a] = applyGroupScale([member('a', 3, 1)], new Vector3(1, 0, 1), 2);
    expect(a.position.toArray()).toEqual([5, 0, 1]);
  });
});
