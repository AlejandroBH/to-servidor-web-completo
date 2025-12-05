function completarFormulario(username, password) {
  document.getElementById("username").value = username;
  document.getElementById("password").value = password;
  document.getElementById("loginForm").submit();
}

document.getElementById("loginForm").addEventListener("submit", function (e) {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    e.preventDefault();
    mostrarError("Por favor completa todos los campos");
  }
});

// Mostrar mensaje de error
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("error")) {
  mostrarError("Credenciales inválidas. Por favor intenta de nuevo.");
}

function mostrarError(mensaje) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = mensaje;
  errorDiv.classList.add("show");
}
