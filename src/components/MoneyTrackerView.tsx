import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { MoneyRecord } from '../types/clearspace';
import { shiftDateString } from '../utils/logic';
import { WashiLabel } from './ScrapbookAccents';
import { Edit3, Plus, Trash2 } from 'lucide-react';

const EXPENSE_CATEGORIES = ['Food', 'Study & Books', 'Transport', 'Living', 'Health', 'Leisure', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Allowance', 'Scholarship', 'Refund', 'Other'];
const PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'Bank Transfer'];

export function MoneyTrackerView() {
  const { todayDate, preferences, incomes, expenses, saveIncome, deleteIncome, saveExpense, deleteExpense } = useData();

  const [monthFilter, setMonthFilter] = useState(todayDate.slice(0, 7));
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(todayDate);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!title.trim() || Number.isNaN(num) || num <= 0) return;
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      title: title.trim(),
      amount: num,
      category,
      paymentMethod,
      date,
      notes: notes.trim(),
    };
    if (recordType === 'expense') {
      await saveExpense(payload);
    } else {
      await saveIncome(payload);
    }
    setEditingId(null);
    setTitle('');
    setAmount('');
    setNotes('');
  };

  const startEdit = (type: 'expense' | 'income', rec: MoneyRecord) => {
    setRecordType(type);
    setEditingId(rec.id);
    setTitle(rec.title);
    setAmount(String(rec.amount));
    setCategory(rec.category);
    setPaymentMethod(rec.paymentMethod);
    setDate(rec.date);
    setNotes(rec.notes || '');
  };

  const monthlyIncomes = useMemo(() => incomes.filter((i) => i.date.startsWith(monthFilter)), [incomes, monthFilter]);
  const monthlyExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(monthFilter)), [expenses, monthFilter]);

  const totalIncome = monthlyIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
  const netSavings = totalIncome - totalExpenses;

  const weekStart = shiftDateString(todayDate, -6);
  const weeklyExpenseTotal = expenses
    .filter((e) => e.date >= weekStart && e.date <= todayDate)
    .reduce((s, e) => s + e.amount, 0);
  const weeklyIncomeTotal = incomes
    .filter((i) => i.date >= weekStart && i.date <= todayDate)
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <section className="cs-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <WashiLabel>Money Tracker</WashiLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Income, expenses &amp; savings</h1>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="money-month" className="text-xs font-medium">
              Month:
            </label>
            <input
              id="money-month"
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="cs-input px-3 py-2 rounded-xl text-xs font-mono-num"
            />
          </div>
        </div>

        {/* Monthly & Weekly Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Monthly Income</div>
            <div className="font-mono-num text-xl font-semibold">
              {preferences.currency} {totalIncome.toLocaleString()}
            </div>
          </div>
          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Monthly Expenses</div>
            <div className="font-mono-num text-xl font-semibold">
              {preferences.currency} {totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Net Savings</div>
            <div className="font-mono-num text-xl font-semibold" style={{ color: netSavings >= 0 ? 'var(--cs-accent)' : '#DC2626' }}>
              {preferences.currency} {netSavings.toLocaleString()}
            </div>
          </div>
          <div className="cs-surface-muted rounded-2xl p-4 space-y-1">
            <div className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>Last 7 Days</div>
            <div className="font-mono-num text-xs font-medium">
              +{weeklyIncomeTotal.toLocaleString()} / -{weeklyExpenseTotal.toLocaleString()} {preferences.currency}
            </div>
          </div>
        </div>

        {/* Add / Edit Transaction Form */}
        <form onSubmit={handleSubmit} className="cs-surface-muted rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRecordType('expense');
                setCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                recordType === 'expense' ? 'cs-btn-primary' : 'cs-card'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordType('income');
                setCategory(INCOME_CATEGORIES[0]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                recordType === 'income' ? 'cs-btn-primary' : 'cs-card'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3 space-y-1">
              <label htmlFor="mny-title" className="block text-xs font-medium">Title</label>
              <input
                id="mny-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Groceries, Stipend..."
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="mny-amt" className="block text-xs font-medium">Amount ({preferences.currency})</label>
              <input
                id="mny-amt"
                type="number"
                required
                min={1}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm font-mono-num"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="mny-cat" className="block text-xs font-medium">Category</label>
              <select
                id="mny-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              >
                {(recordType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="mny-pay" className="block text-xs font-medium">Payment</label>
              <select
                id="mny-pay"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="cs-input w-full px-3 py-2 rounded-xl text-sm"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="mny-date" className="block text-xs font-medium">Date</label>
              <input
                id="mny-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="cs-input w-full px-2.5 py-2 rounded-xl text-xs font-mono-num"
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                aria-label={editingId ? 'Save entry' : 'Add entry'}
                className="cs-btn-primary w-full py-2.5 rounded-xl flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="cs-card rounded-3xl p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Expenses ({monthlyExpenses.length})</h2>
          {monthlyExpenses.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>No expenses logged for {monthFilter}.</p>
          ) : (
            <div className="space-y-2">
              {monthlyExpenses.map((e) => (
                <div key={e.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-sm">{e.title}</div>
                    <div style={{ color: 'var(--cs-text-muted)' }}>
                      {e.date} · {e.category} · {e.paymentMethod}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-semibold text-sm">
                      -{preferences.currency} {e.amount.toLocaleString()}
                    </span>
                    <button type="button" onClick={() => startEdit('expense', e)} aria-label={`Edit ${e.title}`} className="p-1.5 rounded-lg cs-card cursor-pointer">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteExpense(e.id)} aria-label={`Delete ${e.title}`} className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cs-card rounded-3xl p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Income ({monthlyIncomes.length})</h2>
          {monthlyIncomes.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>No income logged for {monthFilter}.</p>
          ) : (
            <div className="space-y-2">
              {monthlyIncomes.map((i) => (
                <div key={i.id} className="cs-surface-muted rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-sm">{i.title}</div>
                    <div style={{ color: 'var(--cs-text-muted)' }}>
                      {i.date} · {i.category} · {i.paymentMethod}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-semibold text-sm" style={{ color: 'var(--cs-accent)' }}>
                      +{preferences.currency} {i.amount.toLocaleString()}
                    </span>
                    <button type="button" onClick={() => startEdit('income', i)} aria-label={`Edit ${i.title}`} className="p-1.5 rounded-lg cs-card cursor-pointer">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteIncome(i.id)} aria-label={`Delete ${i.title}`} className="p-1.5 rounded-lg cs-card text-red-600 dark:text-red-400 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
