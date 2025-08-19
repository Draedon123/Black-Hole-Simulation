import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    outDir: "build",
    emptyOutDir: true,
    minify: true,
    terserOptions: {
      compress: {
        booleans_as_integers: true,
        ecma: 2020,
        expression: true,
        keep_fargs: false,
        module: true,
        toplevel: true,
        passes: 3,
        unsafe: true,
      },
      mangle: {
        module: true,
        toplevel: true,
      },
      format: {
        comments: false,
        indent_level: 0,
      },
    },
  },
  base: "/Black-Hole-Simulation",
  publicDir: "assets",
});
