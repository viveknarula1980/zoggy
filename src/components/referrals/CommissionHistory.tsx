"use client";

import { useState } from "react";
import { History, Download, ArrowUpRight, ArrowDownLeft, Calendar, Filter } from "lucide-react";

interface CommissionHistoryItem {
  id: string;
  type: "received" | "withdrawn";
  amount: number;
  date: string;
  time: string;
  game?: string;
  referralUser?: string;
  transactionId?: string;
  status: "completed" | "pending" | "failed";
}

// Mock data for commission history
const mockCommissionHistory: CommissionHistoryItem[] = [
  {
    id: "1",
    type: "withdrawn",
    amount: 125.50,
    date: "2024-10-28",
    time: "14:30",
    transactionId: "TXN123456789",
    status: "completed"
  },
  {
    id: "2",
    type: "received",
    amount: 45.25,
    date: "2024-10-28",
    time: "12:15",
    game: "Crash",
    referralUser: "user_abc123",
    status: "completed"
  },
  {
    id: "3",
    type: "received",
    amount: 32.80,
    date: "2024-10-27",
    time: "18:45",
    game: "Slots",
    referralUser: "user_def456",
    status: "completed"
  },
  {
    id: "4",
    type: "withdrawn",
    amount: 200.00,
    date: "2024-10-26",
    time: "09:20",
    transactionId: "TXN987654321",
    status: "pending"
  },
  {
    id: "5",
    type: "received",
    amount: 78.90,
    date: "2024-10-26",
    time: "16:30",
    game: "Mines",
    referralUser: "user_ghi789",
    status: "completed"
  },
  {
    id: "6",
    type: "received",
    amount: 15.60,
    date: "2024-10-25",
    time: "11:10",
    game: "Dice",
    referralUser: "user_jkl012",
    status: "completed"
  },
  {
    id: "7",
    type: "withdrawn",
    amount: 89.75,
    date: "2024-10-24",
    time: "13:45",
    transactionId: "TXN456789123",
    status: "failed"
  },
  {
    id: "8",
    type: "received",
    amount: 156.40,
    date: "2024-10-24",
    time: "20:25",
    game: "Plinko",
    referralUser: "user_mno345",
    status: "completed"
  }
];

export default function CommissionHistory() {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  const filteredHistory = mockCommissionHistory.filter(item => {
    if (selectedType === "all") return true;
    return item.type === selectedType;
  });

  const totalReceived = mockCommissionHistory
    .filter(item => item.type === "received" && item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalWithdrawn = mockCommissionHistory
    .filter(item => item.type === "withdrawn" && item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400";
      case "pending": return "text-yellow-400";
      case "failed": return "text-red-400";
      default: return "text-soft";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "received" ? (
      <ArrowDownLeft className="text-green-400" size={16} />
    ) : (
      <ArrowUpRight className="text-blue-400" size={16} />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="text-purple-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Commission History</h2>
        </div>
        <div className="flex items-center gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-soft" />
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)} 
              className="bg-glass-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Types</option>
              <option value="received">Received</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-soft" />
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)} 
              className="bg-glass-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/40 rounded-lg text-purple-400 hover:bg-purple-600/30 transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <ArrowDownLeft className="text-green-400" size={20} />
            <span className="text-soft text-sm">Total Received</span>
          </div>
          <div className="text-2xl font-bold text-green-400">${totalReceived.toFixed(2)}</div>
        </div>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpRight className="text-blue-400" size={20} />
            <span className="text-soft text-sm">Total Withdrawn</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">${totalWithdrawn.toFixed(2)}</div>
        </div>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <History className="text-purple-400" size={20} />
            <span className="text-soft text-sm">Available Balance</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">${(totalReceived - totalWithdrawn).toFixed(2)}</div>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-soft font-medium">Type</th>
                <th className="text-left p-4 text-soft font-medium">Amount</th>
                <th className="text-left p-4 text-soft font-medium">Date & Time</th>
                <th className="text-left p-4 text-soft font-medium">Details</th>
                <th className="text-left p-4 text-soft font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <span className="text-white font-medium capitalize">{item.type}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${item.type === 'received' ? 'text-green-400' : 'text-blue-400'}`}>
                      ${item.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-white">{item.date}</div>
                    <div className="text-soft text-sm">{item.time}</div>
                  </td>
                  <td className="p-4">
                    {item.type === 'received' ? (
                      <div>
                        <div className="text-white text-sm">{item.game}</div>
                        <div className="text-soft text-xs">from {item.referralUser}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-white text-sm">Withdrawal</div>
                        <div className="text-soft text-xs">{item.transactionId}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)} bg-current/10`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredHistory.length === 0 && (
          <div className="p-8 text-center">
            <History className="mx-auto text-soft mb-4" size={48} />
            <h3 className="text-white font-semibold mb-2">No Commission History</h3>
            <p className="text-soft">No commission transactions found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
