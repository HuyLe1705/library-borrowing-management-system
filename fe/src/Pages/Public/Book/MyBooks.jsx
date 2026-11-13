import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';
import { useAuth } from '../../../Context/AuthContext';
import { getBorrowRequests, getBorrows } from '../../../Services/borrowService';
import './MyBooks.css';
import RenewalRequests from '../../Librarian/RenewalRequests';
import Fines from '../../Librarian/Fines';
import { createRenewalRequest, getRenewalRequests } from '../../../Services/circulationService';

const REQUEST_STATUS = {
    PENDING: { label: 'Chờ duyệt', tone: 'pending' },
    APPROVED: { label: 'Đã duyệt', tone: 'approved' },
    REJECTED: { label: 'Bị từ chối', tone: 'rejected' },
    FULFILLED: { label: 'Đã hoàn tất', tone: 'fulfilled' },
    CANCELLED: { label: 'Đã hủy', tone: 'cancelled' },
};

const BORROW_STATUS = {
    BORROWED: { label: 'Đang mượn', tone: 'borrowed' },
    RETURNED: { label: 'Đã trả', tone: 'returned' },
    OVERDUE: { label: 'Quá hạn', tone: 'overdue' },
};

function extractList(result) {
    if (Array.isArray(result)) return result;
    if (!result || typeof result !== 'object') return [];

    const candidates = [result.items, result.rows, result.results, result.records, result.content, result.data];
    return candidates.find(Array.isArray) || [];
}

function dateValue(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = dateValue(value);
    return date
        ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
        : '—';
}

function daysUntil(value) {
    const target = dateValue(value);
    if (!target) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function StatusBadge({ status, request = false }) {
    const config = (request ? REQUEST_STATUS : BORROW_STATUS)[status] || {
        label: status || 'Không rõ',
        tone: 'unknown',
    };
    return <span className={`mybooks-badge mybooks-badge--${config.tone}`}>{config.label}</span>;
}

function EmptyState({ title, description }) {
    return (
        <div className="mybooks-empty">
            <span className="mybooks-empty__icon" aria-hidden="true">📚</span>
            <strong>{title}</strong>
            <p>{description}</p>
            <Link to="/search" className="mybooks-button mybooks-button--light">Khám phá sách</Link>
        </div>
    );
}

export default function MyBooks() {
    const [searchParams, setSearchParams] = useSearchParams();
    const validTabs = ['current', 'requests', 'history', 'renewals', 'fines'];
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(
        validTabs.includes(tabFromUrl) ? tabFromUrl : 'current'
    );
    const { isAuthenticated } = useAuth();
    const [requests, setRequests] = useState([]);
    const [borrows, setBorrows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [requestFilter, setRequestFilter] = useState('ALL');
    const [historyFilter, setHistoryFilter] = useState('ALL');
    const [renewTarget, setRenewTarget] = useState(null);
    const [renewNote, setRenewNote] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState('');
    const [renewals, setRenewals] = useState([]);

    const requestRenewal = async (event) => {
        event.preventDefault(); setSending(true); setError(''); setSuccess('');
        try {
            const result = await createRenewalRequest(renewTarget.id, renewNote);
            setRenewals(previous => [...previous, { ...result, borrowRecordId: renewTarget.id }]);
            setRenewTarget(null); setRenewNote(''); setSuccess('Đã gửi yêu cầu gia hạn. Vui lòng chờ thủ thư duyệt.');
            handleTabChange('renewals');
        } catch (err) { setError(err.message); }
        finally { setSending(false); }
    };

    const loadData = useCallback(async () => {
        if (!isAuthenticated) {
            setRequests([]);
            setBorrows([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const results = await Promise.allSettled([
                getBorrowRequests({ page: 1, size: 100 }),
                getBorrows(),
                getRenewalRequests(),
            ]);
            const setters = [setRequests, setBorrows, setRenewals];
            const labels = ['Yêu cầu mượn', 'Lịch sử mượn/trả', 'Yêu cầu gia hạn'];
            const errors = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') setters[index](extractList(result.value));
                else errors.push(`${labels[index]}: ${result.reason?.message || 'Không thể tải dữ liệu.'}`);
            });
            setError(errors.join(' · '));
        } catch (err) {
            setError(err?.message || 'Không thể tải dữ liệu mượn sách. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        loadData();
        
    }, [loadData]);

    useEffect(() => {
        const tab = searchParams.get('tab');

        setActiveTab(
            validTabs.includes(tab) ? tab : 'current'
        );
    }, [searchParams]);

    const currentBorrows = useMemo(
        () => borrows.filter((item) => ['BORROWED', 'OVERDUE'].includes(String(item.status || '').toUpperCase())),
        [borrows]
    );

    const pendingRequests = useMemo(
        () => requests.filter((item) => String(item.status || '').toUpperCase() === 'PENDING'),
        [requests]
    );

    const overdueCount = useMemo(
        () => currentBorrows.filter((item) => {
            if (String(item.status || '').toUpperCase() === 'OVERDUE') return true;
            const remaining = daysUntil(item.dueDate);
            return remaining !== null && remaining < 0;
        }).length,
        [currentBorrows]
    );

    const dueSoonCount = useMemo(
        () => currentBorrows.filter((item) => {
            if (String(item.status || '').toUpperCase() === 'OVERDUE') return false;
            const remaining = daysUntil(item.dueDate);
            return remaining !== null && remaining >= 0 && remaining <= 3;
        }).length,
        [currentBorrows]
    );

    const visibleRequests = useMemo(() => {
        if (requestFilter === 'ALL') return requests;
        return requests.filter((item) => String(item.status || '').toUpperCase() === requestFilter);
    }, [requests, requestFilter]);

    const visibleHistory = useMemo(() => {
        if (historyFilter === 'ALL') return borrows;
        return borrows.filter((item) => String(item.status || '').toUpperCase() === historyFilter);
    }, [borrows, historyFilter]);

    const handleTabChange = (tab) => {
        if (!validTabs.includes(tab)) return;

        setActiveTab(tab);

        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('tab', tab);
            return next;
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="mybooks-page">
                <Header />
                <main className="mybooks-shell">
                    <div className="mybooks-login-card">
                        <span aria-hidden="true">🔐</span>
                        <h1>Đăng nhập để xem sách của bạn</h1>
                        <p>Đăng nhập để theo dõi sách đang mượn, trạng thái yêu cầu và lịch sử mượn/trả.</p>
                        <Link to="/login" className="mybooks-button">Đăng nhập</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="mybooks-page">
            <Header />
            <main className="mybooks-shell">
                <section className="mybooks-hero">
                    <div>
                        <span className="mybooks-eyebrow">KHÔNG GIAN ĐỘC GIẢ</span>
                        <h1>Sách của tôi</h1>
                        <p>Theo dõi sách đang mượn, yêu cầu mượn và lịch sử của bạn tại BK Library.</p>
                    </div>
                    <Link to="/search" className="mybooks-button"><span aria-hidden="true">＋</span> Tìm sách</Link>
                </section>

                <section className="mybooks-stats" aria-label="Tổng quan mượn sách">
                    <article className="mybooks-stat-card mybooks-stat-card--blue">
                        <span className="mybooks-stat-icon" aria-hidden="true">📖</span>
                        <div><p>Đang mượn</p><strong>{loading ? '—' : currentBorrows.length}</strong><small>Phiếu chưa hoàn tất</small></div>
                    </article>
                    <article className="mybooks-stat-card mybooks-stat-card--amber">
                        <span className="mybooks-stat-icon" aria-hidden="true">⏳</span>
                        <div><p>Chờ duyệt</p><strong>{loading ? '—' : pendingRequests.length}</strong><small>Yêu cầu mượn sách</small></div>
                    </article>
                    <article className="mybooks-stat-card mybooks-stat-card--orange">
                        <span className="mybooks-stat-icon" aria-hidden="true">🔔</span>
                        <div><p>Sắp đến hạn</p><strong>{loading ? '—' : dueSoonCount}</strong><small>Trong 3 ngày tới</small></div>
                    </article>
                    <article className="mybooks-stat-card mybooks-stat-card--red">
                        <span className="mybooks-stat-icon" aria-hidden="true">⚠️</span>
                        <div><p>Quá hạn</p><strong>{loading ? '—' : overdueCount}</strong><small>Cần chú ý trả sách</small></div>
                    </article>
                </section>

                {error && (
                    <div className="mybooks-alert" role="alert">
                        <div><strong>Chưa thể tải đầy đủ dữ liệu</strong><p>{error}</p><small>Hãy kiểm tra kết nối API và quyền truy cập của tài khoản độc giả.</small></div>
                        <button type="button" onClick={loadData}>Thử lại</button>
                    </div>
                )}

                <div className="mybooks-tabs" role="tablist" aria-label="Danh mục sách">
                    <button type="button" role="tab" aria-selected={activeTab === 'renewals'} className={activeTab === 'renewals' ? 'is-active' : ''} onClick={() => handleTabChange('renewals')}>Yêu cầu gia hạn</button>
                    <button type="button" role="tab" aria-selected={activeTab === 'fines'} className={activeTab === 'fines' ? 'is-active' : ''} onClick={() => handleTabChange('fines')}>Khoản phạt</button>
                    <button type="button" role="tab" aria-selected={activeTab === 'current'} className={activeTab === 'current' ? 'is-active' : ''} onClick={() => handleTabChange('current')}>
                        Đang mượn <span>{currentBorrows.length}</span>
                    </button>
                    <button type="button" role="tab" aria-selected={activeTab === 'requests'} className={activeTab === 'requests' ? 'is-active' : ''} onClick={() => handleTabChange('requests')}>
                        Yêu cầu mượn <span>{requests.length}</span>
                    </button>
                    <button type="button" role="tab" aria-selected={activeTab === 'history'} className={activeTab === 'history' ? 'is-active' : ''} onClick={() => handleTabChange('history')}>
                        Lịch sử mượn/trả <span>{borrows.length}</span>
                    </button>
                </div>

                {success && <div className="cm-success" role="status">{success}</div>}
                {renewTarget && <form className="cm-decision" onSubmit={requestRenewal}>
                    <h3>Yêu cầu gia hạn: {renewTarget.bookTitle}</h3><p>Sau khi được duyệt, hạn trả sẽ được cộng thêm 7 ngày. Mỗi phiếu được gia hạn tối đa 1 lần.</p>
                    <label>Lý do / ghi chú<textarea maxLength={500} value={renewNote} onChange={e => setRenewNote(e.target.value)} /></label>
                    <div className="cm-actions"><button disabled={sending}>Gửi yêu cầu</button><button type="button" disabled={sending} onClick={() => setRenewTarget(null)}>Đóng</button></div>
                </form>}
                {activeTab === 'renewals' && <RenewalRequests reader onChange={loadData} />}
                {activeTab === 'fines' && <Fines reader />}
                {loading ? (
                    <div className="mybooks-loading"><span className="mybooks-spinner" /><p>Đang tải thông tin mượn sách...</p></div>
                ) : (
                    <>
                        {activeTab === 'current' && (
                            <section className="mybooks-panel">
                                <div className="mybooks-section-heading"><div><h2>Sách đang mượn</h2><p>Kiểm tra hạn trả và tình trạng các bản sao bạn đang giữ.</p></div><span className="mybooks-count">{currentBorrows.length} phiếu</span></div>
                                {currentBorrows.length === 0 ? (
                                    <EmptyState title="Bạn chưa có sách đang mượn" description="Những cuốn sách đã được ghi nhận mượn sẽ xuất hiện ở đây." />
                                ) : (
                                    <div className="mybooks-table-wrap"><table className="mybooks-table"><thead><tr><th>Tên sách</th><th>Mã bản sao</th><th>Ngày mượn</th><th>Hạn trả</th><th>Vị trí</th><th>Trạng thái</th><th>Gia hạn</th></tr></thead><tbody>
                                        {currentBorrows.map((item, index) => {
                                            const remaining = daysUntil(item.dueDate);
                                            const overdue = String(item.status || '').toUpperCase() === 'OVERDUE' || (remaining !== null && remaining < 0);
                                            return <tr key={item.id ?? `${item.barcode}-${index}`}>
                                                <td><strong className="mybooks-book-title">{item.bookTitle || 'Chưa có tên sách'}</strong>{overdue && <small className="mybooks-inline-warning">Quá hạn {Math.abs(remaining ?? 0)} ngày</small>}</td>
                                                <td><span className="mybooks-code">{item.barcode || '—'}</span></td>
                                                <td>{formatDate(item.borrowDate)}</td>
                                                <td><span className={overdue ? 'mybooks-date mybooks-date--late' : remaining !== null && remaining <= 3 ? 'mybooks-date mybooks-date--soon' : 'mybooks-date'}>{formatDate(item.dueDate)}</span></td>
                                                <td>{item.shelfLocation || '—'}</td>
                                                <td><StatusBadge status={overdue ? 'OVERDUE' : item.status} /></td>
                                                <td>{renewals.some(request => request.borrowRecordId === item.id && request.status === 'PENDING') ? <small>Đang chờ duyệt</small> : !overdue && Number(item.renewalCount || 0) < 1 ? <button className="mybooks-button mybooks-button--light" disabled={sending} onClick={() => { setRenewTarget(item); setRenewNote(''); setSuccess(''); }}>Yêu cầu gia hạn</button> : <small>{overdue ? 'Đã quá hạn' : 'Đã hết lượt'}</small>}</td>
                                            </tr>;
                                        })}
                                    </tbody></table></div>
                                )}
                            </section>
                        )}

                        {activeTab === 'requests' && (
                            <section className="mybooks-panel">
                                <div className="mybooks-section-heading"><div><h2>Yêu cầu mượn sách</h2><p>Theo dõi tiến trình xử lý yêu cầu của bạn.</p></div>
                                    <label className="mybooks-filter">Trạng thái<select value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)}><option value="ALL">Tất cả</option><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Bị từ chối</option><option value="FULFILLED">Đã hoàn tất</option><option value="CANCELLED">Đã hủy</option></select></label>
                                </div>
                                {visibleRequests.length === 0 ? (
                                    <EmptyState title="Chưa có yêu cầu phù hợp" description={requestFilter === 'ALL' ? 'Khi bạn gửi yêu cầu mượn sách, thông tin sẽ hiển thị ở đây.' : 'Thử chọn một trạng thái khác để xem yêu cầu.'} />
                                ) : (
                                    <div className="mybooks-request-list">{visibleRequests.map((item, index) => <article className="mybooks-request-card" key={item.id ?? index}>
                                        <div className="mybooks-request-cover" aria-hidden="true">📘</div>
                                        <div className="mybooks-request-main"><div className="mybooks-request-title-row"><h3>{item.bookTitle || item.title || `Yêu cầu #${item.id ?? index + 1}`}</h3><StatusBadge status={String(item.status || '').toUpperCase()} request /></div>
                                            <p className="mybooks-request-meta">Mã yêu cầu: <strong>#{item.id ?? '—'}</strong><span>Ngày gửi: {formatDate(item.requestDate || item.createdAt)}</span></p>
                                            <p className="mybooks-request-meta">Ngày dự kiến nhận: <strong>{formatDate(item.expectedPickupDate)}</strong>{item.pickupDeadline && <span>Hạn nhận: {formatDate(item.pickupDeadline)}</span>}</p>
                                            {item.barcode && <p className="mybooks-request-meta">Mã bản sao: <strong>{item.barcode}</strong></p>}
                                            {item.adminNote && <div className="mybooks-admin-note"><strong>Ghi chú từ thư viện:</strong> {item.adminNote}</div>}
                                            {item.note && <p className="mybooks-reader-note">Ghi chú của bạn: {item.note}</p>}
                                        </div>
                                    </article>)}</div>
                                )}
                            </section>
                        )}

                        {activeTab === 'history' && (
                            <section className="mybooks-panel">
                                <div className="mybooks-section-heading"><div><h2>Lịch sử mượn/trả</h2><p>Các giao dịch đã và đang diễn ra được ghi nhận trên tài khoản.</p></div>
                                    <label className="mybooks-filter">Trạng thái<select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)}><option value="ALL">Tất cả</option><option value="BORROWED">Đang mượn</option><option value="RETURNED">Đã trả</option><option value="OVERDUE">Quá hạn</option></select></label>
                                </div>
                                {visibleHistory.length === 0 ? (
                                    <EmptyState title="Chưa có lịch sử mượn/trả" description="Các giao dịch mượn và trả sách sẽ được lưu lại tại đây." />
                                ) : (
                                    <div className="mybooks-table-wrap"><table className="mybooks-table"><thead><tr><th>Tên sách</th><th>Mã bản sao</th><th>Ngày mượn</th><th>Hạn trả</th><th>Ngày trả</th><th>Trạng thái</th></tr></thead><tbody>
                                        {visibleHistory.map((item, index) => <tr key={item.id ?? `${item.barcode}-${index}`}>
                                            <td><strong className="mybooks-book-title">{item.bookTitle || 'Chưa có tên sách'}</strong>{item.fineAmount != null && Number(item.fineAmount) > 0 && <small className="mybooks-fine">Tiền phạt: {Number(item.fineAmount).toLocaleString('vi-VN')} đ{item.fineStatus ? ` · ${item.fineStatus}` : ''}</small>}</td>
                                            <td><span className="mybooks-code">{item.barcode || '—'}</span></td>
                                            <td>{formatDate(item.borrowDate)}</td><td>{formatDate(item.dueDate)}</td><td>{formatDate(item.returnDate)}</td>
                                            <td><StatusBadge status={item.status} /></td>
                                        </tr>)}
                                    </tbody></table></div>
                                )}
                            </section>
                        )}
                    </>
                )}

                <div className="mybooks-bottom-note"><span aria-hidden="true">ℹ</span><p>Nếu thông tin mượn/trả chưa chính xác, vui lòng liên hệ thủ thư để được hỗ trợ.</p></div>
            </main>
            <Footer />
        </div>
    );
}
