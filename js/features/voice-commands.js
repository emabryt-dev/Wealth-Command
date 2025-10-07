// Wealth Command Pro - Voice Commands Module
class VoiceCommandManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.commands = new Map();
        this.transcript = '';
        
        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        this.setupSpeechRecognition();
        this.registerDefaultCommands();
        // The setupVoiceInterface() is no longer needed as the HTML is static
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        this.recognition.onstart = () => {
            this.isListening = true;
            this.onListeningStart();
        };

        this.recognition.onresult = (event) => {
            this.handleRecognitionResult(event);
        };
        this.recognition.onerror = (event) => {
            this.handleRecognitionError(event);
        };
        this.recognition.onend = () => {
            this.isListening = false;
            this.onListeningEnd();
        };
    }

    // --- REMOVED SECTION ---
    // The setupVoiceInterface() and createVoiceInterface() methods were removed
    // because the HTML is now part of the main index.html file.

    // Public methods
    showInterface() {
        const interfaceEl = document.getElementById('voiceInterface');
        if (interfaceEl) {
            interfaceEl.classList.remove('d-none');
            // Assuming an animation manager exists for a smooth entry
            window.animationManager?.animateToastShow(interfaceEl);
        }
    }

    hideInterface() {
        const interfaceEl = document.getElementById('voiceInterface');
        if (interfaceEl) {
            // Assuming an animation manager exists for a smooth exit
            window.animationManager?.animateToastHide(interfaceEl);
            setTimeout(() => {
                interfaceEl.classList.add('d-none');
            }, 300);
        }
        
        if (this.isListening) {
            this.stopListening();
        }
    }

    registerDefaultCommands() {
        // Transaction commands
        this.registerCommand('add income', this.handleAddIncome.bind(this));
        this.registerCommand('add expense', this.handleAddExpense.bind(this));
        this.registerCommand('record income', this.handleAddIncome.bind(this));
        this.registerCommand('record expense', this.handleAddExpense.bind(this));
        
        // Query commands
        this.registerCommand('show balance', this.handleShowBalance.bind(this));
        this.registerCommand('what is my balance', this.handleShowBalance.bind(this));
        this.registerCommand('how much money do I have', this.handleShowBalance.bind(this));
        
        this.registerCommand('show spending', this.handleShowSpending.bind(this));
        this.registerCommand('how much did I spend', this.handleShowSpending.bind(this));
        this.registerCommand('spending report', this.handleShowSpending.bind(this));
        
        this.registerCommand('budget status', this.handleBudgetStatus.bind(this));
        this.registerCommand('how is my budget', this.handleBudgetStatus.bind(this));
        
        // Navigation commands
        this.registerCommand('go to dashboard', () => this.navigateTo('dashboard'));
        this.registerCommand('show dashboard', () => this.navigateTo('dashboard'));
        this.registerCommand('go to transactions', () => this.navigateTo('transactions'));
        this.registerCommand('show transactions', () => this.navigateTo('transactions'));
        this.registerCommand('go to analytics', () => this.navigateTo('analytics'));
        this.registerCommand('show analytics', () => this.navigateTo('analytics'));
        this.registerCommand('go to planner', () => this.navigateTo('planner'));
        this.registerCommand('show planner', () => this.navigateTo('planner'));
        
        // Utility commands
        this.registerCommand('help', this.handleHelp.bind(this));
        this.registerCommand('what can I say', this.handleHelp.bind(this));
    }

    registerCommand(phrase, handler, options = {}) {
        this.commands.set(phrase.toLowerCase(), {
            handler,
            description: options.description || '',
            examples: options.examples || []
        });
    }

    setupVoiceInterface() {
        // Create voice interface if it doesn't exist
        if (!document.getElementById('voiceInterface')) {
            this.createVoiceInterface();
        }
    }

    createVoiceInterface() {
        const voiceHTML = `
            <div id="voiceInterface" class="voice-interface d-none">
                <div class="voice-modal">
                    <div class="voice-header">
                        <i class="bi bi-mic-fill voice-icon"></i>
                        <h5>Voice Command</h5>
                        <button class="btn-close voice-close" onclick="voiceCommandManager.hideInterface()"></button>
                    </div>
                    <div class="voice-body">
                        <div class="voice-visualizer">
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                        </div>
                        <p class="voice-instruction">Say something like "Add income of 5000 from salary"</p>
                        <div id="voiceTranscript" class="voice-transcript"></div>
                    </div>
                    <div class="voice-footer">
                        <button class="btn btn-primary btn-lg voice-action-btn" onclick="voiceCommandManager.toggleListening()">
                            <i class="bi bi-mic"></i> Start Listening
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', voiceHTML);
    }

    // Public methods
showInterface() {
    const voiceUI = document.getElementById('voiceInterface');
    if (voiceUI) {
        voiceUI.classList.remove('d-none');
        window.animationManager?.animateToastShow(voiceUI);
    }
}

    hideInterface() {
        const interface = document.getElementById('voiceInterface');
        if (interface) {
            window.animationManager?.animateToastHide(interface);
            setTimeout(() => {
                interface.classList.add('d-none');
            }, 300);
        }
        
        if (this.isListening) {
            this.stopListening();
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.isSupported) {
            window.showToast('Voice commands not supported in your browser', 'warning');
            return;
        }

        try {
            this.recognition.start();
            this.updateVoiceUI('listening');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            window.showToast('Error starting voice recognition', 'error');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Event handlers
    onListeningStart() {
        this.updateVoiceUI('listening');
        this.transcript = '';
        this.updateTranscript('');
    }

    onListeningEnd() {
        this.updateVoiceUI('idle');
        
        // Process the final transcript
        if (this.transcript.trim()) {
            this.processCommand(this.transcript);
        }
    }

    handleRecognitionResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            this.transcript = finalTranscript;
            this.updateTranscript(finalTranscript, true);
        } else if (interimTranscript) {
            this.updateTranscript(interimTranscript, false);
        }
    }

    handleRecognitionError(event) {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Voice recognition error: ';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone found. Please check your microphone.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error occurred. Please check your connection.';
                break;
            default:
                errorMessage = `Recognition error: ${event.error}`;
        }

        window.showToast(errorMessage, 'error');
        this.updateVoiceUI('error');
    }

    // Command processing
    async processCommand(transcript) {
        const normalized = transcript.toLowerCase().trim();
        
        // Find matching command
        let matchedCommand = null;
        let matchedPhrase = '';

        for (const [phrase, command] of this.commands) {
            if (normalized.includes(phrase)) {
                matchedCommand = command;
                matchedPhrase = phrase;
                break;
            }
        }

        if (matchedCommand) {
            try {
                const result = await matchedCommand.handler(transcript, matchedPhrase);
                this.showCommandResult(result);
            } catch (error) {
                console.error('Error executing command:', error);
                this.showCommandResult({
                    success: false,
                    message: 'Error executing command. Please try again.'
                });
            }
        } else {
            // Try AI processing for natural language
            await this.processNaturalLanguage(transcript);
        }
    }

    async processNaturalLanguage(transcript) {
        if (window.aiEngine) {
            try {
                const result = await window.aiEngine.processVoiceCommand(transcript);
                this.showCommandResult(result);
            } catch (error) {
                console.error('AI command processing failed:', error);
                this.showCommandResult({
                    success: false,
                    message: "I didn't understand that command. Try saying 'Add income of 5000 from salary' or 'Show my balance'."
                });
            }
        } else {
            this.showCommandResult({
                success: false,
                message: "I didn't understand that command. Try saying 'Add income of 5000 from salary' or 'Show my balance'."
            });
        }
    }

    // Command handlers
    handleAddIncome(transcript, matchedPhrase) {
        return this.processAddTransaction(transcript, 'income');
    }

    handleAddExpense(transcript, matchedPhrase) {
        return this.processAddTransaction(transcript, 'expense');
    }

    async processAddTransaction(transcript, type) {
        // Extract amount using regex
        const amountMatch = transcript.match(/(\d+(?:\.\d{2})?)/);
        if (!amountMatch) {
            return {
                success: false,
                message: `Please specify an amount for the ${type}.`
            };
        }

        const amount = parseFloat(amountMatch[1]);
        
        // Extract description by removing command words and amount
        let description = transcript
            .replace(/(add|record|log|income|expense|salary|payment|\d+(?:\.\d{2})?)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!description) {
            description = `${type} from voice command`;
        }

        // Determine category
        const category = await this.determineCategory(description, amount, type);

        // Create transaction
        const transaction = {
            date: new Date().toISOString().split('T')[0],
            desc: description,
            type: type,
            category: category,
            amount: amount
        };

        if (window.stateManager) {
            window.stateManager.addTransaction(transaction);
        }

        return {
            success: true,
            message: `Added ${type} of ${amount} for ${description}`,
            transaction: transaction
        };
    }

    async determineCategory(description, amount, type) {
        if (window.aiEngine) {
            try {
                const category = await window.aiEngine.categorizeTransaction(description, amount);
                return category;
            } catch (error) {
                console.error('AI categorization failed:', error);
            }
        }

        // Fallback to simple keyword matching
        const desc = description.toLowerCase();
        const categories = window.stateManager?.state.categories?.filter(cat => cat.type === type) || [];

        for (const category of categories) {
            if (desc.includes(category.name.toLowerCase())) {
                return category.name;
            }
        }

        return type === 'income' ? 'Salary' : 'General';
    }

    handleShowBalance(transcript, matchedPhrase) {
        if (!window.stateManager) {
            return {
                success: false,
                message: 'Application not ready. Please try again.'
            };
        }

        const summary = window.stateManager.getMonthlySummary();
        const message = `Your current balance is ${summary.endingBalance}. ` +
                       `This month you've earned ${summary.income} and spent ${summary.expenses}.`;

        return {
            success: true,
            message: message,
            data: summary
        };
    }

    handleShowSpending(transcript, matchedPhrase) {
        if (!window.stateManager) {
            return {
                success: false,
                message: 'Application not ready. Please try again.'
            };
        }

        const transactions = window.stateManager.getFilteredTransactions();
        const expenses = transactions.filter(tx => tx.type === 'expense');
        const totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
        
        const categoryBreakdown = {};
        expenses.forEach(tx => {
            categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
        });

        const topCategory = Object.entries(categoryBreakdown)
            .sort(([,a], [,b]) => b - a)[0];

        let message = `You've spent ${totalSpent} this period.`;
        if (topCategory) {
            message += ` Your top spending category is ${topCategory[0]} at ${topCategory[1]}.`;
        }

        return {
            success: true,
            message: message,
            data: { totalSpent, categoryBreakdown }
        };
    }

    handleBudgetStatus(transcript, matchedPhrase) {
        if (!window.stateManager) {
            return {
                success: false,
                message: 'Application not ready. Please try again.'
            };
        }

        const summary = window.stateManager.getMonthlySummary();
        const currentMonth = window.stateManager.getCurrentMonthKey();
        const budget = window.stateManager.state.monthlyBudgets[currentMonth];
        
        if (!budget) {
            return {
                success: true,
                message: "You haven't set a budget for this month yet."
            };
        }

        const remaining = (budget.startingBalance || 0) + summary.income - summary.expenses;
        const status = remaining >= 0 ? 'on track' : 'over budget';

        let message = `You're ${status} for this month. `;
        if (remaining >= 0) {
            message += `You have ${remaining} remaining in your budget.`;
        } else {
            message += `You are ${Math.abs(remaining)} over budget.`;
        }

        return {
            success: true,
            message: message,
            data: { remaining, status }
        };
    }

    navigateTo(tab) {
        if (window.showTab) {
            window.showTab(tab);
            return {
                success: true,
                message: `Navigating to ${tab}`,
                action: 'navigate'
            };
        } else {
            return {
                success: false,
                message: 'Navigation not available'
            };
        }
    }

    handleHelp(transcript, matchedPhrase) {
        const commands = Array.from(this.commands.entries()).slice(0, 8); // Show first 8 commands
        
        let message = "Here are some things you can say:\n";
        commands.forEach(([phrase]) => {
            message += `• "${phrase}"\n`;
        });
        message += "\nYou can also use natural language like 'How much did I spend on food this month?'";

        return {
            success: true,
            message: message,
            action: 'help'
        };
    }

    // UI updates
    updateVoiceUI(state) {
        const actionBtn = document.querySelector('.voice-action-btn');
        const visualizer = document.querySelector('.voice-visualizer');
        
        if (!actionBtn || !visualizer) return;

        switch (state) {
            case 'listening':
                actionBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Listening...';
                actionBtn.classList.add('listening');
                visualizer.classList.add('active');
                break;
            case 'idle':
                actionBtn.innerHTML = '<i class="bi bi-mic"></i> Start Listening';
                actionBtn.classList.remove('listening');
                visualizer.classList.remove('active');
                break;
            case 'error':
                actionBtn.innerHTML = '<i class="bi bi-mic"></i> Try Again';
                actionBtn.classList.remove('listening');
                visualizer.classList.remove('active');
                break;
        }
    }

    updateTranscript(text, isFinal = false) {
        const transcriptElement = document.getElementById('voiceTranscript');
        if (transcriptElement) {
            transcriptElement.textContent = text;
            if (isFinal) {
                transcriptElement.classList.add('final');
            } else {
                transcriptElement.classList.remove('final');
            }
        }
    }

    showCommandResult(result) {
        if (result.success) {
            window.showToast(result.message, 'success');
            
            // Perform any additional actions
            if (result.action === 'navigate') {
                // Navigation is handled by the command itself
            }
            
            // Close voice interface after successful command
            setTimeout(() => {
                this.hideInterface();
            }, 1500);
        } else {
            window.showToast(result.message, 'error');
        }
    }

    // Utility methods
    getSupportedCommands() {
        return Array.from(this.commands.entries()).map(([phrase, command]) => ({
            phrase,
            description: command.description,
            examples: command.examples
        }));
    }

    isAvailable() {
        return this.isSupported;
    }

    getStatus() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            isAvailable: this.isAvailable()
        };
    }
}

// Create global voice command manager instance
window.voiceCommandManager = new VoiceCommandManager();
