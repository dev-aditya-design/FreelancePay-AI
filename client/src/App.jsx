
import { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, Users, CreditCard, Settings,
  Bell, Search, Plus, ArrowUpRight, ArrowDownRight,
  Sparkles, Menu, Clock, Wallet, MoreHorizontal,
  Send, X, CheckCircle2
} from "lucide-react";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid
} from "recharts";

import "./App.css";

const API_BASE = "http://localhost:5000";

const chartData = [
  { month: "Jan", revenue: 1200 },
  { month: "Feb", revenue: 1900 },
  { month: "Mar", revenue: 1500 },
  { month: "Apr", revenue: 2800 },
  { month: "May", revenue: 2300 },
  { month: "Jun", revenue: 3600 },
  { month: "Jul", revenue: 3100 },
  { month: "Aug", revenue: 4600 },
  { month: "Sep", revenue: 3900 },
  { month: "Oct", revenue: 5200 },
  { month: "Nov", revenue: 4800 },
  { month: "Dec", revenue: 6200 }
];

const initialInvoices = [
  { id: "INV-2026-001", client: "Alex Morgan", project: "Website Development", amount: "$2,400", status: "Paid", date: "Nov 08, 2026" },
  { id: "INV-2026-002", client: "Sarah Wilson", project: "UI/UX Design", amount: "$1,250", status: "Pending", date: "Nov 07, 2026" },
  { id: "INV-2026-003", client: "James Cooper", project: "AI Automation", amount: "$3,800", status: "Paid", date: "Nov 05, 2026" },
  { id: "INV-2026-004", client: "Emma Davis", project: "Landing Page", amount: "$850", status: "Overdue", date: "Nov 02, 2026" }
];

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Invoices", icon: FileText },
  { name: "Clients", icon: Users },
  { name: "Payments", icon: CreditCard }
];

function App() {
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem("freelancepay_invoices");
      return saved ? JSON.parse(saved) : initialInvoices;
    } catch {
      return initialInvoices;
    }
  });

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [amount, setAmount] = useState("");

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "freelancepay_invoices",
      JSON.stringify(invoices)
    );
  }, [invoices]);

  // Handle PayPal return and capture
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const orderId = params.get("token");

    if (payment === "success" && orderId) {
      setActive("Payments");
      setPaymentMessage("Verifying your PayPal payment...");

      fetch(
        `${API_BASE}/api/paypal/capture-order/${encodeURIComponent(orderId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }
      )
        .then(async (response) => {
          const data = await response.json();

          if (
            !response.ok ||
            !data.success ||
            data.status !== "COMPLETED"
          ) {
            throw new Error(
              data.error || data.details || "Payment was not completed."
            );
          }

          setPaymentMessage(
            "Payment completed successfully! Order ID: " + orderId
          );
        })
        .catch((error) => {
          setPaymentMessage("Payment verification failed: " + error.message);
        })
        .finally(() => {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        });
    }

    if (payment === "cancel") {
      setActive("Payments");
      setPaymentMessage("PayPal checkout was cancelled.");
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  const openPage = (page) => {
    setActive(page);
    setMenuOpen(false);
  };

  // Create invoice
  const createInvoice = (e) => {
    e.preventDefault();

    if (
      !clientName.trim() ||
      !projectName.trim() ||
      !amount.trim() ||
      Number(amount) <= 0
    ) {
      alert("Please enter valid invoice details.");
      return;
    }

    const newInvoice = {
      id: `INV-2026-${String(Date.now()).slice(-6)}`,
      client: clientName.trim(),
      project: projectName.trim(),
      amount: `$${Number(amount).toLocaleString("en-US")}`,
      status: "Pending",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      })
    };

    setInvoices((previous) => [newInvoice, ...previous]);
    setClientName("");
    setProjectName("");
    setAmount("");
    setShowInvoiceForm(false);
    setActive("Invoices");
  };

  // Gemini AI Assistant
  const sendAIMessage = async (e) => {
    e.preventDefault();

    const message = aiMessage.trim();

    if (!message || aiLoading) return;

    setChatHistory((previous) => [
      ...previous,
      { role: "user", text: message }
    ]);

    setAiMessage("");
    setAiLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gemini AI request failed."
        );
      }

      setChatHistory((previous) => [
        ...previous,
        {
          role: "assistant",
          text: data.reply,
          model: data.model
        }
      ]);
    } catch (error) {
      setChatHistory((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "AI Error: " + error.message
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // PayPal Sandbox order
  const createPayPalOrder = async () => {
    setPaymentLoading(true);
    setPaymentMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/api/paypal/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: "{}"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.approvalUrl) {
        throw new Error(
          data.details || data.error || "Could not create PayPal order."
        );
      }

      window.location.assign(data.approvalUrl);
    } catch (error) {
      setPaymentMessage(error.message);
      setPaymentLoading(false);
    }
  };

  const pageHeading = {
    Overview: "Overview",
    Invoices: "Invoices",
    Clients: "Clients",
    Payments: "Payments",
    Settings: "Settings",
    "AI Assistant": "AI Assistant"
  };

  // Dashboard
  const renderDashboard = () => (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">FREELANCE BUSINESS WORKSPACE</p>
          <h1>Good morning, Aditya <span>✦</span></h1>
          <p className="subtitle">
            Here's what's happening with your freelance business.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowInvoiceForm(true)}
        >
          <Plus size={18} /> Create invoice
        </button>
      </div>

      <div className="ai-banner">
        <div className="ai-icon">
          <Sparkles size={23} />
        </div>

        <div className="ai-copy">
          <strong>Your AI finance assistant is ready</strong>
          <p>
            Manage invoices, understand income and get freelance business advice.
          </p>
        </div>

        <button onClick={() => openPage("AI Assistant")}>
          Open AI Assistant <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="section-heading">
        <div>
          <h2>Financial overview</h2>
          <p>Your business performance at a glance</p>
        </div>
        <button className="period-button">This year⌄</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Total revenue</span>
            <div className="stat-icon purple"><Wallet size={19} /></div>
          </div>
          <h2>$24,680.00</h2>
          <p className="positive">
            <ArrowUpRight size={15} /> 12.8% <span>vs last month</span>
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Pending payments</span>
            <div className="stat-icon orange"><Clock size={19} /></div>
          </div>
          <h2>$5,240.00</h2>
          <p className="neutral">4 invoices awaiting payment</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Total invoices</span>
            <div className="stat-icon blue"><FileText size={19} /></div>
          </div>
          <h2>{invoices.length + 44}</h2>
          <p className="positive">
            <ArrowUpRight size={15} /> 8.2% <span>vs last month</span>
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Active clients</span>
            <div className="stat-icon green"><Users size={19} /></div>
          </div>
          <h2>{new Set(invoices.map((invoice) => invoice.client)).size}</h2>
          <p className="positive">
            <CheckCircle2 size={15} /> Based on invoices
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h3>Revenue analytics</h3>
              <p>Sample revenue overview</p>
            </div>
            <button className="icon-button">
              <MoreHorizontal />
            </button>
          </div>

          <div className="chart-legend">
            <span></span> Revenue <strong>$24,680</strong>
          </div>

          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="revenueFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#8067ed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8067ed" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#252b3a"
                />

                <XAxis
                  dataKey="month"
                  tick={{ fill: "#858da1", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "#858da1", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#171c29",
                    border: "1px solid #30394c",
                    borderRadius: 10,
                    color: "#fff"
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#9278ff"
                  strokeWidth={3}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel payment-panel">
          <div className="panel-heading">
            <div>
              <h3>Payment summary</h3>
              <p>Sample invoice payment status</p>
            </div>
          </div>

          <div className="payment-total">
            <span>Total collected</span>
            <h2>$19,440.00</h2>
          </div>

          <div className="progress-track">
            <div className="progress-paid"></div>
            <div className="progress-pending"></div>
          </div>

          <div className="payment-row">
            <span><i className="dot paid"></i> Paid</span>
            <strong>$19,440 <small>79%</small></strong>
          </div>

          <div className="payment-row">
            <span><i className="dot pending"></i> Pending</span>
            <strong>$4,240 <small>17%</small></strong>
          </div>

          <div className="payment-row">
            <span><i className="dot overdue"></i> Overdue</span>
            <strong>$1,000 <small>4%</small></strong>
          </div>

          <button
            className="outline-button"
            onClick={() => openPage("Payments")}
          >
            View payments <ArrowUpRight size={15} />
          </button>
        </section>
      </div>

      <InvoiceTable
        invoices={invoices.slice(0, 4)}
        onViewAll={() => openPage("Invoices")}
      />
    </>
  );

  // Invoice page
  const renderInvoices = () => (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Invoices</h1>
          <p className="subtitle">
            Manage and track your client invoices.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowInvoiceForm(true)}
        >
          <Plus size={18} /> Create invoice
        </button>
      </div>

      <InvoiceTable
        invoices={invoices}
        onViewAll={() => {}}
      />
    </>
  );

  // Clients page
  const renderClients = () => {
    const clients = [
      ...new Set(invoices.map((invoice) => invoice.client))
    ];

    return (
      <>
        <div className="welcome-row">
          <div>
            <p className="eyebrow">WORKSPACE</p>
            <h1>Clients</h1>
            <p className="subtitle">
              Manage your freelance client relationships.
            </p>
          </div>
        </div>

        <section className="panel invoice-panel">
          <div className="panel-heading">
            <div>
              <h3>Recent clients</h3>
              <p>{clients.length} clients in your invoice records</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CLIENT</th>
                  <th>PROJECT</th>
                  <th>INVOICE</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.client}</td>
                    <td>{invoice.project}</td>
                    <td>{invoice.amount}</td>
                    <td>
                      <span className={`status ${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

  // Payments page
  const renderPayments = () => (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Payments</h1>
          <p className="subtitle">
            Test your PayPal payment integration.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total collected (sample)</span>
          <h2>$19,440</h2>
        </div>

        <div className="stat-card">
          <span>Pending (sample)</span>
          <h2>$4,240</h2>
        </div>

        <div className="stat-card">
          <span>Overdue (sample)</span>
          <h2>$1,000</h2>
        </div>
      </div>

      <section className="panel" style={{ padding: 24, marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <h3>PayPal Sandbox Checkout</h3>
            <p>
              Test a $5.00 USD transaction using a Sandbox buyer account.
            </p>
          </div>
        </div>

        <h2 style={{ margin: "22px 0" }}>$5.00 USD</h2>

        <button
          className="primary-button"
          onClick={createPayPalOrder}
          disabled={paymentLoading}
        >
          <CreditCard size={18} />
          {paymentLoading ? "Creating order..." : "Pay with PayPal"}
        </button>

        {paymentMessage && (
          <p style={{ marginTop: 18, color: "#a9c7ff" }}>
            {paymentMessage}
          </p>
        )}

        <p style={{ marginTop: 16, color: "#929bad", fontSize: 12 }}>
          Sandbox testing only. No real money is charged.
        </p>
      </section>

      <InvoiceTable
        invoices={invoices}
        onViewAll={() => openPage("Invoices")}
      />
    </>
  );

  // AI assistant and Settings
  const renderOtherPage = () => (
    <section className="panel invoice-panel" style={{ padding: 24 }}>
      <div className="panel-heading">
        <div>
          <h3>{active}</h3>
          <p>
            {active === "AI Assistant"
              ? "Gemini-powered freelance finance assistant."
              : "Manage your FreelancePay preferences."}
          </p>
        </div>
      </div>

      {active === "AI Assistant" ? (
        <div style={{ paddingTop: 20 }}>
          <Sparkles size={30} />

          <h2>FreelancePay AI Assistant</h2>

          <p>
            Ask questions about invoices, clients, pricing and payments.
          </p>

          <div
            style={{
              minHeight: 250,
              maxHeight: 400,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 14,
              marginTop: 20,
              background: "#111827",
              borderRadius: 12
            }}
          >
            {chatHistory.length === 0 && (
              <p style={{ color: "#aab3c5" }}>
                Hello Aditya! How can I help with your freelance business today?
              </p>
            )}

            {chatHistory.map((item, index) => (
              <div
                key={index}
                style={{
                  alignSelf:
                    item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: 13,
                  borderRadius: 12,
                  background:
                    item.role === "user" ? "#3949ab" : "#263247",
                  color: "white",
                  whiteSpace: "pre-wrap"
                }}
              >
                <div>{item.text}</div>
                {item.model && (
                  <small style={{ opacity: 0.65 }}>
                    {item.model}
                  </small>
                )}
              </div>
            ))}

            {aiLoading && (
              <p style={{ color: "#aab3c5" }}>
                Gemini is thinking...
              </p>
            )}
          </div>

          <form
            onSubmit={sendAIMessage}
            style={{
              display: "flex",
              gap: 10,
              marginTop: 16
            }}
          >
            <input
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              placeholder="Ask your AI assistant..."
              style={{ flex: 1, minWidth: 0 }}
            />

            <button
              className="primary-button"
              type="submit"
              disabled={aiLoading || !aiMessage.trim()}
            >
              <Send size={18} />
              Send
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: 20 }}>
          <h2>Settings</h2>
          <p>FreelancePay AI local MVP settings.</p>
          <p>Invoices are saved in this browser's local storage.</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "show" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={23} />
          </div>

          <div>
            <strong>FreelancePay</strong>
            <span>AI FINANCE PLATFORM</span>
          </div>
        </div>

        <div className="workspace">
          <span className="workspace-dot"></span>
          Personal Workspace
          <MoreHorizontal size={18} />
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                active === item.name ? "active" : ""
              }`}
              onClick={() => openPage(item.name)}
            >
              <item.icon size={19} />
              {item.name}

              {item.name === "Invoices" && (
                <span className="nav-count">
                  {invoices.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <p className="nav-label tools-label">PREFERENCES</p>

        <button
          className={`nav-item ${
            active === "Settings" ? "active" : ""
          }`}
          onClick={() => openPage("Settings")}
        >
          <Settings size={19} /> Settings
        </button>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <Sparkles size={20} />
            <strong>Work smarter with AI</strong>
            <p>
              Let AI help you manage your freelance finances.
            </p>
            <button onClick={() => openPage("AI Assistant")}>
              Explore AI <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="profile">
            <div className="avatar">A</div>
            <div>
              <strong>Aditya</strong>
              <span>Free Plan</span>
            </div>
            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{pageHeading[active]}</strong>
          </div>

          <div className="top-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search anything..." />
            </div>

            <button className="notification">
              <Bell size={19} />
              <i />
            </button>

            <div className="top-avatar">A</div>
          </div>
        </header>

        <div className="page-content">
          {active === "Overview" && renderDashboard()}
          {active === "Invoices" && renderInvoices()}
          {active === "Clients" && renderClients()}
          {active === "Payments" && renderPayments()}

          {(active === "Settings" || active === "AI Assistant") &&
            renderOtherPage()}

          <footer>
            © 2026 FreelancePay AI
            <span>Built for independent professionals</span>
          </footer>
        </div>
      </main>

      {showInvoiceForm && (
        <div className="modal-overlay">
          <div
            className="panel"
            style={{
              width: "min(450px, 95%)",
              padding: 24
            }}
          >
            <div className="panel-heading">
              <div>
                <h3>Create invoice</h3>
                <p>Enter your client and project details.</p>
              </div>

              <button
                className="icon-button"
                onClick={() => setShowInvoiceForm(false)}
              >
                <X />
              </button>
            </div>

            <form onSubmit={createInvoice}>
              <label>Client name</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                required
              />

              <label>Project name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                required
              />

              <label>Amount (USD)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />

              <button type="submit" className="primary-button">
                <Plus size={17} /> Save invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceTable({ invoices, onViewAll }) {
  return (
    <section className="panel invoice-panel">
      <div className="panel-heading">
        <div>
          <h3>Recent invoices</h3>
          <p>Keep track of your latest transactions</p>
        </div>

        <button className="view-all" onClick={onViewAll}>
          View all <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>INVOICE</th>
              <th>CLIENT</th>
              <th>PROJECT</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th>DATE</th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="invoice-id">{invoice.id}</td>
                <td>{invoice.client}</td>
                <td>{invoice.project}</td>
                <td className="amount">{invoice.amount}</td>
                <td>
                  <span className={`status ${invoice.status.toLowerCase()}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="date-cell">{invoice.date}</td>
              </tr>
            ))}

            {invoices.length === 0 && (
              <tr>
                <td colSpan="6">No invoices created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default App;
