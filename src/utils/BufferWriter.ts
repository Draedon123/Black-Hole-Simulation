import { Matrix4 } from "./Matrix4";
import { Vector3 } from "./Vector3";

class BufferWriter {
  public readonly buffer: ArrayBuffer;
  private readonly dataview: DataView;
  public readonly littleEndian: boolean;
  private offset: number;
  constructor(
    byteLength: number,
    littleEndian: boolean = true,
    offset: number = 0
  ) {
    this.buffer = new ArrayBuffer(byteLength);
    this.dataview = new DataView(this.buffer);
    this.littleEndian = littleEndian;
    this.offset = offset;
  }

  public toFloat32Array(): Float32Array {
    return new Float32Array(this.buffer);
  }

  public writeUint8(uint8: number): void {
    this.dataview.setUint8(this.offset, uint8);
    this.offset += 1;
  }

  public writeFloat32(float32: number): void {
    this.dataview.setFloat32(this.offset, float32, this.littleEndian);
    this.offset += 4;
  }

  public writeUint32(uint32: number): void {
    this.dataview.setUint32(this.offset, uint32, this.littleEndian);
    this.offset += 4;
  }

  public writeVec3f(vec3f32: Vector3): void {
    this.writeFloat32(vec3f32.x);
    this.writeFloat32(vec3f32.y);
    this.writeFloat32(vec3f32.z);
  }

  public writeMat4x4f(mat4x4f: Matrix4): void {
    for (let i = 0; i < 16; i++) {
      this.writeFloat32(mat4x4f.components[i]);
    }
  }

  public pad(bytes: number): void {
    for (let i = 0; i < bytes; i++) {
      this.writeUint8(0);
    }
  }
}

export { BufferWriter };
