
"use strict";

const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

let db = null;
let databasePath = null;

const DEFAULT_SETTINGS = {
  store_name: "ShoeMaster",
  phone: "",
  email: "",
  address: "",
  currency: "PKR",
  tax_rate: 0,
  receipt_footer: "Thank you for shopping with us!"
};

function getDb() {
  if (!db) {
    throw new Error("Database has not been initialized.");
  }
  return db;
}

function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function positiveNumber(value, fieldName) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number.`);
  }
  return result;
}

function requiredText(value, fieldName) {
  const result = String(value ?? "").trim();
  if (!result) {
    throw new Error(`${fieldName} is required.`);
  }
  return result;
}

function now() {
  return new Date().toISOString();
}

function initialize(userDataPath) {
  if (!userDataPath) {
    throw new Error("User data directory is required.");
  }

  if (db) {
    close();
  }

  const folder = path.join(userDataPath, "data");
  fs.mkdirSync(folder, { recursive: true });

  databasePath = path.join(folder, "shoemaster.db");
  db = new Database(databasePath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Sneakers',
      brand TEXT DEFAULT '',
      sku TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      size_system TEXT DEFAULT 'UK',
      size TEXT DEFAULT '',
      color TEXT DEFAULT '',
      material TEXT DEFAULT '',
      width TEXT DEFAULT 'Regular',
      cost REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      stock REAL NOT NULL DEFAULT 0,
      reorder_level REAL NOT NULL DEFAULT 2,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku
    ON products(sku) WHERE sku <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode
    ON products(barcode) WHERE barcode <> '';

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      customer_name TEXT DEFAULT 'Walk-in Customer',
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paid REAL NOT NULL DEFAULT 0,
      change_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'Cash',
      status TEXT DEFAULT 'completed',
      items_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      sku TEXT DEFAULT '',
      size TEXT DEFAULT '',
      color TEXT DEFAULT '',
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      movement_type TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_created_at
    ON sales(created_at);

    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
    ON sale_items(sale_id);

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
    ON stock_movements(product_id);
  `);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    db.prepare(`
      INSERT OR IGNORE INTO settings (key, value)
      VALUES (?, ?)
    `).run(key, String(value));
  }

  return {
    success: true,
    path: databasePath
  };
}

const productMethods = {
  list(query = "") {
    const search = String(query ?? "").trim();

    if (!search) {
      return getDb().prepare(`
        SELECT * FROM products
        ORDER BY name COLLATE NOCASE ASC, id DESC
      `).all();
    }

    const term = `%${search}%`;

    return getDb().prepare(`
      SELECT * FROM products
      WHERE name LIKE ?
         OR category LIKE ?
         OR brand LIKE ?
         OR sku LIKE ?
         OR barcode LIKE ?
         OR size LIKE ?
         OR color LIKE ?
      ORDER BY name COLLATE NOCASE ASC, id DESC
    `).all(term, term, term, term, term, term, term);
  },

  save(data = {}) {
    const database = getDb();
    const name = requiredText(data.name, "Product name");
    const cost = positiveNumber(data.cost, "Cost");
    const price = positiveNumber(data.price, "Price");
    const stock = positiveNumber(data.stock, "Stock");
    const reorderLevel = positiveNumber(
      data.reorder_level,
      "Reorder level"
    );

    const values = {
      name,
      category: String(data.category || "Sneakers"),
      brand: String(data.brand || ""),
      sku: String(data.sku || "").trim(),
      barcode: String(data.barcode || "").trim(),
      size_system: String(data.size_system || "UK"),
      size: String(data.size ?? ""),
      color: String(data.color || ""),
      material: String(data.material || ""),
      width: String(data.width || "Regular"),
      cost,
      price,
      stock,
      reorder_level: reorderLevel,
      updated_at: now()
    };

    if (data.id) {
      const existing = database.prepare(
        "SELECT id FROM products WHERE id = ?"
      ).get(data.id);

      if (!existing) {
        throw new Error("Product not found.");
      }

      database.prepare(`
        UPDATE products SET
          name = @name,
          category = @category,
          brand = @brand,
          sku = @sku,
          barcode = @barcode,
          size_system = @size_system,
          size = @size,
          color = @color,
          material = @material,
          width = @width,
          cost = @cost,
          price = @price,
          stock = @stock,
          reorder_level = @reorder_level,
          updated_at = @updated_at
        WHERE id = @id
      `).run({ ...values, id: data.id });

      return database.prepare(
        "SELECT * FROM products WHERE id = ?"
      ).get(data.id);
    }

    const result = database.prepare(`
      INSERT INTO products (
        name, category, brand, sku, barcode, size_system,
        size, color, material, width, cost, price, stock,
        reorder_level, created_at, updated_at
      ) VALUES (
        @name, @category, @brand, @sku, @barcode, @size_system,
        @size, @color, @material, @width, @cost, @price, @stock,
        @reorder_level, @created_at, @updated_at
      )
    `).run({
      ...values,
      created_at: now()
    });

    if (stock > 0) {
      database.prepare(`
        INSERT INTO stock_movements
          (product_id, quantity, movement_type, note, created_at)
        VALUES (?, ?, 'opening', 'Opening stock', ?)
      `).run(result.lastInsertRowid, stock, now());
    }

    return database.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).get(result.lastInsertRowid);
  },

  delete(id) {
    const result = getDb().prepare(
      "DELETE FROM products WHERE id = ?"
    ).run(id);

    if (!result.changes) {
      throw new Error("Product not found.");
    }

    return { success: true, id };
  }
};

const customerMethods = {
  list() {
    return getDb().prepare(`
      SELECT * FROM customers
      ORDER BY name COLLATE NOCASE ASC
    `).all();
  },

  save(data = {}) {
    const database = getDb();
    const name = requiredText(data.name, "Customer name");

    const values = {
      name,
      phone: String(data.phone || ""),
      email: String(data.email || ""),
      address: String(data.address || ""),
      notes: String(data.notes || ""),
      updated_at: now()
    };

    if (data.id) {
      const result = database.prepare(`
        UPDATE customers SET
          name = @name,
          phone = @phone,
          email = @email,
          address = @address,
          notes = @notes,
          updated_at = @updated_at
        WHERE id = @id
      `).run({ ...values, id: data.id });

      if (!result.changes) {
        throw new Error("Customer not found.");
      }

      return database.prepare(
        "SELECT * FROM customers WHERE id = ?"
      ).get(data.id);
    }

    const result = database.prepare(`
      INSERT INTO customers
        (name, phone, email, address, notes, created_at, updated_at)
      VALUES
        (@name, @phone, @email, @address, @notes, @created_at, @updated_at)
    `).run({
      ...values,
      created_at: now()
    });

    return database.prepare(
      "SELECT * FROM customers WHERE id = ?"
    ).get(result.lastInsertRowid);
  }
};

const supplierMethods = {
  list() {
    return getDb().prepare(`
      SELECT * FROM suppliers
      ORDER BY name COLLATE NOCASE ASC
    `).all();
  },

  save(data = {}) {
    const database = getDb();
    const name = requiredText(data.name, "Supplier name");

    const values = {
      name,
      phone: String(data.phone || ""),
      email: String(data.email || ""),
      address: String(data.address || ""),
      notes: String(data.notes || ""),
      updated_at: now()
    };

    if (data.id) {
      const result = database.prepare(`
        UPDATE suppliers SET
          name = @name,
          phone = @phone,
          email = @email,
          address = @address,
          notes = @notes,
          updated_at = @updated_at
        WHERE id = @id
      `).run({ ...values, id: data.id });

      if (!result.changes) {
        throw new Error("Supplier not found.");
      }

      return database.prepare(
        "SELECT * FROM suppliers WHERE id = ?"
      ).get(data.id);
    }

    const result = database.prepare(`
      INSERT INTO suppliers
        (name, phone, email, address, notes, created_at, updated_at)
      VALUES
        (@name, @phone, @email, @address, @notes, @created_at, @updated_at)
    `).run({
      ...values,
      created_at: now()
    });

    return database.prepare(
      "SELECT * FROM suppliers WHERE id = ?"
    ).get(result.lastInsertRowid);
  }
};

function makeInvoiceNumber() {
  const stamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

  const random = Math.floor(100 + Math.random() * 900);

  return `SH-${stamp}-${random}`;
}

const saleMethods = {
  list() {
    return getDb().prepare(`
      SELECT * FROM sales
      ORDER BY id DESC
    `).all().map((sale) => ({
      ...sale,
      items: JSON.parse(sale.items_json || "[]")
    }));
  },

  create(data = {}) {
    const database = getDb();

    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.cart)
        ? data.cart
        : [];

    if (!items.length) {
      throw new Error("Your cart is empty.");
    }

    const customerId = data.customer_id || null;

    if (customerId && !database.prepare(
      "SELECT id FROM customers WHERE id = ?"
    ).get(customerId)) {
      throw new Error("Selected customer does not exist.");
    }

    const discount = positiveNumber(
      data.discount ?? data.discount_amount ?? 0,
      "Discount"
    );

    const taxRate = positiveNumber(
      data.tax_rate ?? data.tax_percent ?? 0,
      "Tax rate"
    );

    if (taxRate > 100) {
      throw new Error("Tax rate cannot exceed 100%.");
    }

    const preparedItems = [];
    const quantities = new Map();
    let subtotal = 0;

    for (const item of items) {
      const productId = item.product_id ?? item.id;
      const quantity = positiveNumber(
        item.quantity ?? item.qty,
        "Item quantity"
      );

      if (!productId || quantity <= 0) {
        throw new Error(
          "Each sale item must have a product and quantity."
        );
      }

      const product = database.prepare(
        "SELECT * FROM products WHERE id = ?"
      ).get(productId);

      if (!product) {
        throw new Error(`Product ${productId} was not found.`);
      }

      const combinedQuantity =
        (quantities.get(productId) || 0) + quantity;

      quantities.set(productId, combinedQuantity);

      const unitPrice = positiveNumber(
        item.price ?? item.unit_price ?? product.price,
        "Item price"
      );

      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      preparedItems.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        size: product.size,
        color: product.color,
        quantity,
        unit_price: unitPrice,
        unit_cost: product.cost,
        line_total: lineTotal
      });
    }

    for (const [productId, quantity] of quantities) {
      const product = database.prepare(
        "SELECT name, stock FROM products WHERE id = ?"
      ).get(productId);

      if (product.stock < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        );
      }
    }

    if (discount > subtotal) {
      throw new Error("Discount cannot exceed the subtotal.");
    }

    const taxableAmount = subtotal - discount;

    const tax = number(
      data.tax_amount,
      taxableAmount * taxRate / 100
    );

    if (tax < 0) {
      throw new Error("Tax cannot be negative.");
    }

    const calculatedTotal = taxableAmount + tax;
    const total = number(data.total, calculatedTotal);

    if (Math.abs(total - calculatedTotal) > 0.01) {
      throw new Error(
        "Sale total does not match the item totals, discount and tax."
      );
    }

    const paid = positiveNumber(
      data.paid ?? data.paid_amount ?? total,
      "Paid amount"
    );

    if (paid < total) {
      throw new Error("Paid amount is less than the sale total.");
    }

    const paymentMethod = String(
      data.payment_method || data.payment || "Cash"
    );

    const customer = customerId
      ? database.prepare(
          "SELECT name FROM customers WHERE id = ?"
        ).get(customerId)
      : null;

    const customerName = customer?.name || "Walk-in Customer";
    const invoiceNumber = makeInvoiceNumber();
    const createdAt = now();

    const createTransaction = database.transaction(() => {
      for (const [productId, quantity] of quantities) {
        const product = database.prepare(
          "SELECT name FROM products WHERE id = ?"
        ).get(productId);

        const result = database.prepare(`
          UPDATE products
          SET stock = stock - ?, updated_at = ?
          WHERE id = ? AND stock >= ?
        `).run(
          quantity,
          createdAt,
          productId,
          quantity
        );

        if (!result.changes) {
          throw new Error(
            `Stock changed during checkout for ${product.name}. Please refresh and try again.`
          );
        }

        database.prepare(`
          INSERT INTO stock_movements
            (product_id, quantity, movement_type, note, created_at)
          VALUES (?, ?, 'sale', ?, ?)
        `).run(
          productId,
          -quantity,
          `Sale ${invoiceNumber}`,
          createdAt
        );
      }

      const saleResult = database.prepare(`
        INSERT INTO sales (
          invoice_number, customer_id, customer_name,
          subtotal, discount, tax, tax_rate, total,
          paid, change_amount, payment_method, status,
          items_json, created_at
        ) VALUES (
          @invoice_number, @customer_id, @customer_name,
          @subtotal, @discount, @tax, @tax_rate, @total,
          @paid, @change_amount, @payment_method, 'completed',
          @items_json, @created_at
        )
      `).run({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        customer_name: customerName,
        subtotal,
        discount,
        tax,
        tax_rate: taxRate,
        total,
        paid,
        change_amount: paid - total,
        payment_method: paymentMethod,
        items_json: JSON.stringify(preparedItems),
        created_at: createdAt
      });

      const insertItem = database.prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, sku,
          size, color, quantity, unit_price, unit_cost, line_total
        ) VALUES (
          @sale_id, @product_id, @product_name, @sku,
          @size, @color, @quantity, @unit_price, @unit_cost, @line_total
        )
      `);

      for (const item of preparedItems) {
        insertItem.run({
          ...item,
          sale_id: saleResult.lastInsertRowid
        });
      }

      return saleResult.lastInsertRowid;
    });

    const saleId = createTransaction();

    const sale = database.prepare(
      "SELECT * FROM sales WHERE id = ?"
    ).get(saleId);

    return {
      ...sale,
      items: preparedItems
    };
  }
};

function getDashboard() {
  const database = getDb();

  const totals = database.prepare(`
    SELECT
      COUNT(*) AS total_sales,
      COALESCE(SUM(total), 0) AS total_revenue,
      COALESCE(SUM(discount), 0) AS total_discount,
      COALESCE(SUM(total - (
        SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0)
        FROM sale_items si WHERE si.sale_id = sales.id
      )), 0) AS gross_profit
    FROM sales
    WHERE status = 'completed'
  `).get();

  const productCount = database.prepare(
    "SELECT COUNT(*) AS count FROM products"
  ).get().count;

  const customerCount = database.prepare(
    "SELECT COUNT(*) AS count FROM customers"
  ).get().count;

  const lowStock = database.prepare(`
    SELECT * FROM products
    WHERE stock <= reorder_level
    ORDER BY stock ASC, name ASC
  `).all();

  const today = new Date().toISOString().slice(0, 10);

  const todaySales = database.prepare(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS revenue
    FROM sales
    WHERE status = 'completed'
      AND date(created_at) = date(?)
  `).get(today);

  const recentSales = database.prepare(`
    SELECT * FROM sales
    ORDER BY id DESC
    LIMIT 7
  `).all();

  return {
    ...totals,
    total_products: productCount,
    total_customers: customerCount,
    low_stock: lowStock,
    low_stock_count: lowStock.length,
    today_sales: todaySales.count,
    today_revenue: todaySales.revenue,
    recent_sales: recentSales
  };
}

function getReports() {
  const database = getDb();

  const dailySales = database.prepare(`
    SELECT
      date(created_at) AS date,
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue
    FROM sales
    WHERE status = 'completed'
      AND created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  const topProducts = database.prepare(`
    SELECT
      product_name AS name,
      SUM(quantity) AS quantity_sold,
      SUM(line_total) AS revenue
    FROM sale_items
    GROUP BY product_id, product_name
    ORDER BY quantity_sold DESC
    LIMIT 10
  `).all();

  const paymentMethods = database.prepare(`
    SELECT
      payment_method,
      COUNT(*) AS transactions,
      SUM(total) AS amount
    FROM sales
    WHERE status = 'completed'
    GROUP BY payment_method
    ORDER BY amount DESC
  `).all();

  const monthlySales = database.prepare(`
    SELECT
      strftime('%Y-%m', created_at) AS month,
      COUNT(*) AS orders,
      SUM(total) AS revenue
    FROM sales
    WHERE status = 'completed'
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 12
  `).all().reverse();

  return {
    daily_sales: dailySales,
    top_products: topProducts,
    payment_methods: paymentMethods,
    monthly_sales: monthlySales
  };
}

const settingMethods = {
  get() {
    const rows = getDb().prepare(
      "SELECT key, value FROM settings"
    ).all();

    const result = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      result[row.key] = row.value;
    }

    result.tax_rate = number(result.tax_rate, 0);

    return result;
  },

  save(data = {}) {
    const database = getDb();
    const allowedKeys = Object.keys(DEFAULT_SETTINGS);

    const saveTransaction = database.transaction(() => {
      for (const key of allowedKeys) {
        if (data[key] === undefined) continue;

        let value = data[key];

        if (key === "tax_rate") {
          value = positiveNumber(value, "Tax rate");

          if (value > 100) {
            throw new Error("Tax rate cannot exceed 100%.");
          }
        }

        database.prepare(`
          INSERT INTO settings (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(key, String(value));
      }
    });

    saveTransaction();

    return this.get();
  }
};

const stockMethods = {
  adjust(data = {}) {
    const database = getDb();
    const productId = data.product_id ?? data.id;

    if (!productId) {
      throw new Error("Product is required for stock adjustment.");
    }

    const product = database.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).get(productId);

    if (!product) {
      throw new Error("Product not found.");
    }

    const rawQuantity = positiveNumber(
      data.quantity ?? data.adjustment ?? data.amount,
      "Adjustment quantity"
    );

    if (rawQuantity <= 0) {
      throw new Error(
        "Adjustment quantity must be greater than zero."
      );
    }

    const action = String(
      data.type ?? data.action ?? data.movement_type ?? "add"
    ).toLowerCase();

    const isRemoval = [
      "remove",
      "subtract",
      "decrease",
      "out",
      "deduct"
    ].includes(action);

    const change = isRemoval ? -rawQuantity : rawQuantity;
    const newStock = product.stock + change;

    if (newStock < 0) {
      throw new Error("Stock cannot be reduced below zero.");
    }

    const note = String(
      data.note || data.reason || "Manual stock adjustment"
    );

    const createdAt = now();

    const transaction = database.transaction(() => {
      database.prepare(`
        UPDATE products
        SET stock = ?, updated_at = ?
        WHERE id = ?
      `).run(newStock, createdAt, productId);

      database.prepare(`
        INSERT INTO stock_movements
          (product_id, quantity, movement_type, note, created_at)
        VALUES (?, ?, 'adjustment', ?, ?)
      `).run(productId, change, note, createdAt);
    });

    transaction();

    return database.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).get(productId);
  }
};

async function backup(destination) {
  const database = getDb();

  if (!destination) {
    throw new Error("A backup destination is required.");
  }

  const destinationPath = path.resolve(destination);

  fs.mkdirSync(path.dirname(destinationPath), {
    recursive: true
  });

  database.pragma("wal_checkpoint(FULL)");

  await database.backup(destinationPath);

  return {
    success: true,
    path: destinationPath
  };
}

function close() {
  if (db) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.close();
    } finally {
      db = null;
      databasePath = null;
    }
  }
}

module.exports = {
  initialize,
  close,
  backup,
  products: productMethods,
  customers: customerMethods,
  suppliers: supplierMethods,
  sales: saleMethods,
  dashboard: getDashboard,
  reports: getReports,
  settings: settingMethods,
  stock: stockMethods
};
