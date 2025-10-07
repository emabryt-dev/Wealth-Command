// Wealth Command Pro - Categories Management
class CategoryManager {
    constructor() {
        this.currentEditId = null;
        // ... (rest of constructor is the same)
    }

    init() {
        this.ensureDefaultCategories();
        this.setupEventListeners();
        this.renderCategoryList();
    }

    // --- REFACTORED MODAL METHOD ---
    showCategoryModal(categoryData, title) {
        const modalId = 'categoryModal';
        const formId = 'categoryForm';
        const formHTML = `
            <form id="${formId}" autocomplete="off">
                <div class="row g-3">
                    <div class="col-12">
                        <label for="categoryName" class="form-label">Category Name</label>
                        <input type="text" class="form-control" id="categoryName" name="name" value="${this.escapeHTML(categoryData.name || '')}" required>
                    </div>
                    <div class="col-md-6">
                        <label for="categoryType" class="form-label">Type</label>
                        <select class="form-select" id="categoryType" name="type" required>
                            <option value="income" ${categoryData.type === 'income' ? 'selected' : ''}>Income</option>
                            <option value="expense" ${categoryData.type === 'expense' ? 'selected' : ''}>Expense</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="categoryColor" class="form-label">Color</label>
                        <input type="color" class="form-control form-control-color" id="categoryColor" name="color" value="${categoryData.color || this.generateRandomColor()}" title="Choose color">
                    </div>
                    <div class="col-12">
                        <label for="categoryIcon" class="form-label">Icon</label>
                        <select class="form-select" id="categoryIcon" name="icon" required>
                            <option value="">Select an icon</option>
                            ${this.generateIconOptions(categoryData.icon)}
                        </select>
                    </div>
                    <div class="col-12">
                        <div id="categoryFormAlert" class="alert alert-danger d-none"></div>
                    </div>
                </div>
            </form>
        `;

        const modal = window.modalManager.showCustomModal(modalId, formHTML, { title });

        const footer = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="save-category-btn">${this.currentEditId ? 'Update' : 'Add'} Category</button>
        `;
        modal.element.querySelector('.modal-body').insertAdjacentHTML('afterend', `<div class="modal-footer">${footer}</div>`);

        modal.element.querySelector('#save-category-btn').addEventListener('click', () => {
            this.saveCategory();
        });
    }

    ensureDefaultCategories() {
        const state = window.stateManager.state;
        let needsUpdate = false;

        // Check if we have any categories
        if (!state.categories || state.categories.length === 0) {
            needsUpdate = true;
            state.categories = [];
        }

        // Add missing default categories
        Object.entries(this.defaultCategories).forEach(([type, categories]) => {
            categories.forEach(defaultCat => {
                const exists = state.categories.some(cat => 
                    cat.name === defaultCat.name && cat.type === type
                );
                
                if (!exists) {
                    state.categories.push({
                        id: this.generateId(),
                        name: defaultCat.name,
                        type: type,
                        icon: defaultCat.icon,
                        color: defaultCat.color,
                        isDefault: true,
                        createdAt: new Date().toISOString()
                    });
                    needsUpdate = true;
                }
            });
        });

        if (needsUpdate) {
            window.stateManager.setState({ categories: state.categories });
        }
    }

    setupEventListeners() {
        // Category type filter
        document.getElementById('categoryTypeFilter')?.addEventListener('change', (e) => {
            this.renderCategoryList(e.target.value);
        });

        // Add category button
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
            this.showAddModal();
        });
    }

    renderCategoryList(filterType = 'all') {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        const categories = window.stateManager.state.categories.filter(category => {
            if (filterType === 'all') return true;
            return category.type === filterType;
        });

        if (categories.length === 0) {
            this.showEmptyState(container, filterType);
            return;
        }

        // Group by type
        const incomeCategories = categories.filter(cat => cat.type === 'income');
        const expenseCategories = categories.filter(cat => cat.type === 'expense');

        let html = '';

        if (incomeCategories.length > 0 && (filterType === 'all' || filterType === 'income')) {
            html += this.renderCategorySection('Income Categories', incomeCategories);
        }

        if (expenseCategories.length > 0 && (filterType === 'all' || filterType === 'expense')) {
            html += this.renderCategorySection('Expense Categories', expenseCategories);
        }

        container.innerHTML = html;
        this.attachCategoryEventListeners();
    }

    renderCategorySection(title, categories) {
        return `
            <div class="category-section">
                <h6 class="category-section-title">${title}</h6>
                <div class="category-grid">
                    ${categories.map(category => this.renderCategoryCard(category)).join('')}
                </div>
            </div>
        `;
    }

    renderCategoryCard(category) {
        const usageCount = this.getCategoryUsageCount(category.name);
        const canDelete = !category.isDefault && usageCount === 0;

        return `
            <div class="category-card" data-category-id="${category.id}">
                <div class="category-header">
                    <div class="category-icon" style="background-color: ${category.color}22; color: ${category.color}">
                        <i class="${category.icon}"></i>
                    </div>
                    <div class="category-info">
                        <div class="category-name">${this.escapeHTML(category.name)}</div>
                        <div class="category-meta">
                            <span class="category-type badge ${category.type === 'income' ? 'bg-success' : 'bg-danger'}">
                                ${category.type}
                            </span>
                            <span class="category-usage">${usageCount} transactions</span>
                        </div>
                    </div>
                </div>
                <div class="category-actions">
                    <button class="btn-action btn-edit" onclick="categoryManager.editCategory('${category.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${canDelete ? `
                        <button class="btn-action btn-delete" onclick="categoryManager.deleteCategory('${category.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : `
                        <button class="btn-action btn-disabled" disabled title="Default categories cannot be deleted">
                            <i class="bi bi-lock"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    showEmptyState(container, filterType) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-tags"></i>
                </div>
                <h4>No Categories Found</h4>
                <p>
                    ${filterType !== 'all' 
                        ? `No ${filterType} categories found.` 
                        : 'No categories have been created yet.'}
                </p>
                <button class="btn btn-primary" onclick="categoryManager.showAddModal()">
                    <i class="bi bi-plus-lg"></i> Add Category
                </button>
            </div>
        `;
    }

    attachCategoryEventListeners() {
        // Category card click events
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.category-actions')) {
                    const categoryId = card.dataset.categoryId;
                    this.showCategoryDetails(categoryId);
                }
            });
        });
    }

    getCategoryUsageCount(categoryName) {
        const transactions = window.stateManager.state.transactions;
        return transactions.filter(tx => tx.category === categoryName).length;
    }

    showCategoryDetails(categoryId) {
        const category = window.stateManager.state.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const usageCount = this.getCategoryUsageCount(category.name);
        const transactions = window.stateManager.state.transactions.filter(tx => tx.category === category.name);
        
        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const avgAmount = usageCount > 0 ? totalAmount / usageCount : 0;

        const modalHTML = `
            <div class="modal fade" id="categoryDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Category Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="category-detail-header">
                                <div class="category-detail-icon" style="background-color: ${category.color}22; color: ${category.color}">
                                    <i class="${category.icon}"></i>
                                </div>
                                <div class="category-detail-main">
                                    <h4>${this.escapeHTML(category.name)}</h4>
                                    <div class="category-detail-type badge ${category.type === 'income' ? 'bg-success' : 'bg-danger'}">
                                        ${category.type}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="category-detail-stats">
                                <div class="stat-row">
                                    <div class="stat-item">
                                        <div class="stat-value">${usageCount}</div>
                                        <div class="stat-label">Total Transactions</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${this.formatCurrency(totalAmount)}</div>
                                        <div class="stat-label">Total Amount</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${this.formatCurrency(avgAmount)}</div>
                                        <div class="stat-label">Average per Transaction</div>
                                    </div>
                                </div>
                            </div>

                            <div class="category-detail-info">
                                <div class="detail-row">
                                    <span class="detail-label">Icon</span>
                                    <span class="detail-value">
                                        <i class="${category.icon}"></i> ${category.icon}
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Color</span>
                                    <span class="detail-value">
                                        <span class="color-preview" style="background-color: ${category.color}"></span>
                                        ${category.color}
                                    </span>
                                </div>
                                ${category.createdAt ? `
                                <div class="detail-row">
                                    <span class="detail-label">Created</span>
                                    <span class="detail-value">${this.formatDateTime(category.createdAt)}</span>
                                </div>
                                ` : ''}
                                ${category.isDefault ? `
                                <div class="detail-row">
                                    <span class="detail-label">Status</span>
                                    <span class="detail-value badge bg-info">Default Category</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="categoryManager.editCategory('${category.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('categoryDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('categoryDetailsModal'));
        modal.show();

        // Clean up modal after hide
        document.getElementById('categoryDetailsModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    showAddModal() {
        this.currentEditId = null;
        this.showCategoryModal({}, 'Add Category');
    }

    editCategory(categoryId) {
        const category = window.stateManager.state.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        this.currentEditId = categoryId;
        this.showCategoryModal(category, 'Edit Category');
    }

    showCategoryModal(categoryData, title) {
        const modalHTML = `
            <div class="modal fade" id="categoryModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <form id="categoryForm" autocomplete="off">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label for="categoryName" class="form-label">Category Name</label>
                                        <input type="text" class="form-control" id="categoryName" 
                                               value="${this.escapeHTML(categoryData.name || '')}" required>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="categoryType" class="form-label">Type</label>
                                        <select class="form-select" id="categoryType" required>
                                            <option value="income" ${categoryData.type === 'income' ? 'selected' : ''}>Income</option>
                                            <option value="expense" ${categoryData.type === 'expense' ? 'selected' : ''}>Expense</option>
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label for="categoryColor" class="form-label">Color</label>
                                        <input type="color" class="form-control form-control-color" id="categoryColor" 
                                               value="${categoryData.color || this.generateRandomColor()}" title="Choose color">
                                    </div>
                                    
                                    <div class="col-12">
                                        <label for="categoryIcon" class="form-label">Icon</label>
                                        <select class="form-select" id="categoryIcon" required>
                                            <option value="">Select an icon</option>
                                            ${this.generateIconOptions(categoryData.icon)}
                                        </select>
                                        <div class="form-text">Choose an icon that represents this category</div>
                                    </div>

                                    <div class="col-12">
                                        <div class="category-preview">
                                            <div class="preview-label">Preview:</div>
                                            <div class="category-preview-card">
                                                <div class="preview-icon" id="previewIcon" 
                                                     style="background-color: ${categoryData.color || '#6B7280'}22; 
                                                            color: ${categoryData.color || '#6B7280'}">
                                                    <i class="${categoryData.icon || 'bi-tag'}"></i>
                                                </div>
                                                <div class="preview-name">${this.escapeHTML(categoryData.name || 'New Category')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-12">
                                        <div id="categoryFormAlert" class="alert alert-danger d-none"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    ${this.currentEditId ? 'Update Category' : 'Add Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('categoryModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupCategoryModal();
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();

        // Clean up modal after hide
        document.getElementById('categoryModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    setupCategoryModal() {
        // Update preview when inputs change
        const nameInput = document.getElementById('categoryName');
        const colorInput = document.getElementById('categoryColor');
        const iconSelect = document.getElementById('categoryIcon');
        const typeSelect = document.getElementById('categoryType');

        const updatePreview = () => {
            const previewIcon = document.getElementById('previewIcon');
            const previewName = document.querySelector('.preview-name');
            
            if (previewIcon && previewName) {
                const icon = iconSelect.value || 'bi-tag';
                const color = colorInput.value;
                const name = nameInput.value || 'New Category';
                
                previewIcon.innerHTML = `<i class="${icon}"></i>`;
                previewIcon.style.backgroundColor = `${color}22`;
                previewIcon.style.color = color;
                previewName.textContent = name;
            }
        };

        nameInput.addEventListener('input', updatePreview);
        colorInput.addEventListener('input', updatePreview);
        iconSelect.addEventListener('change', updatePreview);
        typeSelect.addEventListener('change', updatePreview);

        // Initial preview update
        updatePreview();

        // Setup form submission
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });
    }

    generateIconOptions(selectedIcon) {
        const icons = [
            'bi-tag', 'bi-briefcase', 'bi-laptop', 'bi-graph-up', 'bi-gift', 'bi-star',
            'bi-cup-straw', 'bi-car-front', 'bi-bag', 'bi-controller', 'bi-lightning',
            'bi-heart-pulse', 'bi-book', 'bi-airplane', 'bi-house', 'bi-phone',
            'bi-wifi', 'bi-tv', 'bi-tsunami', 'bi-cart', 'bi-currency-dollar',
            'bi-credit-card', 'bi-piggy-bank', 'bi-cash-coin', 'bi-wallet'
        ];

        return icons.map(icon => `
            <option value="${icon}" ${icon === selectedIcon ? 'selected' : ''}>
                ${icon.replace('bi-', '')}
            </option>
        `).join('');
    }

    saveCategory() {
        const formData = {
            name: document.getElementById('categoryName').value.trim(),
            type: document.getElementById('categoryType').value,
            color: document.getElementById('categoryColor').value,
            icon: document.getElementById('categoryIcon').value
        };

        // Validation
        const validation = this.validateCategory(formData);
        if (!validation.isValid) {
            this.showFormAlert(validation.message);
            return;
        }

        // Check for duplicate category name
        const existingCategory = window.stateManager.state.categories.find(cat => 
            cat.name.toLowerCase() === formData.name.toLowerCase() && 
            cat.id !== this.currentEditId
        );

        if (existingCategory) {
            this.showFormAlert('A category with this name already exists');
            return;
        }

        if (this.currentEditId) {
            // Update existing category
            window.stateManager.updateCategory(this.currentEditId, formData);
            window.showToast('Category updated successfully', 'success');
        } else {
            // Add new category
            window.stateManager.addCategory(formData);
            window.showToast('Category added successfully', 'success');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        modal.hide();

        // Refresh category list
        this.renderCategoryList();
    }

    validateCategory(data) {
        if (!data.name || data.name.length < 2) {
            return { isValid: false, message: 'Category name must be at least 2 characters long' };
        }

        if (!data.icon) {
            return { isValid: false, message: 'Please select an icon for the category' };
        }

        return { isValid: true };
    }

    showFormAlert(message) {
        const alert = document.getElementById('categoryFormAlert');
        alert.textContent = message;
        alert.classList.remove('d-none');
        
        setTimeout(() => {
            alert.classList.add('d-none');
        }, 5000);
    }

    deleteCategory(categoryId) {
        const category = window.stateManager.state.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const usageCount = this.getCategoryUsageCount(category.name);

        if (usageCount > 0) {
            window.showConfirmationModal(
                'Delete Category',
                `This category is used in ${usageCount} transaction(s). Deleting it will remove the category from all transactions. Are you sure you want to proceed?`,
                () => {
                    this.performCategoryDeletion(categoryId);
                },
                'Delete Anyway',
                'danger'
            );
        } else {
            window.showConfirmationModal(
                'Delete Category',
                `Are you sure you want to delete category "${category.name}"?`,
                () => {
                    this.performCategoryDeletion(categoryId);
                },
                'Delete',
                'danger'
            );
        }
    }

    performCategoryDeletion(categoryId) {
        const category = window.stateManager.state.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        // Remove category from transactions
        const transactions = window.stateManager.state.transactions.map(tx => {
            if (tx.category === category.name) {
                return {
                    ...tx,
                    category: category.type === 'income' ? 'Salary' : 'General'
                };
            }
            return tx;
        });

        // Update state
        window.stateManager.setState({
            categories: window.stateManager.state.categories.filter(cat => cat.id !== categoryId),
            transactions: transactions
        });

        window.showToast('Category deleted successfully', 'success');
        this.renderCategoryList();
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateRandomColor() {
        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: window.stateManager.state.currency || 'PKR'
        }).format(amount);
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Get category statistics
    getCategoryStats() {
        const categories = window.stateManager.state.categories;
        const transactions = window.stateManager.state.transactions;

        return categories.map(category => {
            const categoryTransactions = transactions.filter(tx => tx.category === category.name);
            const totalAmount = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            const transactionCount = categoryTransactions.length;

            return {
                ...category,
                transactionCount,
                totalAmount,
                averageAmount: transactionCount > 0 ? totalAmount / transactionCount : 0,
                lastUsed: categoryTransactions.length > 0 ? 
                    new Date(Math.max(...categoryTransactions.map(tx => new Date(tx.date)))) : 
                    null
            };
        }).sort((a, b) => b.transactionCount - a.transactionCount);
    }

    // Suggest category based on transaction description
    suggestCategory(description, type) {
        const categories = window.stateManager.state.categories.filter(cat => cat.type === type);
        const desc = description.toLowerCase();

        // Simple keyword matching
        for (const category of categories) {
            if (desc.includes(category.name.toLowerCase())) {
                return category;
            }
        }

        // Return most used category as fallback
        const mostUsed = this.getMostUsedCategory(type);
        return mostUsed || categories[0];
    }

    getMostUsedCategory(type) {
        const transactions = window.stateManager.state.transactions.filter(tx => tx.type === type);
        const categoryCount = {};
        
        transactions.forEach(tx => {
            categoryCount[tx.category] = (categoryCount[tx.category] || 0) + 1;
        });

        const mostUsed = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0];
        return mostUsed ? 
            window.stateManager.state.categories.find(cat => cat.name === mostUsed[0]) : 
            null;
    }
}

// Create global category manager instance
window.categoryManager = new CategoryManager();
