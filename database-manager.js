// File-Based Database Manager for Wash Zambia Laundry System
class FileDatabaseManager {
  constructor() {
    this.dbFile = 'database.json';
    this.data = null;
    this.init();
  }

  async init() {
    try {
      await this.loadDatabase();
    } catch (error) {
      console.warn('Failed to load database, using fallback:', error);
      this.useFallbackStorage();
    }
  }

  async loadDatabase() {
    try {
      const response = await fetch(this.dbFile);
      if (!response.ok) {
        throw new Error('Database file not found');
      }
      this.data = await response.json();
      console.log('Database loaded successfully');
    } catch (error) {
      // If file doesn't exist or can't be loaded, create initial database
      this.data = {
        sales: [],
        customers: [],
        expenses: [],
        users: [
          {
            username: "admin",
            password: "admin123",
            role: "admin"
          }
        ],
        version: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      await this.saveDatabase();
    }
  }

  async saveDatabase() {
    try {
      this.data.lastUpdated = new Date().toISOString().split('T')[0];
      
      // Create a blob with the data
      const blob = new Blob([JSON.stringify(this.data, null, 2)], { 
        type: 'application/json' 
      });
      
      // For local file system, we need to trigger a download
      // In a real server environment, this would be a POST request
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.dbFile;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('Database saved (download triggered)');
      return true;
    } catch (error) {
      console.error('Failed to save database:', error);
      return false;
    }
  }

  // Get all records from a collection
  async getAll(collection) {
    if (!this.data) await this.loadDatabase();
    return this.data[collection] || [];
  }

  // Get a specific record by ID
  async get(collection, id) {
    if (!this.data) await this.loadDatabase();
    const records = this.data[collection] || [];
    return records.find(record => record.id === id);
  }

  // Add a new record
  async add(collection, record) {
    if (!this.data) await this.loadDatabase();
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    
    // Generate ID if not provided
    if (!record.id) {
      record.id = Date.now().toString();
    }
    
    this.data[collection].push(record);
    await this.saveDatabase();
    return record;
  }

  // Update a record
  async update(collection, id, updates) {
    if (!this.data) await this.loadDatabase();
    const records = this.data[collection] || [];
    const index = records.findIndex(record => record.id === id);
    
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      await this.saveDatabase();
      return records[index];
    }
    return null;
  }

  // Delete a record
  async delete(collection, id) {
    if (!this.data) await this.loadDatabase();
    const records = this.data[collection] || [];
    const index = records.findIndex(record => record.id === id);
    
    if (index !== -1) {
      const deleted = records.splice(index, 1)[0];
      await this.saveDatabase();
      return deleted;
    }
    return null;
  }

  // Clear entire collection
  async clear(collection) {
    if (!this.data) await this.loadDatabase();
    this.data[collection] = [];
    await this.saveDatabase();
  }

  // Get database statistics
  getStats() {
    if (!this.data) return null;
    
    return {
      totalSales: this.data.sales.length,
      totalCustomers: this.data.customers.length,
      totalExpenses: this.data.expenses.length,
      totalUsers: this.data.users.length,
      lastUpdated: this.data.lastUpdated,
      version: this.data.version
    };
  }

  // Backup database
  async backup() {
    if (!this.data) await this.loadDatabase();
    
    const backup = {
      ...this.data,
      backupDate: new Date().toISOString(),
      backupType: 'manual'
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wash-zambia-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Restore database from backup
  async restore(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.data = data;
          await this.saveDatabase();
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Fallback to localStorage if file system isn't available
  useFallbackStorage() {
    console.log('Using localStorage fallback');
    
    // Override methods to use localStorage
    this.getAll = async (collection) => {
      const data = localStorage.getItem(`washZambia_${collection}`);
      return data ? JSON.parse(data) : [];
    };
    
    this.add = async (collection, record) => {
      const data = await this.getAll(collection);
      if (!record.id) record.id = Date.now().toString();
      data.push(record);
      localStorage.setItem(`washZambia_${collection}`, JSON.stringify(data));
      return record;
    };
    
    this.update = async (collection, id, updates) => {
      const data = await this.getAll(collection);
      const index = data.findIndex(record => record.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        localStorage.setItem(`washZambia_${collection}`, JSON.stringify(data));
        return data[index];
      }
      return null;
    };
    
    this.delete = async (collection, id) => {
      const data = await this.getAll(collection);
      const index = data.findIndex(record => record.id === id);
      if (index !== -1) {
        const deleted = data.splice(index, 1)[0];
        localStorage.setItem(`washZambia_${collection}`, JSON.stringify(data));
        return deleted;
      }
      return null;
    };
    
    this.clear = async (collection) => {
      localStorage.removeItem(`washZambia_${collection}`);
    };
  }
}

// Export for use in HTML
window.FileDatabaseManager = FileDatabaseManager;
