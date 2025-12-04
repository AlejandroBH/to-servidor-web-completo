// templates.js - Sistema básico de templates
const fs = require("fs").promises;
const path = require("path");

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

    let template = this.cache.get(templatePath);

    // Reemplazar variables simples {{variable}}
    template = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : "";
    });

    // Soporte para bucles básicos {{#each items}}{{/each}}
    template = template.replace(
      /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, templateContent) => {
        const possibleArray = data[arrayName];
        const array = Array.isArray(possibleArray) ? possibleArray : [];
        return array
          .map((item) => {
            let itemTemplate = templateContent;
            // Reemplazar propiedades del item {{propiedad}}
            itemTemplate = itemTemplate.replace(
              /\{\{(\w+)\}\}/g,
              (match, prop) => {
                return item[prop] !== undefined ? item[prop] : "";
              }
            );
            return itemTemplate;
          })
          .join("");
      }
    );

    return template;
  }

  // Limpiar cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = TemplateEngine;
