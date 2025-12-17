import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, Trash2, Milk, User, Phone, Droplets, DollarSign, Wallet, MessageCircle, Pencil, Settings as SettingsIcon, Users, CheckCircle, Search, X, ChevronDown, ChevronUp, FileText, Download, Tag, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { Client, Sale, Payment, ViewState, TabState, DEFAULT_SETTINGS, PriceSettings, PriceType } from './types';
import { firestoreService } from './services/firestore';
import { AddClientModal, AddSaleModal, PayDebtModal, ConfirmModal, SuccessReceiptModal } from './components/Modals';
import { generateReceipt } from './services/pdfGenerator';

// Custom Payment Icon
const CustomPaymentIcon = ({ size = 20, className = "", strokeWidth = 2 }: { size?: number, className?: string, strokeWidth?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
    strokeWidth={strokeWidth}
  >
    {/* ... (código do ícone SVG permanece o mesmo) ... */}
  </svg>
);

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabState>('CLIENTS');
  const [clientView, setClientView] = useState<ViewState>('LIST');

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>(DEFAULT_SETTINGS);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Report State
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());

  // Selection State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Edit State
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [standardPriceInput, setStandardPriceInput] = useState('');
  const [customPriceInput, setCustomPriceInput] = useState('');

  // Receipt State
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ clientName: string, amount: number, sales: Sale[], date: string } | null>(null);

  // Delete State
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null);
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribeClients = firestoreService.listenToClients(setClients);
    const unsubscribeSales = firestoreService.listenToSales(setSales);
    const unsubscribePayments = firestoreService.listenToPayments(setPayments);

    const unsubscribeSettings = firestoreService.listenToPriceSettings((settings) => {
      if (settings) {
        setPriceSettings(settings);
        setStandardPriceInput(settings.standard.toString());
        setCustomPriceInput(settings.custom.toString());
      }
    });

    return () => {
      unsubscribeClients();
      unsubscribeSales();
      unsubscribePayments();
      unsubscribeSettings();
    };
  }, []);

  const clientBalances = useMemo(() => {
    const balances: { [key: string]: number } = {};
    clients.forEach(c => balances[c.id] = 0);

    sales.forEach(sale => {
      if (balances[sale.clientId] !== undefined) {
        balances[sale.clientId] += sale.totalValue;
      }
    });
    return balances;
  }, [clients, sales]);
