import { fse, child_process } from './core-imports';

import { Helpers } from './index';

const isUsingWindows = process.platform == 'win32';

const fileNotExists = function (commandName, callback) {
  fse.access(commandName, fse.constants.F_OK, function (err) {
    callback(!err);
  });
};

const fileNotExistsSync = function (commandName) {
  try {
    fse.accessSync(commandName, fse.constants.F_OK);
    return false;
  } catch (e) {
    return true;
  }
};

const localExecutable = function (commandName, callback) {
  fse.access(
    commandName,
    fse.constants.F_OK | fse.constants.X_OK,
    function (err) {
      callback(null, !err);
    },
  );
};

const localExecutableSync = function (commandName) {
  try {
    fse.accessSync(commandName, fse.constants.F_OK | fse.constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const commandExistsUnix = function (commandName, callback) {
  fileNotExists(commandName, function (isFile) {
    if (!isFile) {
      var child = child_process.exec(
        'command -v ' +
          commandName +
          ' 2>/dev/null' +
          " && { echo >&1 '" +
          commandName +
          " found'; exit 0; }",
        function (error, stdout, stderr) {
          callback(null, !!stdout);
        },
      );
      return;
    }

    localExecutable(commandName, callback);
  });
};

const commandExistsWindows = function (commandName, callback) {
  Helpers.commandOutputAsStringAsync('where ' + commandName)
    .then(() => {
      callback(null, false);
    })
    .catch(() => {
      callback(null, true);
    });
};

const commandExistsUnixSync = function (commandName) {
  if (fileNotExistsSync(commandName)) {
    try {
      var stdout = child_process.execSync(
        'command -v ' +
          commandName +
          ' 2>/dev/null' +
          " && { echo >&1 '" +
          commandName +
          " found'; exit 0; }",
      );
      return !!stdout;
    } catch (error) {
      return false;
    }
  }

  return localExecutableSync(commandName);
};

const commandExistsWindowsSync = function (commandName) {
  try {
    var stdout = Helpers.commandOutputAsString(`where ${commandName}`);
    return !!stdout;
  } catch (error) {
    return false;
  }
};

export function checkSyncIfCommandExistsAsync(
  commandName,
  callback,
): Promise<boolean> {
  if (!callback && typeof Promise !== 'undefined') {
    return new Promise(function (resolve, reject) {
      checkSyncIfCommandExistsAsync(commandName, function (error, output) {
        if (output) {
          resolve(commandName);
        } else {
          reject(error);
        }
      });
    });
  }
  if (isUsingWindows) {
    commandExistsWindows(commandName, callback);
  } else {
    commandExistsUnix(commandName, callback);
  }
}

export const commandExistsSync = (commandName: string) => {
  if (isUsingWindows) {
    return commandExistsWindowsSync(commandName);
  } else {
    return commandExistsUnixSync(commandName);
  }
};
