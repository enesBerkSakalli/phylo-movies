function unsupportedChildProcessApi(apiName) {
  throw new Error(`${apiName} is not available in the browser build.`);
}

export function spawn() {
  unsupportedChildProcessApi('child_process.spawn');
}

export function exec() {
  unsupportedChildProcessApi('child_process.exec');
}

const childProcess = {
  spawn,
  exec
};

export default childProcess;