
import { CONFIG } from '../config.js';

// Note: To use real persistence, you would initialize Supabase here:
// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
// const supabase = createClient('YOUR_URL', 'YOUR_KEY');

class AuthService {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('sheepMarket_user')) || null;
        
        // Persistent Device Identity (Works like an IP/Fingerprint for this browser)
        this.visitorId = localStorage.getItem('sheepMarket_visitorId');
        if (!this.visitorId) {
            this.visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('sheepMarket_visitorId', this.visitorId);
        }

        this.onAuthStateChangeCallbacks = [];
    }

    onAuthStateChange(callback) {
        this.onAuthStateChangeCallbacks.push(callback);
        callback(this.user);
    }

    _notify() {
        this.onAuthStateChangeCallbacks.forEach(cb => cb(this.user));
    }

    async signUp(email, password) {
        // Mocking a network delay
        await new Promise(r => setTimeout(r, 800));
        
        // Capture current guest balance to migrate it
        const guestBalance = this.loadBalance();
        
        this.user = { email, id: 'user_' + Math.random().toString(36).substr(2, 9) };
        localStorage.setItem('sheepMarket_user', JSON.stringify(this.user));
        
        // Migrate guest balance to the new account
        this.saveBalance(guestBalance);
        
        this._notify();
        return { success: true };
    }

    async signIn(email, password) {
        await new Promise(r => setTimeout(r, 800));
        
        this.user = { email, id: 'user_existing' };
        localStorage.setItem('sheepMarket_user', JSON.stringify(this.user));
        this._notify();
        return { success: true };
    }

    async signOut() {
        this.user = null;
        localStorage.removeItem('sheepMarket_user');
        this._notify();
    }

    saveBalance(balance) {
        // If logged in, save to user account. Otherwise, save to the device (visitorId).
        const id = this.user ? this.user.id : this.visitorId;
        // Ensure we save the exact balance value (preserve decimals)
        const balanceToSave = typeof balance === 'number' ? balance.toFixed(2) : balance;
        localStorage.setItem(`sheepMarket_balance_${id}`, balanceToSave);
        console.log(`💾 Balance saved: ${balanceToSave}W`);
    }

    loadBalance() {
        // Priority: Logged in user > Persistent Device ID > Default starting grant
        const id = this.user ? this.user.id : this.visitorId;
        const saved = localStorage.getItem(`sheepMarket_balance_${id}`);
        
        if (saved) {
            const balance = parseFloat(saved);
            console.log(`📂 Balance loaded: ${balance}W`);
            return balance;
        }
        
        // If it's a brand new visitor, give them the starting grant
        console.log(`🆕 New player - granting starting wool: ${CONFIG.startingWool}W`);
        return CONFIG.startingWool;
    }
}

export const authService = new AuthService();
