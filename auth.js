const crypto = require("crypto");

const usuariosAutorizados = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    nombre: "Administrador",
    email: "admin@tienda.com",
  },
  {
    id: 2,
    username: "vendedor",
    password: "vendedor123",
    nombre: "Vendedor",
    email: "vendedor@tienda.com",
  },
  {
    id: 3,
    username: "cliente",
    password: "cliente123",
    nombre: "Cliente",
    email: "cliente@tienda.com",
  },
];

// Almacenar sesiones en memoria
const sesiones = new Map();

// Generar token de sesión
function generarToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Validar credenciales
function validarCredenciales(username, password) {
  const usuario = usuariosAutorizados.find(
    (u) => u.username === username && u.password === password
  );
  return usuario;
}

// Crear sesión
function crearSesion(usuario) {
  const token = generarToken();
  const sesion = {
    token,
    usuario: {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      email: usuario.email,
    },
    creada: new Date(),
    expira: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  sesiones.set(token, sesion);
  return sesion;
}

// Obtener sesión por token
function obtenerSesion(token) {
  const sesion = sesiones.get(token);

  if (!sesion) {
    return null;
  }

  // Verificar expiración
  if (new Date() > sesion.expira) {
    sesiones.delete(token);
    return null;
  }

  return sesion;
}

// Eliminar sesión (logout)
function eliminarSesion(token) {
  sesiones.delete(token);
}

// Middleware de autenticación
function requerirAutenticacion(context) {
  // Obtener token de cookie o header
  const token =
    extraerTokenDeCookie(context.request) ||
    extraerTokenDeHeader(context.request);

  if (!token) {
    return null;
  }

  const sesion = obtenerSesion(token);

  if (!sesion) {
    return null;
  }

  // Agregar usuario y token al contexto
  context.usuario = sesion.usuario;
  context.token = token;
  context.sesion = sesion;

  return sesion;
}

// Extraer token de cookie
function extraerTokenDeCookie(request) {
  const cookie = request.headers.cookie || "";
  const cookies = cookie.split(";").reduce((acc, c) => {
    const [key, value] = c.trim().split("=");
    acc[key] = value;
    return acc;
  }, {});

  return cookies.token;
}

// Extraer token de header Authorization
function extraerTokenDeHeader(request) {
  const authHeader = request.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

// Establecer cookie de sesión
function establecerCookieSesion(response, token) {
  const cookieStr = `token=${token}; Path=/; HttpOnly; Max-Age=${24 * 60 * 60}`;
  response.setHeader("Set-Cookie", cookieStr);
}

// Limpiar cookie de sesión
function limpiarCookieSesion(response) {
  const cookieStr = "token=; Path=/; HttpOnly; Max-Age=0";
  response.setHeader("Set-Cookie", cookieStr);
}

// Proteger ruta
function protegerRuta(handler) {
  return async (context) => {
    const sesion = requerirAutenticacion(context);

    if (!sesion) {
      const { response } = context;
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ error: "No autorizado. Debes iniciar sesión." })
      );
      return;
    }

    // Ejecutar handler si está autenticado
    return handler(context);
  };
}

module.exports = {
  usuariosAutorizados,
  validarCredenciales,
  crearSesion,
  obtenerSesion,
  eliminarSesion,
  requerirAutenticacion,
  establecerCookieSesion,
  limpiarCookieSesion,
  protegerRuta,
};
