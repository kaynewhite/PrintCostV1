class PrintCalculator {
    constructor() {
        this.state = {
            currency: 'PHP',
            currencySymbol: '₱',
            products: JSON.parse(localStorage.getItem('printProducts')) || [],
            selectedProduct: null,
            selectedPrice: null,
            currentCalculation: null
        };
        
        this.currencyData = {
            'PHP': { symbol: '₱', name: 'Philippine Peso', rate: 1 },
            'USD': { symbol: '$', name: 'US Dollar', rate: 0.018 },
            'EUR': { symbol: '€', name: 'Euro', rate: 0.016 },
            'GBP': { symbol: '£', name: 'British Pound', rate: 0.014 },
            'JPY': { symbol: '¥', name: 'Japanese Yen', rate: 2.6 }
        };
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.initEventListeners();
        this.updateCurrencySymbols();
        this.renderProducts();
        this.updateDashboard();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('printTheme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-bs-theme', savedTheme);
            const icon = document.querySelector('#darkModeToggle i');
            if (icon) {
                icon.className = savedTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
            }
        }
    }

    initEventListeners() {
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
        
        document.getElementById('currencySelect').addEventListener('change', (e) => this.changeCurrency(e.target.value));
        
        document.getElementById('newProductBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('createFirstBtn').addEventListener('click', () => this.showProductModal());
        
        document.getElementById('sortNewest').addEventListener('click', () => this.sortProducts('newest'));
        document.getElementById('sortProfit').addEventListener('click', () => this.sortProducts('profit'));
        
        document.getElementById('printingCost').addEventListener('input', () => this.calculatePrices());
        document.getElementById('laborCost').addEventListener('input', () => this.calculatePrices());
        document.getElementById('markupPercentage').addEventListener('input', () => this.calculatePrices());
        
        document.getElementById('addMaterialBtn').addEventListener('click', () => this.addMaterialRow());
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculatePrices(true));
        document.getElementById('saveProductBtn').addEventListener('click', () => this.saveProduct());
        
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-color');
                this.selectColor(color);
            });
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-material')) {
                const container = document.getElementById('materialsContainer');
                if (container.children.length > 1) {
                    e.target.closest('.material-item').remove();
                    this.calculatePrices();
                }
            }
        });
        
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('material-name') || 
                e.target.classList.contains('material-cost') ||
                e.target.classList.contains('material-items')) {
                const row = e.target.closest('.material-item');
                if (row) {
                    this.updateMaterialCost(row);
                    this.calculatePrices();
                }
            }
        });
        
        document.getElementById('editBtn').addEventListener('click', () => {
            if (this.state.selectedProduct) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('detailsModal'));
                modal.hide();
                setTimeout(() => this.showProductModal(this.state.selectedProduct), 300);
            }
        });
        
        document.getElementById('deleteBtn').addEventListener('click', () => {
            if (this.state.selectedProduct) {
                this.deleteProduct(this.state.selectedProduct.id);
            }
        });
        
        this.addMaterialRow();
    }

    toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        const icon = document.querySelector('#darkModeToggle i');
        
        html.setAttribute('data-bs-theme', newTheme);
        icon.className = newTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
        localStorage.setItem('printTheme', newTheme);
    }

    changeCurrency(currency) {
        this.state.currency = currency;
        this.state.currencySymbol = this.currencyData[currency].symbol;
        this.updateCurrencySymbols();
        this.renderProducts();
        this.updateDashboard();
    }

    updateCurrencySymbols() {
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = this.state.currencySymbol;
        });
    }

    showProductModal(product = null) {
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        const title = document.getElementById('modalTitle');
        const saveBtn = document.getElementById('saveProductBtn');
        const calculateBtn = document.getElementById('calculateBtn');
        
        if (product) {
            title.textContent = 'Edit Product';
            this.loadProductToForm(product);
            saveBtn.classList.remove('d-none');
            calculateBtn.classList.add('d-none');
        } else {
            title.textContent = 'New Product Calculation';
            this.resetProductForm();
            saveBtn.classList.add('d-none');
            calculateBtn.classList.remove('d-none');
        }
        
        modal.show();
    }

    resetProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('materialsContainer').innerHTML = '';
        document.getElementById('previewSection').classList.add('d-none');
        document.getElementById('productColor').value = '#0d6efd';
        
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector('.color-option[data-color="#0d6efd"]').classList.add('active');
        
        document.getElementById('printingCost').value = '5';
        document.getElementById('laborCost').value = '20';
        document.getElementById('markupPercentage').value = '30';
        
        const row = this.addMaterialRow();
        row.querySelector('.material-name').value = 'Sample Material';
        row.querySelector('.material-cost').value = '100';
        row.querySelector('.material-items').value = '50';
        this.updateMaterialCost(row);
        
        this.state.currentCalculation = null;
        this.state.selectedPrice = null;
    }

    loadProductToForm(product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('printingCost').value = product.printingCost;
        document.getElementById('laborCost').value = product.laborCost;
        document.getElementById('markupPercentage').value = product.markupPercentage;
        document.getElementById('productColor').value = product.color;
        
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-color') === product.color) {
                option.classList.add('active');
            }
        });
        
        document.getElementById('materialsContainer').innerHTML = '';
        product.materials.forEach(material => {
            const row = this.addMaterialRow();
            row.querySelector('.material-name').value = material.name;
            row.querySelector('.material-unit').value = material.unit;
            row.querySelector('.material-cost').value = material.cost;
            row.querySelector('.material-items').value = material.itemsProduced;
            this.updateMaterialCost(row);
        });
        
        setTimeout(() => this.calculatePrices(true), 100);
    }

    addMaterialRow() {
        const template = document.getElementById('materialTemplate');
        const clone = template.content.cloneNode(true);
        const container = document.getElementById('materialsContainer');
        
        container.appendChild(clone);
        
        const newRow = container.lastElementChild;
        newRow.querySelector('.currency-symbol').textContent = this.state.currencySymbol;
        
        return newRow;
    }

    updateMaterialCost(row) {
        const cost = parseFloat(row.querySelector('.material-cost').value) || 0;
        const items = parseInt(row.querySelector('.material-items').value) || 1;
        
        const costPerItem = cost / items;
        row.querySelector('.material-cost-per-item').textContent = 
            `${this.state.currencySymbol}${costPerItem.toFixed(2)}`;
    }

    getMaterialsData() {
        const materials = [];
        document.querySelectorAll('.material-item').forEach(item => {
            const name = item.querySelector('.material-name').value.trim();
            const unit = item.querySelector('.material-unit').value;
            const cost = parseFloat(item.querySelector('.material-cost').value) || 0;
            const itemsProduced = parseInt(item.querySelector('.material-items').value) || 1;
            
            if (name && cost > 0 && itemsProduced > 0) {
                materials.push({
                    name,
                    unit,
                    cost,
                    itemsProduced,
                    costPerItem: cost / itemsProduced
                });
            }
        });
        return materials;
    }

    calculatePrices(showToast = false) {
        const materials = this.getMaterialsData();
        const printingCost = parseFloat(document.getElementById('printingCost').value) || 0;
        const laborCost = parseFloat(document.getElementById('laborCost').value) || 0;
        const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 30;
        
        if (materials.length === 0) {
            if (showToast) this.showToast('Please add at least one material', 'warning');
            return;
        }
        
        let totalMaterialCostPerItem = 0;
        let materialDetails = [];
        
        materials.forEach(material => {
            totalMaterialCostPerItem += material.costPerItem;
            materialDetails.push({
                ...material,
                costPerItem: material.costPerItem
            });
        });
        
        const baseCost = totalMaterialCostPerItem + printingCost + laborCost;
        
        const sellingPrice = baseCost * (1 + markupPercentage / 100);
        const profit = sellingPrice - baseCost;
        const profitPercentage = markupPercentage;
        
        this.state.currentCalculation = {
            materials: materialDetails,
            totalMaterialCostPerItem,
            printingCost,
            laborCost,
            markupPercentage,
            baseCost,
            sellingPrice,
            profit,
            profitPercentage
        };
        
        this.showPricePreview();
        
        if (showToast) {
            this.showToast('Prices calculated successfully!', 'success');
        }
    }

    showPricePreview() {
        const previewSection = document.getElementById('previewSection');
        const pricePreview = document.getElementById('pricePreview');
        
        if (!this.state.currentCalculation) return;
        
        const calc = this.state.currentCalculation;
        previewSection.classList.remove('d-none');
        
        pricePreview.innerHTML = `
            <div class="col-md-6">
                <div class="price-option" data-price="${calc.sellingPrice.toFixed(2)}">
                    <div class="price-label fw-bold mb-2">Recommended Price</div>
                    <div class="price">${this.state.currencySymbol}${calc.sellingPrice.toFixed(2)}</div>
                    <div class="profit mb-3">
                        <div>${calc.profitPercentage}% Profit Margin</div>
                        <div>Profit: ${this.state.currencySymbol}${calc.profit.toFixed(2)} per item</div>
                    </div>
                    <button class="btn btn-sm btn-primary select-price">Select This Price</button>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title mb-3">Cost Breakdown</h6>
                        <div class="cost-breakdown">
                            <div class="cost-item">
                                <span>Material Cost:</span>
                                <span>${this.state.currencySymbol}${calc.totalMaterialCostPerItem.toFixed(2)}</span>
                            </div>
                            <div class="cost-item">
                                <span>Printing Cost:</span>
                                <span>${this.state.currencySymbol}${calc.printingCost.toFixed(2)}</span>
                            </div>
                            <div class="cost-item">
                                <span>Labor Cost:</span>
                                <span>${this.state.currencySymbol}${calc.laborCost.toFixed(2)}</span>
                            </div>
                            <div class="cost-item border-top pt-2">
                                <span>Total Cost:</span>
                                <span class="fw-bold">${this.state.currencySymbol}${calc.baseCost.toFixed(2)}</span>
                            </div>
                            <div class="cost-item">
                                <span>Markup (${calc.markupPercentage}%):</span>
                                <span class="text-success">+${this.state.currencySymbol}${calc.profit.toFixed(2)}</span>
                            </div>
                            <div class="cost-item border-top pt-2 fw-bold">
                                <span>Selling Price:</span>
                                <span class="text-success">${this.state.currencySymbol}${calc.sellingPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelectorAll('.select-price').forEach(button => {
            button.addEventListener('click', (e) => {
                const priceOption = e.target.closest('.price-option');
                const price = parseFloat(priceOption.getAttribute('data-price'));
                
                // Store selected price
                this.state.selectedPrice = price;
                
                // Show save button
                document.getElementById('saveProductBtn').classList.remove('d-none');
                document.getElementById('calculateBtn').classList.add('d-none');
                
                // Visual feedback
                document.querySelectorAll('.price-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                priceOption.classList.add('selected');
                
                this.showToast('Price selected! Click "Save Product" to continue.', 'success');
            });
        });
    }

    selectColor(color) {
        document.getElementById('productColor').value = color;
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`.color-option[data-color="${color}"]`).classList.add('active');
    }

    saveProduct() {
        if (!this.state.selectedPrice && !this.state.currentCalculation) {
            this.showToast('Please calculate and select a price first', 'warning');
            return;
        }
        
        const productId = document.getElementById('productId').value || Date.now().toString();
        const productName = document.getElementById('productName').value.trim();
        const materials = this.getMaterialsData();
        const printingCost = parseFloat(document.getElementById('printingCost').value) || 0;
        const laborCost = parseFloat(document.getElementById('laborCost').value) || 0;
        const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 30;
        const category = document.getElementById('productCategory').value;
        const color = document.getElementById('productColor').value;
        
        if (!productName || materials.length === 0) {
            this.showToast('Please fill all required fields', 'warning');
            return;
        }
        
        let baseCost, sellingPrice, profit, profitPercentage;
        
        if (this.state.currentCalculation) {
            baseCost = this.state.currentCalculation.baseCost;
            sellingPrice = this.state.selectedPrice || this.state.currentCalculation.sellingPrice;
            profit = sellingPrice - baseCost;
            profitPercentage = ((profit / baseCost) * 100).toFixed(1);
        } else {
            let totalMaterialCostPerItem = 0;
            materials.forEach(material => {
                totalMaterialCostPerItem += material.costPerItem;
            });
            
            baseCost = totalMaterialCostPerItem + printingCost + laborCost;
            sellingPrice = this.state.selectedPrice || (baseCost * (1 + markupPercentage / 100));
            profit = sellingPrice - baseCost;
            profitPercentage = ((profit / baseCost) * 100).toFixed(1);
        }
        
        const product = {
            id: productId,
            name: productName,
            category,
            color,
            materials,
            printingCost,
            laborCost,
            markupPercentage,
            baseCost,
            sellingPrice,
            profit,
            profitPercentage,
            currency: this.state.currency,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const existingIndex = this.state.products.findIndex(p => p.id === productId);
        if (existingIndex >= 0) {
            this.state.products[existingIndex] = product;
        } else {
            this.state.products.unshift(product);
        }
        
        localStorage.setItem('printProducts', JSON.stringify(this.state.products));
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        
        this.state.selectedPrice = null;
        this.state.currentCalculation = null;
        this.renderProducts();
        this.updateDashboard();
        this.showToast('Product saved successfully!', 'success');
    }

    renderProducts() {
        const container = document.getElementById('productsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.state.products.length === 0) {
            emptyState.classList.remove('d-none');
            container.innerHTML = '';
            return;
        }
        
        emptyState.classList.add('d-none');
        
        container.innerHTML = this.state.products.map(product => {
            const conversionRate = this.currencyData[product.currency].rate / this.currencyData[this.state.currency].rate;
            const sellingPrice = product.sellingPrice * conversionRate;
            const baseCost = product.baseCost * conversionRate;
            const profit = product.profit * conversionRate;
            const profitPercentage = product.profitPercentage;
            
            return `
                <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                    <div class="card product-card" data-id="${product.id}" style="border-left-color: ${product.color || '#0d6efd'}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h5 class="card-title mb-1 text-truncate">${product.name}</h5>
                                    <span class="badge bg-secondary">${product.category.replace('-', ' ')}</span>
                                </div>
                                <span class="badge bg-primary">${product.materials.length} mat</span>
                            </div>
                            
                            <div class="product-price mb-2">
                                ${this.state.currencySymbol}${sellingPrice.toFixed(2)}
                            </div>
                            
                            <div class="product-meta mb-3">
                                <div class="d-flex justify-content-between">
                                    <span>Cost:</span>
                                    <span>${this.state.currencySymbol}${baseCost.toFixed(2)}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Profit:</span>
                                    <span class="text-success">${this.state.currencySymbol}${profit.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-success">${profitPercentage}% margin</span>
                                <button class="btn btn-sm btn-outline-primary view-details">
                                    <i class="bi bi-eye me-1"></i> View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = e.target.closest('.product-card').getAttribute('data-id');
                this.showProductDetails(productId);
            });
        });
        
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    const productId = card.getAttribute('data-id');
                    this.showProductDetails(productId);
                }
            });
        });
    }

    showProductDetails(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;
        
        this.state.selectedProduct = product;
        
        const conversionRate = this.currencyData[product.currency].rate / this.currencyData[this.state.currency].rate;
        const sellingPrice = product.sellingPrice * conversionRate;
        const baseCost = product.baseCost * conversionRate;
        const profit = product.profit * conversionRate;
        const printingCost = product.printingCost * conversionRate;
        const laborCost = product.laborCost * conversionRate;
        const materialCost = baseCost - printingCost - laborCost;
        
        const detailsHtml = `
            <div class="row">
                <div class="col-md-8">
                    <div class="mb-4">
                        <div class="d-flex align-items-center mb-3">
                            <div class="color-indicator me-3" style="background-color: ${product.color}; width: 30px; height: 30px; border-radius: 6px;"></div>
                            <div>
                                <h4 class="mb-1">${product.name}</h4>
                                <span class="badge bg-secondary">${product.category.replace('-', ' ')}</span>
                            </div>
                        </div>
                        
                        <div class="row g-4 mb-4">
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <div class="display-6 text-success">${this.state.currencySymbol}${sellingPrice.toFixed(2)}</div>
                                        <small class="text-muted">Selling Price</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <div class="display-6">${this.state.currencySymbol}${baseCost.toFixed(2)}</div>
                                        <small class="text-muted">Cost</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <div class="display-6 text-success">${product.profitPercentage}%</div>
                                        <small class="text-muted">Profit Margin</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Materials</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Material</th>
                                                <th>Unit</th>
                                                <th>Cost</th>
                                                <th>Items Produced</th>
                                                <th>Cost per Item</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${product.materials.map(material => `
                                                <tr>
                                                    <td>${material.name}</td>
                                                    <td><span class="badge bg-light text-dark">${material.unit}</span></td>
                                                    <td>${this.state.currencySymbol}${(material.cost * conversionRate).toFixed(2)}</td>
                                                    <td>${material.itemsProduced}</td>
                                                    <td class="text-success">${this.state.currencySymbol}${(material.costPerItem * conversionRate).toFixed(2)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-light">
                                                <td colspan="4" class="text-end"><strong>Total Material Cost per Item:</strong></td>
                                                <td><strong>${this.state.currencySymbol}${materialCost.toFixed(2)}</strong></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Cost Breakdown</h6>
                        </div>
                        <div class="card-body">
                            <div class="cost-breakdown">
                                <div class="cost-item">
                                    <span>Materials:</span>
                                    <span>${this.state.currencySymbol}${materialCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Printing:</span>
                                    <span>${this.state.currencySymbol}${printingCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Labor:</span>
                                    <span>${this.state.currencySymbol}${laborCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item border-top pt-2">
                                    <span>Total Cost:</span>
                                    <span class="fw-bold">${this.state.currencySymbol}${baseCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Profit:</span>
                                    <span class="text-success fw-bold">${this.state.currencySymbol}${profit.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Profit Margin:</span>
                                    <span class="text-success fw-bold">${product.profitPercentage}%</span>
                                </div>
                                <div class="cost-item border-top pt-2">
                                    <span>Selling Price:</span>
                                    <span class="fw-bold text-success">${this.state.currencySymbol}${sellingPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card mt-3">
                        <div class="card-body">
                            <h6 class="card-title mb-3">Production Info</h6>
                            <div class="list-group list-group-flush">
                                <div class="list-group-item d-flex justify-content-between">
                                    <span>Created:</span>
                                    <span>${new Date(product.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div class="list-group-item d-flex justify-content-between">
                                    <span>Updated:</span>
                                    <span>${new Date(product.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <div class="list-group-item d-flex justify-content-between">
                                    <span>Currency:</span>
                                    <span>${product.currency}</span>
                                </div>
                                <div class="list-group-item d-flex justify-content-between">
                                    <span>Markup Applied:</span>
                                    <span>${product.markupPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        <strong>Business Insight:</strong> To make ${this.state.currencySymbol}1000 profit, 
                        you need to sell approximately <strong>${Math.ceil(1000 / profit)}</strong> units.
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('productDetails').innerHTML = detailsHtml;
        document.getElementById('detailsTitle').textContent = product.name;
        
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        modal.show();
    }

    deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            this.state.products = this.state.products.filter(p => p.id !== productId);
            localStorage.setItem('printProducts', JSON.stringify(this.state.products));
            
            bootstrap.Modal.getInstance(document.getElementById('detailsModal')).hide();
            
            this.renderProducts();
            this.updateDashboard();
            this.showToast('Product deleted successfully', 'warning');
        }
    }

    sortProducts(criteria) {
        if (criteria === 'newest') {
            this.state.products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (criteria === 'profit') {
            this.state.products.sort((a, b) => b.profitPercentage - a.profitPercentage);
        }
        
        this.renderProducts();
    }

    updateDashboard() {
        const totalProducts = this.state.products.length;
        
        const totalValue = this.state.products.reduce((sum, product) => {
            const conversionRate = this.currencyData[product.currency].rate / this.currencyData[this.state.currency].rate;
            return sum + (product.sellingPrice * conversionRate);
        }, 0);
        
        const avgProfit = this.state.products.length > 0 
            ? (this.state.products.reduce((sum, product) => sum + parseFloat(product.profitPercentage), 0) / this.state.products.length).toFixed(1)
            : 0;
        
        const recentCount = this.state.products.filter(p => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(p.createdAt) > weekAgo;
        }).length;
        
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalValue').textContent = `${this.state.currencySymbol}${totalValue.toFixed(0)}`;
        document.getElementById('avgProfit').textContent = `${avgProfit}%`;
        document.getElementById('recentCount').textContent = recentCount;
        
        document.getElementById('currencySelect').value = this.state.currency;
    }

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(container);
        }
        
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-${type} text-white">
                    <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            animation: true,
            autohide: true,
            delay: 3000
        });
        
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

const app = new PrintCalculator();