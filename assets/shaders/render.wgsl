struct Settings {
  gamma: f32,
}

struct Vertex {
  @builtin(vertex_index) index: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) textureCoordinates: vec2f,
}

@group(0) @binding(0) var <uniform> settings: Settings;
@group(0) @binding(1) var renderTexture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;

const VERTICES: array<vec2f, 3> = array(
  vec2f(-1.0,  3.0),
  vec2f(-1.0, -1.0),
  vec2f( 3.0, -1.0),
);

@vertex
fn vertexMain(vertex: Vertex) -> VertexOutput {
  var output: VertexOutput;

  output.position = vec4f(VERTICES[vertex.index], 1.0, 1.0);
  output.textureCoordinates = vec2f(output.position.xy * 0.5 + 0.5);

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var colour: vec4f = textureSample(renderTexture, textureSampler, input.textureCoordinates);

  gammaCorrect(&colour);

  return colour;
}

fn gammaCorrect(colour: ptr<function, vec4f>) {
  let inverseGamma = 1 / settings.gamma;

  colour.r = pow(colour.r, inverseGamma);
  colour.g = pow(colour.g, inverseGamma);
  colour.b = pow(colour.b, inverseGamma);
}
