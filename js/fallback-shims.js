// fallback-shims.js
// Lightweight defensive fallbacks for Wealth Command Pro
(function(){
  // Safe console
  if (!window.console) window.console = { log: ()=>{}, warn: ()=>{}, error: ()=>{} };

  // Format currency fallback (PKR default) - used by many modules
  window.formatCurrency = window.formatCurrency || function(amount){
    try {
      const currency = (window.stateManager && window.stateManager.state && window.stateManager.state.currency) || 'PKR';
      return new Intl.NumberFormat('en', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(Number(amount) || 0);
    } catch (e) {
      return String(amount);
    }
  };

  // Minimal showToast
  window.showToast = window.showToast || function(message='OK', type='info'){
    console.log('[toast]', type, message);
    // create a simple toast in DOM if desired
    try {
      const container = document.getElementById('toastContainer');
      if (container) {
        const t = document.createElement('div');
        t.className = 'fallback-toast';
        t.textContent = message;
        container.appendChild(t);
        setTimeout(()=> t.remove(), 4000);
      }
    } catch(e){/*noop*/}
  };

  // Simple confirmation modal that returns Promise<boolean>
  window.showConfirmationModal = window.showConfirmationModal || function(title, message, ok='OK', cancel='Cancel'){
    return new Promise((resolve) => {
      try {
        const confirmed = confirm(title ? (title + '\n\n' + message) : message);
        resolve(Boolean(confirmed));
      } catch (e) { resolve(false); }
    });
  };

  // Basic dataPersistence fallback using localStorage
  window.dataPersistence = window.dataPersistence || {
    dbName: 'wc_fallback_db',
    async init(){ console.log('dataPersistence: using localStorage fallback'); },
    async loadAppState(){
      try { return JSON.parse(localStorage.getItem('wc_state') || 'null'); } catch(e){ return null; }
    },
    async saveAppState(state){
      try { localStorage.setItem('wc_state', JSON.stringify(state)); } catch(e){ console.warn('save failed', e); }
    },
    cleanupOldData(){ /*noop*/ }
  };

  // Minimal stateManager if missing (keeps app running)
  if (!window.stateManager) {
    window.stateManager = {
      state: { transactions: [], categories: [], monthlyBudgets: {}, currency: 'PKR' },
      setState(obj){ this.state = Object.assign({}, this.state, obj); },
      getMonthlySummary(){
        const tx = this.state.transactions || [];
        const income = tx.filter(t=>t.type==='income').reduce((s,t)=>s+(+t.amount||0),0);
        const expenses = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+(+t.amount||0),0);
        return { income, expenses, endingBalance: income - expenses };
      },
      addTransaction(t){ t.id = t.id || `tx_${Date.now()}`; this.state.transactions = this.state.transactions || []; this.state.transactions.push(t); },
      deleteTransaction(id){ this.state.transactions = (this.state.transactions||[]).filter(x => x.id !== id); },
      getCurrentMonthKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
      getFilteredTransactions(){ return this.state.transactions || []; }
    };
    console.log('stateManager: fallback installed');
  }

  // AI Engine minimal stub
  if (!window.aiEngine) {
    window.aiEngine = {
      isInitialized: false,
      async initialize(){ this.isInitialized = true; console.log('aiEngine fallback init'); },
      async generateInsights(){ return { insights: [], metrics: {} }; },
      async categorizeTransaction(){ return 'General'; },
      async predictSpending(){ return { amount:0, confidence:0, trend:0, message:'no data' }; },
      processVoiceCommand(command){ return { success:false, message: "AI fallback: command not supported." }; },
      processAddTransaction(){ return { success:false, message: "AI fallback" }; }
    };
  }

  // Analytics Engine stub
  if (!window.analyticsEngine) {
    window.analyticsEngine = {
      prepareChartData: function(){ return { labels: [], datasets: [] }; },
      clearCache: function(){},
      calculateHealthScore: function(){ return 50; },
      analyzeSpendingPatterns: function(){ return {}; }
    };
  }

  // Chart manager small wrapper for Chart.js if available; otherwise stub
  if (!window.chartManager) {
    window.chartManager = {
      _charts: new Map(),
      initializeCharts(){ /*noop*/ },
      createChart(el, type, data){
        try {
          if (!el) return;
          // if Chart.js is present, attempt to create; else render simple placeholder text
          if (window.Chart) {
            // destroy previous if exists
            if (this._charts.get(el)) { this._charts.get(el).destroy(); }
            const ctx = el.getContext('2d');
            const c = new Chart(ctx, { type: type, data: data, options: {} });
            this._charts.set(el, c);
            return c;
          } else {
            el.innerHTML = '<div class="chart-placeholder">Chart (' + type + ')</div>';
          }
        } catch (e) {
          console.warn('chartManager.createChart error', e);
        }
      }
    };
  }

  // Modal manager minimal
  if (!window.modalManager) {
    window.modalManager = {
      showAddTransactionModal(type){ alert('Show add transaction modal: ' + type); },
      showEditTransactionModal(transaction, index){ alert('Edit transaction: ' + (transaction?.desc || index)); }
    };
  }

  // Animation manager shim
  if (!window.animationManager) {
    window.animationManager = {
      init(){},
      animateFABOpen(fab, menu){ try { fab.classList.add('open'); menu.classList.add('open'); } catch(e){} },
      animateFABClose(fab, menu){ try { fab.classList.remove('open'); menu.classList.remove('open'); } catch(e){} }
    };
  }

  // Notification / voice / sync stubs
  window.notificationManager = window.notificationManager || { notify(){ console.log('notify'); } };
  window.voiceCommandManager = window.voiceCommandManager || { showInterface(){ console.log('voice ui'); } };
  window.syncEngine = window.syncEngine || { getSyncStats(){ return 'fallback'; }, syncData: async ()=>{ console.log('sync fallback'); } };

  // Ensure global app variable won't throw when used in inline handlers before creation
  if (!window.wealthCommandApp) {
    // Temporary proxy that queues calls until real app exists
    const queue = [];
    const proxy = new Proxy(function(){}, {
      get(target, prop){ 
        if (prop === 'isProxy') return true;
        return function(...args){ queue.push({ prop, args }); console.warn('wealthCommandApp proxy called before init:', prop); };
      }
    });
    window.wealthCommandApp = proxy;
    // When real app is created, it should flush queued calls manually if desired.
    // We'll add a small helper to flush if an app attaches itself:
    Object.defineProperty(window.wealthCommandApp, '__flushQueue', {
      value: function(realApp){
        try {
          if (!Array.isArray(queue) || !realApp) return;
          queue.forEach(item => { try { if (typeof realApp[item.prop] === 'function') realApp[item.prop](...item.args); } catch(e){ console.warn('flush call failed', item.prop, e); } });
        } catch(e){}
      },
      writable: false, configurable: false
    });
  }

  // Cosmetic: add small CSS for fallback toast & chart placeholder
  const styleId = 'wc-fallback-styles';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .fallback-toast{ background:#222;color:#fff;padding:8px;border-radius:6px;margin:6px;opacity:0.95; }
      .chart-placeholder{ padding:16px;background:#f5f5f5;border-radius:8px;color:#666;text-align:center; }
    `;
    document.head.appendChild(s);
  }

  console.log('Wealth Command Pro: fallback shims loaded.');
})();
