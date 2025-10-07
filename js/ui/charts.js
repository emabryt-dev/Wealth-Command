// Wealth Command Pro - Charts Module
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1F2937',
                    bodyColor: '#4B5563',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: window.stateManager?.state.currency || 'PKR'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'linear'
                }
            }
        };
    }

    // Initialize all charts on a page
    initializeCharts(container = document) {
        const chartCanvases = container.querySelectorAll('[data-chart]');
        
        chartCanvases.forEach(canvas => {
            const chartType = canvas.dataset.chart;
            const chartData = canvas.dataset.chartData ? 
                JSON.parse(canvas.dataset.chartData) : null;
            
            if (chartData) {
                this.createChart(canvas, chartType, chartData);
            }
        });
    }

    // Create a new chart
    createChart(canvas, type, data, customOptions = {}) {
        // Destroy existing chart if it exists
        if (this.charts.has(canvas)) {
            this.charts.get(canvas).destroy();
        }

        const options = this.getChartOptions(type, customOptions);
        const chart = new Chart(canvas, {
            type: type,
            data: data,
            options: options
        });

        this.charts.set(canvas, chart);
        return chart;
    }

    getChartOptions(type, customOptions = {}) {
        const baseOptions = JSON.parse(JSON.stringify(this.defaultOptions));
        
        switch (type) {
            case 'line':
                return this.getLineChartOptions(baseOptions, customOptions);
            case 'bar':
                return this.getBarChartOptions(baseOptions, customOptions);
            case 'pie':
            case 'doughnut':
                return this.getPieChartOptions(baseOptions, customOptions);
            case 'radar':
                return this.getRadarChartOptions(baseOptions, customOptions);
            default:
                return { ...baseOptions, ...customOptions };
        }
    }

    getLineChartOptions(baseOptions, customOptions) {
        return {
            ...baseOptions,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif"
                        },
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: window.stateManager?.state.currency || 'PKR',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            },
            ...customOptions
        };
    }

    getBarChartOptions(baseOptions, customOptions) {
        return {
            ...baseOptions,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif"
                        },
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: window.stateManager?.state.currency || 'PKR',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            },
            ...customOptions
        };
    }

    getPieChartOptions(baseOptions, customOptions) {
        return {
            ...baseOptions,
            cutout: type === 'doughnut' ? '50%' : 0,
            plugins: {
                ...baseOptions.plugins,
                tooltip: {
                    ...baseOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            
                            return `${label}: ${new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: window.stateManager?.state.currency || 'PKR'
                            }).format(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            ...customOptions
        };
    }

    getRadarChartOptions(baseOptions, customOptions) {
        return {
            ...baseOptions,
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        display: false
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            ...customOptions
        };
    }

    // Update chart data
    updateChart(canvas, newData) {
        const chart = this.charts.get(canvas);
        if (chart) {
            chart.data = newData;
            chart.update('none'); // Use 'none' for immediate update without animation
        }
    }

    // Animated update
    animateChartUpdate(canvas, newData) {
        const chart = this.charts.get(canvas);
        if (chart) {
            chart.data = newData;
            chart.update();
        }
    }

    // Destroy a specific chart
    destroyChart(canvas) {
        const chart = this.charts.get(canvas);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvas);
        }
    }

    // Destroy all charts
    destroyAllCharts() {
        this.charts.forEach((chart, canvas) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    // Export chart as image
    exportChartAsImage(canvas, filename = 'chart') {
        const chart = this.charts.get(canvas);
        if (!chart) return;

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = image;
        link.click();
    }

    // Create specific chart types with pre-configured data
    createSpendingByCategoryChart(canvas, transactions, options = {}) {
        const data = window.analyticsEngine.prepareChartData('categoryBreakdown', transactions, {
            type: 'expense',
            limit: options.limit || 8
        });

        return this.createChart(canvas, 'doughnut', data, {
            plugins: {
                ...this.defaultOptions.plugins,
                title: {
                    display: true,
                    text: 'Spending by Category',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            }
        });
    }

    createMonthlyTrendChart(canvas, transactions, options = {}) {
        const data = window.analyticsEngine.prepareChartData('monthlyTrend', transactions, {
            months: options.months || 6
        });

        return this.createChart(canvas, 'line', data, {
            plugins: {
                ...this.defaultOptions.plugins,
                title: {
                    display: true,
                    text: 'Income vs Expenses Trend',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: window.stateManager?.state.currency || 'PKR',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            }
        });
    }

    createIncomeVsExpensesChart(canvas, transactions, options = {}) {
        const data = window.analyticsEngine.prepareChartData('incomeVsExpenses', transactions, {
            months: options.months || 6
        });

        return this.createChart(canvas, 'bar', data, {
            plugins: {
                ...this.defaultOptions.plugins,
                title: {
                    display: true,
                    text: 'Monthly Net Cash Flow',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            }
        });
    }

    createFinancialHealthChart(canvas, transactions, options = {}) {
        const data = window.analyticsEngine.prepareChartData('financialHealth', transactions, {
            months: options.months || 6
        });

        return this.createChart(canvas, 'line', data, {
            plugins: {
                ...this.defaultOptions.plugins,
                title: {
                    display: true,
                    text: 'Financial Health Score',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '/100';
                        }
                    }
                }
            }
        });
    }

    createWealthProjectionChart(canvas, projectionData) {
        const data = {
            labels: projectionData.projections.map(p => p.year),
            datasets: [
                {
                    label: 'Projected Wealth',
                    data: projectionData.projections.map(p => p.endingBalance),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        return this.createChart(canvas, 'line', data, {
            plugins: {
                ...this.defaultOptions.plugins,
                title: {
                    display: true,
                    text: 'Wealth Projection',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: window.stateManager?.state.currency || 'PKR',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            }
        });
    }

    // Create a composite dashboard chart
    createFinancialDashboard(canvas, transactions, options = {}) {
        const healthData = window.analyticsEngine.prepareChartData('financialHealth', transactions);
        const trendData = window.analyticsEngine.prepareChartData('monthlyTrend', transactions);
        const categoryData = window.analyticsEngine.prepareChartData('categoryBreakdown', transactions);

        // This would be a more complex composite chart
        // For now, we'll create a simple multi-axis chart
        const data = {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Financial Health',
                    data: healthData.datasets[0].data,
                    borderColor: '#6366F1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    yAxisID: 'y1',
                    fill: false
                },
                {
                    label: 'Income',
                    data: trendData.datasets[0].data,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y',
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: trendData.datasets[1].data,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    fill: true
                }
            ]
        };

        return this.createChart(canvas, 'line', data, {
            plugins: {
                ...this.defaultOptions.plugins,
                title: {
                    display: true,
                    text: 'Financial Overview',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: window.stateManager?.state.currency || 'PKR',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '/100';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        });
    }

    // Utility method to apply theme to charts
    applyTheme(theme) {
        const isDark = theme === 'dark';
        
        this.charts.forEach(chart => {
            // Update chart colors based on theme
            if (isDark) {
                chart.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.1)';
                chart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
                chart.options.plugins.tooltip.backgroundColor = 'rgba(30, 30, 30, 0.95)';
                chart.options.plugins.tooltip.titleColor = '#F9FAFB';
                chart.options.plugins.tooltip.bodyColor = '#D1D5DB';
            } else {
                chart.options.scales.x.grid.color = 'rgba(0, 0, 0, 0.1)';
                chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.1)';
                chart.options.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                chart.options.plugins.tooltip.titleColor = '#1F2937';
                chart.options.plugins.tooltip.bodyColor = '#4B5563';
            }
            
            chart.update();
        });
    }

    // Performance optimization for multiple charts
    batchUpdate(callbacks) {
        // Suspend updates for better performance
        Chart.helpers.each(Chart.instances, (chart) => {
            chart.suspended = true;
        });

        try {
            callbacks();
        } finally {
            // Resume updates
            Chart.helpers.each(Chart.instances, (chart) => {
                chart.suspended = false;
                chart.update();
            });
        }
    }
}

// Create global chart manager instance
window.chartManager = new ChartManager();
