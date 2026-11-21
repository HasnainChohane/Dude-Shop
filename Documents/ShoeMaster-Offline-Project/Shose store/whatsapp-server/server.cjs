
"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3001);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const API_KEY = process.env.SHOEMASTER_API_KEY;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "orders.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(orders, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "null"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function verifySignature(rawBody, signature) {
  if (!APP_SECRET || !signature) return false;

  const expected = "sha256=" + crypto
    .createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function extractMessages(payload) {
  const result = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      for (const message of value.messages || []) {
        const contact = (value.contacts || []).find(
          item => item.wa_id === message.from
        );

        let messageText = "";

        if (message.type === "text") {
          messageText = message.text?.body || "";
        } else if (message.type === "button") {
          messageText = message.button?.text || "";
        } else if (message.type === "interactive") {
          messageText =
            message.interactive?.button_reply?.title ||
            message.interactive?.list_reply?.title ||
            "";
        } else {
          messageText = `[${message.type || "unknown"} message]`;
        }

        result.push({
          id: message.id,
          customerPhone: message.from || "",
          customerName: contact?.profile?.name || "WhatsApp Customer",
          message: messageText,
          messageType: message.type || "unknown",
          timestamp: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          status: "pending",
          source: "whatsapp"
        });
      }
    }
  }

  return result;
}

function authorized(req) {
  return Boolean(API_KEY) &&
    req.headers["x-api-key"] === API_KEY;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Meta webhook verification
    if (req.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === VERIFY_TOKEN && VERIFY_TOKEN) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end(challenge || "");
      }

      return sendJson(res, 403, { error: "Webhook verification failed" });
    }

    // Receive messages from Meta
    if (req.method === "POST" && url.pathname === "/webhook") {
      const rawBody = await readBody(req);

      if (!verifySignature(
        rawBody,
        req.headers["x-hub-signature-256"]
      )) {
        return sendJson(res, 401, { error: "Invalid webhook signature" });
      }

      const payload = JSON.parse(rawBody);
      const incoming = extractMessages(payload);
      const orders = readOrders();

      for (const message of incoming) {
        if (!message.id || orders.some(order => order.id === message.id)) {
          continue;
        }

        orders.unshift(message);
      }

      saveOrders(orders);
      return sendJson(res, 200, { received: true });
    }

    // Desktop app: retrieve incoming orders
    if (req.method === "GET" && url.pathname === "/api/orders") {
      if (!authorized(req)) {
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const after = Number(url.searchParams.get("after") || 0);

      const orders = readOrders().filter(order =>
        new Date(order.timestamp).getTime() > after
      );

      return sendJson(res, 200, { orders });
    }

    // Desktop app: update order status
    if (
      req.method === "PATCH" &&
      url.pathname.startsWith("/api/orders/")
    ) {
      if (!authorized(req)) {
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const id = decodeURIComponent(
        url.pathname.slice("/api/orders/".length)
      );

      const body = JSON.parse(await readBody(req));
      const allowed = ["pending", "accepted", "rejected", "completed"];

      if (!allowed.includes(body.status)) {
        return sendJson(res, 400, { error: "Invalid status" });
      }

      const orders = readOrders();
      const order = orders.find(item => item.id === id);

      if (!order) {
        return sendJson(res, 404, { error: "Order not found" });
      }

      order.status = body.status;
      order.updatedAt = new Date().toISOString();

      saveOrders(orders);
      return sendJson(res, 200, { success: true, order });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("WhatsApp server error:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ShoeMaster WhatsApp server running on port ${PORT}`);
});
