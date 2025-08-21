struct Settings {
  numberOfSteps: u32,
}

struct Camera {
  @align(16) position: vec3f,
  @align(16) viewportDeltaU: vec3f,
  @align(16) viewportDeltaV: vec3f,
  @align(16) pixel00: vec3f,
  imageSize: vec2f,
}

struct BlackHole {
  position: vec3f,
  mass: f32,
  r_s: f32,
  kerrParameter: f32,
}

struct Ray {
  position: vec3f,
  velocity: vec3f,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var <uniform> camera: Camera;
@group(0) @binding(2) var <uniform> blackHole: BlackHole;
@group(0) @binding(3) var output: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var skybox: texture_cube<f32>;
@group(0) @binding(5) var skyboxSampler: sampler;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let coords: vec2f = vec2f(id.xy);
  if(coords.x > camera.imageSize.x || coords.y > camera.imageSize.y){
    return;
  }

  let pixelLocation: vec3f = getPixelLocation(coords);

  var ray: Ray;

  ray.position = camera.position;
  ray.velocity = normalize(pixelLocation - camera.position);

  var colour: vec3f = vec3f(0.0);
  var hitBlackHole: bool = false;

  for(var i: u32 = 0; i < settings.numberOfSteps; i++){
    step(&ray);

    if(length(ray.position) < blackHole.r_s){
      hitBlackHole = true;
      break;
    }
  }

  if(!hitBlackHole){
    colour = textureSampleLevel(skybox, skyboxSampler, ray.velocity, 0.0).rgb;
  }

  textureStore(output, id.xy, vec4f(colour, 1.0));
}

fn getPixelLocation(coords: vec2f) -> vec3f {
  return
    camera.pixel00
    + coords.x * camera.viewportDeltaU
    + coords.y * camera.viewportDeltaV;
}

fn step(ray: ptr<function, Ray>) {
  let stepSize: f32 = blackHole.r_s / 10;

  ray.position += ray.velocity * stepSize;
}

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

// https://physics.stackexchange.com/q/739653
// COORDINATE SYSTEM CONVERSION:
// x -> z
// y -> x
// z -> y
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