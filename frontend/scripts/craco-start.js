const net = require("net");
const path = require("path");

process.env.NODE_NO_WARNINGS = "1";
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--no-deprecation"]
  .filter(Boolean)
  .join(" ");

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function pickPort(startPort = 5000) {
  let port = startPort;

  while (!(await isPortFree(port))) {
    port += 1;
  }

  return port;
}

(async () => {
  if (!process.env.PORT) {
    process.env.PORT = String(await pickPort(5000));
  }

  const script = process.argv[2] || "start";
  process.argv = [
    process.argv[0],
    path.resolve(__dirname, "../node_modules/@craco/craco/dist/bin/craco.js"),
    script,
    ...process.argv.slice(3),
  ];

  require("../node_modules/@craco/craco/dist/bin/craco.js");
})();