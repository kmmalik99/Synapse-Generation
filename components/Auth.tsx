import React, { useState } from 'react';
import { AIIcon, GoogleIcon } from './icons';
import DynamicBackground from './DynamicBackground';
import { useError } from '../hooks/useError';

interface AuthProps {
    onLoginSuccess: (username: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { showError } = useError();
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate network delay
        setTimeout(() => {
            if (isSignUp) {
                handleSignUp();
            } else {
                handleSignIn();
            }
            setLoading(false);
        }, 500);
    };

    const handleSignUp = () => {
        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }
        try {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[username]) {
                showError('Username already exists. Please choose another.');
                return;
            }
            users[username] = { password }; // In a real app, hash the password
            localStorage.setItem('users', JSON.stringify(users));
            onLoginSuccess(username);
        } catch (e) {
            showError('Could not create account. Please try again.');
        }
    };

    const handleSignIn = () => {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            const user = users[username];
            if (user && user.password === password) {
                onLoginSuccess(username);
            } else {
                showError('Invalid username or password.');
            }
        } catch (e) {
             showError('Could not sign in. Please try again.');
        }
    };
    
    // Mock Google Sign-In
    const handleGoogleSignIn = () => {
        setLoading(true);
        // In a real app, this would trigger the Google OAuth flow.
        // Here, we'll simulate a successful login after a short delay.
        setTimeout(() => {
            const mockGoogleUser = `GoogleUser${Math.floor(Math.random() * 1000)}`;
            onLoginSuccess(mockGoogleUser);
            setLoading(false);
        }, 1000);
    };


    return (
        <div className="flex items-center justify-center min-h-screen w-screen bg-slate-50 font-sans text-gray-800 relative isolate overflow-hidden">
            <DynamicBackground />
            <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-lg rounded-xl shadow-2xl z-10 border border-slate-200/75">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center">
                        <AIIcon className="h-10 w-10 text-emerald-500" />
                        <h1 className="text-3xl font-bold ml-3 tracking-tight text-slate-800">Synapse Generation</h1>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-slate-700">
                        {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        {isSignUp ? 'Get started with your personal AI toolkit.' : 'Sign in to continue to your dashboard.'}
                    </p>
                </div>
                
                <div className="space-y-4">
                     <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : <><GoogleIcon className="h-5 w-5" /> Sign {isSignUp ? 'up' : 'in'} with Google</>}
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-slate-500">Or continue with</span>
                        </div>
                    </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                            Username
                        </label>
                        <div className="mt-1">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-slate-700">
                            Password
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <p className="text-sm text-slate-500">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button onClick={() => { setIsSignUp(!isSignUp); }} className="font-medium text-emerald-600 hover:text-emerald-500 ml-1">
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;