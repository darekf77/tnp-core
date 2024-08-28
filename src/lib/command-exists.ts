const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
import { Helpers } from "./index";
import { fse } from "./core-imports";
const access = fse.access;
const accessSync = fse.accessSync;
const constants = fse.constants;


const isUsingWindows = process.platform == 'win32'

const fileNotExists = function (commandName, callback) {
  access(commandName, constants.F_OK,
    function (err) {
      callback(!err);
    });
};

const fileNotExistsSync = function (commandName) {
  try {
    accessSync(commandName, constants.F_OK);
    return false;
  } catch (e) {
    return true;
  }
};

const localExecutable = function (commandName, callback) {
  access(commandName, constants.F_OK | constants.X_OK,
    function (err) {
      callback(null, !err);
    });
};

const localExecutableSync = function (commandName) {
  try {
    accessSync(commandName, constants.F_OK | constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}

const commandExistsUnix = function (commandName, callback) {

  fileNotExists(commandName, function (isFile) {

    if (!isFile) {
      var child = exec('command -v ' + commandName +
        ' 2>/dev/null' +
        ' && { echo >&1 \'' + commandName + ' found\'; exit 0; }',
        function (error, stdout, stderr) {
          callback(null, !!stdout);
        });
      return;
    }

    localExecutable(commandName, callback);
  });

}

const commandExistsWindows = function (commandName, callback) {
  Helpers.commnadOutputAsStringAsync('where ' + commandName,)
    .then(() => {
      callback(null, false);
    })
    .catch(() => {
      callback(null, true);
    });
}

const commandExistsUnixSync = function (commandName) {
  if (fileNotExistsSync(commandName)) {
    try {
      var stdout = execSync('command -v ' + commandName +
        ' 2>/dev/null' +
        ' && { echo >&1 \'' + commandName + ' found\'; exit 0; }'
      );
      return !!stdout;
    } catch (error) {
      return false;
    }
  }

  return localExecutableSync(commandName);

}

const commandExistsWindowsSync = function (commandName) {
  try {
    var stdout = Helpers.commnadOutputAsString(`where ${commandName}`);
    return !!stdout;
  } catch (error) {
    return false;
  }
}

export function checkSyncIfCommandExistsAsync(commandName, callback): Promise<boolean> {
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
};

export const checkSyncIfCommandExists = (commandName: string) => {
  if (isUsingWindows) {
    return commandExistsWindowsSync(commandName);
  } else {
    return commandExistsUnixSync(commandName);
  }
};
