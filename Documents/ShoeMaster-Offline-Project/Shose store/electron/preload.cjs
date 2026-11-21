"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("shoeAPI", {
  // Products and images
  products: {
    list: (query = "") => invoke("products:list", query),
    save: data => invoke("products:save", data),
    delete: id => invoke("products:delete", id),
    chooseImage: () => invoke("products:choose-image")
  },

  // Customers
  customers: {
    list: () => invoke("customers:list"),
    save: data => invoke("customers:save", data)
  },

  // Suppliers
  suppliers: {
    list: () => invoke("suppliers:list"),
    save: data => invoke("suppliers:save", data)
  },

  // Sales and receipts
  sales: {
    list: () => invoke("sales:list"),
    create: data => invoke("sales:create", data)
  },

  // Opens Electron's native system print dialog for receipt HTML
  printReceipt: html => invoke("receipt:print", html),

  // Dashboard
  dashboard: () => invoke("dashboard:get"),

  // Reports
  reports: () => invoke("reports:get"),

  // Store settings
  settings: {
    get: () => invoke("settings:get"),
    save: data => invoke("settings:save", data)
  },

  // Stock control
  stock: {
    adjust: data => invoke("stock:adjust", data)
  },

  // WhatsApp incoming orders
  whatsapp: {
    list: (after = 0) => invoke("whatsapp:list", after),
    update: (id, status) => invoke("whatsapp:update", id, status)
  },

  // Database backup
  backup: () => invoke("database:backup"),

  // WhatsApp and permitted external links
  external: {
    open: url => invoke("external:open", url)
  }
});
