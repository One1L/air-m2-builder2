import fs from "fs";
import webpack from "webpack";
import webpackCompileConfig from "../webpack-compiler.config.mjs";

class Compile {
  constructor(opt) {
    this.opt = opt;
    const { dirname, module, units, mode } = this.opt;

    const pkgPath = `${dirname}/node_modules/${module}/package.json`;
    const pkg = fs.readFileSync(pkgPath, "utf8");
    if (!pkg) {
      throw `ERROR: file not found '${pkgPath}'`;
    }
    this.main = JSON.parse(pkg).main;
    const path =
      mode === "development"
        ? `${dirname}/node_modules/${module}/${units.dir}`
        : `${dirname}/dist/${units.dirS}/${module}`;
    const compileOpt = {
      mode,
      path,
      entry: `${dirname}/node_modules/${module}/${this.main}`,
      filename: "index.js"
    };
    this.config = webpackCompileConfig(compileOpt);
  }
}

class CompileResource extends Compile {
  run() {
    return new Promise(resolve => {
      resolve();
    });
  }
}

class CompileDev extends Compile {
  run() {
    return new Promise((res, rej) => {
      console.log(`compile: ${this.opt.module} ...`);

      const compiler = webpack(this.config);

      compiler.run((error, stats) => {
        if (stats.hasErrors()) {
          console.log(`ERROR: ${this.opt.module} compile error`);
          console.log(stats.compilation.errors);
          rej(`ERROR '${this.opt.module}': compile error`);
          return;
        }

        console.log(`compile: ${this.opt.module} -- ok`);
        res();
      });
    });
  }
}

export { CompileDev, CompileResource };
