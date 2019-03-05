import Utils from "./utils";
import Install from "./install";
import RequestOpt from "./request";

const utils = new Utils();
const install = new Install({ test: false });

export default function({ dirname, currentName, units, optional }) {
  let p = 0;

  (function bundle() {
    for (let i = p; i < optional.length; i++) {
      const e = optional[i];
      const req = {
        originalUrl: `/m2units/${e.module}/index.js`,
        path: `/m2units/${e.module}/index.js`
      };
      const request = new RequestOpt({ req, dirname, units, currentName, optional, mode: "prod" });

      if (request.error) {
        console.log(request.error);
      } else if (request.mode === "currentModule") {
        const from = `${dirname}/src/**/*`;
        utils
          .copyFiles({
            from,
            to: `${dirname}/dist/${units.dirS}/${currentName}`,
            up: utils.getUp(from),
            module: currentName
          })
          .then(() => {
            console.log(`copy: ${currentName} -- ok`);
          });
      } else {
        const opt = request.options;
        install.go(opt).then(() => {
          if (opt.resources) {
            const from = `${dirname}/node_modules/${opt.module}/src/**/*`;
            utils
              .copyFiles({
                from,
                to: `${dirname}/dist/${units.dirS}/${opt.module}`,
                up: utils.getUp(from)
              })
              .then(() => {
                console.log(`copy: ${opt.module} -- ok`);
              });
          }
          if (p < optional.length) {
            bundle();
          }
        });
      }
    }
    p = optional.length;
  })();
}
