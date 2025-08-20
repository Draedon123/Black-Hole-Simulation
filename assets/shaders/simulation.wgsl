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
}

struct Ray {
  cartesian: vec3f,
  spherical: vec3f,
  sphericalVelocities: vec3f,
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

  ray.cartesian = camera.position;
  ray.spherical = cartesianToSpherical(ray.cartesian);
  // TODO: ADAPT TO SPHERICAL COORDINATES
  ray.sphericalVelocities = normalize(pixelLocation - camera.position);

  var colour: vec3f = vec3f(0.0);
  var hitBlackHole: bool = false;

  for(var i: u32 = 0; i < settings.numberOfSteps; i++){
    step(&ray);

    if(length(ray.cartesian) < blackHole.r_s){
      hitBlackHole = true;
      break;
    }
  }

  if(!hitBlackHole){
    colour = textureSampleLevel(skybox, skyboxSampler, ray.sphericalVelocities, 0.0).rgb;
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

  // TODO: ADAPT TO SPHERICAL COORDINATES
  ray.cartesian += ray.sphericalVelocities * stepSize;
}

fn cartesianToSpherical(cartesian: vec3f) -> vec3f {
  let r: f32 = sqrt(cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z);
  let theta: f32 = acos(cartesian.y / r);
  let phi: f32 = atan2(cartesian.x, cartesian.z);

  return vec3f(r, theta, phi);
}

fn sphericalToCartesian(spherical: vec3f) -> vec3f {
  let sinTheta: f32 = sin(spherical.y);
  let sinPhi: f32 = sin(spherical.z);
  let cosTheta: f32 = cos(spherical.y);
  let cosPhi: f32 = cos(spherical.z);

  let x: f32 = spherical.x * sinTheta * sinPhi;
  let y: f32 = spherical.x * cosTheta;
  let z: f32 = spherical.x * sinTheta * cosPhi;

  return vec3f(x, y, z);
}