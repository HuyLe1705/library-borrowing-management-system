import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { loginRequest } from '../../Services/authService';
import { getDefaultRoute } from '../../Utils/permissions';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [form, setForm] = useState({
        username: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

        if (!form.username.trim() || !form.password) {
            setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
            return;
        }

        try {
            setLoading(true);

            const response = await loginRequest({
                username: form.username.trim(),
                password: form.password,
            });

            // Backend trả về { success, message, data: { token, user } }
            const result = response.data ?? response;

            const token = result.token ?? result.accessToken;
            const user = result.user;

            if (!token || !user) {
                throw new Error('Dữ liệu đăng nhập từ máy chủ không hợp lệ.');
            }

            login(user, token);

            const role = String(
                user.role ?? user.roles?.[0]?.name ?? ''
            )
                .toUpperCase()
                .replace('ROLE_', '');

            const destination = location.state?.from?.pathname;

            if (role === 'ADMIN') {
                navigate('/admin', { replace: true });
            } else if (role === 'LIBRARIAN') {
                navigate('/librarian', { replace: true });
            } else if (destination && destination !== '/login') {
                navigate(destination, { replace: true });
            } else {
                navigate('/', { replace: true });
            }

        } catch (err) {
            setError(err.message || 'Đăng nhập thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <section className="auth-card">
                <Link to="/" className="auth-brand">
                    <img src="/Image/logolib.png" alt="BK Library" />
                    <span>BK Library</span>
                </Link>

                <div className="auth-heading">
                    <h1>Đăng nhập</h1>
                    <p>Chào mừng bạn quay trở lại thư viện.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="username">Tài khoản</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            placeholder="Nhập username"
                            value={form.username}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Mật khẩu</label>

                        <div className="password-input">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Nhập mật khẩu"
                                value={form.password}
                                onChange={handleChange}
                                disabled={loading}
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword((prev) => !prev)
                                }
                                aria-label={
                                    showPassword
                                        ? 'Ẩn mật khẩu'
                                        : 'Hiện mật khẩu'
                                }
                            >
                                {showPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
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
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>

                <p className="auth-switch">
                    Chưa có tài khoản?{' '}
                    <Link to="/register">Đăng ký ngay</Link>
                </p>

                <Link to="/" className="auth-back">
                    ← Quay về trang chủ
                </Link>
            </section>
        </div>
    );
};

export default Login;