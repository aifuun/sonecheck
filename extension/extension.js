'use strict';

/**
 * SoneCheck — VS Code extension, name-reservation release.
 *
 * Version 0.0.1 reserves the Marketplace listing `rolligen.sonecheck`.
 * No inspection functionality is implemented yet; the single command below
 * exists so the listing is honest and interactive rather than an empty shell.
 *
 * Roadmap and design documents: https://github.com/aifuun/sonecheck
 */

const vscode = require('vscode');

/** Version of the placeholder release. */
const RESERVED_VERSION = '0.0.1';

/** The first release expected to contain a working implementation. */
const FIRST_FUNCTIONAL_VERSION = '0.1.0';

const STATUS_COMMAND = 'sonecheck.showStatus';

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(STATUS_COMMAND, () => {
      vscode.window.showInformationMessage(
        `SoneCheck ${RESERVED_VERSION} only reserves the name. ` +
          `The first functional release is ${FIRST_FUNCTIONAL_VERSION}. ` +
          'See https://github.com/aifuun/sonecheck'
      );
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
