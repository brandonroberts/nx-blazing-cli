/**
 * This file patches the Angular CLI to use the Nx CLI to enable
 * features such as computation caching, and faster execution of tasks.
 * 
 * It does this by:
 * 
 * - Patching the Angular CLI to warn you in case you accidentally use the ng command going forward.
 * - Symlinking the ng to nx command, so all commands run through the Nx CLI
 * - Updating the package.json postinstall script to give you control over this script
 * 
 * To opt out of this patch:
 * - Replace occurrences of nx with ng in your package.json
 * - Remove the script from your postinstall script in your package.json
 * - Delete and reinstall your node_modules
 */

const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');
const os = require('os');
const isWindows = os.platform() === 'win32';
const { output } = require('@nrwl/workspace');

/**
 * Paths to files being patched
 * 
 */
const angularCLIInitPath = 'node_modules/@angular/cli/lib/init.js';
const packageJsonPath = 'package.json';

/**
 * This task performs patching of Angular CLI init.js
 */
function patchAngularCLI(initPath) {
  const angularCLIInit = fs.readFileSync(initPath, 'utf-8').toString();

  if (!angularCLIInit.includes('NX_CLI_SET')) {
    const patchedCLIInit = angularCLIInit.replace('require("symbol-observable");', `
  require("symbol-observable");
  const { output } = require('@nrwl/workspace');
  
  if (!process.env['NX_CLI_SET']) {
    output.warn({ title: 'The Angular CLI was invoked instead of the Nx CLI. Use the nx [command] instead' });
  }
  `);

    fs.writeFileSync(initPath, patchedCLIInit);
  }
}

function symlinkNgCLItoNxCLI() {
  /**
   * This task performs symlinking of ng to nx
   */
  // Check OS
  try {
    const ngPath = './node_modules/.bin/ng';
    const nxPath = './node_modules/.bin/nx';

    if (isWindows) {
      /**
       * Node has a built-in API to create symlinks
       * https://nodejs.org/docs/latest-v13.x/api/fs.html
       */
      // If Windows, symlink
      if (fs.existsSync(ngPath)) {
        fs.unlinkSync(ngPath);
      }
      
      fs.symlinkSync(nxPath, ngPath, 'junction');
    } else {
      // If unix-based, symlink
      shelljs.exec(`ln -sf ./nx ${ngPath}`);
    }
  }
  catch(e) {
    output.error({ title: 'Unable to create a symlink from the Angular CLI to the Nx CLI:' + e.message });
    throw e;
  }
}

/**
 * This task performs updating of the package.json to run nx
 */
function patchPackageJson(pkgJsonPath) {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(pkgJsonPath).toString('utf-8'));
  // check for postinstall script
  if (packageJson.scripts.postinstall) {
    // if exists, add execution of this script
    if (!packageJson.scripts.postinstall.includes('decorate-angular-cli.js')) {
      packageJson.scripts.postinstall += ' && node ./decorate-angular-cli.js';
    }
  } else {
    // if doesn't exist, set to execute this script
    packageJson.scripts.postinstall = 'node ./decorate-angular-cli.js';
  }

  // check for ng script
  if (packageJson.scripts.ng) {
    // if ng, set to nx
    packageJson.scripts.ng = 'nx';
  }

  fs.writeFileSync(pkgJsonPath, JSON.stringify(packageJson, null, 2));
}


try {
  symlinkNgCLItoNxCLI();
  patchAngularCLI(angularCLIInitPath);
  patchPackageJson(packageJsonPath);
  output.log({ title: 'Patching of the Angular CLI completed successfully' });
} catch(e) {
  output.error({ title: 'Patching of the Angular CLI did not complete successfully' });
}
