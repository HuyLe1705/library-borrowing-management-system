
import React, { useEffect, useState } from 'react';
import dashboardService from '../../Services/dashboardService';
import './AdminPages.css';

const initialSummary = {
    totalBooks: 0,
    totalUsers: 0,
    activeBorrowings: 0,
    pendingRequests: 0,
    overdueBooks: 0,
};

const cards = [
    { key: 'totalBooks', label: 'Đầu sách', icon: '📚' },
    { key: 'totalUsers', label: 'Người dùng', icon: '👥' },
    { key: 'activeBorrowings', label: 'Lượt mượn đang hoạt động', icon: '📖' },
    { key: 'pendingRequests', label: 'Yêu cầu chờ duyệt', icon: '⏳' },
    { key: 'overdueBooks', label: 'Sách quá hạn', icon: '⚠️' },
];

function StaffDashboard() {
    const [summary, setSummary] = useState(initialSummary);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [overdueBooks, setOverdueBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            setLoading(true);
            setError('');

            try {
                const [summaryData, pendingData, overdueData] =
                    await Promise.all([
                        dashboardService.getDashboardSummary(),
                        dashboardService.getPendingBorrowRequests(),
                        dashboardService.getOverdueBooks(),
                    ]);

                if (cancelled) return;

                setSummary({ ...initialSummary, ...(summaryData || {}) });
                setPendingRequests(
                    Array.isArray(pendingData)
                        ? pendingData
                        : pendingData?.content || []
                );
                setOverdueBooks(
                    Array.isArray(overdueData)
                        ? overdueData
                        : overdueData?.content || []
                );
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Không thể tải dữ liệu dashboard.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="admin-page">
            <h1 className="admin-heading">Tổng quan thư viện</h1>
            <p className="admin-subtitle">
                Theo dõi tình hình hoạt động của BK Library.
            </p>

            {error && (
                <p role="alert" className="admin-error">
                    {error}
                </p>
            )}

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <div className="admin-grid">
                        {cards.map((card) => (
                            <div key={card.key} className="admin-card">
                                <div>
                                    {card.icon} {card.label}
                                </div>
                                <div className="admin-number">
                                    {Number(summary[card.key] ?? 0).toLocaleString('vi-VN')}
                                </div>
                            </div>
                        ))}
                    </div>

                    <section className="admin-section">
                        <h2>Yêu cầu mượn sách đang chờ</h2>
                        {pendingRequests.length === 0 ? (
                            <p>Không có yêu cầu chờ duyệt.</p>
                        ) : (
                            <ul>
                                {pendingRequests.slice(0, 5).map((item, index) => (
                                    <li key={item.id ?? item.requestId ?? index}>
                                        {item.userName || item.borrowerName || 'Người dùng'}
                                        {' — '}
                                        {item.bookTitle || item.title || 'Chưa có tên sách'}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="admin-section">
                        <h2>Sách đang quá hạn</h2>
                        {overdueBooks.length === 0 ? (
                            <p>Không có bản ghi sách quá hạn.</p>
                        ) : (
                            <ul>
                                {overdueBooks.slice(0, 5).map((item, index) => (
                                    <li key={item.id ?? item.borrowingId ?? index}>
                                        {item.bookTitle || item.title || 'Chưa có tên sách'}
                                        {' — '}
                                        {item.userName || item.borrowerName || 'Chưa rõ người mượn'}
                                        {item.dueDate ? ` — Hạn trả: ${item.dueDate}` : ''}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default StaffDashboard;
