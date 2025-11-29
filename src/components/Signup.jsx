import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlinePhone } from 'react-icons/ai';
import '../styles/auth.css';
import {
	signUpWithEmail,
	signInWithGoogle,
	createRecaptcha,
	sendPhoneVerification,
} from '../firebase/firebaseConfig';

export default function Signup() {
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [phone, setPhone] = useState('');
	const [codeSent, setCodeSent] = useState(false);
	const [confirmationResult, setConfirmationResult] = useState(null);
	const [verificationCode, setVerificationCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleEmailSignup(e) {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			await signUpWithEmail(email, password);
			// optionally update profile with name
			navigate('/');
		} catch (err) {
			setError(err.message || 'Signup failed');
		} finally {
			setLoading(false);
		}
	}

	async function handleGoogle() {
		setLoading(true);
		setError('');
		try {
			await signInWithGoogle();
			navigate('/');
		} catch (err) {
			setError(err.message || 'Google sign-in failed');
		} finally {
			setLoading(false);
		}
	}

	async function handleSendCode(e) {
		e && e.preventDefault();
		setLoading(true);
		setError('');
		try {
			// create recaptcha in invisible mode
			const verifier = createRecaptcha('recaptcha-container', 'invisible');
			const confirmation = await sendPhoneVerification(phone, verifier);
			setConfirmationResult(confirmation);
			setCodeSent(true);
		} catch (err) {
			setError(err.message || 'Failed to send verification code');
		} finally {
			setLoading(false);
		}
	}

	async function handleVerifyCode(e) {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			if (!confirmationResult) throw new Error('No confirmation result');
			await confirmationResult.confirm(verificationCode);
			navigate('/');
		} catch (err) {
			setError(err.message || 'Verification failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="auth-page">
			<motion.div className="auth-card" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
				<div className="brand">
					<div style={{width:42,height:42, borderRadius:10, background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center'}}>
						<FiUser size={22} />
					</div>
					<h2>BrightPlay Sign up</h2>
				</div>

				<form onSubmit={handleEmailSignup}>
					<div className="input-group">
						<label className="helper">Full name</label>
						<div className="input">
							<FiUser />
							<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
						</div>
					</div>

					<div className="input-group">
						<label className="helper">Email</label>
						<div className="input">
							<FiMail />
							<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" required />
						</div>
					</div>

					<div className="input-group">
						<label className="helper">Password</label>
						<div className="input">
							<FiLock />
							<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" required />
						</div>
					</div>

					<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn" type="submit" disabled={loading}>
						{loading ? 'Creating...' : 'Create account'}
					</motion.button>
				</form>

				<div style={{margin:'12px 0', textAlign:'center'}} className="helper">or continue with</div>

				<div className="social-row">
					<motion.div whileHover={{ y: -4 }} className="social" onClick={handleGoogle} style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
						<FcGoogle size={20} />
						<span style={{marginLeft:8}}>Google</span>
					</motion.div>

					<motion.div whileHover={{ y: -4 }} className="social" onClick={() => {}} style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
						<AiOutlinePhone size={20} />
						<span style={{marginLeft:8}}>Phone</span>
					</motion.div>
				</div>

				<div style={{marginTop:8}}>
					<form onSubmit={codeSent ? handleVerifyCode : handleSendCode}>
						<div className="input-group">
							<label className="helper">Phone (E.164) — e.g. +15551234567</label>
							<div className="input">
								<AiOutlinePhone />
								<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1..." />
							</div>
						</div>

						{codeSent ? (
							<div className="input-group">
								<label className="helper">Verification code</label>
								<div className="input">
									<input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" />
								</div>
							</div>
						) : null}

						<div id="recaptcha-container"></div>

						<motion.button whileHover={{ scale: 1.02 }} className="btn" type="submit" disabled={loading} style={{marginTop:12}}>
							{codeSent ? (loading ? 'Verifying...' : 'Verify code') : (loading ? 'Sending...' : 'Send code')}
						</motion.button>
					</form>
				</div>

				{error && <div style={{marginTop:12,color:'#ffd1d1'}} className="helper">{error}</div>}

				<div className="small-link">
					<span className="helper">Already have an account? <Link to="/login">Login</Link></span>
				</div>
			</motion.div>
		</div>
	);
}

