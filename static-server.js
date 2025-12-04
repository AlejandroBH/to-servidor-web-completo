// static-server.js - Servidor optimizado de archivos estáticos
const fs = require("fs").promises;
const url = require("url");
const path = require("path");
const { createReadStream } = require("fs");

class StaticServer {
  constructor(publicPath = "./public") {
    this.publicPath = publicPath;
    this.cache = new Map();
    this.mimeTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain",
    };
  }

  // Servir archivo estático
  async serve(request, response) {
    const parsedUrl = url.parse(request.url);
    const pathname = parsedUrl.pathname;

    // Solo servir rutas que empiecen con /static/
    if (!pathname.startsWith("/static/")) {
      return false;
    }

    // Resolver ruta del archivo
    const relativePath = pathname.replace("/static/", "");
    const filePath = path.join(this.publicPath, relativePath);

    try {
      // Verificar que el archivo existe y es seguro
      const stat = await fs.stat(filePath);

      if (!stat.isFile()) {
        return this.sendError(response, 404, "Archivo no encontrado");
      }

      // Verificar que no está intentando acceder fuera de public/
      const resolvedPath = path.resolve(filePath);
      const publicPath = path.resolve(this.publicPath);

      if (!resolvedPath.startsWith(publicPath)) {
        return this.sendError(response, 403, "Acceso denegado");
      }

      // Headers de cache y tipo de contenido
      const ext = path.extname(filePath);
      const contentType = this.mimeTypes[ext] || "application/octet-stream";

      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // 1 año
        "Last-Modified": stat.mtime.toUTCString(),
      });

      // Stream el archivo
      const stream = createReadStream(filePath);
      stream.pipe(response);

      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return this.sendError(response, 404, "Archivo no encontrado");
      }
      return this.sendError(response, 500, "Error interno del servidor");
    }
  }

  sendError(response, statusCode, message) {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: message, status: statusCode }));
    return true;
  }

  // Método para preload de archivos críticos
  async preload(files) {
    for (const file of files) {
      const filePath = path.join(this.publicPath, file);
      try {
        const content = await fs.readFile(filePath);
        this.cache.set(file, content);
      } catch (error) {
        console.warn(`No se pudo precargar ${file}:`, error.message);
      }
    }
  }
}

module.exports = StaticServer;
