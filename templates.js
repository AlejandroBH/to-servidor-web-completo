// templates.js - Sistema básico de templates
const fs = require("fs").promises;
const path = require("path");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (e) {
    return false;
  }
}

class TemplateEngine {
  constructor(viewsPath = "./views") {
    this.viewsPath = viewsPath;
    this.cache = new Map();
  }

  // Renderizar template con datos
  async render(templateName, data = {}) {
    const templatePath = path.join(this.viewsPath, `${templateName}.html`);

    // Cargar template (con cache)
    if (!this.cache.has(templatePath)) {
      try {
        const content = await fs.readFile(templatePath, "utf8");
        this.cache.set(templatePath, content);
      } catch (error) {
        throw new Error(
          `Template ${templateName} no encontrado: ${error.message}`
        );
      }
    }

    let templateContent = this.cache.get(templatePath);

    // Resolver rutas con puntos, p.ej. 'productos.length'
    function resolvePath(root, path) {
      if (!path) return undefined;
      const parts = path.split(".");
      let cur = root;
      for (const p of parts) {
        if (cur === undefined || cur === null) return undefined;
        cur = cur[p];
      }
      return cur;
    }

    // Soporte básico para condicionales {{#if var}}...{{else}}...{{/if}}
    templateContent = templateContent.replace(
      /\{\{#if ([\w.@]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, varName, inner) => {
        // Soportar {{else}} dentro del bloque
        const elseMatch = inner.match(/([\s\S]*?)\{\{else\}\}([\s\S]*)/);
        const value = resolvePath(data, varName);
        const truthy =
          value !== undefined &&
          value !== null &&
          ((Array.isArray(value) && value.length > 0) ||
            (typeof value === "object" &&
              !Array.isArray(value) &&
              Object.keys(value).length > 0) ||
            (typeof value === "boolean" && value) ||
            (typeof value === "number" && value !== 0) ||
            (typeof value === "string" && value !== ""));

        if (elseMatch) {
          const ifPart = elseMatch[1];
          const elsePart = elseMatch[2];
          return truthy ? ifPart : elsePart;
        } else {
          return truthy ? inner : "";
        }
      }
    );

    // Soporte para bucles básicos {{#each items}}{{/each}} en el template hijo
    templateContent = templateContent.replace(
      /\{\{#each ([\w.@]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, inner) => {
        const possible = resolvePath(data, arrayName);
        if (Array.isArray(possible)) {
          return possible
            .map((item) => {
              let itemTemplate = inner;
              itemTemplate = itemTemplate.replace(
                /\{\{(@?\w+)\}\}/g,
                (m, prop) => {
                  if (prop === "this")
                    return item !== undefined && item !== null ? item : "";
                  return item && item[prop] !== undefined ? item[prop] : "";
                }
              );
              return itemTemplate;
            })
            .join("");
        }

        if (possible && typeof possible === "object") {
          return Object.keys(possible)
            .map((key) => {
              const val = possible[key];
              let itemTemplate = inner;
              itemTemplate = itemTemplate.replace(
                /\{\{(@?\w+)\}\}/g,
                (m, prop) => {
                  if (prop === "@key") return key;
                  if (prop === "this")
                    return val !== undefined && val !== null ? val : "";
                  return val && val[prop] !== undefined ? val[prop] : "";
                }
              );

              return itemTemplate;
            })
            .join("");
        }

        return "";
      }
    );

    // Intentar envolver en layout si existe layout.html
    const layoutPath = path.join(this.viewsPath, "layout.html");
    let finalHtml = templateContent;

    if (this.cache.has(layoutPath) || (await fileExists(layoutPath))) {
      if (!this.cache.has(layoutPath)) {
        try {
          const layoutContent = await fs.readFile(layoutPath, "utf8");
          this.cache.set(layoutPath, layoutContent);
        } catch (error) {
          // Ignorar si no existe
        }
      }

      const layoutTpl = this.cache.get(layoutPath);
      if (layoutTpl) {
        // Insertar contenido hijo en {{{content}}}
        finalHtml = layoutTpl.replace("{{{content}}}", templateContent);
      }
    }

    // Reemplazar variables simples y con rutas con puntos {{variable}} o {{a.b.c}} en el HTML final
    finalHtml = finalHtml.replace(/\{\{([\w.@]+)\}\}/g, (match, key) => {
      const val = resolvePath(data, key);
      return val !== undefined && val !== null ? val : "";
    });

    return finalHtml;
  }

  // Limpiar cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = TemplateEngine;
