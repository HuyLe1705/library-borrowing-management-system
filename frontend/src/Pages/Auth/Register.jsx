import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerRequest } from '../../Services/authService';
import './Auth.css';

const Register = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (
            !form.fullName.trim() ||
            !form.username.trim() ||
            !form.email.trim() ||
            !form.password ||
            !form.confirmPassword
        ) {
            setError('Vui lòng nhập đầy đủ thông tin.');
            return;
        }

        if (form.password.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        try {
            setLoading(true);

            await registerRequest({
                fullName: form.fullName.trim(),
                username: form.username.trim(),
                email: form.email.trim(),
                password: form.password,
            });

            navigate('/login', {
                replace: true,
                state: { registered: true },
            });
        } catch (err) {
            setError(err.message || 'Đăng ký thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <section className="auth-card auth-card-register">
                <Link to="/" className="auth-brand">
                    <img src="/Image/logolib.png" alt="BK Library" />
                    <span>BK Library</span>
                </Link>

                <div className="auth-heading">
                    <h1>Tạo tài khoản</h1>
                    <p>Đăng ký để sử dụng các dịch vụ thư viện.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="fullName">Họ và tên</label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            autoComplete="name"
                            placeholder="Nhập họ và tên"
                            value={form.fullName}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            placeholder="Tạo tên đăng nhập"
                            value={form.username}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="example@email.com"
                            value={form.email}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Mật khẩu</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Ít nhất 8 ký tự"
                            value={form.password}
                            onChange={handleChange}
                            disabled={loading}
                            minLength={8}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="confirmPassword">
                            Xác nhận mật khẩu
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Nhập lại mật khẩu"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    {error && (
                        <p className="auth-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </button>
                </form>

                <p className="auth-switch">
                    Đã có tài khoản?{' '}
                    <Link to="/login">Đăng nhập</Link>
                </p>

                <Link to="/" className="auth-back">
                    ← Quay về trang chủ
                </Link>
            </section>
        </div>
    );
};

export default Register;