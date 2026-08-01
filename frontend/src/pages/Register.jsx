import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/auth.css';

const PasswordInput = ({ placeholder, value, onChange, show, onToggle }) => (
  <div style={{ position: 'relative', width: '100%' }}>
    <input
      type={show ? 'text' : 'password'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
      style={{ width: '100%', paddingRight: '42px', boxSizing: 'border-box' }}
    />
    <button
      type="button"
      onClick={onToggle}
      style={{
        position:   'absolute',
        right:      10,
        top:        '50%',
        transform:  'translateY(-50%)',
        background: 'none',
        border:     'none',
        cursor:     'pointer',
        color:      '#71717a',
        padding:    0,
        display:    'flex',
        alignItems: 'center',
      }}
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
);

const Register = () => {
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone,           setPhone]           = useState('');
  const [gender,          setGender]          = useState('');
  const [dob,             setDob]             = useState('');
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
  };

  const validatePhone = (val) => {
    return /^(97|98)\d{8}$/.test(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!validatePhone(phone)) {
      alert('Phone must be a valid Nepal number');
      return;
    }

    if (!gender) {
      alert('Please select your gender');
      return;
    }

    if (!dob) {
      alert('Please enter your date of birth');
      return;
    }

    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, phone, gender, dob })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Registration Successful! Please check your email for the Welcome OTP.');
        login(data);
        navigate('/');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Register</h2>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={handlePhoneChange}
          maxLength={10}
          required
          title="Enter a valid Nepal number starting with 97 or 98"
          style={{ borderColor: phone && !validatePhone(phone) ? '#ef4444' : undefined }}
        />
        {phone && !validatePhone(phone) && (
          <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '-8px', marginBottom: '4px' }}>
            Must start with 97 or 98 and be exactly 10 digits
          </p>
        )}

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="auth-select"
          required
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <div className="auth-field-group">
          <label className="auth-label">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
            style={{
              width: '100%',
              padding: '11px 14px',
              background: '#0f0f0f',
              border: '1px solid #27272a',
              borderRadius: 8,
              color: '#e0e0e0',
              fontSize: 14,
              outline: 'none',
              colorScheme: 'dark',
            }}
          />
        </div>

        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          show={showPassword}
          onToggle={() => setShowPassword(p => !p)}
        />

        <PasswordInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          show={showConfirmPassword}
          onToggle={() => setShowConfirmPassword(p => !p)}
        />

        {confirmPassword && password !== confirmPassword && (
          <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '-8px', marginBottom: '4px' }}>
            Passwords do not match
          </p>
        )}

        <button type="submit" className="btn">Register</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
};

export default Register;