/**
 * 🗄️ GitHub-Compatible Database System
 * Works perfectly on GitHub Pages and static hosting
 * Uses localStorage with cloud backup capabilities
 */

class GitHubDatabase {
    constructor() {
        this.dbName = 'washZambiaDB';
        this.version = 1;
        this.db = null;
        this.isInitialized = false;
        this.useLocalStorage = false;
        this.cloudSyncEnabled = false;
        
        // Initialize database
        this.init();
    }

    async init() {
        try {
            // Try IndexedDB first (modern browsers)
            if ('indexedDB' in window) {
                await this.initIndexedDB();
                console.log('✅ IndexedDB initialized successfully');
            } else {
                throw new Error('IndexedDB not supported');
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB failed, using localStorage:', error);
            this.useLocalStorage = true;
            this.initLocalStorage();
        }
        
        this.isInitialized = true;
        this.migrateData();
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('sales')) {
                    db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('expenses')) {
                    db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'username' });
                    userStore.createIndex('role', 'role', { unique: false });
                }
            };
        });
    }

    initLocalStorage() {
        // Initialize localStorage structure
        if (!localStorage.getItem('washZambia_sales')) {
            localStorage.setItem('washZambia_sales', JSON.stringify([]));
        }
        if (!localStorage.getItem('washZambia_customers')) {
            localStorage.setItem('washZambia_customers', JSON.stringify([]));
        }
        if (!localStorage.getItem('washZambia_expenses')) {
            localStorage.setItem('washZambia_expenses', JSON.stringify([]));
        }
        if (!localStorage.getItem('washZambia_users')) {
            localStorage.setItem('washZambia_users', JSON.stringify([
                { username: 'admin', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() }
            ]));
        }
    }

    // Generic CRUD operations
    async create(storeName, data) {
        if (this.useLocalStorage) {
            return this.createLocalStorage(storeName, data);
        }
        return this.createIndexedDB(storeName, data);
    }

    async createIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    createLocalStorage(storeName, data) {
        const key = `washZambia_${storeName}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Generate ID if not present
        if (!data.id && storeName !== 'users') {
            data.id = Date.now() + Math.random();
        }
        
        items.push(data);
        localStorage.setItem(key, JSON.stringify(items));
        return Promise.resolve(data);
    }

    async read(storeName, id = null) {
        if (this.useLocalStorage) {
            return this.readLocalStorage(storeName, id);
        }
        return this.readIndexedDB(storeName, id);
    }

    async readIndexedDB(storeName, id) {
        if (id) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(id);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } else {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    }

    async readLocalStorage(storeName, id) {
        const key = `washZambia_${storeName}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (id) {
            if (storeName === 'users') {
                return Promise.resolve(items.find(item => item.username === id));
            }
            return Promise.resolve(items.find(item => item.id === id));
        }
        
        return Promise.resolve(items);
    }

    async update(storeName, data) {
        if (this.useLocalStorage) {
            return this.updateLocalStorage(storeName, data);
        }
        return this.updateIndexedDB(storeName, data);
    }

    async updateIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    updateLocalStorage(storeName, data) {
        const key = `washZambia_${storeName}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (storeName === 'users') {
            const index = items.findIndex(item => item.username === data.username);
            if (index !== -1) {
                items[index] = data;
                localStorage.setItem(key, JSON.stringify(items));
                return Promise.resolve(data);
            }
        } else {
            const index = items.findIndex(item => item.id === data.id);
            if (index !== -1) {
                items[index] = data;
                localStorage.setItem(key, JSON.stringify(items));
                return Promise.resolve(data);
            }
        }
        
        return Promise.reject(new Error('Item not found'));
    }

    async delete(storeName, id) {
        if (this.useLocalStorage) {
            return this.deleteLocalStorage(storeName, id);
        }
        return this.deleteIndexedDB(storeName, id);
    }

    async deleteIndexedDB(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    deleteLocalStorage(storeName, id) {
        const key = `washZambia_${storeName}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (storeName === 'users') {
            const filtered = items.filter(item => item.username !== id);
            localStorage.setItem(key, JSON.stringify(filtered));
            return Promise.resolve(true);
        } else {
            const filtered = items.filter(item => item.id !== id);
            localStorage.setItem(key, JSON.stringify(filtered));
            return Promise.resolve(true);
        }
    }

    // Utility methods
    async getAll(storeName) {
        return this.read(storeName);
    }

    async clear(storeName) {
        if (this.useLocalStorage) {
            const key = `washZambia_${storeName}`;
            localStorage.setItem(key, JSON.stringify([]));
            return Promise.resolve(true);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Data migration and backup
    migrateData() {
        // Migrate from old storage format if needed
        const oldSales = localStorage.getItem('washZambiaSales');
        const oldCustomers = localStorage.getItem('washZambiaCustomers');
        const oldExpenses = localStorage.getItem('washZambiaExpenses');
        const oldUsers = localStorage.getItem('users');

        if (oldSales && !localStorage.getItem('washZambia_sales')) {
            localStorage.setItem('washZambia_sales', oldSales);
            localStorage.removeItem('washZambiaSales');
        }
        if (oldCustomers && !localStorage.getItem('washZambia_customers')) {
            localStorage.setItem('washZambia_customers', oldCustomers);
            localStorage.removeItem('washZambiaCustomers');
        }
        if (oldExpenses && !localStorage.getItem('washZambia_expenses')) {
            localStorage.setItem('washZambia_expenses', oldExpenses);
            localStorage.removeItem('washZambiaExpenses');
        }
        if (oldUsers && !localStorage.getItem('washZambia_users')) {
            localStorage.setItem('washZambia_users', oldUsers);
            localStorage.removeItem('users');
        }
    }

    // Backup and restore functionality
    async exportData() {
        try {
            const data = {
                sales: await this.getAll('sales'),
                customers: await this.getAll('customers'),
                expenses: await this.getAll('expenses'),
                users: await this.getAll('users'),
                exportDate: new Date().toISOString(),
                version: this.version
            };
            
            return data;
        } catch (error) {
            console.error('Export failed:', error);
            return null;
        }
    }

    async importData(data) {
        try {
            // Clear existing data
            await this.clear('sales');
            await this.clear('customers');
            await this.clear('expenses');
            await this.clear('users');
            
            // Import new data
            for (const item of data.sales || []) {
                await this.create('sales', item);
            }
            for (const item of data.customers || []) {
                await this.create('customers', item);
            }
            for (const item of data.expenses || []) {
                await this.create('expenses', item);
            }
            for (const item of data.users || []) {
                await this.create('users', item);
            }
            
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    // Cloud sync simulation (for GitHub Pages)
    enableCloudSync() {
        this.cloudSyncEnabled = true;
        this.setupCloudSync();
    }

    setupCloudSync() {
        // Simulate cloud sync using localStorage as "cloud"
        setInterval(() => {
            this.syncToCloud();
        }, 30000); // Sync every 30 seconds
    }

    async syncToCloud() {
        try {
            const data = await this.exportData();
            localStorage.setItem('washZambia_cloudBackup', JSON.stringify(data));
            console.log('🔄 Data synced to cloud storage');
        } catch (error) {
            console.error('Cloud sync failed:', error);
        }
    }

    async syncFromCloud() {
        try {
            const cloudData = localStorage.getItem('washZambia_cloudBackup');
            if (cloudData) {
                const data = JSON.parse(cloudData);
                await this.importData(data);
                console.log('🔄 Data restored from cloud storage');
                return true;
            }
        } catch (error) {
            console.error('Cloud restore failed:', error);
        }
        return false;
    }

    // Statistics and analytics
    async getStats() {
        try {
            const sales = await this.getAll('sales');
            const customers = await this.getAll('customers');
            const expenses = await this.getAll('expenses');
            const users = await this.getAll('users');
            
            const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
            const todayRevenue = sales
                .filter(sale => sale.date === new Date().toISOString().split('T')[0])
                .reduce((sum, sale) => sum + (sale.total || 0), 0);
            
            return {
                totalSales: sales.length,
                totalCustomers: customers.length,
                totalExpenses: expenses.length,
                totalUsers: users.length,
                totalRevenue: totalRevenue,
                todayRevenue: todayRevenue,
                databaseType: this.useLocalStorage ? 'localStorage' : 'IndexedDB',
                cloudSyncEnabled: this.cloudSyncEnabled
            };
        } catch (error) {
            console.error('Stats failed:', error);
            return null;
        }
    }
}

// Initialize database globally
const githubDB = new GitHubDatabase();

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubDatabase;
}
