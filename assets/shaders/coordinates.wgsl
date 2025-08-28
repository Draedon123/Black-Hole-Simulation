// https://physics.stackexchange.com/a/739795
// COORDINATE SYSTEM CONVERSION:
// x -> z
// y -> x
// z -> y

fn cartesianToBoyerLindquist(cartesian: vec3f, a: f32) -> vec3f {
  let aa: f32 = a * a;
  let xx: f32 = cartesian.x * cartesian.x;
  let yy: f32 = cartesian.y * cartesian.y;
  let zz: f32 = cartesian.z * cartesian.z;

  let r: f32 = sqrt(sqrt(yy * yy + 2 * xx * yy + 2 * zz * yy + 2 * aa * yy + xx * xx + 2 * zz * xx - 2 * aa * xx + zz * zz - 2 * aa * zz + aa * aa) + xx + yy + zz - aa) / sqrt(2);
  let theta: f32 = acos(cartesian.y / r);
  let phi: f32 = atan2(cartesian.x, cartesian.z);

  return vec3f(r, theta, phi);
}

fn boyerLindquistToCartesian(boyerLindquist: vec3f, a: f32) -> vec3f {
  let ra: f32 = sqrt(boyerLindquist.x * boyerLindquist.x + a * a);

  let sinTheta: f32 = sin(boyerLindquist.y);
  let sinPhi: f32 = sin(boyerLindquist.z);
  let cosTheta: f32 = cos(boyerLindquist.y);
  let cosPhi: f32 = cos(boyerLindquist.z);

  let x: f32 = ra * sinTheta * sinPhi;
  let y: f32 = boyerLindquist.x * cosTheta;
  let z: f32 = ra * sinTheta * cosPhi;

  return vec3f(x, y, z);
}
