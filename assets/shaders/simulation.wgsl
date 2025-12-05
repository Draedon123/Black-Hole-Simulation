#!import coordinates
#!import derivatives
#!import rkf45

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

  var hitBlackHole: bool = false;

  for(var i: u32 = 0; i < settings.numberOfSteps; i++){
    step(&ray);

    if(length(ray.position) < blackHole.r_s){
      hitBlackHole = true;
      break;
    }
  }

  let colour: vec3f = select(
    textureSampleLevel(skybox, skyboxSampler, ray.velocity, 0.0).rgb,
    vec3f(0.0),
    hitBlackHole
  );
  
  textureStore(output, id.xy, vec4f(colour, 1.0));
}

fn getPixelLocation(coords: vec2f) -> vec3f {
  return
    camera.pixel00
    + coords.x * camera.viewportDeltaU
    + coords.y * camera.viewportDeltaV;
}

fn step(ray: ptr<function, Ray>) {
  let stepSize: f32 = blackHole.r_s / 20.0;

  ray.position += ray.velocity * stepSize;
}
