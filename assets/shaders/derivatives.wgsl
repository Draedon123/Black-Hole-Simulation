// Σ = r^2 + a^2 * cos(θ)^2
fn calculateSigma(boyerLindquist: vec3f, kerrParameter: f32) -> f32 {
  let cosTheta: f32 = cos(boyerLindquist.y);
  return boyerLindquist.x * boyerLindquist.x + kerrParameter * kerrParameter + cosTheta * cosTheta;
}

// Δ = r^2 - r * r_s + a^2
fn calculateDelta(boyerLindquist: vec3f, kerrParameter: f32, schwarzschildRadius: f32) -> f32 {
  return boyerLindquist.x * boyerLindquist.x - boyerLindquist.x * schwarzschildRadius + kerrParameter * kerrParameter;
}

// function drdτ() -> f32 {
//   return sqrt(
//     (E * E - 1) * blackHole
//   );  
// }

fn derivative(derivativeFunction: u32, t: f32, y: vec3f) -> vec3f {
  switch(derivativeFunction){
    default: {
      return vec3f(0.0);
    }
  }
}
