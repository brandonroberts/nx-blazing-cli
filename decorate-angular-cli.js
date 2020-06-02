/**
 * This file patches the Angular CLI to use the Nx CLI to enable
 * features such as computation caching, and faster execution of tasks.
 * 
 * It does this by:
 * 
 * - Symlinking the ng to nx command, so all commands run through the Nx CLI
 * - Updating the package.json postinstall script to give you control over this script
 */

const fs = require('fs');
const shelljs = require('shelljs');
const os = require('os');
const isWindows = os.platform() === 'win32';

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
  const patchedCLIInit = angularCLIInit.replace('require("symbol-observable");', `
  require("symbol-observable");

  console.log('!!!Warning about using Angular CLI instead of Nx CLI if env variable not set!!!');
  `)
  fs.writeFileSync(initPath, patchedCLIInit);
}

function symlinkNgCLItoNxCLI() {
  /**
   * This task performs symlinking of ng to nx
   */
  // Check OS
  if (isWindows) {
    // If Windows, symlink

  } else {
    // If unix-based, symlink
    shelljs.exec('ln -sf ./nx ./node_modules/.bin/ng');
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

symlinkNgCLItoNxCLI();
patchAngularCLI(angularCLIInitPath);
patchPackageJson(packageJsonPath);

console.log('Patching complete');