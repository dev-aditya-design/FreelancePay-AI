
import { useEffect, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, X, FileText,
  Download, CheckCircle2
} from "lucide-react";

const initialInvoices = [
  {
    id: "INV-2026-001",
    client: "Alex Morgan",
    project: "Website Development",
    amount: 2400,
    dueDate: "2026-11-15",
    status: "Paid"
  },
  {
    id: "INV-2026-002",
    client: "Sarah Wilson",
    project: "UI/UX Design",
    amount: 1250,
    dueDate: "2026-11-15",
    status: "Pending"
  },
  {
    id: "INV-2026-003",
    client: "James Cooper",
    project: "AI Automation",
    amount: 3800,
    dueDate: "2026-11-05",
    status: "Paid"
  },
  {
    id: "INV-2026-004",
    client: "Emma Davis",
    project: "Landing Page",
    amount: 850,
    dueDate: "2026-11-02",
    status: "Overdue"
  }
];

export default function InvoicePage() {
  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem("freelancepay_invoices");
      return saved ? JSON.parse(saved) : initialInvoices;
    } catch {
      return initialInvoices;
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    client: "",
    project: "",
    amount: "",
    dueDate: "",
    status: "Pending"
  });

  useEffect(() => {
    localStorage.setItem(
      "freelancepay_invoices",
      JSON.stringify(invoices)
    );
  }, [invoices]);

  const updateField = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      client: "",
      project: "",
      amount: "",
      dueDate: "",
      status: "Pending"
    });
    setShowForm(true);
  };

  const openEdit = (invoice) => {
    setEditingId(invoice.id);
    setForm({
      client: invoice.client,
      project: invoice.project,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status
    });
    setShowForm(true);
  };

  const saveInvoice = (e) => {
    e.preventDefault();

    if (
      !form.client.trim() ||
      !form.project.trim() ||
      !form.amount ||
      Number(form.amount) <= 0 ||
      !form.dueDate
    ) {
      alert("Please enter all valid invoice details.");
      return;
    }

    if (editingId) {
      setInvoices(prev =>
        prev.map(item =>
          item.id === editingId
            ? { ...item, ...form, amount: Number(form.amount) }
            : item
        )
      );
    } else {
      const newInvoice = {
        ...form,
        amount: Number(form.amount),
        id: `INV-${Date.now()}`
      };

      setInvoices(prev => [newInvoice, ...prev]);
    }

    setShowForm(false);
    setEditingId(null);
  };

  const deleteInvoice = (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      setInvoices(prev => prev.filter(item => item.id !== id));
    }
  };

  const togglePaid = (id) => {
    setInvoices(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: item.status === "Paid" ? "Pending" : "Paid" }
          : item
      )
    );
  };

  const getStatus = (invoice) => {
    if (invoice.status === "Paid") return "Paid";

    const today = new Date().toISOString().slice(0, 10);

    return invoice.dueDate < today ? "Overdue" : "Pending";
  };

  const filtered = invoices.filter(item =>
    `${item.id} ${item.client} ${item.project}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const total = invoices.reduce(
    (sum, item) => sum + Number(item.amount), 0
  );

  const pending = invoices
    .filter(item => getStatus(item) !== "Paid")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const paid = invoices
    .filter(item => getStatus(item) === "Paid")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const exportCSV = () => {
    const rows = [
      ["Invoice ID", "Client", "Project", "Amount", "Due Date", "Status"],
      ...invoices.map(item => [
        item.id,
        item.client,
        item.project,
        item.amount,
        item.dueDate,
        getStatus(item)
      ])
    ];

    const csv = rows.map(row =>
      row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "freelancepay-invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="invoice-page">
      <div className="invoice-page-heading">
        <div>
          <p className="eyebrow">WORKSPACE / FINANCE</p>
          <h1>Invoices</h1>
          <p className="subtitle">
            Create, manage and track your client invoices.
          </p>
        </div>

        <div className="invoice-actions">
          <button className="invoice-secondary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="primary-button" onClick={openCreate}>
            <Plus size={17} /> Create invoice
          </button>
        </div>
      </div>

      <div className="invoice-stats">
        <div className="invoice-stat">
          <span>Total invoices</span>
          <h2>{invoices.length}</h2>
        </div>
        <div className="invoice-stat">
          <span>Total amount</span>
          <h2>${total.toLocaleString("en-US")}</h2>
        </div>
        <div className="invoice-stat">
          <span>Collected</span>
          <h2 className="collected">${paid.toLocaleString("en-US")}</h2>
        </div>
        <div className="invoice-stat">
          <span>Outstanding</span>
          <h2 className="outstanding">${pending.toLocaleString("en-US")}</h2>
        </div>
      </div>

      <section className="panel invoice-manager">
        <div className="panel-heading">
          <div>
            <h3>All invoices</h3>
            <p>Manage your client billing records</p>
          </div>

          <div className="invoice-search">
            <Search size={16} />
            <input
              placeholder="Search invoices..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>INVOICE</th>
                <th>CLIENT</th>
                <th>PROJECT</th>
                <th>AMOUNT</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(invoice => {
                const status = getStatus(invoice);

                return (
                  <tr key={invoice.id}>
                    <td className="invoice-id">{invoice.id}</td>
                    <td>{invoice.client}</td>
                    <td>{invoice.project}</td>
                    <td className="amount">
                      ${Number(invoice.amount).toLocaleString("en-US")}
                    </td>
                    <td>{invoice.dueDate}</td>
                    <td>
                      <span className={`status ${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <div className="invoice-row-actions">
                        <button
                          title="Edit invoice"
                          onClick={() => openEdit(invoice)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          title={status === "Paid" ? "Mark pending" : "Mark paid"}
                          onClick={() => togglePaid(invoice.id)}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          title="Delete invoice"
                          onClick={() => deleteInvoice(invoice.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-invoices">
                    <FileText size={28} />
                    <p>No invoices found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="invoice-modal-overlay">
          <div className="invoice-modal">
            <div className="invoice-modal-heading">
              <div>
                <h2>{editingId ? "Edit invoice" : "Create new invoice"}</h2>
                <p>Enter your billing details below.</p>
              </div>
              <button
                className="close-modal"
                onClick={() => setShowForm(false)}
              >
                <X />
              </button>
            </div>

            <form onSubmit={saveInvoice}>
              <label>Client name</label>
              <input
                name="client"
                value={form.client}
                onChange={updateField}
                placeholder="e.g. John Smith"
                required
              />

              <label>Project name</label>
              <input
                name="project"
                value={form.project}
                onChange={updateField}
                placeholder="e.g. Website Development"
                required
              />

              <label>Invoice amount (USD)</label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={updateField}
                placeholder="e.g. 1200"
                required
              />

              <label>Due date</label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={updateField}
                required
              />

              <label>Payment status</label>
              <select
                name="status"
                value={form.status}
                onChange={updateField}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>

              <div className="invoice-form-actions">
                <button
                  type="button"
                  className="invoice-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? "Save changes" : "Save invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
