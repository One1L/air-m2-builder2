import sass from "dart-sass";
import path from "path";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import csstree from 'css-tree';

export default class CompileSass {
  constructor({ htmlText, filePath }) {
    const reg = `(?<=<style[a-z0-9="' ]*type\\s*=\\s*["']?\\s*text\\/scss\\s*["']?[a-z0-9="' ]*>)([\\s\\S]*?)(?=<\\/style>)`;
    this.filePath = filePath;
    this.scss = (htmlText.match(new RegExp(reg, "gi")) || []).reduce((acc, style, i) => {
      acc.push({
        cssIndex: i,
        data: this.processImports(style),
        idx: htmlText.indexOf(style),
        len: style.length
      });
      return acc;
    }, []);
    this.css = [];
  }

  processImports (scss) {
    return scss.replace(/(?:@import ["'])(\S+)(?:["'];)/g, (match, importPath) => {
      const lvl = (importPath.match(/\.\.\//g) || []).length;
      const rel = new Array(lvl).fill('../').join('') || './';
      return `/* <import rel="${rel}"> */ @import "${path.resolve(this.filePath, importPath).replace(/\\/g, '/')}"; /* </import> */`;
    });
  }

  processPath (css) {
    const regex = /(?:\/\* <import[a-z0-9="' ]*rel\s*=\s*["']?\s*([a-zA-Z0-9\.\/]*)\s*["']?[a-z0-9="' ]*> \*\/)([\s\S]*?)(?:\/\* <\/import> \*\/)/gm;

    return css.replace(regex, (full, rel, match) => {
      if (rel === './') return match;
      const ast = csstree.parse(match);
      csstree.walk(ast, (node) => {
        if (node.type === 'Url') {
          const value = node.value;
          let url = (value.type === 'Raw' ? value.value : value.value.substr(1, value.value.length - 2));
          if (url.indexOf('data:') > -1) return;
          node.value.value = `${rel}${url}`.replace(/\/\.\//g, '/');
        }
      });
      return csstree.generate(ast);
    });
  }

  compile() {
    const promises = [];
    this.scss.forEach(({ data }, i) => {
      promises.push(
        new Promise(res => {
          sass.render({ data }, (err, result) => {
            if (err) {
              console.log(`Sass compile error:\n${err}`);
              this.css[i] = this.scss[i].data;
              res();
            } else {
              postcss([autoprefixer])
                .process(result.css.toString(), { from: undefined })
                .then(({ css }) => {
                  this.css[i] = this.processPath(css);
                  res();
                });
            }
          });
        })
      );
    });

    return promises;
  }
}
