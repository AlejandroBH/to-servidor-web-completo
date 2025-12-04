// router.js - Sistema de routing avanzado
const url = require("url");

class Router {
  constructor() {
    this.routes = {};
    this.middlewares = [];
  }

  // Agregar middleware global
  use(middleware) {
    this.middlewares.push(middleware);
  }

  // Registrar rutas con diferentes métodos
  addRoute(method, path, ...handlers) {
    if (!this.routes[method]) {
      this.routes[method] = [];
    }

    // Convertir path con parámetros a regex
    const paramNames = [];
    const regexPath = path.replace(/:(\w+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return "([^/]+)";
    });

    this.routes[method].push({
      originalPath: path,
      regex: new RegExp(`^${regexPath}$`),
      paramNames,
      handlers,
    });
  }

  // Métodos convenientes
  get(path, ...handlers) {
    this.addRoute("GET", path, ...handlers);
  }

  post(path, ...handlers) {
    this.addRoute("POST", path, ...handlers);
  }

  put(path, ...handlers) {
    this.addRoute("PUT", path, ...handlers);
  }

  delete(path, ...handlers) {
    this.addRoute("DELETE", path, ...handlers);
  }

  // Encontrar ruta que coincida
  findRoute(method, pathname) {
    const methodRoutes = this.routes[method];
    if (!methodRoutes) return null;

    for (const route of methodRoutes) {
      const match = pathname.match(route.regex);
      if (match) {
        // Extraer parámetros
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return { route, params };
      }
    }

    return null;
  }

  // Ejecutar middlewares y handlers
  async execute(request, response, routeInfo) {
    const { route, params } = routeInfo;

    // Crear contexto
    const context = {
      request,
      response,
      params,
      query: url.parse(request.url, true).query,
      body: null,
    };

    // Ejecutar middlewares globales
    for (const middleware of this.middlewares) {
      await middleware(context);
    }

    // Ejecutar handlers de la ruta
    for (const handler of route.handlers) {
      const result = await handler(context);
      if (result === "next") continue;
      if (result !== undefined) return result;
    }
  }
}

module.exports = Router;
