/* wolfdenOS
 * Root JS Service Runner
 */

const child_process = require("child_process");
const fs = require("fs");

function log() {
  const args = Array.prototype.slice.call(arguments);
  const message = args.join(" ");
  console.log(message);
  try {
    fs.appendFileSync("/tmp/wolfdenos-service.log", message + "\n");
  } catch (e) {}
}

function run() {
  log("entered wolfdenOS run()");

  if (process.argv.length < 3) {
    log("error: missing script path");
    process.exit(1);
  }

  const scriptPath = process.argv[2];
  const args = process.argv.slice(3);

  log("scriptPath:", scriptPath);
  log("args:", args.join(" "));

  var status = "unknown error";

  try {
    child_process.execFileSync("/bin/sh", [scriptPath].concat(args), {
      stdio: "ignore",
      timeout: 45000,
    });
    status = "success";
  } catch (err) {
    status = "error: " + err.message;
  } finally {
    log("result:", status);
    process.exit(0);
  }
}

module.exports = { run: run };
