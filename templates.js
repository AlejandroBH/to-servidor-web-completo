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

    // Soporte para bucles básicos {{#each items}}{{/each}} en el template hijo
    templateContent = templateContent.replace(
      /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, inner) => {
        const possibleArray = data[arrayName];
        const array = Array.isArray(possibleArray) ? possibleArray : [];
        return array
          .map((item) => {
            let itemTemplate = inner;
            itemTemplate = itemTemplate.replace(/\{\{(\w+)\}\}/g, (m, prop) => {
              return item[prop] !== undefined ? item[prop] : "";
            });
            return itemTemplate;
          })
          .join("");
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

    // Reemplazar variables simples {{variable}} en el HTML final
    finalHtml = finalHtml.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : "";
    });

    return finalHtml;
  }

  // Limpiar cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = TemplateEngine;
