
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, Barcode, Boxes, Check,
  CheckCircle2, ChevronDown, CircleDollarSign, ClipboardList,
  CreditCard, Download, Eye, FileText, Footprints, ImagePlus,
  LayoutDashboard, Menu, MessageCircle, MoreHorizontal, Package,
  PackageCheck, Phone, Plus, Printer, Receipt, RefreshCw, Save,
  ScanLine, Search, Send, Settings, ShoppingBag, ShoppingCart,
  Smartphone, Trash2, Truck, TrendingUp, Users, Wallet, X,
  ArrowUpRight, Hash, Ban, Clock
} from "lucide-react";
import "./styles.css";

const api = window.shoeAPI;

const money = value =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0
  })}`;

const formatDate = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
};

const formatDateTime = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PK");
};

const emptyProduct = {
  name: "",
  category: "Sneakers",
  brand: "",
  sku: "",
  barcode: "",
  size_system: "UK",
  size: "",
  color: "Black",
  material: "",
  width: "Regular",
  cost: "0",
  price: "0",
  stock: "0",
  reorder_level: "2",
  image_path: ""
};

const navGroups = [
  {
    label: "WORKSPACE",
    items: [
      ["dashboard", "Overview", LayoutDashboard],
      ["pos", "Point of Sale", ShoppingCart],
      ["scanner", "Barcode Scanner", ScanLine],
      ["whatsapp", "WhatsApp Orders", MessageCircle]
    ]
  },
  {
    label: "MANAGEMENT",
    items: [
      ["products", "Products", Footprints],
      ["stock", "Stock Control", Boxes],
      ["customers", "Customers", Users],
      ["suppliers", "Suppliers", Truck]
    ]
  },
  {
    label: "ANALYTICS",
    items: [
      ["sales", "Sales History", ClipboardList],
      ["reports", "Reports", BarChart3]
    ]
  },
  {
    label: "SYSTEM",
    items: [["settings", "Settings", Settings]]
  }
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [reports, setReports] = useState({});
  const [settings, setSettings] = useState({});
  const [settingsForm, setSettingsForm] = useState({});

  const [search, setSearch] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [imagePreview, setImagePreview] = useState("");

  const [customerModal, setCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "", phone: "", email: "", address: "", notes: ""
  });

  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: "", phone: "", email: "", address: "", notes: ""
  });

  const [stockModal, setStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({
    product_id: "", type: "add", quantity: "", note: ""
  });

  const [cart, setCart] = useState([]);
  const [posSearch, setPosSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [lastSale, setLastSale] = useState(null);

  const [scannerValue, setScannerValue] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const scannerRef = useRef(null);

  // Outgoing WhatsApp order builder
  const [waCustomer, setWaCustomer] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waItems, setWaItems] = useState([]);
  const [waStatusFilter, setWaStatusFilter] = useState("All");
  const [waOrders, setWaOrders] = useState([]);

  // Incoming WhatsApp Cloud API orders
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [waConnection, setWaConnection] = useState({
    connected: false,
    configured: false,
    last_sync: null,
    business_number: ""
  });
  const [waSyncing, setWaSyncing] = useState(false);
  const [incomingFilter, setIncomingFilter] = useState("All");
  const [selectedIncomingOrder, setSelectedIncomingOrder] = useState(null);
  const [waServerUrl, setWaServerUrl] = useState("");
  const [waBusinessNumber, setWaBusinessNumber] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

  const notify = useCallback(message => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!api) {
      setError("ShoeMaster API is unavailable. Check electron/preload.cjs.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const [p, c, s, sa, d, r, st] = await Promise.all([
        api.products.list(""),
        api.customers.list(),
        api.suppliers.list(),
        api.sales.list(),
        api.dashboard(),
        api.reports(),
        api.settings.get()
      ]);

      setProducts(Array.isArray(p) ? p : []);
      setCustomers(Array.isArray(c) ? c : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setSales(Array.isArray(sa) ? sa : []);
      setDashboard(d || {});
      setReports(r || {});
      setSettings(st || {});
      setSettingsForm(st || {});
    } catch (err) {
      setError(err.message || "Could not load store data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subtotal = useMemo(
    () => cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    ),
    [cart]
  );

  const discountAmount = Math.max(0, Number(discount || 0));
  const taxRate = Number(settings.tax_rate || 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = taxable * taxRate / 100;
  const total = taxable + tax;
  const paidAmount = paid === "" ? total : Number(paid);
  const change = Math.max(0, paidAmount - total);

  const filteredProducts = useMemo(() => {
    const term = (page === "pos" ? posSearch : search).toLowerCase().trim();
    if (!term) return products;

    return products.filter(product =>
      [
        product.name, product.brand, product.category, product.sku,
        product.barcode, product.size, product.color
      ].some(value => String(value || "").toLowerCase().includes(term))
    );
  }, [products, page, posSearch, search]);

  const lowStock = products.filter(
    product => Number(product.stock) <= Number(product.reorder_level)
  );

  const filteredCustomers = customers.filter(customer =>
    `${customer.name} ${customer.phone}`
      .toLowerCase()
      .includes(customerSearch.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(supplier =>
    `${supplier.name} ${supplier.phone}`
      .toLowerCase()
      .includes(supplierSearch.toLowerCase())
  );

  const go = id => {
    setPage(id);
    setSidebarOpen(false);
    setSearch("");
    setPosSearch("");
  };

  const addToCart = product => {
    if (Number(product.stock) <= 0) {
      notify("This product is out of stock.");
      return;
    }

    setCart(previous => {
      const existing = previous.find(item => item.id === product.id);

      if (existing) {
        if (Number(existing.quantity) >= Number(product.stock)) {
          notify("Available stock limit reached.");
          return previous;
        }

        return previous.map(item =>
          item.id === product.id
            ? { ...item, quantity: Number(item.quantity) + 1 }
            : item
        );
      }

      return [...previous, {
        id: product.id,
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        size: product.size,
        color: product.color,
        price: Number(product.price),
        quantity: 1,
        stock: Number(product.stock)
      }];
    });
  };

  const changeQuantity = (id, value) => {
    const quantity = Math.max(1, Number(value) || 1);

    setCart(previous => previous.map(item =>
      item.id === id
        ? { ...item, quantity: Math.min(quantity, item.stock) }
        : item
    ));
  };

  const scanBarcode = event => {
    event.preventDefault();
    const code = scannerValue.trim();
    if (!code) return;

    const product = products.find(item =>
      String(item.barcode || "").trim().toLowerCase() === code.toLowerCase() ||
      String(item.sku || "").trim().toLowerCase() === code.toLowerCase()
    );

    if (!product) {
      setScannedProduct(null);
      notify(`No product found for "${code}".`);

      setScanHistory(previous => [
        { code, found: false, time: new Date().toLocaleTimeString() },
        ...previous
      ].slice(0, 12));
    } else {
      setScannedProduct(product);

      setScanHistory(previous => [
        {
          code,
          found: true,
          name: product.name,
          time: new Date().toLocaleTimeString()
        },
        ...previous
      ].slice(0, 12));

      addToCart(product);
      notify(`${product.name} added to POS cart.`);
    }

    setScannerValue("");
    scannerRef.current?.focus();
  };

  useEffect(() => {
    if (page === "scanner") {
      const timer = window.setTimeout(
        () => scannerRef.current?.focus(),
        120
      );
      return () => window.clearTimeout(timer);
    }
  }, [page]);

  const openProduct = product => {
    setEditingProduct(product || null);

    setProductForm(product ? {
      ...emptyProduct,
      ...product,
      cost: String(product.cost ?? 0),
      price: String(product.price ?? 0),
      stock: String(product.stock ?? 0),
      reorder_level: String(product.reorder_level ?? 2)
    } : { ...emptyProduct });

    setImagePreview("");
    setProductModal(true);
  };

  const chooseImage = async () => {
    try {
      const result = await api.products.chooseImage();
      if (!result || result.canceled) return;

      setProductForm(previous => ({
        ...previous,
        image_path: result.path
      }));

      setImagePreview(result.url || "");
    } catch (err) {
      notify(err.message || "Image selection failed.");
    }
  };

  const saveProduct = async event => {
    event.preventDefault();

    try {
      await api.products.save({
        ...productForm,
        id: editingProduct?.id,
        cost: Number(productForm.cost),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        reorder_level: Number(productForm.reorder_level)
      });

      setProductModal(false);
      await refresh();
      notify("Product saved successfully.");
    } catch (err) {
      notify(err.message || "Could not save product.");
    }
  };

  const deleteProduct = async id => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await api.products.delete(id);
      await refresh();
      notify("Product deleted.");
    } catch (err) {
      notify(err.message || "Could not delete product.");
    }
  };

  const checkout = async () => {
    if (!cart.length) return notify("Your cart is empty.");
    if (discountAmount > subtotal) {
      return notify("Discount cannot exceed subtotal.");
    }
    if (paidAmount < total) {
      return notify("Paid amount is insufficient.");
    }

    // Receipt printing is handled by Electron's main process.
    // Keep a copy of the cart before clearing it after the sale.
    const receiptItems = cart.map(item => ({
      product_name: item.name,
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      line_total: Number(item.price) * Number(item.quantity)
    }));

    const selectedCustomerRecord = customers.find(
      customer => String(customer.id) === String(selectedCustomer)
    );

    try {
      const sale = await api.sales.create({
        items: cart.map(item => ({
          product_id: item.id,
          quantity: Number(item.quantity),
          price: Number(item.price)
        })),
        customer_id: selectedCustomer ? Number(selectedCustomer) : null,
        discount: discountAmount,
        tax_rate: taxRate,
        tax_amount: tax,
        total,
        paid: paidAmount,
        payment_method: paymentMethod
      });

      // Some backends return only the sale header. Add the original cart
      // and calculated totals so the printed receipt is complete.
      const receiptSale = {
        ...sale,
        items: Array.isArray(sale?.items) && sale.items.length
          ? sale.items
          : receiptItems,
        subtotal: sale?.subtotal ?? subtotal,
        discount: sale?.discount ?? discountAmount,
        tax: sale?.tax ?? sale?.tax_amount ?? tax,
        total: sale?.total ?? total,
        paid: sale?.paid ?? paidAmount,
        change_amount: sale?.change_amount ?? change,
        payment_method: sale?.payment_method || paymentMethod,
        customer_name:
          sale?.customer_name ||
          selectedCustomerRecord?.name ||
          "Walk-in Customer",
        created_at: sale?.created_at || new Date().toISOString()
      };

      setLastSale(receiptSale);

      // Open the native Windows/Electron print dialog after the sale succeeds.
      await printReceipt(receiptSale);

      setCart([]);
      setDiscount("0");
      setPaid("");
      setSelectedCustomer("");

      await refresh();
      notify("Sale completed successfully.");
    } catch (err) {
      notify(err.message || "Checkout failed.");
    }
  };

  const saveCustomer = async event => {
    event.preventDefault();

    try {
      await api.customers.save(customerForm);
      setCustomerModal(false);
      setCustomerForm({
        name: "", phone: "", email: "", address: "", notes: ""
      });
      await refresh();
      notify("Customer saved.");
    } catch (err) {
      notify(err.message || "Could not save customer.");
    }
  };

  const saveSupplier = async event => {
    event.preventDefault();

    try {
      await api.suppliers.save(supplierForm);
      setSupplierModal(false);
      setSupplierForm({
        name: "", phone: "", email: "", address: "", notes: ""
      });
      await refresh();
      notify("Supplier saved.");
    } catch (err) {
      notify(err.message || "Could not save supplier.");
    }
  };

  const adjustStock = async event => {
    event.preventDefault();

    try {
      await api.stock.adjust({
        ...stockForm,
        product_id: Number(stockForm.product_id),
        quantity: Number(stockForm.quantity)
      });

      setStockModal(false);
      setStockForm({
        product_id: "", type: "add", quantity: "", note: ""
      });

      await refresh();
      notify("Stock updated.");
    } catch (err) {
      notify(err.message || "Stock adjustment failed.");
    }
  };

  const saveSettings = async event => {
    event.preventDefault();

    try {
      const result = await api.settings.save({
        ...settingsForm,
        tax_rate: Number(settingsForm.tax_rate || 0)
      });

      setSettings(result || settingsForm);
      setSettingsForm(result || settingsForm);
      notify("Settings saved.");
    } catch (err) {
      notify(err.message || "Settings could not be saved.");
    }
  };

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const printReceipt = async sale => {
    if (!sale) return;

    const rows = (sale.items || []).map(item => `
      <tr>
        <td>${escapeHTML(item.product_name || item.name || "Product")}</td>
        <td>${Number(item.quantity || 0)}</td>
        <td>${money(
          item.line_total ??
          Number(item.price || 0) * Number(item.quantity || 0)
        )}</td>
      </tr>
    `).join("");

    const receiptHTML = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Receipt - ${escapeHTML(sale.invoice_number || sale.id || "")}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; color: #111; }
          body {
            width: 72mm;
            margin: 0 auto;
            padding: 5mm 3mm 6mm;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .brand { text-align: center; padding: 2mm 0 3mm; }
          .brand-mark {
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border: 2px solid #111;
            border-radius: 50%; font-size: 17px; font-weight: 900;
            letter-spacing: -2px; margin-bottom: 5px;
          }
          .brand-name {
            margin: 0; font-size: 23px; line-height: 1;
            font-weight: 900; letter-spacing: 1.7px; text-transform: uppercase;
          }
          .brand-sub {
            margin: 4px 0 0; font-size: 9px; font-weight: 700;
            letter-spacing: 2px; text-transform: uppercase;
          }
          .store-details { text-align: center; font-size: 10px; color: #333; margin-top: 7px; }
          .store-details div { margin: 2px 0; }
          .rule { border: 0; border-top: 1px dashed #333; margin: 9px 0; }
          .ticket-title {
            text-align: center; font-size: 10px; font-weight: 800;
            letter-spacing: 2px; margin: 8px 0; text-transform: uppercase;
          }
          .meta { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
          .meta span:first-child { color: #555; }
          .meta strong { text-align: right; overflow-wrap: anywhere; }
          .customer {
            border: 1px solid #bbb; border-radius: 4px;
            padding: 6px 7px; margin: 8px 0; font-size: 10px;
          }
          .customer-label { color: #555; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; margin: 9px 0; table-layout: fixed; }
          th {
            padding: 6px 2px; border-top: 1px solid #111; border-bottom: 1px solid #111;
            font-size: 9px; text-transform: uppercase; letter-spacing: .5px;
          }
          td { padding: 6px 2px; border-bottom: 1px dotted #aaa; vertical-align: top; }
          th:first-child, td:first-child { text-align: left; width: 52%; overflow-wrap: anywhere; }
          th:nth-child(2), td:nth-child(2) { text-align: center; width: 12%; }
          th:last-child, td:last-child { text-align: right; width: 36%; white-space: nowrap; }
          .totals { margin-top: 9px; }
          .total-line { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
          .total-line span:first-child { color: #444; }
          .grand-total {
            margin: 8px 0; padding: 8px 7px; border: 2px solid #111;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 15px; font-weight: 900; letter-spacing: .2px;
          }
          .payment {
            margin-top: 8px; padding: 7px; background: #f1f1f1;
            border: 1px solid #ddd; font-size: 10px;
          }
          .footer { text-align: center; margin-top: 13px; }
          .thanks { font-size: 13px; font-weight: 900; letter-spacing: .5px; }
          .footer-note { font-size: 9px; color: #444; margin-top: 4px; overflow-wrap: anywhere; }
          .end-mark { text-align: center; letter-spacing: 3px; margin-top: 10px; font-size: 10px; }
          @media print {
            html, body { width: 80mm; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <header class="brand">
          <div class="brand-mark">S</div>
          <h1 class="brand-name">${escapeHTML(settings.store_name || "ShoeMaster")}</h1>
          <p class="brand-sub">Footwear • Style • Comfort</p>
          <div class="store-details">
            ${settings.address ? `<div>${escapeHTML(settings.address)}</div>` : ""}
            ${settings.phone ? `<div>Tel: ${escapeHTML(settings.phone)}</div>` : ""}
          </div>
        </header>

        <hr class="rule">
        <div class="ticket-title">Sales Receipt</div>
        <div class="meta"><span>Invoice</span><strong>${escapeHTML(sale.invoice_number || sale.id || "—")}</strong></div>
        <div class="meta"><span>Date</span><strong>${escapeHTML(sale.created_at || new Date().toLocaleString())}</strong></div>
        <div class="customer">
          <div class="customer-label">Customer</div>
          <strong>${escapeHTML(sale.customer_name || "Walk-in Customer")}</strong>
        </div>

        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3" style="text-align:center">No items</td></tr>'}</tbody>
        </table>

        <section class="totals">
          <div class="total-line"><span>Subtotal</span><strong>${money(sale.subtotal)}</strong></div>
          <div class="total-line"><span>Discount</span><strong>${money(sale.discount)}</strong></div>
          <div class="total-line"><span>Tax</span><strong>${money(sale.tax ?? sale.tax_amount)}</strong></div>
          <div class="grand-total"><span>TOTAL</span><span>${money(sale.total)}</span></div>
          <div class="total-line"><span>Amount Paid</span><strong>${money(sale.paid)}</strong></div>
          <div class="total-line"><span>Change</span><strong>${money(sale.change_amount)}</strong></div>
        </section>

        <div class="payment">
          <div class="meta"><span>Payment method</span><strong>${escapeHTML(sale.payment_method || "Cash")}</strong></div>
          <div class="meta"><span>Status</span><strong>PAID</strong></div>
        </div>

        <footer class="footer">
          <div class="thanks">THANK YOU!</div>
          <div class="footer-note">${escapeHTML(settings.receipt_footer || "Thank you for shopping with us!")}</div>
          <div class="footer-note">Please visit us again.</div>
          <div class="end-mark">• • • • •</div>
        </footer>
      </body>
      </html>
    `;

    try {
      if (typeof api.printReceipt !== "function") {
        throw new Error(
          "Electron printing is not connected. Please update preload.cjs and electron/main.cjs."
        );
      }

      await api.printReceipt(receiptHTML);
      notify("Receipt print dialog opened.");
    } catch (error) {
      notify(error.message || "Could not open the receipt print dialog.");
    }
  };

  // ---------------- WHATSAPP OUTGOING ORDERS ----------------

  const addWhatsAppItem = product => {
    setWaItems(previous => {
      const found = previous.find(item => item.id === product.id);

      if (found) {
        return previous.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1
      }];
    });
  };

  const waSubtotal = waItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const makeWhatsAppMessage = () => {
    const customer = customers.find(
      item => String(item.id) === String(waCustomer)
    );

    const lines = [
      `*${settings.store_name || "ShoeMaster"} - Order Details*`,
      customer ? `Customer: ${customer.name}` : "",
      waPhone ? `Phone: ${waPhone}` : "",
      "",
      ...waItems.map(item =>
        `${item.name} x ${item.quantity} — ${money(
          item.price * item.quantity
        )}`
      ),
      "",
      `*Total: ${money(waSubtotal)}*`,
      "",
      "Thank you for shopping with us."
    ].filter(Boolean);

    setWaMessage(lines.join("\n"));
  };

  const openWhatsApp = () => {
    const customer = customers.find(
      item => String(item.id) === String(waCustomer)
    );

    const phone = (waPhone || customer?.phone || "").replace(/\D/g, "");

    if (!phone) {
      return notify("Enter a customer phone number with country code.");
    }

    if (!waItems.length) {
      return notify("Add at least one product to the order.");
    }

    const message = waMessage || [
      `*${settings.store_name || "ShoeMaster"} - Order*`,
      ...waItems.map(item =>
        `${item.name} x ${item.quantity} — ${money(
          item.price * item.quantity
        )}`
      ),
      `Total: ${money(waSubtotal)}`
    ].join("\n");

    const order = {
      id: `WA-${Date.now()}`,
      customer: customer?.name || "WhatsApp Customer",
      phone,
      total: waSubtotal,
      status: "Pending",
      created_at: new Date().toISOString(),
      message
    };

    setWaOrders(previous => [order, ...previous]);

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    if (api?.external?.open) {
      api.external.open(url).catch(() => window.open(url, "_blank"));
    } else {
      window.open(url, "_blank");
    }
  };

  const changeWaStatus = (id, status) => {
    setWaOrders(previous => previous.map(order =>
      order.id === id ? { ...order, status } : order
    ));
  };

  // ---------------- WHATSAPP INCOMING CLOUD API ----------------

  const syncIncomingWhatsAppOrders = useCallback(async (silent = false) => {
    if (
      !api?.whatsapp?.list ||
      !api?.whatsapp?.status
    ) {
      if (!silent) {
        notify(
          "WhatsApp Cloud API backend is not connected yet. Complete the Electron backend setup."
        );
      }
      return;
    }

    try {
      setWaSyncing(true);

      if (api.whatsapp.sync) {
        await api.whatsapp.sync();
      }

      const [orders, status] = await Promise.all([
        api.whatsapp.list(),
        api.whatsapp.status()
      ]);

      setIncomingOrders(Array.isArray(orders) ? orders : []);

      setWaConnection({
        connected: Boolean(status?.connected),
        configured: Boolean(status?.configured),
        last_sync: status?.last_sync || null,
        business_number: status?.business_number || ""
      });

      if (status?.server_url) {
        setWaServerUrl(status.server_url);
      }

      if (status?.business_number) {
        setWaBusinessNumber(status.business_number);
      }
    } catch (err) {
      if (!silent) {
        notify(
          err.message || "Could not synchronize incoming WhatsApp orders."
        );
      }
    } finally {
      setWaSyncing(false);
    }
  }, [notify]);

  useEffect(() => {
    if (page !== "whatsapp" && page !== "dashboard") return;

    syncIncomingWhatsAppOrders(true);

    const interval = window.setInterval(
      () => syncIncomingWhatsAppOrders(true),
      15000
    );

    return () => window.clearInterval(interval);
  }, [page, syncIncomingWhatsAppOrders]);

  const updateIncomingOrderStatus = async (orderId, status) => {
    if (!api?.whatsapp?.updateStatus) {
      return notify(
        "Incoming WhatsApp order API is not configured in preload.cjs yet."
      );
    }

    try {
      await api.whatsapp.updateStatus(orderId, status);

      setIncomingOrders(previous => previous.map(order =>
        String(order.id) === String(orderId)
          ? { ...order, status }
          : order
      ));

      setSelectedIncomingOrder(previous =>
        previous && String(previous.id) === String(orderId)
          ? { ...previous, status }
          : previous
      );

      notify(`Incoming order marked as ${status}.`);
    } catch (err) {
      notify(err.message || "Could not update incoming order.");
    }
  };

  const saveWhatsAppConnection = async event => {
    event.preventDefault();

    if (!api?.whatsapp?.saveSettings) {
      return notify(
        "WhatsApp settings API is not configured in preload.cjs yet."
      );
    }

    try {
      await api.whatsapp.saveSettings({
        server_url: waServerUrl.trim().replace(/\/+$/, ""),
        business_number: waBusinessNumber.trim()
      });

      await syncIncomingWhatsAppOrders(true);
      notify("WhatsApp connection settings saved.");
    } catch (err) {
      notify(err.message || "Could not save WhatsApp settings.");
    }
  };

  const matchIncomingOrderItems = order => {
    const items = Array.isArray(order?.items) ? order.items : [];

    if (!items.length) {
      notify(
        "This incoming message does not contain structured product items. Review the message and add products manually."
      );
      return;
    }

    const matched = [];
    const unmatched = [];

    items.forEach(item => {
      const product = products.find(product =>
        String(product.id) === String(item.product_id || item.id) ||
        (
          item.sku &&
          String(product.sku || "").toLowerCase() ===
          String(item.sku).toLowerCase()
        ) ||
        (
          item.barcode &&
          String(product.barcode || "").toLowerCase() ===
          String(item.barcode).toLowerCase()
        )
      );

      if (!product) {
        unmatched.push(item.name || item.sku || item.barcode || "Unknown item");
        return;
      }

      matched.push({
        id: product.id,
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        size: product.size,
        color: product.color,
        price: Number(product.price),
        quantity: Math.max(1, Number(item.quantity || 1)),
        stock: Number(product.stock)
      });
    });

    if (unmatched.length) {
      notify(`Could not match: ${unmatched.join(", ")}`);
    }

    if (!matched.length) {
      return notify("No incoming products matched your catalogue.");
    }

    const invalidStock = matched.filter(item =>
      item.quantity > item.stock || item.stock <= 0
    );

    if (invalidStock.length) {
      return notify(
        `Insufficient stock for: ${invalidStock.map(item => item.name).join(", ")}`
      );
    }

    setCart(previous => {
      const next = [...previous];

      matched.forEach(item => {
        const existing = next.find(row => row.id === item.id);

        if (existing) {
          existing.quantity = Math.min(
            existing.quantity + item.quantity,
            existing.stock
          );
        } else {
          next.push(item);
        }
      });

      return next;
    });

    const customer = customers.find(item =>
      String(item.phone || "").replace(/\D/g, "") ===
      String(order.from || order.phone || "").replace(/\D/g, "")
    );

    if (customer) {
      setSelectedCustomer(String(customer.id));
    }

    setSelectedIncomingOrder(null);
    go("pos");
    notify("Matched WhatsApp items added to POS. Review and complete checkout.");
  };

  const saveBackup = async () => {
    try {
      const result = await api.backup();

      if (result?.success) {
        notify("Database backup completed.");
      } else {
        notify("Backup request completed.");
      }
    } catch (err) {
      notify(err.message || "Backup failed.");
    }
  };

  const title = navGroups.flatMap(group => group.items)
    .find(item => item[0] === page)?.[1] || "Overview";

  const pendingIncoming = incomingOrders.filter(
    order => (order.status || "Pending").toLowerCase() === "pending"
  ).length;

  const acceptedIncoming = incomingOrders.filter(
    order => (order.status || "").toLowerCase() === "accepted"
  ).length;

  const convertedIncoming = incomingOrders.filter(
    order => (order.status || "").toLowerCase() === "converted"
  ).length;

  const filteredIncomingOrders = incomingOrders.filter(order =>
    incomingFilter === "All" ||
    (order.status || "Pending").toLowerCase() === incomingFilter.toLowerCase()
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-mark"><Footprints size={30} /></div>
        <h2>ShoeMaster</h2>
        <p>Preparing your workspace...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Footprints size={24} /></div>
          <div className="brand-copy">
            <strong>ShoeMaster</strong>
            <span>RETAIL MANAGEMENT</span>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="store-chip">
          <span className="online-dot" />
          <span>Local store database</span>
          <span className="offline-tag">OFFLINE</span>
        </div>

        <nav className="side-navigation">
          {navGroups.map(group => (
            <div className="nav-section" key={group.label}>
              <p>{group.label}</p>

              {group.items.map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={`nav-link ${page === id ? "selected" : ""}`}
                  onClick={() => go(id)}
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{label}</span>

                  {id === "whatsapp" && (
                    <span className="nav-count">
                      {pendingIncoming || waOrders.length}
                    </span>
                  )}

                  {id === "products" && (
                    <span className="nav-count">{products.length}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="store-avatar">SM</div>
          <div className="sidebar-user">
            <strong>{settings.store_name || "ShoeMaster Store"}</strong>
            <span>Administrator</span>
          </div>
          <button
            className="user-more"
            onClick={() => go("settings")}
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-shade"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-heading">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div>
              <div className="eyebrow">
                SHOEMASTER <span>/</span> {title.toUpperCase()}
              </div>
              <h1>{title}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="top-date">
              <span className="date-dot" />
              {new Date().toLocaleDateString("en-PK", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </div>

            <button
              className="top-icon"
              title="Refresh data"
              onClick={refresh}
            >
              <RefreshCw size={18} />
            </button>

            <div className="top-avatar">SM</div>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="error-banner">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button onClick={refresh}>Retry</button>
            </div>
          )}

          {/* DASHBOARD */}
          {page === "dashboard" && (
            <>
              <div className="page-intro">
                <div>
                  <div className="section-kicker">STORE OVERVIEW</div>
                  <h2>Good day. Here's your store at a glance.</h2>
                  <p>
                    Monitor sales, inventory and customer activity from one place.
                  </p>
                </div>

                <div className="intro-actions">
                  <button
                    className="button button-light"
                    onClick={refresh}
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>

                  <button
                    className="button button-primary"
                    onClick={() => go("pos")}
                  >
                    <Plus size={17} /> Create sale
                  </button>
                </div>
              </div>

              <div className="metric-grid">
                <Metric
                  title="Total Revenue"
                  value={money(dashboard.total_revenue)}
                  icon={Wallet}
                  tone="orange"
                  caption="All recorded sales"
                />
                <Metric
                  title="Today's Revenue"
                  value={money(dashboard.today_revenue)}
                  icon={TrendingUp}
                  tone="green"
                  caption={`${dashboard.today_sales || 0} sales today`}
                />
                <Metric
                  title="Total Orders"
                  value={dashboard.total_sales || 0}
                  icon={ShoppingBag}
                  tone="violet"
                  caption="Completed transactions"
                />
                <Metric
                  title="Inventory Items"
                  value={dashboard.total_products || products.length}
                  icon={Package}
                  tone="blue"
                  caption={`${lowStock.length} items need attention`}
                />
              </div>

              <div className="dashboard-main-grid">
                <section className="surface">
                  <div className="surface-heading">
                    <div>
                      <h3>Recent transactions</h3>
                      <p>Latest activity from your POS</p>
                    </div>
                    <button
                      className="link-button"
                      onClick={() => go("sales")}
                    >
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>

                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>INVOICE</th>
                          <th>CUSTOMER</th>
                          <th>DATE</th>
                          <th>PAYMENT</th>
                          <th className="align-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dashboard.recent_sales || sales).slice(0, 7).map(sale => (
                          <tr key={sale.id}>
                            <td>
                              <strong className="invoice-text">
                                {sale.invoice_number || `#${sale.id}`}
                              </strong>
                            </td>
                            <td>{sale.customer_name || "Walk-in customer"}</td>
                            <td>{formatDate(sale.created_at)}</td>
                            <td>
                              <span className="soft-badge">
                                {sale.payment_method || "Cash"}
                              </span>
                            </td>
                            <td className="align-right amount">
                              {money(sale.total)}
                            </td>
                          </tr>
                        ))}

                        {!(dashboard.recent_sales || sales).length && (
                          <EmptyRow
                            colSpan={5}
                            text="No transactions yet. Your sales will appear here."
                          />
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="surface">
                  <div className="surface-heading">
                    <div>
                      <h3>Stock attention</h3>
                      <p>Products at or below reorder level</p>
                    </div>
                    <span className="alert-count">{lowStock.length}</span>
                  </div>

                  <div className="attention-list">
                    {lowStock.slice(0, 7).map(product => (
                      <div className="attention-item" key={product.id}>
                        <div className="attention-icon">
                          <Footprints size={18} />
                        </div>
                        <div className="attention-copy">
                          <strong>{product.name}</strong>
                          <span>{product.sku || "No SKU"}</span>
                        </div>
                        <span className="low-quantity">
                          {product.stock} left
                        </span>
                      </div>
                    ))}

                    {!lowStock.length && (
                      <div className="empty-message">
                        <CheckCircle2 size={22} />
                        All products are sufficiently stocked.
                      </div>
                    )}
                  </div>

                  <button
                    className="wide-soft-button"
                    onClick={() => go("stock")}
                  >
                    Open stock control <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>

              <div className="quick-actions">
                <button onClick={() => go("pos")}>
                  <span className="quick-icon orange-bg">
                    <ShoppingCart size={19} />
                  </span>
                  <span>
                    <strong>New sale</strong>
                    <small>Open point of sale</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>

                <button onClick={() => openProduct()}>
                  <span className="quick-icon blue-bg">
                    <Package size={19} />
                  </span>
                  <span>
                    <strong>Add product</strong>
                    <small>Update catalogue</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>

                <button onClick={() => go("scanner")}>
                  <span className="quick-icon violet-bg">
                    <ScanLine size={19} />
                  </span>
                  <span>
                    <strong>Scan barcode</strong>
                    <small>Find an item quickly</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>

                <button onClick={() => go("whatsapp")}>
                  <span className="quick-icon green-bg">
                    <MessageCircle size={19} />
                  </span>
                  <span>
                    <strong>WhatsApp orders</strong>
                    <small>Review customer orders</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* POS */}
          {page === "pos" && (
            <div className="pos-workspace">
              <section className="surface catalogue-surface">
                <div className="surface-heading">
                  <div>
                    <div className="section-kicker">CHECKOUT WORKSPACE</div>
                    <h3>Choose products</h3>
                    <p>Search your catalogue or scan a product barcode.</p>
                  </div>
                  <span className="result-count">
                    {filteredProducts.length} products
                  </span>
                </div>

                <form
                  className="inline-scan"
                  onSubmit={event => {
                    event.preventDefault();
                    const code = event.currentTarget.elements.scan.value.trim();

                    const found = products.find(item =>
                      String(item.barcode || "").toLowerCase() === code.toLowerCase() ||
                      String(item.sku || "").toLowerCase() === code.toLowerCase()
                    );

                    if (found) addToCart(found);
                    else if (code) notify("Barcode or SKU not found.");

                    event.currentTarget.reset();
                  }}
                >
                  <ScanLine size={19} />
                  <input
                    name="scan"
                    placeholder="Quick scan barcode / SKU, then press Enter"
                  />
                  <button type="submit">Add item</button>
                </form>

                <div className="search-control">
                  <Search size={18} />
                  <input
                    value={posSearch}
                    onChange={event => setPosSearch(event.target.value)}
                    placeholder="Search by product, brand, size or SKU..."
                  />
                  {posSearch && (
                    <button onClick={() => setPosSearch("")}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="catalogue-grid">
                  {filteredProducts.map(product => (
                    <button
                      className="catalogue-card"
                      key={product.id}
                      onClick={() => addToCart(product)}
                    >
                      <div className="catalogue-photo">
                        <Footprints size={34} />
                        <span>{product.stock} available</span>
                      </div>
                      <div className="catalogue-info">
                        <strong>{product.name}</strong>
                        <small>
                          {[
                            product.brand,
                            product.size && `Size ${product.size}`,
                            product.color
                          ].filter(Boolean).join(" · ")}
                        </small>
                        <div>
                          <b>{money(product.price)}</b>
                          <span><Plus size={15} /></span>
                        </div>
                      </div>
                    </button>
                  ))}

                  {!filteredProducts.length && (
                    <div className="empty-message">
                      No matching products found.
                    </div>
                  )}
                </div>
              </section>

              <section className="surface order-surface">
                <div className="surface-heading">
                  <div>
                    <div className="section-kicker">CURRENT TRANSACTION</div>
                    <h3>Order summary</h3>
                    <p>{cart.length} different products</p>
                  </div>
                  <button
                    className="icon-action"
                    title="Clear cart"
                    onClick={() => setCart([])}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <label className="input-label">Customer</label>
                <select
                  className="form-control"
                  value={selectedCustomer}
                  onChange={event => setSelectedCustomer(event.target.value)}
                >
                  <option value="">Walk-in customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>

                <div className="cart-list">
                  {cart.map(item => (
                    <div className="cart-line" key={item.id}>
                      <div className="cart-line-thumb">
                        <Footprints size={19} />
                      </div>

                      <div className="cart-line-detail">
                        <strong>{item.name}</strong>
                        <small>{money(item.price)} each</small>

                        <div className="quantity-stepper">
                          <button
                            onClick={() =>
                              changeQuantity(item.id, item.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() =>
                              changeQuantity(item.id, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="cart-line-total">
                        <strong>{money(item.price * item.quantity)}</strong>
                        <button
                          onClick={() =>
                            setCart(previous =>
                              previous.filter(row => row.id !== item.id)
                            )
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!cart.length && (
                    <div className="cart-empty-state">
                      <ShoppingCart size={34} />
                      <strong>No items added</strong>
                      <span>Select a product to start an order.</span>
                    </div>
                  )}
                </div>

                <div className="checkout-settings">
                  <div className="split-fields">
                    <label className="input-label">
                      Discount (Rs.)
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={discount}
                        onChange={event => setDiscount(event.target.value)}
                      />
                    </label>

                    <label className="input-label">
                      Payment
                      <select
                        className="form-control"
                        value={paymentMethod}
                        onChange={event => setPaymentMethod(event.target.value)}
                      >
                        <option>Cash</option>
                        <option>Card</option>
                        <option>Bank Transfer</option>
                        <option>JazzCash</option>
                        <option>EasyPaisa</option>
                      </select>
                    </label>
                  </div>

                  <label className="input-label">
                    Amount received (Rs.)
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      placeholder={String(total)}
                      value={paid}
                      onChange={event => setPaid(event.target.value)}
                    />
                  </label>
                </div>

                <div className="order-totals">
                  <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
                  <div>
                    <span>Discount</span>
                    <b>− {money(discountAmount)}</b>
                  </div>
                  <div>
                    <span>Tax ({taxRate}%)</span>
                    <b>{money(tax)}</b>
                  </div>
                  <div className="total-line">
                    <strong>Total payable</strong>
                    <strong>{money(total)}</strong>
                  </div>
                  <div><span>Change due</span><b>{money(change)}</b></div>
                </div>

                <button
                  className="checkout-button"
                  disabled={!cart.length}
                  onClick={checkout}
                >
                  <CreditCard size={19} />
                  Complete transaction
                  <span>{money(total)}</span>
                </button>

                <button
                  className="whatsapp-outline"
                  disabled={!cart.length}
                  onClick={() => {
                    setWaItems(cart.map(item => ({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      quantity: item.quantity
                    })));
                    setWaCustomer(selectedCustomer);
                    setWaMessage("");
                    go("whatsapp");
                  }}
                >
                  <MessageCircle size={17} />
                  Prepare WhatsApp order
                </button>
              </section>
            </div>
          )}

          {/* BARCODE SCANNER */}
          {page === "scanner" && (
            <div className="scanner-page">
              <section className="scanner-hero surface">
                <div className="scanner-heading">
                  <div className="scanner-symbol">
                    <ScanLine size={32} />
                  </div>
                  <div>
                    <div className="section-kicker">HARDWARE INPUT</div>
                    <h2>Barcode scanner</h2>
                    <p>
                      Connect a USB barcode scanner and scan a product label.
                    </p>
                  </div>
                </div>

                <form
                  className="scanner-input-wrap"
                  onSubmit={scanBarcode}
                >
                  <Barcode size={25} />
                  <input
                    ref={scannerRef}
                    value={scannerValue}
                    onChange={event => setScannerValue(event.target.value)}
                    placeholder="Click here, scan barcode, press Enter..."
                    autoComplete="off"
                  />
                  <button type="submit" className="button button-primary">
                    Find product
                  </button>
                </form>

                <div className="scanner-hints">
                  <span>
                    <CheckCircle2 size={15} />
                    USB keyboard-wedge scanners supported
                  </span>
                  <span>
                    <Hash size={15} />
                    Exact barcode and SKU matching
                  </span>
                  <span>
                    <Activity size={15} />
                    Press Enter after scanning
                  </span>
                </div>
              </section>

              <div className="scanner-result-grid">
                <section className="surface scanner-product-panel">
                  <div className="surface-heading">
                    <div>
                      <h3>Product result</h3>
                      <p>Details of the last matched scan</p>
                    </div>
                    <span className="live-label"><i /> READY</span>
                  </div>

                  {scannedProduct ? (
                    <div className="scan-product-result">
                      <div className="scan-product-image">
                        <Footprints size={55} />
                      </div>

                      <div className="scan-product-data">
                        <span className="section-kicker">MATCH FOUND</span>
                        <h2>{scannedProduct.name}</h2>
                        <p>
                          {scannedProduct.brand || scannedProduct.category}
                        </p>

                        <div className="scan-detail-grid">
                          <div>
                            <small>SKU</small>
                            <strong>{scannedProduct.sku || "—"}</strong>
                          </div>
                          <div>
                            <small>BARCODE</small>
                            <strong>{scannedProduct.barcode || "—"}</strong>
                          </div>
                          <div>
                            <small>SIZE</small>
                            <strong>
                              {scannedProduct.size_system} {scannedProduct.size}
                            </strong>
                          </div>
                          <div>
                            <small>COLOR</small>
                            <strong>{scannedProduct.color || "—"}</strong>
                          </div>
                          <div>
                            <small>STOCK</small>
                            <strong>{scannedProduct.stock}</strong>
                          </div>
                          <div>
                            <small>PRICE</small>
                            <strong className="scan-price">
                              {money(scannedProduct.price)}
                            </strong>
                          </div>
                        </div>

                        <button
                          className="button button-primary"
                          onClick={() => addToCart(scannedProduct)}
                        >
                          <Plus size={16} /> Add to POS cart
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="scanner-placeholder">
                      <ScanLine size={43} />
                      <strong>Waiting for a scan</strong>
                      <span>
                        Scan a product barcode to see its details here.
                      </span>
                    </div>
                  )}
                </section>

                <section className="surface scan-history-panel">
                  <div className="surface-heading">
                    <div>
                      <h3>Recent scans</h3>
                      <p>This session</p>
                    </div>
                    <button
                      className="link-button"
                      onClick={() => setScanHistory([])}
                    >
                      Clear
                    </button>
                  </div>

                  {scanHistory.map((item, index) => (
                    <div
                      className="scan-history-item"
                      key={`${item.code}-${index}`}
                    >
                      <div
                        className={`history-result-icon ${
                          item.found ? "found" : "missing"
                        }`}
                      >
                        {item.found ? <Check size={16} /> : <X size={16} />}
                      </div>
                      <div>
                        <strong>{item.name || item.code}</strong>
                        <small>{item.code}</small>
                      </div>
                      <time>{item.time}</time>
                    </div>
                  ))}

                  {!scanHistory.length && (
                    <div className="empty-message">
                      Your recent scans will appear here.
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* WHATSAPP ORDERS */}
          {page === "whatsapp" && (
            <div className="whatsapp-page">
              <div className="whatsapp-banner">
                <div className="wa-brand-icon">
                  <MessageCircle size={30} />
                </div>

                <div>
                  <div className="section-kicker">
                    WHATSAPP BUSINESS CLOUD API
                  </div>
                  <h2>WhatsApp order desk</h2>
                  <p>
                    Receive customer messages, review incoming orders and
                    prepare outgoing orders.
                  </p>
                </div>

                <span className="wa-connection">
                  <i />
                  {waConnection.connected
                    ? "CONNECTED"
                    : waConnection.configured
                      ? "CONFIGURED"
                      : "NOT CONNECTED"}
                </span>
              </div>

              {/* Incoming order metrics */}
              <div className="metric-grid">
                <Metric
                  title="Incoming messages"
                  value={incomingOrders.length}
                  icon={MessageCircle}
                  tone="blue"
                  caption="Received by webhook"
                />
                <Metric
                  title="Pending review"
                  value={pendingIncoming}
                  icon={Clock}
                  tone="orange"
                  caption="Waiting for staff"
                />
                <Metric
                  title="Accepted"
                  value={acceptedIncoming}
                  icon={CheckCircle2}
                  tone="green"
                  caption="Reviewed orders"
                />
                <Metric
                  title="Converted"
                  value={convertedIncoming}
                  icon={PackageCheck}
                  tone="violet"
                  caption="Converted order status"
                />
              </div>

              {/* Connection configuration */}
              <section className="surface wa-connection-panel">
                <div className="surface-heading">
                  <div>
                    <h3>Cloud API connection</h3>
                    <p>
                      Configure the URL of your hosted ShoeMaster WhatsApp
                      service. Do not enter Meta access tokens here.
                    </p>
                  </div>

                  <button
                    className="button button-light"
                    onClick={() => syncIncomingWhatsAppOrders(false)}
                    disabled={waSyncing}
                  >
                    <RefreshCw
                      size={16}
                      className={waSyncing ? "spin" : ""}
                    />
                    {waSyncing ? "Syncing..." : "Sync now"}
                  </button>
                </div>

                <form
                  className="form-grid"
                  onSubmit={saveWhatsAppConnection}
                >
                  <Field label="Hosted ShoeMaster service URL">
                    <input
                      type="url"
                      value={waServerUrl}
                      onChange={event => setWaServerUrl(event.target.value)}
                      placeholder="https://your-server.example.com"
                    />
                  </Field>

                  <Field label="WhatsApp Business number">
                    <input
                      value={waBusinessNumber}
                      onChange={event =>
                        setWaBusinessNumber(event.target.value)
                      }
                      placeholder="e.g. 923001234567"
                    />
                  </Field>

                  <div className="settings-actions">
                    <button
                      className="button button-primary"
                      type="submit"
                    >
                      <Save size={16} /> Save connection
                    </button>
                  </div>
                </form>

                <div className="wa-connection-info">
                  <span>
                    <strong>Connection:</strong>{" "}
                    {waConnection.connected
                      ? "Connected"
                      : waConnection.configured
                        ? "Configured but not connected"
                        : "Not configured"}
                  </span>

                  <span>
                    <strong>Business number:</strong>{" "}
                    {waConnection.business_number || waBusinessNumber || "—"}
                  </span>

                  <span>
                    <strong>Last sync:</strong>{" "}
                    {formatDateTime(waConnection.last_sync)}
                  </span>
                </div>
              </section>

              {/* Incoming orders */}
              <section className="surface wa-history">
                <div className="surface-heading">
                  <div>
                    <div className="section-kicker">INBOUND MESSAGES</div>
                    <h3>Incoming WhatsApp orders</h3>
                    <p>
                      Messages received by your official WhatsApp webhook.
                    </p>
                  </div>

                  <select
                    className="filter-select"
                    value={incomingFilter}
                    onChange={event =>
                      setIncomingFilter(event.target.value)
                    }
                  >
                    <option value="All">All statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>PHONE</th>
                        <th>MESSAGE</th>
                        <th>RECEIVED</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredIncomingOrders.map(order => {
                        const status = order.status || "Pending";
                        const message =
                          order.message ||
                          order.text ||
                          order.body ||
                          order.message_text ||
                          "";

                        return (
                          <tr key={order.id}>
                            <td>
                              <strong>
                                {order.customer_name ||
                                  order.customer ||
                                  order.profile_name ||
                                  "WhatsApp customer"}
                              </strong>
                            </td>

                            <td>
                              {order.from || order.phone || "—"}
                            </td>

                            <td>
                              <span className="incoming-message-preview">
                                {String(message).slice(0, 65) ||
                                  "No text content"}
                              </span>
                            </td>

                            <td>
                              {formatDateTime(
                                order.received_at ||
                                order.created_at ||
                                order.timestamp
                              )}
                            </td>

                            <td>
                              <span
                                className={`status-pill ${String(
                                  status
                                ).toLowerCase()}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td>
                              <div className="row-actions">
                                <button
                                  title="View message"
                                  onClick={() =>
                                    setSelectedIncomingOrder(order)
                                  }
                                >
                                  <Eye size={16} />
                                </button>

                                {status.toLowerCase() === "pending" && (
                                  <>
                                    <button
                                      title="Accept order"
                                      onClick={() =>
                                        updateIncomingOrderStatus(
                                          order.id,
                                          "Accepted"
                                        )
                                      }
                                    >
                                      <Check size={16} />
                                    </button>

                                    <button
                                      title="Reject order"
                                      onClick={() =>
                                        updateIncomingOrderStatus(
                                          order.id,
                                          "Rejected"
                                        )
                                      }
                                    >
                                      <Ban size={16} />
                                    </button>
                                  </>
                                )}

                                {status.toLowerCase() === "accepted" && (
                                  <button
                                    title="Match items and add to POS"
                                    onClick={() =>
                                      matchIncomingOrderItems(order)
                                    }
                                  >
                                    <ShoppingCart size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {!filteredIncomingOrders.length && (
                        <EmptyRow
                          colSpan={6}
                          text={
                            incomingOrders.length
                              ? "No orders match this filter."
                              : "No incoming WhatsApp messages found. Once your webhook is connected, customer messages will appear here."
                          }
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Outgoing order builder */}
              <div className="wa-workspace">
                <section className="surface wa-builder">
                  <div className="surface-heading">
                    <div>
                      <h3>Create an outgoing order</h3>
                      <p>
                        Choose a customer and add products to the order.
                      </p>
                    </div>
                    <span className="step-number">01 / 02</span>
                  </div>

                  <label className="input-label">Select customer</label>
                  <select
                    className="form-control"
                    value={waCustomer}
                    onChange={event => {
                      const value = event.target.value;
                      setWaCustomer(value);

                      const customer = customers.find(
                        item => String(item.id) === value
                      );

                      if (customer?.phone) {
                        setWaPhone(customer.phone);
                      }
                    }}
                  >
                    <option value="">Choose customer (optional)</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} — {customer.phone || "No phone"}
                      </option>
                    ))}
                  </select>

                  <label className="input-label">
                    WhatsApp phone number
                  </label>

                  <div className="phone-input">
                    <Phone size={17} />
                    <input
                      value={waPhone}
                      onChange={event => setWaPhone(event.target.value)}
                      placeholder="e.g. 923001234567 (include country code)"
                    />
                  </div>

                  <div className="wa-product-picker">
                    <div className="picker-heading">
                      <strong>Add products</strong>
                      <span>{products.length} available</span>
                    </div>

                    <div className="wa-product-list">
                      {products.slice(0, 8).map(product => (
                        <div
                          className="wa-product-option"
                          key={product.id}
                        >
                          <div className="wa-product-thumb">
                            <Footprints size={18} />
                          </div>

                          <div>
                            <strong>{product.name}</strong>
                            <small>
                              {product.sku || product.category} ·{" "}
                              {money(product.price)}
                            </small>
                          </div>

                          <button
                            onClick={() => addWhatsAppItem(product)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ))}

                      {!products.length && (
                        <div className="empty-message">
                          Add products to your catalogue first.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="wa-selected-items">
                    <div className="picker-heading">
                      <strong>Order items</strong>
                      <span>{waItems.length} selected</span>
                    </div>

                    {waItems.map(item => (
                      <div className="wa-order-line" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{money(item.price)} each</small>
                        </div>

                        <div className="quantity-stepper">
                          <button
                            onClick={() =>
                              setWaItems(previous =>
                                previous.map(row =>
                                  row.id === item.id
                                    ? {
                                        ...row,
                                        quantity: Math.max(
                                          1,
                                          row.quantity - 1
                                        )
                                      }
                                    : row
                                )
                              )
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() =>
                              setWaItems(previous =>
                                previous.map(row =>
                                  row.id === item.id
                                    ? {
                                        ...row,
                                        quantity: row.quantity + 1
                                      }
                                    : row
                                )
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {money(item.price * item.quantity)}
                        </strong>

                        <button
                          className="remove-line"
                          onClick={() =>
                            setWaItems(previous =>
                              previous.filter(row => row.id !== item.id)
                            )
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}

                    {!waItems.length && (
                      <div className="empty-message compact">
                        No products selected yet.
                      </div>
                    )}

                    <div className="wa-order-total">
                      <span>Order total</span>
                      <strong>{money(waSubtotal)}</strong>
                    </div>
                  </div>
                </section>

                <section className="surface wa-preview-panel">
                  <div className="surface-heading">
                    <div>
                      <h3>Message preview</h3>
                      <p>Review and edit before opening WhatsApp.</p>
                    </div>
                    <span className="step-number">02 / 02</span>
                  </div>

                  <div className="wa-preview-top">
                    <div className="wa-preview-avatar">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <strong>WhatsApp message</strong>
                      <small>Preview only · Not sent yet</small>
                    </div>
                    <span className="secure-dot" />
                  </div>

                  <textarea
                    className="wa-message-editor"
                    value={waMessage}
                    onChange={event => setWaMessage(event.target.value)}
                    placeholder="Generate an order message or write your own..."
                  />

                  <button
                    className="button button-light full-button"
                    onClick={makeWhatsAppMessage}
                  >
                    <RefreshCw size={16} />
                    Generate message from order
                  </button>

                  <button
                    className="wa-send-button"
                    onClick={openWhatsApp}
                  >
                    <MessageCircle size={19} />
                    Open WhatsApp chat
                    <ArrowUpRight size={17} />
                  </button>

                  <p className="wa-disclaimer">
                    This opens a WhatsApp conversation with a prepared
                    message. Review and send it inside WhatsApp. Automatic
                    outgoing Cloud API messages require the hosted backend
                    and approved Meta messaging configuration.
                  </p>
                </section>
              </div>

              {/* Local outgoing history */}
              <section className="surface wa-history">
                <div className="surface-heading">
                  <div>
                    <h3>Prepared order history</h3>
                    <p>Orders opened from this session</p>
                  </div>

                  <select
                    className="filter-select"
                    value={waStatusFilter}
                    onChange={event =>
                      setWaStatusFilter(event.target.value)
                    }
                  >
                    <option>All</option>
                    <option>Pending</option>
                    <option>Confirmed</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </select>
                </div>

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ORDER ID</th>
                        <th>CUSTOMER</th>
                        <th>PHONE</th>
                        <th>DATE</th>
                        <th>TOTAL</th>
                        <th>STATUS</th>
                        <th>UPDATE STATUS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {waOrders
                        .filter(order =>
                          waStatusFilter === "All" ||
                          order.status === waStatusFilter
                        )
                        .map(order => (
                          <tr key={order.id}>
                            <td><strong>{order.id}</strong></td>
                            <td>{order.customer}</td>
                            <td>{order.phone}</td>
                            <td>{formatDate(order.created_at)}</td>
                            <td className="amount">{money(order.total)}</td>
                            <td>
                              <span
                                className={`status-pill ${order.status.toLowerCase()}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td>
                              <select
                                className="status-select"
                                value={order.status}
                                onChange={event =>
                                  changeWaStatus(
                                    order.id,
                                    event.target.value
                                  )
                                }
                              >
                                <option>Pending</option>
                                <option>Confirmed</option>
                                <option>Delivered</option>
                                <option>Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        ))}

                      {!waOrders.length && (
                        <EmptyRow
                          colSpan={7}
                          text="No prepared orders in this session yet."
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* PRODUCTS */}
          {page === "products" && (
            <section className="surface page-surface">
              <div className="surface-heading page-toolbar">
                <div>
                  <div className="section-kicker">CATALOGUE MANAGEMENT</div>
                  <h3>Products & variants</h3>
                  <p>
                    Manage shoes, sizes, colours, pricing and barcodes.
                  </p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => openProduct()}
                >
                  <Plus size={17} /> Add product
                </button>
              </div>

              <div className="table-tools">
                <div className="search-control">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search product, SKU, barcode or brand..."
                  />
                </div>
                <span className="result-count">
                  {filteredProducts.length} results
                </span>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>SKU / BARCODE</th>
                      <th>CATEGORY</th>
                      <th>SIZE</th>
                      <th>COST</th>
                      <th>PRICE</th>
                      <th>STOCK</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-cell">
                            <div className="table-product-icon">
                              <Footprints size={19} />
                            </div>
                            <div>
                              <strong>{product.name}</strong>
                              <small>
                                {product.brand || product.color || ""}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>{product.sku || product.barcode || "—"}</td>
                        <td>{product.category}</td>
                        <td>
                          {product.size_system} {product.size}
                        </td>
                        <td>{money(product.cost)}</td>
                        <td className="amount">{money(product.price)}</td>
                        <td>
                          <span
                            className={`stock-pill ${
                              Number(product.stock) <=
                              Number(product.reorder_level)
                                ? "low"
                                : "good"
                            }`}
                          >
                            {product.stock} units
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              title="Edit"
                              onClick={() => openProduct(product)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!filteredProducts.length && (
                      <EmptyRow colSpan={8} text="No products found." />
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* STOCK */}
          {page === "stock" && (
            <section className="surface page-surface">
              <div className="surface-heading page-toolbar">
                <div>
                  <div className="section-kicker">INVENTORY CONTROL</div>
                  <h3>Stock management</h3>
                  <p>
                    Review inventory levels and record stock adjustments.
                  </p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => setStockModal(true)}
                >
                  <Plus size={17} /> Adjust stock
                </button>
              </div>

              <div className="mini-metrics">
                <MiniMetric
                  label="Products"
                  value={products.length}
                  icon={Package}
                />
                <MiniMetric
                  label="Total units"
                  value={products.reduce(
                    (sum, product) => sum + Number(product.stock || 0),
                    0
                  )}
                  icon={Boxes}
                />
                <MiniMetric
                  label="Low stock"
                  value={lowStock.length}
                  icon={AlertTriangle}
                />
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>SKU</th>
                      <th>ON HAND</th>
                      <th>REORDER LEVEL</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map(product => (
                      <tr key={product.id}>
                        <td><strong>{product.name}</strong></td>
                        <td>{product.sku || "—"}</td>
                        <td>{product.stock}</td>
                        <td>{product.reorder_level}</td>
                        <td>
                          <span
                            className={`stock-pill ${
                              Number(product.stock) <=
                              Number(product.reorder_level)
                                ? "low"
                                : "good"
                            }`}
                          >
                            {Number(product.stock) <=
                            Number(product.reorder_level)
                              ? "Low stock"
                              : "In stock"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="small-button"
                            onClick={() => {
                              setStockForm({
                                product_id: String(product.id),
                                type: "add",
                                quantity: "",
                                note: ""
                              });
                              setStockModal(true);
                            }}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* CUSTOMERS */}
          {page === "customers" && (
            <section className="surface page-surface">
              <div className="surface-heading page-toolbar">
                <div>
                  <div className="section-kicker">
                    CUSTOMER RELATIONSHIPS
                  </div>
                  <h3>Customers</h3>
                  <p>
                    Maintain customer contact details for sales and WhatsApp
                    orders.
                  </p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => setCustomerModal(true)}
                >
                  <Plus size={17} /> Add customer
                </button>
              </div>

              <div className="table-tools">
                <div className="search-control">
                  <Search size={18} />
                  <input
                    value={customerSearch}
                    onChange={event => setCustomerSearch(event.target.value)}
                    placeholder="Search customers..."
                  />
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>PHONE</th>
                      <th>EMAIL</th>
                      <th>ADDRESS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map(customer => (
                      <tr key={customer.id}>
                        <td><strong>{customer.name}</strong></td>
                        <td>{customer.phone || "—"}</td>
                        <td>{customer.email || "—"}</td>
                        <td>{customer.address || "—"}</td>
                      </tr>
                    ))}

                    {!filteredCustomers.length && (
                      <EmptyRow colSpan={4} text="No customers found." />
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SUPPLIERS */}
          {page === "suppliers" && (
            <section className="surface page-surface">
              <div className="surface-heading page-toolbar">
                <div>
                  <div className="section-kicker">
                    SUPPLIER RELATIONSHIPS
                  </div>
                  <h3>Suppliers</h3>
                  <p>Keep supplier contact information organised.</p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => setSupplierModal(true)}
                >
                  <Plus size={17} /> Add supplier
                </button>
              </div>

              <div className="table-tools">
                <div className="search-control">
                  <Search size={18} />
                  <input
                    value={supplierSearch}
                    onChange={event => setSupplierSearch(event.target.value)}
                    placeholder="Search suppliers..."
                  />
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>PHONE</th>
                      <th>EMAIL</th>
                      <th>ADDRESS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSuppliers.map(supplier => (
                      <tr key={supplier.id}>
                        <td><strong>{supplier.name}</strong></td>
                        <td>{supplier.phone || "—"}</td>
                        <td>{supplier.email || "—"}</td>
                        <td>{supplier.address || "—"}</td>
                      </tr>
                    ))}

                    {!filteredSuppliers.length && (
                      <EmptyRow colSpan={4} text="No suppliers found." />
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SALES */}
          {page === "sales" && (
            <section className="surface page-surface">
              <div className="surface-heading page-toolbar">
                <div>
                  <div className="section-kicker">TRANSACTION RECORDS</div>
                  <h3>Sales history</h3>
                  <p>Review completed transactions and print receipts.</p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => go("pos")}
                >
                  <Plus size={17} /> New sale
                </button>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>INVOICE</th>
                      <th>CUSTOMER</th>
                      <th>DATE</th>
                      <th>PAYMENT</th>
                      <th>TOTAL</th>
                      <th>RECEIPT</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id}>
                        <td>
                          <strong>{sale.invoice_number || sale.id}</strong>
                        </td>
                        <td>{sale.customer_name || "Walk-in customer"}</td>
                        <td>{formatDate(sale.created_at)}</td>
                        <td>
                          <span className="soft-badge">
                            {sale.payment_method || "Cash"}
                          </span>
                        </td>
                        <td className="amount">{money(sale.total)}</td>
                        <td>
                          <button
                            className="small-button"
                            onClick={() => printReceipt(sale)}
                          >
                            <Printer size={14} /> Print
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!sales.length && (
                      <EmptyRow colSpan={6} text="No sales recorded yet." />
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* REPORTS */}
          {page === "reports" && (
            <>
              <div className="metric-grid report-metrics">
                <Metric
                  title="Total revenue"
                  value={money(dashboard.total_revenue)}
                  icon={Wallet}
                  tone="orange"
                />
                <Metric
                  title="Gross profit"
                  value={money(dashboard.gross_profit)}
                  icon={TrendingUp}
                  tone="green"
                />
                <Metric
                  title="Total sales"
                  value={dashboard.total_sales || 0}
                  icon={Receipt}
                  tone="violet"
                />
                <Metric
                  title="Low stock"
                  value={lowStock.length}
                  icon={AlertTriangle}
                  tone="blue"
                />
              </div>

              <div className="report-grid">
                <section className="surface">
                  <div className="surface-heading">
                    <div>
                      <h3>Top selling products</h3>
                      <p>Based on quantity sold</p>
                    </div>
                  </div>

                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>PRODUCT</th>
                          <th>QUANTITY</th>
                          <th>REVENUE</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(reports.top_products || []).map((item, index) => (
                          <tr key={`${item.name}-${index}`}>
                            <td><strong>{item.name}</strong></td>
                            <td>{item.quantity_sold}</td>
                            <td className="amount">{money(item.revenue)}</td>
                          </tr>
                        ))}

                        {!reports.top_products?.length && (
                          <EmptyRow
                            colSpan={3}
                            text="No product sales data available."
                          />
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="surface">
                  <div className="surface-heading">
                    <div>
                      <h3>Payment methods</h3>
                      <p>Transaction breakdown</p>
                    </div>
                  </div>

                  {(reports.payment_methods || []).map(item => (
                    <div
                      className="payment-method-row"
                      key={item.payment_method}
                    >
                      <div>
                        <strong>{item.payment_method}</strong>
                        <small>{item.transactions} transactions</small>
                      </div>
                      <b>{money(item.amount)}</b>
                    </div>
                  ))}

                  {!reports.payment_methods?.length && (
                    <div className="empty-message">
                      No payment data available.
                    </div>
                  )}
                </section>
              </div>

              <section className="surface page-surface">
                <div className="surface-heading">
                  <div>
                    <h3>Monthly sales</h3>
                    <p>Revenue summary by month</p>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>MONTH</th>
                        <th>ORDERS</th>
                        <th>REVENUE</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(reports.monthly_sales || []).map(item => (
                        <tr key={item.month}>
                          <td>{item.month}</td>
                          <td>{item.orders}</td>
                          <td className="amount">{money(item.revenue)}</td>
                        </tr>
                      ))}

                      {!reports.monthly_sales?.length && (
                        <EmptyRow
                          colSpan={3}
                          text="No monthly sales data available."
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* SETTINGS */}
          {page === "settings" && (
            <section className="surface settings-surface">
              <div className="surface-heading">
                <div>
                  <div className="section-kicker">CONFIGURATION</div>
                  <h3>Store settings</h3>
                  <p>
                    Business details, tax configuration and receipt preferences.
                  </p>
                </div>
              </div>

              <form onSubmit={saveSettings}>
                <h4 className="form-section-heading">
                  Business information
                </h4>

                <div className="form-grid">
                  <Field label="Store name">
                    <input
                      required
                      value={settingsForm.store_name || ""}
                      onChange={event =>
                        setSettingsForm({
                          ...settingsForm,
                          store_name: event.target.value
                        })
                      }
                    />
                  </Field>

                  <Field label="Phone number">
                    <input
                      value={settingsForm.phone || ""}
                      onChange={event =>
                        setSettingsForm({
                          ...settingsForm,
                          phone: event.target.value
                        })
                      }
                    />
                  </Field>

                  <Field label="Email address">
                    <input
                      type="email"
                      value={settingsForm.email || ""}
                      onChange={event =>
                        setSettingsForm({
                          ...settingsForm,
                          email: event.target.value
                        })
                      }
                    />
                  </Field>

                  <Field label="Currency">
                    <input value="PKR" disabled />
                  </Field>

                  <Field label="Business address">
                    <input
                      value={settingsForm.address || ""}
                      onChange={event =>
                        setSettingsForm({
                          ...settingsForm,
                          address: event.target.value
                        })
                      }
                    />
                  </Field>

                  <Field label="Tax rate (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settingsForm.tax_rate ?? 0}
                      onChange={event =>
                        setSettingsForm({
                          ...settingsForm,
                          tax_rate: event.target.value
                        })
                      }
                    />
                  </Field>
                </div>

                <h4 className="form-section-heading">
                  Receipt preferences
                </h4>

                <Field label="Receipt footer">
                  <textarea
                    rows="3"
                    value={settingsForm.receipt_footer || ""}
                    onChange={event =>
                      setSettingsForm({
                        ...settingsForm,
                        receipt_footer: event.target.value
                      })
                    }
                  />
                </Field>

                <div className="settings-actions">
                  <button
                    className="button button-primary"
                    type="submit"
                  >
                    <Save size={16} /> Save settings
                  </button>

                  <button
                    className="button button-light"
                    type="button"
                    onClick={saveBackup}
                  >
                    <Download size={16} /> Backup database
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      {/* PRODUCT MODAL */}
      {productModal && (
        <Modal
          title={editingProduct ? "Edit product" : "Add new product"}
          onClose={() => setProductModal(false)}
          wide
        >
          <form onSubmit={saveProduct}>
            <div className="image-upload-box">
              <div className="image-preview-box">
                {imagePreview
                  ? <img src={imagePreview} alt="Product" />
                  : <Footprints size={34} />}
              </div>

              <div>
                <strong>Product photo</strong>
                <p>Add a clear image of the shoe.</p>
                <button
                  className="button button-light"
                  type="button"
                  onClick={chooseImage}
                >
                  <ImagePlus size={16} /> Choose image
                </button>
              </div>
            </div>

            <div className="form-grid">
              <Field label="Product name">
                <input
                  required
                  value={productForm.name}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      name: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Category">
                <select
                  value={productForm.category}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value
                    })
                  }
                >
                  <option>Sneakers</option>
                  <option>Formal Shoes</option>
                  <option>Casual Shoes</option>
                  <option>Sports Shoes</option>
                  <option>Sandals</option>
                  <option>Slippers</option>
                  <option>Boots</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field label="Brand">
                <input
                  value={productForm.brand}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      brand: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="SKU">
                <input
                  value={productForm.sku}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      sku: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Barcode">
                <input
                  value={productForm.barcode}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      barcode: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Size system">
                <select
                  value={productForm.size_system}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      size_system: event.target.value
                    })
                  }
                >
                  <option>UK</option>
                  <option>US</option>
                  <option>EU</option>
                </select>
              </Field>

              <Field label="Size">
                <input
                  value={productForm.size}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      size: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Color">
                <input
                  value={productForm.color}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      color: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Material">
                <input
                  value={productForm.material}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      material: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Width">
                <input
                  value={productForm.width}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      width: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Cost price (Rs.)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.cost}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      cost: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Selling price (Rs.)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      price: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Stock quantity">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.stock}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      stock: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Reorder level">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.reorder_level}
                  onChange={event =>
                    setProductForm({
                      ...productForm,
                      reorder_level: event.target.value
                    })
                  }
                />
              </Field>
            </div>

            <ModalActions
              onCancel={() => setProductModal(false)}
              submitLabel={
                editingProduct ? "Update product" : "Save product"
              }
            />
          </form>
        </Modal>
      )}

      {/* CUSTOMER MODAL */}
      {customerModal && (
        <Modal
          title="Add customer"
          onClose={() => setCustomerModal(false)}
        >
          <form onSubmit={saveCustomer}>
            <div className="form-grid one-column">
              <Field label="Customer name">
                <input
                  required
                  value={customerForm.name}
                  onChange={event =>
                    setCustomerForm({
                      ...customerForm,
                      name: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Phone">
                <input
                  value={customerForm.phone}
                  onChange={event =>
                    setCustomerForm({
                      ...customerForm,
                      phone: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={event =>
                    setCustomerForm({
                      ...customerForm,
                      email: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Address">
                <input
                  value={customerForm.address}
                  onChange={event =>
                    setCustomerForm({
                      ...customerForm,
                      address: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={customerForm.notes}
                  onChange={event =>
                    setCustomerForm({
                      ...customerForm,
                      notes: event.target.value
                    })
                  }
                />
              </Field>
            </div>

            <ModalActions
              onCancel={() => setCustomerModal(false)}
              submitLabel="Save customer"
            />
          </form>
        </Modal>
      )}

      {/* SUPPLIER MODAL */}
      {supplierModal && (
        <Modal
          title="Add supplier"
          onClose={() => setSupplierModal(false)}
        >
          <form onSubmit={saveSupplier}>
            <div className="form-grid one-column">
              <Field label="Supplier name">
                <input
                  required
                  value={supplierForm.name}
                  onChange={event =>
                    setSupplierForm({
                      ...supplierForm,
                      name: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Phone">
                <input
                  value={supplierForm.phone}
                  onChange={event =>
                    setSupplierForm({
                      ...supplierForm,
                      phone: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={event =>
                    setSupplierForm({
                      ...supplierForm,
                      email: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Address">
                <input
                  value={supplierForm.address}
                  onChange={event =>
                    setSupplierForm({
                      ...supplierForm,
                      address: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={supplierForm.notes}
                  onChange={event =>
                    setSupplierForm({
                      ...supplierForm,
                      notes: event.target.value
                    })
                  }
                />
              </Field>
            </div>

            <ModalActions
              onCancel={() => setSupplierModal(false)}
              submitLabel="Save supplier"
            />
          </form>
        </Modal>
      )}

      {/* STOCK MODAL */}
      {stockModal && (
        <Modal
          title="Adjust inventory stock"
          onClose={() => setStockModal(false)}
        >
          <form onSubmit={adjustStock}>
            <div className="form-grid one-column">
              <Field label="Product">
                <select
                  required
                  value={stockForm.product_id}
                  onChange={event =>
                    setStockForm({
                      ...stockForm,
                      product_id: event.target.value
                    })
                  }
                >
                  <option value="">Select product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {product.stock} in stock
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Adjustment">
                <select
                  value={stockForm.type}
                  onChange={event =>
                    setStockForm({
                      ...stockForm,
                      type: event.target.value
                    })
                  }
                >
                  <option value="add">Add stock</option>
                  <option value="remove">Remove stock</option>
                </select>
              </Field>

              <Field label="Quantity">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stockForm.quantity}
                  onChange={event =>
                    setStockForm({
                      ...stockForm,
                      quantity: event.target.value
                    })
                  }
                />
              </Field>

              <Field label="Reason">
                <textarea
                  value={stockForm.note}
                  onChange={event =>
                    setStockForm({
                      ...stockForm,
                      note: event.target.value
                    })
                  }
                />
              </Field>
            </div>

            <ModalActions
              onCancel={() => setStockModal(false)}
              submitLabel="Apply adjustment"
            />
          </form>
        </Modal>
      )}

      {/* INCOMING MESSAGE DETAILS */}
      {selectedIncomingOrder && (
        <Modal
          title="Incoming WhatsApp message"
          onClose={() => setSelectedIncomingOrder(null)}
          wide
        >
          <div className="incoming-order-details">
            <div className="mini-metrics">
              <MiniMetric
                label="Customer"
                value={
                  selectedIncomingOrder.customer_name ||
                  selectedIncomingOrder.profile_name ||
                  "WhatsApp customer"
                }
                icon={Users}
              />
              <MiniMetric
                label="Phone"
                value={
                  selectedIncomingOrder.from ||
                  selectedIncomingOrder.phone ||
                  "Unknown"
                }
                icon={Phone}
              />
            </div>

            <div className="incoming-message-box">
              <div className="section-kicker">MESSAGE CONTENT</div>
              <p>
                {selectedIncomingOrder.message ||
                  selectedIncomingOrder.text ||
                  selectedIncomingOrder.body ||
                  selectedIncomingOrder.message_text ||
                  "No text content"}
              </p>
            </div>

            <p>
              <strong>Received:</strong>{" "}
              {formatDateTime(
                selectedIncomingOrder.received_at ||
                selectedIncomingOrder.created_at ||
                selectedIncomingOrder.timestamp
              )}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {selectedIncomingOrder.status || "Pending"}
            </p>

            {Array.isArray(selectedIncomingOrder.items) &&
              selectedIncomingOrder.items.length > 0 && (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>SKU / BARCODE</th>
                        <th>QUANTITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedIncomingOrder.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.name || "Unknown item"}</td>
                          <td>{item.sku || item.barcode || "—"}</td>
                          <td>{item.quantity || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            <div className="modal-actions">
              {(selectedIncomingOrder.status || "Pending").toLowerCase() ===
                "pending" && (
                <>
                  <button
                    className="button button-light"
                    onClick={() => {
                      updateIncomingOrderStatus(
                        selectedIncomingOrder.id,
                        "Rejected"
                      );
                    }}
                  >
                    <Ban size={16} /> Reject
                  </button>

                  <button
                    className="button button-primary"
                    onClick={() => {
                      updateIncomingOrderStatus(
                        selectedIncomingOrder.id,
                        "Accepted"
                      );
                    }}
                  >
                    <Check size={16} /> Accept order
                  </button>
                </>
              )}

              {(selectedIncomingOrder.status || "").toLowerCase() ===
                "accepted" && (
                <button
                  className="button button-primary"
                  onClick={() =>
                    matchIncomingOrderItems(selectedIncomingOrder)
                  }
                >
                  <ShoppingCart size={16} /> Match items and open POS
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* SALE SUCCESS */}
      {lastSale && (
        <Modal
          title="Sale completed"
          onClose={() => setLastSale(null)}
        >
          <div className="sale-success">
            <div className="sale-success-icon">
              <Check size={30} />
            </div>
            <h2>Payment successful</h2>
            <p>Invoice {lastSale.invoice_number}</p>
            <strong>{money(lastSale.total)}</strong>

            <div className="modal-actions">
              <button
                className="button button-light"
                onClick={() => printReceipt(lastSale)}
              >
                <Printer size={16} /> Print receipt
              </button>

              <button
                className="button button-primary"
                onClick={() => setLastSale(null)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="toast-message">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
    </div>
  );
}

function Metric({ title, value, icon: Icon, tone, caption }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div className="metric-copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{caption || "Store performance"}</small>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }) {
  return (
    <div className="mini-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={21} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-table-cell">
        {text}
      </td>
    </tr>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal-window ${wide ? "modal-wide" : ""}`}>
        <div className="modal-titlebar">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, submitLabel }) {
  return (
    <div className="modal-actions">
      <button
        type="button"
        className="button button-light"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button type="submit" className="button button-primary">
        {submitLabel}
      </button>
    </div>
  );
}

export default App;
