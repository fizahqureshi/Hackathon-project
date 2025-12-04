import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signup from './components/Signup';
import Login from './components/Login';
import Home from './components/Home';
import './index.css';
import { UserProvider } from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Game from './components/Game';
import LevelSummary from './components/LevelSummary';
import Leaderboard from './components/Leaderboard';
import Settings from './components/Settings';

export default function App(){
	const makeChecker = (name, comp) => {
		const t = typeof comp;
		const ok = t === 'function' || t === 'string' || (comp && typeof comp === 'object' && ('$$typeof' in comp));
		if (!ok) {
			console.error(`Invalid component import: ${name} — typeof=${t}`, comp);
		}
		return ok;
	};
	makeChecker('Home', Home);
	makeChecker('Signup', Signup);
	makeChecker('Login', Login);
	makeChecker('ProtectedRoute', ProtectedRoute);
	makeChecker('Navbar', Navbar);
	makeChecker('Game', Game);
	makeChecker('LevelSummary', LevelSummary);
	makeChecker('Leaderboard', Leaderboard);
	makeChecker('Settings', Settings);

	return (
		<UserProvider>
			<BrowserRouter>
				<Navbar />
				<Routes>
					  <Route path="/" element={<Home/>} />
					<Route path="/signup" element={<Signup/>} />
					<Route path="/login" element={<Login/>} />

					<Route path="/game" element={<ProtectedRoute><Game/></ProtectedRoute>} />
					<Route path="/level-summary" element={<ProtectedRoute><LevelSummary/></ProtectedRoute>} />
					<Route path="/leaderboard" element={<ProtectedRoute><Leaderboard/></ProtectedRoute>} />
					<Route path="/settings" element={<ProtectedRoute><Settings/></ProtectedRoute>} />
				</Routes>
			</BrowserRouter>
		</UserProvider>
	);
}
