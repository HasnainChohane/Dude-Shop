
"use strict";

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell
} = require("electron");

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

const database = require("./database/db.cjs");

let mainWindow = null;
let isQuitting = false;

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
]);

function logError(context, error) {
  console.error(`[ShoeMaster] ${context}:`, error);
}

function registerHandler(channel, callback) {
  ipcMain.removeHandler(channel);

  ipcMain.handle(channel, async (event, ...args) => {
    try {
      if (event.sender.isDestroyed()) {
        throw new Error("Application window is no longer available.");
      }

      return await callback(...args);
    } catch (error) {
      logError(channel, error);
      throw new Error(
        error.message || "An unexpected application error occurred."
      );
    }
  });
}

function getProductImageDirectory() {
  const directory = path.join(
    app.getPath("userData"),
    "images",
    "products"
  );

  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

async function chooseProductImage() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Shoe Product Image",
    properties: ["openFile"],
    filters: [
      {
        name: "Product Images",
        extensions: ["jpg", "jpeg", "png", "webp"]
      }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const source = result.filePaths[0];
  const extension = path.extname(source).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported image format.");
  }

  const stats = fs.statSync(source);

  if (!stats.isFile()) {
    throw new Error("Selected image is not a valid file.");
  }

  if (stats.size > 10 * 1024 * 1024) {
    throw new Error("Image must be smaller than 10 MB.");
  }

  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(
    getProductImageDirectory(),
    filename
  );

  fs.copyFileSync(source, destination);

  return {
    canceled: false,
    path: destination,
    url: pathToFileURL(destination).href
  };
}

// WhatsApp server connection
function getWhatsAppConfig() {
  const serverUrl = process.env.SHOEMASTER_WHATSAPP_SERVER_URL;
  const apiKey = process.env.SHOEMASTER_API_KEY;

  if (!serverUrl || !apiKey) {
    throw new Error(
      "WhatsApp connection is not configured. Set SHOEMASTER_WHATSAPP_SERVER_URL and SHOEMASTER_API_KEY."
    );
  }

  let parsed;

  try {
    parsed = new URL(serverUrl);
  } catch {
    throw new Error("Invalid WhatsApp server URL.");
  }

  const localDevelopment =
    !app.isPackaged &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname);

  if (parsed.protocol !== "https:" && !localDevelopment) {
    throw new Error("WhatsApp server must use HTTPS.");
  }

  return {
    baseUrl: parsed.origin,
    apiKey
  };
}

async function whatsappRequest(endpoint, options = {}) {
  const config = getWhatsAppConfig();

  const response = await fetch(
    `${config.baseUrl}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(15000)
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `WhatsApp server returned HTTP ${response.status}.`
    );
  }

  return result;
}

/**
 * Opens Electron's native print dialog for receipt HTML sent by the renderer.
 * Printing is performed by Electron itself, not by window.open()/window.print().
 */
function printReceiptHtml(html) {
  if (typeof html !== "string" || !html.trim()) {
    throw new Error("Receipt content is empty.");
  }

  if (html.length > 2 * 1024 * 1024) {
    throw new Error("Receipt content is too large to print.");
  }

  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      width: 420,
      height: 720,
      show: false,
      parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
      autoHideMenuBar: true,
      title: "ShoeMaster Receipt",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    let finished = false;

    const finish = (error, result) => {
      if (finished) return;
      finished = true;

      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }

      if (error) reject(error);
      else resolve(result);
    };

    printWindow.webContents.once("did-fail-load", (_event, code, description) => {
      finish(new Error(`Receipt could not be loaded: ${description} (${code}).`));
    });

    printWindow.webContents.once("did-finish-load", () => {
      if (printWindow.isDestroyed()) {
        finish(new Error("Receipt print window was closed."));
        return;
      }

      // silent:false tells Electron to show the system print dialog.
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          color: true
        },
        (success, failureReason) => {
          if (!success) {
            finish(new Error(
              failureReason || "Printing was cancelled or the printer could not be reached."
            ));
            return;
          }

          finish(null, { success: true });
        }
      );
    });

    const dataUrl =
      "data:text/html;charset=UTF-8," + encodeURIComponent(html);

    printWindow.loadURL(dataUrl).catch(error => {
      finish(new Error(error.message || "Could not open receipt for printing."));
    });
  });
}

function registerHandlers() {
  // Native receipt printing
  registerHandler("receipt:print", html => printReceiptHtml(html));


  // Products
  registerHandler("products:list", query =>
    database.products.list(query)
  );

  registerHandler("products:save", data =>
    database.products.save(data)
  );

  registerHandler("products:delete", id =>
    database.products.delete(id)
  );

  registerHandler("products:choose-image", () =>
    chooseProductImage()
  );

  // Customers
  registerHandler("customers:list", () =>
    database.customers.list()
  );

  registerHandler("customers:save", data =>
    database.customers.save(data)
  );

  // Suppliers
  registerHandler("suppliers:list", () =>
    database.suppliers.list()
  );

  registerHandler("suppliers:save", data =>
    database.suppliers.save(data)
  );

  // Sales
  registerHandler("sales:list", () =>
    database.sales.list()
  );

  registerHandler("sales:create", data =>
    database.sales.create(data)
  );

  // Dashboard and reports
  registerHandler("dashboard:get", () =>
    database.dashboard()
  );

  registerHandler("reports:get", () =>
    database.reports()
  );

  // Settings
  registerHandler("settings:get", () =>
    database.settings.get()
  );

  registerHandler("settings:save", data =>
    database.settings.save(data)
  );

  // Stock
  registerHandler("stock:adjust", data =>
    database.stock.adjust(data)
  );

  // WhatsApp: incoming orders
  registerHandler("whatsapp:list", async after => {
    const timestamp = Number(after || 0);

    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new Error("Invalid WhatsApp order timestamp.");
    }

    const query = new URLSearchParams({
      after: String(timestamp)
    });

    return await whatsappRequest(
      `/api/orders?${query.toString()}`
    );
  });

  // WhatsApp: change order status
  registerHandler("whatsapp:update", async (id, status) => {
    if (
      typeof id !== "string" ||
      !id.trim() ||
      id.length > 500
    ) {
      throw new Error("Invalid WhatsApp order ID.");
    }

    const allowedStatuses = [
      "pending",
      "accepted",
      "rejected",
      "completed"
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid WhatsApp order status.");
    }

    return await whatsappRequest(
      `/api/orders/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status })
      }
    );
  });

  // Database backup
  registerHandler("database:backup", async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Backup ShoeMaster Database",
      defaultPath: `ShoeMaster-Backup-${new Date()
        .toISOString()
        .slice(0, 10)}.db`,
      filters: [
        {
          name: "SQLite Database",
          extensions: ["db"]
        }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    return await database.backup(result.filePath);
  });

  // External links
  registerHandler("external:open", async url => {
    let parsed;

    try {
      parsed = new URL(String(url));
    } catch {
      throw new Error("Invalid external URL.");
    }

    const allowedHosts = [
      "wa.me",
      "www.whatsapp.com",
      "whatsapp.com"
    ];

    if (
      parsed.protocol !== "https:" ||
      !allowedHosts.includes(parsed.hostname)
    ) {
      throw new Error("This external link is not permitted.");
    }

    await shell.openExternal(parsed.href);

    return { success: true };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f7f7f5",
    title: "ShoeMaster POS & ERP",

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);

      if (
        parsed.protocol === "https:" &&
        ["wa.me", "www.whatsapp.com", "whatsapp.com"].includes(
          parsed.hostname
        )
      ) {
        shell.openExternal(parsed.href);
      }
    } catch (error) {
      logError("External window request", error);
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedDevelopmentURL =
      !app.isPackaged &&
      url.startsWith("http://127.0.0.1:5173/");

    const allowedProductionURL =
      app.isPackaged &&
      url.startsWith("file://");

    if (!allowedDevelopmentURL && !allowedProductionURL) {
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }
}

app.whenReady().then(() => {
  try {
    database.initialize(app.getPath("userData"));

    registerHandlers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    logError("Application startup", error);

    dialog.showErrorBox(
      "ShoeMaster Startup Error",
      error.message || "The application could not start."
    );

    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;

  try {
    database.close();
  } catch (error) {
    logError("Database shutdown", error);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (!isQuitting) {
    try {
      database.close();
    } catch (error) {
      logError("Database final shutdown", error);
    }
  }
});
