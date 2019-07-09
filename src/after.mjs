import Request from './request.mjs';
import { CompileHtml } from './compile.mjs';
import { Utils } from './utils.mjs';
import path from 'path';

export default function after ({ dirname, currentModule, units, optional, latency, app: { requester, installer }, execute, devServer, buildMode }) {
  return function (app) {
    app.get(`/${units.dirS}/*`, (req, res) => {
      function sendResolve ({ source, method, delay }) {
        if (delay === 0) {
          if (method === 'data') {
            res.send(source);
          } else if (method === 'file') {
            res.sendFile(source);
          }
        } else {
          if (method === 'data') {
            setTimeout(() => {
              res.send(source);
            }, delay);
          } else if (method === 'file') {
            setTimeout(() => {
              res.sendFile(source);
            }, delay);
          }
        }
      }

      const request = new Request({ req, dirname, units, currentModule, optional, execute, buildMode, devServer });

      const utils = new Utils();
      const { module, relativePath, resolvePath } = request.options;
      const filePath = utils.removeQueryString(`${dirname}/src/${relativePath}`);

      let i = 0;
      let match = null;
      let delay = 0;
      while (match === null && i < latency.length) {
        match = filePath.match(new RegExp(latency[i++].regex));
      }
      if (match !== null) {
        delay = latency[i - 1].delay || 0;
      }

      if (request.mode === 'currentModule') {
        if (path.extname(filePath) === '.html') {
          const importPathResolve = (data) => {
            const regex = /import\s(?:["'\s]*[\w*{}\$\n\r\t, ]+from\s*)?["'\s]*([^"']+)["'\s]/gm;
            const sourceDir = path.dirname(filePath);
            return data.replace(regex, (match, importPath) => {
              let res = match;
              if (~importPath.indexOf('./')) {
                res = match.replace(importPath, path.resolve(`${sourceDir}/${importPath}`));
                res = res.replace(/\\/g, '/');
              }
              return res;
            });
          };

          new CompileHtml({
            ...request.options,
            inputFile: filePath,
            outputFile: utils.removeQueryString(resolvePath),
            importPathResolve
          })
            .run()
            .then(htmlText => {
              sendResolve({ source: htmlText, method: 'data', delay });
            });
        } else {
          sendResolve({ source: filePath, method: 'file', delay });
        }
        return;
      }
      if (request.error) {
        console.log(request.error);
        sendResolve({ source: request.error, method: 'data', delay });
        return;
      }

      requester
        .get(request.options)
        .then(() => {
          return sendResolve({ source: utils.removeQueryString(resolvePath), method: 'file', delay });
        })
        .catch(error => {
          installer.deleteInstance(`${module}/${relativePath}`);
          sendResolve({ source: error, method: 'data', delay });
        });
    });
  };
}
