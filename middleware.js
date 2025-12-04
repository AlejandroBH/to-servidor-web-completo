// middleware.js - Middleware común
const fs = require("fs").promises;
const path = require("path");

// Middleware de logging
function logger(context) {
  const timestamp = new Date().toISOString();
  const { method, url } = context.request;
  console.log(`[${timestamp}] ${method} ${url}`);
}

// Middleware CORS
function cors(context) {
  const { response } = context;
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Middleware para parsear JSON
async function jsonParser(context) {
  const { request } = context;

  if (request.headers["content-type"] === "application/json") {
    let body = "";

    return new Promise((resolve, reject) => {
      request.on("data", (chunk) => {
        body += chunk.toString();
      });

      request.on("end", () => {
        try {
          context.body = JSON.parse(body);
          resolve();
        } catch (error) {
          reject(new Error("JSON inválido"));
        }
      });

      request.on("error", reject);
    });
  }
}

// Middleware para servir archivos estáticos
async function staticFiles(context) {
  const { request, response } = context;
  const parsedUrl = url.parse(request.url);
  const pathname = parsedUrl.pathname;

  // Solo servir archivos de /public/
  if (pathname.startsWith("/public/")) {
    const filePath = path.join(__dirname, pathname);

    try {
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const ext = path.extname(filePath);
        const contentType = getContentType(ext);

        response.writeHead(200, { "Content-Type": contentType });

        const stream = fs.createReadStream(filePath);
        stream.pipe(response);
        return "end"; // Terminar procesamiento
      }
    } catch (error) {
      // Archivo no encontrado, continuar
    }
  }
}

function getContentType(ext) {
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
  };
  return types[ext] || "text/plain";
}

module.exports = {
  logger,
  cors,
  jsonParser,
  staticFiles,
};
