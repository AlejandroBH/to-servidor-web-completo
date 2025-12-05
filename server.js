// server.js - Servidor web completo
const http = require("http");
const url = require("url");
const Router = require("./router");
const TemplateEngine = require("./templates");
const StaticServer = require("./static-server");
const { logger, cors, jsonParser, staticFiles } = require("./middleware");
const Auth = require("./auth");

// Datos de ejemplo
const productos = [
  {
    id: 1,
    nombre: "Laptop Gaming",
    precio: 1200,
    categoria: "Electrónica",
    imagen: "producto-1.jpg",
  },
  {
    id: 2,
    nombre: "Mouse Inalámbrico",
    precio: 50,
    categoria: "Accesorios",
    imagen: "producto-2.jpg",
  },
  {
    id: 3,
    nombre: "Teclado Mecánico",
    precio: 150,
    categoria: "Accesorios",
    imagen: "producto-3.jpg",
  },
  {
    id: 4,
    nombre: 'Monitor 27"',
    precio: 300,
    categoria: "Electrónica",
    imagen: "producto-4.jpg",
  },
];

// Inicializar componentes
const router = new Router();
const templates = new TemplateEngine();
const staticServer = new StaticServer();

// Configurar middleware
router.use(logger);
router.use(cors);
router.use(jsonParser);

// Rutas principales
router.get("/", async (context) => {
  const { response } = context;

  const html = await templates.render("home", {
    titulo: "Bienvenido a Mi Tienda",
    productos: productos.slice(0, 3), // Mostrar 3 productos destacados
    fecha: new Date().toLocaleDateString("es-ES"),
  });

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});

router.get("/productos", async (context) => {
  const { response, query } = context;

  let productosFiltrados = productos;

  // Filtros por query
  if (query.categoria) {
    productosFiltrados = productosFiltrados.filter(
      (p) => p.categoria === query.categoria
    );
  }

  if (query.maxPrecio) {
    const maxPrecio = parseFloat(query.maxPrecio);
    productosFiltrados = productosFiltrados.filter(
      (p) => p.precio <= maxPrecio
    );
  }

  const html = await templates.render("productos", {
    titulo: "Nuestros Productos",
    productos: productosFiltrados,
    filtros: query,
  });

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});

router.get("/productos/:id", async (context) => {
  const { response, params } = context;
  const id = parseInt(params.id);
  const producto = productos.find((p) => p.id === id);

  if (!producto) {
    const html = await templates.render("404", {
      titulo: "Producto no encontrado",
      mensaje: `El producto con ID ${id} no existe.`,
    });
    response.writeHead(404, { "Content-Type": "text/html" });
    response.end(html);
    return;
  }

  const html = await templates.render("producto-detalle", {
    titulo: producto.nombre,
    producto,
  });

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});

router.get("/acerca", async (context) => {
  const { response } = context;

  const html = await templates.render("about", {
    titulo: "Acerca de Nosotros",
    empresa: "Mi Tienda Online",
    descripcion: "Somos una tienda especializada en productos tecnológicos.",
    fundacion: 2020,
  });

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});

// Autenticación
router.get("/login", async (context) => {
  const { response } = context;

  if (Auth.requerirAutenticacion(context)) {
    response.writeHead(302, { Location: "/dashboard" });
    response.end();
    return;
  }

  const html = await templates.render("login", {
    titulo: "Iniciar Sesión",
  });

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});

router.post("/login", async (context) => {
  const { response, body } = context;

  const username = body?.username;
  const password = body?.password;

  if (!username || !password) {
    response.writeHead(302, { Location: "/login?error=campos_vacios" });
    response.end();
    return;
  }

  const usuario = Auth.validarCredenciales(username, password);

  if (!usuario) {
    response.writeHead(302, {
      Location: "/login?error=credenciales_invalidas",
    });
    response.end();
    return;
  }

  const sesion = Auth.crearSesion(usuario);

  Auth.establecerCookieSesion(response, sesion.token);

  response.writeHead(302, { Location: "/dashboard" });
  response.end();
});

// Dashboard
router.get("/dashboard", async (context) => {
  const { response } = context;

  const sesion = Auth.requerirAutenticacion(context);

  if (!sesion) {
    response.writeHead(302, { Location: "/login" });
    response.end();
    return;
  }

  const html = await templates.render("dashboard", {
    titulo: "Dashboard",
    usuario: sesion.usuario,
  });

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});

// Logout
router.post("/logout", async (context) => {
  const { response } = context;

  const sesion = Auth.requerirAutenticacion(context);

  if (sesion) {
    Auth.eliminarSesion(sesion.token);
  }

  Auth.limpiarCookieSesion(response);

  response.writeHead(302, { Location: "/" });
  response.end();
});

// API REST
router.get("/api/productos", (context) => {
  const { response, query } = context;

  let resultados = productos;

  // Aplicar filtros
  if (query.categoria) {
    resultados = resultados.filter((p) => p.categoria === query.categoria);
  }

  if (query.minPrecio) {
    const minPrecio = parseFloat(query.minPrecio);
    resultados = resultados.filter((p) => p.precio >= minPrecio);
  }

  if (query.maxPrecio) {
    const maxPrecio = parseFloat(query.maxPrecio);
    resultados = resultados.filter((p) => p.precio <= maxPrecio);
  }

  // Ordenamiento
  if (query.ordenar === "precio_asc") {
    resultados.sort((a, b) => a.precio - b.precio);
  } else if (query.ordenar === "precio_desc") {
    resultados.sort((a, b) => b.precio - a.precio);
  }

  // Paginación
  const pagina = parseInt(query.pagina) || 1;
  const limite = parseInt(query.limite) || 10;
  const inicio = (pagina - 1) * limite;
  const paginados = resultados.slice(inicio, inicio + limite);

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      total: resultados.length,
      pagina,
      limite,
      productos: paginados,
    })
  );
});

router.get("/api/productos/:id", (context) => {
  const { response, params } = context;
  const id = parseInt(params.id);
  const producto = productos.find((p) => p.id === id);

  if (!producto) {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Producto no encontrado" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(producto));
});

// Obtener perfil del usuario autenticado
router.get("/api/perfil", (context) => {
  const { response } = context;

  const sesion = Auth.requerirAutenticacion(context);

  if (!sesion) {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "No autorizado" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      usuario: sesion.usuario,
      sesion: {
        creada: sesion.creada,
        expira: sesion.expira,
      },
    })
  );
});

router.get("/api/auth/status", (context) => {
  const { response } = context;

  const sesion = Auth.requerirAutenticacion(context);

  if (!sesion) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ autenticado: false }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      autenticado: true,
      usuario: sesion.usuario,
    })
  );
});

router.get("/api/usuarios", (context) => {
  const { response } = context;

  const sesion = Auth.requerirAutenticacion(context);

  if (!sesion) {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "No autorizado" }));
    return;
  }

  if (sesion.usuario.username !== "admin") {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        error: "Acceso denegado. Solo administrador puede ver usuarios.",
      })
    );
    return;
  }

  // Retornar usuarios sin contraseñas
  const usuariosPublicos = Auth.usuariosAutorizados.map((u) => ({
    id: u.id,
    username: u.username,
    nombre: u.nombre,
    email: u.email,
  }));

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(usuariosPublicos));
});

// Crear servidor
const servidor = http.createServer(async (request, response) => {
  const { method } = request;

  const parsedUrl = url.parse(request.url, true);
  const { pathname } = parsedUrl;

  try {
    // Intentar servir archivo estático primero
    const archivoServido = await staticServer.serve(request, response);
    if (archivoServido) return;

    // Buscar ruta en el router
    const routeInfo = router.findRoute(method, pathname);

    if (routeInfo) {
      await router.execute(request, response, routeInfo);
    } else {
      // Página 404
      const html = await templates.render("404", {
        titulo: "Página no encontrada",
        mensaje: `La ruta ${pathname} no existe en este servidor.`,
      });
      response.writeHead(404, { "Content-Type": "text/html" });
      response.end(html);
    }
  } catch (error) {
    console.error("Error en el servidor:", error);

    // Página de error
    const html = await templates.render("error", {
      titulo: "Error del servidor",
      mensaje:
        "Ha ocurrido un error interno. Por favor, inténtalo de nuevo más tarde.",
      error: process.env.NODE_ENV === "development" ? error.message : "",
    });

    response.writeHead(500, { "Content-Type": "text/html" });
    response.end(html);
  }
});

// Inicialización
async function iniciarServidor() {
  try {
    // Precargar archivos críticos
    await staticServer.preload(["css/styles.css", "js/app.js"]);

    // Iniciar servidor
    const PUERTO = process.env.PORT || 3000;
    servidor.listen(PUERTO, () => {
      console.log(
        `🚀 Servidor web completo ejecutándose en http://localhost:${PUERTO}`
      );
      console.log(`📄 Página principal: http://localhost:${PUERTO}`);
      console.log(`🛍️  Productos: http://localhost:${PUERTO}/productos`);
      console.log(`🔐 Iniciar sesión: http://localhost:${PUERTO}/login`);
      console.log(`📊 Dashboard: http://localhost:${PUERTO}/dashboard`);
      console.log(`📡 API: http://localhost:${PUERTO}/api/productos`);
      console.log(
        `👤 API Perfil: http://localhost:${PUERTO}/api/perfil (autenticado)`
      );
      console.log(
        `👥 API Usuarios: http://localhost:${PUERTO}/api/usuarios (solo admin)`
      );
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Cerrando servidor...");
  servidor.close(() => {
    console.log("✅ Servidor cerrado correctamente");
    process.exit(0);
  });
});

// Iniciar servidor
iniciarServidor();
