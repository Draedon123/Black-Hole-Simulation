struct Settings {
  placeholder: f32,
}

struct Camera {
  @align(16) position: vec3f,
  imageSize: vec2f,
  focalLength: f32,
  fieldOfView: f32,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var <uniform> camera: Camera;
@group(0) @binding(2) var output: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var skybox: texture_storage_2d<rgba8unorm, read>;

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let coords: vec2f = vec2f(id.xy);
  if(coords.x > camera.imageSize.x || coords.y > camera.imageSize.y){
    return;
  }

  let aspectRatio: f32 = camera.imageSize.x / camera.imageSize.y;
  let viewportHeight: f32 = 2 * camera.focalLength * tan(camera.fieldOfView / 2);
  let viewportSize: vec2f = vec2f(
    viewportHeight * aspectRatio,
    viewportHeight,
  );

  let viewportU: vec3f = vec3f(viewportSize.x, 0.0, 0.0);
  let viewportV: vec3f = vec3f(0.0, viewportSize.y, 0.0);

  let viewportDeltaU: vec3f = viewportU / camera.imageSize.x;
  let viewportDeltaV: vec3f = viewportV / camera.imageSize.y;

  let viewportBottomLeft: vec3f = 
    camera.position
    - vec3f(0.0, 0.0, camera.focalLength)
    - 0.5 * (viewportU + viewportV);

  let pixelLocation: vec3f = 
    viewportBottomLeft
    + 0.5 * (viewportDeltaU + viewportDeltaV)
    + coords.x * viewportDeltaU
    + coords.y * viewportDeltaV;

  let rayDirection: vec3f = normalize(pixelLocation - camera.position);
  let t: f32 = 0.5 * (rayDirection.y + 1.0);
  let colour: vec4f = textureLoad(skybox, id.xy);

  textureStore(output, id.xy, colour);
}
