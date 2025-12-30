class PrintCalculator {
    constructor() {
        this.state = {
            products: JSON.parse(localStorage.getItem('printProducts')) || [],
            selectedProduct: null
        };
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.initEventListeners();
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
        document.getElementById('newProductBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('createFirstBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('sortNewest').addEventListener('click', () => this.sortProducts('newest'));
        document.getElementById('sortProfit').addEventListener('click', () => this.sortProducts('profit'));
        document.getElementById('printingCost').addEventListener('input', () => this.calculateAndShowPreview());
        document.getElementById('laborCost').addEventListener('input', () => this.calculateAndShowPreview());
        document.getElementById('markupPercentage').addEventListener('input', () => this.calculateAndShowPreview());
        document.getElementById('productName').addEventListener('input', () => this.updateSaveButton());
        document.getElementById('addMaterialBtn').addEventListener('click', () => this.addMaterialRow());
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
                    this.calculateAndShowPreview();
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
                    this.calculateAndShowPreview();
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

    showProductModal(product = null) {
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        const title = document.getElementById('modalTitle');
        const saveBtn = document.getElementById('saveProductBtn');
        
        if (product) {
            title.textContent = 'Edit Product';
            this.loadProductToForm(product);
            saveBtn.textContent = 'Update Product';
        } else {
            title.textContent = 'New Product Calculation';
            this.resetProductForm();
            saveBtn.textContent = 'Save Product';
        }
        
        modal.show();
        
        setTimeout(() => {
            this.calculateAndShowPreview();
            this.updateSaveButton();
        }, 100);
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
        document.getElementById('laborCost').value = '25';
        document.getElementById('markupPercentage').value = '40';
        
        const row = this.addMaterialRow();
        row.querySelector('.material-name').value = 'Glossy Paper (A4)';
        row.querySelector('.material-cost').value = '250';
        row.querySelector('.material-items').value = '100';
        row.querySelector('.material-unit').value = 'ream';
        this.updateMaterialCost(row);
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
    }

    addMaterialRow() {
        const template = document.getElementById('materialTemplate');
        const clone = template.content.cloneNode(true);
        const container = document.getElementById('materialsContainer');
        
        container.appendChild(clone);
        
        const newRow = container.lastElementChild;
        return newRow;
    }

    updateMaterialCost(row) {
        const cost = parseFloat(row.querySelector('.material-cost').value) || 0;
        const items = parseInt(row.querySelector('.material-items').value) || 1;
        
        const costPerItem = cost / items;
        row.querySelector('.material-cost-per-item').textContent = `₱${costPerItem.toFixed(2)}`;
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

    calculateAndShowPreview() {
        const materials = this.getMaterialsData();
        const printingCost = parseFloat(document.getElementById('printingCost').value) || 0;
        const laborCost = parseFloat(document.getElementById('laborCost').value) || 0;
        const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 40;
        
        if (materials.length === 0) {
            document.getElementById('previewSection').classList.add('d-none');
            return;
        }
        
        let totalMaterialCostPerItem = 0;
        let totalWastePercentage = 0;
        
        materials.forEach(material => {
            totalMaterialCostPerItem += material.costPerItem;
            
            if (material.unit === 'sheet' || material.unit === 'piece') {
                totalWastePercentage += 5;
            } else if (material.unit === 'roll') {
                totalWastePercentage += 3;
            } else {
                totalWastePercentage += 2;
            }
        });
        
        const averageWaste = totalWastePercentage / materials.length;
        const wasteFactor = 1 + (averageWaste / 100);
        
        const adjustedMaterialCost = totalMaterialCostPerItem * wasteFactor;
        const baseCost = adjustedMaterialCost + printingCost + laborCost;
        
        const sellingPrice = baseCost * (1 + markupPercentage / 100);
        const roundedPrice = Math.ceil(sellingPrice / 5) * 5;
        const profit = roundedPrice - baseCost;
        const profitPercentage = ((profit / baseCost) * 100).toFixed(1);
        
        this.showPricePreview(totalMaterialCostPerItem, printingCost, laborCost, baseCost, roundedPrice, profit, profitPercentage, averageWaste);
    }

    showPricePreview(materialCost, printingCost, laborCost, baseCost, sellingPrice, profit, profitPercentage, wastePercentage) {
        const previewSection = document.getElementById('previewSection');
        const pricePreview = document.getElementById('pricePreview');
        
        previewSection.classList.remove('d-none');
        
        const wasteCost = materialCost * (wastePercentage / 100);
        const totalMaterialWithWaste = materialCost + wasteCost;
        
        pricePreview.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Pricing Analysis</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="cost-breakdown mb-4">
                                    <h6 class="mb-3">Detailed Cost Breakdown</h6>
                                    <div class="cost-item">
                                        <span>Raw Material Cost:</span>
                                        <span>₱${materialCost.toFixed(2)}</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Material Waste (${wastePercentage.toFixed(1)}%):</span>
                                        <span class="text-warning">+₱${wasteCost.toFixed(2)}</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Adjusted Material Cost:</span>
                                        <span class="fw-bold">₱${totalMaterialWithWaste.toFixed(2)}</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Printing Cost:</span>
                                        <span>₱${printingCost.toFixed(2)}</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Labor Cost:</span>
                                        <span>₱${laborCost.toFixed(2)}</span>
                                    </div>
                                    <div class="cost-item border-top pt-2">
                                        <span>Total Production Cost:</span>
                                        <span class="fw-bold">₱${baseCost.toFixed(2)}</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Profit (${profitPercentage}%):</span>
                                        <span class="text-success">+₱${profit.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="price-summary text-center">
                                    <h6 class="mb-3">Recommended Retail Price</h6>
                                    <div class="display-4 text-success mb-3">₱${sellingPrice.toFixed(2)}</div>
                                    <div class="profit-details">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Your Cost:</span>
                                            <span>₱${baseCost.toFixed(2)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Your Profit:</span>
                                            <span class="text-success fw-bold">₱${profit.toFixed(2)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Profit Margin:</span>
                                            <span class="text-success fw-bold">${profitPercentage}%</span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>ROI:</span>
                                            <span class="text-info fw-bold">${((profit / baseCost) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    <strong>Waste Considered:</strong> ${wastePercentage.toFixed(1)}% material waste included
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="alert alert-info">
                                    <i class="bi bi-lightbulb me-2"></i>
                                    <strong>Break-even:</strong> Need to sell ${Math.ceil(1000 / profit)} units for ₱1,000 profit
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.updateSaveButton();
    }

    selectColor(color) {
        document.getElementById('productColor').value = color;
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`.color-option[data-color="${color}"]`).classList.add('active');
    }

    updateSaveButton() {
        const productName = document.getElementById('productName').value.trim();
        const materials = this.getMaterialsData();
        const saveBtn = document.getElementById('saveProductBtn');
        
        if (productName && materials.length > 0) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-secondary');
            saveBtn.classList.add('btn-primary');
        } else {
            saveBtn.disabled = true;
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-secondary');
        }
    }

    saveProduct() {
        const productId = document.getElementById('productId').value || Date.now().toString();
        const productName = document.getElementById('productName').value.trim();
        const materials = this.getMaterialsData();
        const printingCost = parseFloat(document.getElementById('printingCost').value) || 0;
        const laborCost = parseFloat(document.getElementById('laborCost').value) || 0;
        const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 40;
        const category = document.getElementById('productCategory').value;
        const color = document.getElementById('productColor').value;
        
        if (!productName) {
            this.showToast('Please enter a product name', 'warning');
            document.getElementById('productName').focus();
            return;
        }
        
        if (materials.length === 0) {
            this.showToast('Please add at least one material', 'warning');
            return;
        }
        
        let totalMaterialCostPerItem = 0;
        let totalWastePercentage = 0;
        
        materials.forEach(material => {
            totalMaterialCostPerItem += material.costPerItem;
            
            if (material.unit === 'sheet' || material.unit === 'piece') {
                totalWastePercentage += 5;
            } else if (material.unit === 'roll') {
                totalWastePercentage += 3;
            } else {
                totalWastePercentage += 2;
            }
        });
        
        const averageWaste = totalWastePercentage / materials.length;
        const wasteFactor = 1 + (averageWaste / 100);
        const adjustedMaterialCost = totalMaterialCostPerItem * wasteFactor;
        const baseCost = adjustedMaterialCost + printingCost + laborCost;
        const sellingPrice = baseCost * (1 + markupPercentage / 100);
        const roundedPrice = Math.ceil(sellingPrice / 5) * 5;
        const profit = roundedPrice - baseCost;
        const profitPercentage = ((profit / baseCost) * 100).toFixed(1);
        
        const product = {
            id: productId,
            name: productName,
            category,
            color,
            materials,
            printingCost,
            laborCost,
            markupPercentage,
            wastePercentage: averageWaste,
            baseCost,
            sellingPrice: roundedPrice,
            profit,
            profitPercentage,
            currency: 'PHP',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const existingIndex = this.state.products.findIndex(p => p.id === productId);
        if (existingIndex >= 0) {
            this.state.products[existingIndex] = product;
            this.showToast('Product updated successfully!', 'success');
        } else {
            this.state.products.unshift(product);
            this.showToast('Product saved successfully!', 'success');
        }
        
        localStorage.setItem('printProducts', JSON.stringify(this.state.products));
        
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        
        this.renderProducts();
        this.updateDashboard();
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
            const sellingPrice = product.sellingPrice;
            const baseCost = product.baseCost;
            const profit = product.profit;
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
                                ₱${sellingPrice.toFixed(2)}
                            </div>
                            
                            <div class="product-meta mb-3">
                                <div class="d-flex justify-content-between">
                                    <span>Cost:</span>
                                    <span>₱${baseCost.toFixed(2)}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Profit:</span>
                                    <span class="text-success">₱${profit.toFixed(2)}</span>
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
        
        const sellingPrice = product.sellingPrice;
        const baseCost = product.baseCost;
        const profit = product.profit;
        const printingCost = product.printingCost;
        const laborCost = product.laborCost;
        const materialCost = baseCost - printingCost - laborCost;
        const wasteCost = materialCost * (product.wastePercentage / 100);
        const rawMaterialCost = materialCost - wasteCost;
        
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
                                        <div class="display-6 text-success">₱${sellingPrice.toFixed(2)}</div>
                                        <small class="text-muted">Selling Price</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body text-center">
                                        <div class="display-6">₱${baseCost.toFixed(2)}</div>
                                        <small class="text-muted">Your Cost</small>
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
                                <h6 class="mb-0">Materials Used (${product.wastePercentage.toFixed(1)}% waste included)</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Material</th>
                                                <th>Unit</th>
                                                <th>Cost</th>
                                                <th>Items Made</th>
                                                <th>Cost/Item</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${product.materials.map(material => `
                                                <tr>
                                                    <td>${material.name}</td>
                                                    <td><span class="badge bg-light text-dark">${material.unit}</span></td>
                                                    <td>₱${material.cost.toFixed(2)}</td>
                                                    <td>${material.itemsProduced}</td>
                                                    <td class="text-success">₱${material.costPerItem.toFixed(2)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-light">
                                                <td colspan="4" class="text-end"><strong>Total Raw Material Cost:</strong></td>
                                                <td><strong>₱${rawMaterialCost.toFixed(2)}</strong></td>
                                            </tr>
                                            <tr class="table-warning">
                                                <td colspan="4" class="text-end"><strong>Material Waste (${product.wastePercentage.toFixed(1)}%):</strong></td>
                                                <td><strong class="text-warning">+₱${wasteCost.toFixed(2)}</strong></td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td colspan="4" class="text-end"><strong>Total Adjusted Material Cost:</strong></td>
                                                <td><strong>₱${materialCost.toFixed(2)}</strong></td>
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
                            <h6 class="mb-0">Cost Analysis</h6>
                        </div>
                        <div class="card-body">
                            <div class="cost-breakdown">
                                <div class="cost-item">
                                    <span>Raw Materials:</span>
                                    <span>₱${rawMaterialCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Material Waste:</span>
                                    <span class="text-warning">+₱${wasteCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Printing Cost:</span>
                                    <span>₱${printingCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Labor Cost:</span>
                                    <span>₱${laborCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item border-top pt-2">
                                    <span>Total Production Cost:</span>
                                    <span class="fw-bold">₱${baseCost.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Your Profit:</span>
                                    <span class="text-success fw-bold">₱${profit.toFixed(2)}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Profit Margin:</span>
                                    <span class="text-success fw-bold">${product.profitPercentage}%</span>
                                </div>
                                <div class="cost-item border-top pt-2">
                                    <span>Recommended Price:</span>
                                    <span class="fw-bold text-success">₱${sellingPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card mt-3">
                        <div class="card-body">
                            <h6 class="card-title mb-3">Production Insights</h6>
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
                                    <span>Markup Applied:</span>
                                    <span>${product.markupPercentage}%</span>
                                </div>
                                <div class="list-group-item d-flex justify-content-between">
                                    <span>Waste Considered:</span>
                                    <span>${product.wastePercentage.toFixed(1)}%</span>
                                </div>
                                <div class="list-group-item d-flex justify-content-between">
                                    <span>Break-even Units:</span>
                                    <span>${Math.ceil(1000 / profit)} for ₱1,000 profit</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="bi bi-lightbulb me-2"></i>
                        <strong>Pricing Strategy:</strong> This price is rounded to the nearest ₱5 increment for better market acceptance. 
                        The calculation includes realistic material waste considerations based on industry standards.
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
            return sum + product.sellingPrice;
        }, 0);
        
        const totalCost = this.state.products.reduce((sum, product) => {
            return sum + product.baseCost;
        }, 0);
        
        const totalProfit = totalValue - totalCost;
        
        const avgProfit = this.state.products.length > 0 
            ? (this.state.products.reduce((sum, product) => sum + parseFloat(product.profitPercentage), 0) / this.state.products.length).toFixed(1)
            : 0;
        
        const recentCount = this.state.products.filter(p => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(p.createdAt) > weekAgo;
        }).length;
        
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalValue').textContent = `₱${totalValue.toFixed(0)}`;
        document.getElementById('avgProfit').textContent = `${avgProfit}%`;
        document.getElementById('recentCount').textContent = recentCount;
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