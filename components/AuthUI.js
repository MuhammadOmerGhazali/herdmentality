
import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { authService } from '../services/auth.js';

const html = htm.bind(React.createElement);

export default function AuthUI() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        authService.onAuthStateChange((u) => {
            setUser(u);
            if (u) setIsOpen(false);
        });

        const openHandler = () => setIsOpen(true);
        const showHandler = () => setIsVisible(true);
        const hideHandler = () => {
            setIsVisible(false);
            setIsOpen(false);
        };

        window.addEventListener('open-auth-modal', openHandler);
        window.addEventListener('show-auth-ui', showHandler);
        window.addEventListener('hide-auth-ui', hideHandler);

        return () => {
            window.removeEventListener('open-auth-modal', openHandler);
            window.removeEventListener('show-auth-ui', showHandler);
            window.removeEventListener('hide-auth-ui', hideHandler);
        };
    }, []);

    const handleTestRun = () => {
        // Clear all localStorage
        localStorage.clear();
        
        // Explicitly set Level 1 and starting wool
        localStorage.setItem('sheepMarket_playerLevel', '1');
        localStorage.setItem('sheepMarket_testMode', 'true');
        
        // Create a new visitor ID for fresh start
        const newVisitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('sheepMarket_visitorId', newVisitorId);
        
        // Set starting wool balance for this new visitor
        localStorage.setItem('sheepMarket_balance_${newVisitorId}', '100');
        
        // Force reload
        window.location.href = window.location.href;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await authService.signIn(email, password);
            } else {
                await authService.signUp(email, password);
            }
        } catch (err) {
            alert('Auth Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isVisible) return null;
    
    if (!isOpen) return null;

    return html`
        <div style=${{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style=${{
                background: '#161a1e',
                padding: '40px',
                borderRadius: '30px',
                width: '100%',
                maxWidth: '400px',
                border: '2px solid #333',
                textAlign: 'center',
                color: 'white'
            }}>
                <h2 style=${{ fontSize: '32px', marginBottom: '10px', color: '#00ff00' }}>
                    ${isLogin ? 'WELCOME BACK' : 'JOIN THE PASTURE'}
                </h2>
                <p style=${{ color: '#888', marginBottom: '30px' }}>
                    ${isLogin ? 'Enter your credentials to trade' : 'Create an account to save your WOOL'}
                </p>

                <form onSubmit=${handleSubmit} style=${{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        value=${email}
                        onInput=${(e) => setEmail(e.target.value)}
                        required
                        style=${{ padding: '15px', borderRadius: '10px', border: '1px solid #444', background: '#222', color: 'white' }}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value=${password}
                        onInput=${(e) => setPassword(e.target.value)}
                        required
                        style=${{ padding: '15px', borderRadius: '10px', border: '1px solid #444', background: '#222', color: 'white' }}
                    />
                    <button 
                        type="submit" 
                        disabled=${loading}
                        style=${{ 
                            padding: '15px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            background: '#00ff00', 
                            color: '#000', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            marginTop: '10px',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        ${loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
                    </button>
                </form>

                <div style=${{ marginTop: '20px' }}>
                    <button 
                        onClick=${() => setIsLogin(!isLogin)}
                        style=${{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        ${isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                    </button>
                </div>

                <button 
                    onClick=${() => setIsOpen(false)}
                    style=${{ marginTop: '20px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                >
                    CANCEL
                </button>
            </div>
        </div>
    `;
}
