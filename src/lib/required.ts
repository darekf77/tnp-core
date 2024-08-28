export const requiredForDev =  {
  npm: [
    //#region @backend
    // { name: '@angular/cli', version: '13' },
    { name: 'ncc', version: '0.36.0', installName: '@vercel/ncc' },
    { name: 'extract-zip', version: '1.6.7' },
    // { name: 'watch', version: '1.0.2' },
    { name: 'cpr' },
    { name: 'check-node-version' },
    { name: 'npm-run', version: '4.1.2' },
    { name: 'rimraf', version: '3.0.2' },
    { name: 'mkdirp' },
    // { name: 'renamer', version: '2.0.1' },
    { name: 'nodemon' },
    // { name: 'madge' },
    { name: 'yarn' },
    { name: 'taon-http-server' },
    // { name: 'bower' },
    { name: 'prettier' },
    { name: 'fkill', installName: 'fkill-cli' },
    // { name: 'yo' },
    { name: 'mocha' },
    { name: 'jest' },
    // { name: 'chai' },
    { name: 'ts-node' },
    { name: 'taon-vsce' },
    // { name: 'stmux' },
    { name: 'webpack-bundle-analyzer' },
    // { name: 'ng', installName: '@angular/cli' },
    // { name: 'ngx-pwa-icons', version: '0.1.2' },
    // { name: 'real-favicon', installName: 'cli-real-favicon' },
    { name: 'babel', installName: 'babel-cli' },
    { name: 'javascript-obfuscator', version: '4' },
    { name: 'uglifyjs', installName: 'uglify-js' },
    //#endregion
  ],
  niceTools: [
    //#region @backend
    { name: 'speed-test' },
    { name: 'npm-name' }, // check if name is available on npm
    { name: 'vantage', platform: 'linux' }, // inspect you live applicaiton
    { name: 'clinic', platform: 'linux' }, // check why nodejs is slow
    { name: 'vtop', platform: 'linux' }, // inspect you live applicaiton,
    { name: 'public-ip' },
    { name: 'empty-trash' },
    { name: 'is-up' }, // check if website is ok
    { name: 'is-online' }, // check if internet is ok,
    { name: 'ttystudio' }, // record terminal actions,
    { name: 'bcat' }, // redirect any stream to browser,
    { name: 'wifi-password', installName: 'wifi-password-cli' },
    { name: 'wallpaper', installName: 'wallpaper-cli' },
    { name: 'brightness', installName: 'brightness-cli' },
    { name: 'subdownloader' },
    { name: 'rtail' }, // monitor multiple server
    { name: 'iponmap' }, // show ip in terminal map,
    { name: 'jsome' }, // display colored jsons,
    { name: 'drawille', isNotCli: true }, // 3d drwa in temrinal
    { name: 'columnify', isNotCli: true }, // draw nice columns in node,
    { name: 'multispinner', isNotCli: true }, // progres for multiple async actions
    { name: 'cfonts' }, // draw super nice fonts in console
    //#endregion
  ],
  programs: [
    ,
    //#region @backend
    {
      name: 'code',
      website: 'https://code.visualstudio.com/',
    },
    //#endregion
  ],
};
