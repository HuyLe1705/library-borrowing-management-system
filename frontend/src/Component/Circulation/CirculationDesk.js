import React, { useState } from 'react';
import './CirculationDesk.css';

const CirculationDesk = () => {
    const [loanID, setLoanID] = useState('');
    const [fineInfo, setFineInfo] = useState(null); 
    const [overdueBooks, setOverdueBooks] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Thêm trạng thái loading

    // B1: Kiểm tra phạt (ĐÃ CẬP NHẬT: Xử lý isReturned và logic overdueBooks)
    const checkFine = async () => {
        if (!loanID) {
            alert("Vui lòng nhập mã phiếu mượn!");
            return;
        }
        setFineInfo(null); // Reset fineInfo khi kiểm tra mới
        setOverdueBooks(''); // Reset cảnh báo khi kiểm tra mới
        setIsLoading(true); // Bắt đầu loading
        try {
            const res = await fetch(`http://localhost:5000/api/loans/fine/${loanID}`);
            
            // 1. Xử lý trường hợp Server trả về lỗi (ví dụ: 404 Not Found)
            if (!res.ok) {
                // Đọc thông báo lỗi chi tiết từ Server (vd: "Lỗi: Không tìm thấy LoanID này...")
                const errorText = await res.text(); 
                
                // Nếu là 404, hiển thị thông báo rõ ràng cho người dùng
                if (res.status === 404) {
                     // Nếu Server trả về status 404 khi không tìm thấy LoanID
                    throw new Error(errorText || "Không tìm thấy Mã Phiếu Mượn.");
                } else {
                    // Lỗi chung (500,...)
                    throw new Error(errorText || "Lỗi kết nối hoặc xử lý."); 
                }
            }
            
            // 2. Xử lý phản hồi thành công (status 200)
            const data = await res.json();
            const fineAmount = data.FineAmount || 0;
            
            setFineInfo({ 
                amount: fineAmount, 
                daysLate: data.DaysLate,
                // Lấy các thông tin mới từ Server
                isReturned: data.isReturned || false,
                ReturnDate: data.ReturnDate || null,
                FineHistory: data.FineHistory || null
            });
            
            // LOGIC LẤY SÁCH QUÁ HẠN CHỈ KHI CÓ PHẠT VÀ CHƯA TRẢ
            if (fineAmount > 0 && !data.isReturned) { 
                // Sau khi đảm bảo LoanID tồn tại (res.ok ở trên), ta check thông tin chi tiết
                const resLoan = await fetch(`http://localhost:5000/api/loan/${loanID}`);
                if (resLoan.ok) {
                    const loanData = await resLoan.json();
                    if (loanData.BorrowerID) {
                        const resOverdue = await fetch(`http://localhost:5000/api/user/overdue-books/${loanData.BorrowerID}`);
                        if (resOverdue.ok) {
                            const overdueData = await resOverdue.json();
                            setOverdueBooks(overdueData.OverdueBooks);
                        } else {
                             setOverdueBooks('Không thể tải thông tin sách quá hạn.');
                        }
                    }
                }
            } else {
                // Hợp lệ hoặc đã trả: Reset overdueBooks
                setOverdueBooks(''); 
            }
            
        } catch (err) {
            alert("Lỗi kiểm tra: " + err.message);
            setFineInfo(null);
            setOverdueBooks(''); // Reset cảnh báo trong trường hợp lỗi
        } finally {
            setIsLoading(false); // Kết thúc loading
        }
    };

    // B2: Thu tiền & Trả sách (Giữ nguyên)
    const handleReturn = async () => {
        if (!loanID) return;
        
        const amount = fineInfo ? fineInfo.amount : 0;
        if (!window.confirm(`Xác nhận thu ${amount.toLocaleString()} VND và hoàn tất trả sách?`)) {
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/loans/return`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loanID })
            });
            
            if (!res.ok) throw new Error(await res.text());

            alert(`✅ Giao dịch thành công!\n- Sách đã trả về kho.\n- Đã thu ${amount.toLocaleString()} VND.`);
            
            // Reset UI
            setFineInfo(null);
            setOverdueBooks('');
            setLoanID(''); 
            
        } catch (err) {
            alert("❌ Lỗi giao dịch: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="desk-container">
            <h2>📚 Quầy Lưu Hành</h2>
            
            <div className="input-group">
                <label>Mã Phiếu Mượn (Loan ID)</label>
                <input 
                    type="text" 
                    value={loanID} 
                    onChange={(e) => setLoanID(e.target.value)} 
                    placeholder="Ví dụ: L004"
                    onKeyPress={(e) => e.key === 'Enter' && checkFine()} // Cho phép nhấn Enter
                />
            </div>

            <button className="btn-check" onClick={checkFine} disabled={isLoading}>
                {isLoading ? "Đang xử lý..." : "🔍 Kiểm tra Thông Tin"}
            </button>

            {fineInfo !== null && (
                <div className="fine-box">
                    <div className="fine-header">
                        <h3>Hóa Đơn Thanh Toán</h3>
                        <span className={fineInfo.amount > 0 ? "amount-highlight" : "status-clean"}>
                            {/* LOGIC ĐÃ SỬA ĐỂ HIỂN THỊ "Đang Mượn (Hợp Lệ)" */}
                            {fineInfo.isReturned ? "Đã Hoàn Tất" : (
                                fineInfo.amount > 0 ? "Chưa Thanh Toán (Quá Hạn)" : "Đang Mượn (Hợp Lệ)"
                            )}
                        </span>
                    </div>

                    <div className="fine-details">
                        <p>Số ngày quá hạn: <span>{fineInfo.daysLate > 0 ? fineInfo.daysLate : 0} ngày</span></p>
                        {
                            // HIỂN THỊ LỊCH SỬ GIAO DỊCH KHI ĐÃ TRẢ
                            fineInfo.isReturned ? (
                                <>
                                    <p>Ngày trả sách: <span>{new Date(fineInfo.ReturnDate).toLocaleDateString()}</span></p>
                                    <p>Trạng thái phạt: <span className={fineInfo.FineHistory && fineInfo.FineHistory.Status === 'Paid' ? 'status-clean' : 'amount-highlight'}>
                                        {fineInfo.FineHistory && fineInfo.FineHistory.Status === 'Paid' ? `Đã Đóng (${fineInfo.FineHistory.Amount.toLocaleString()} VND)` : 'Không Phát Sinh'}
                                    </span></p>
                                    {fineInfo.FineHistory && fineInfo.FineHistory.Status === 'Paid' && <p>Ngày đóng phạt: <span>{new Date(fineInfo.FineHistory.FinePaymentDate).toLocaleDateString()}</span></p>}
                                    
                                    {/* DÒNG NÀY ĐÃ ĐƯỢC THÊM VÀO ĐỂ HIỂN THỊ TỔNG TIỀN ĐÃ THU */}
                                    <p>Tổng tiền đã thu: <span className="amount-highlight">{fineInfo.amount.toLocaleString()} VND</span></p>
                                </>
                            ) : (
                                // HIỂN THỊ TIỀN PHẠT NẾU CHƯA TRẢ
                                <p>Tổng tiền phạt: <span className="amount-highlight">{fineInfo.amount.toLocaleString()} VND</span></p>
                            )
                        }
                    </div>

                    {overdueBooks && overdueBooks !== 'Không có sách quá hạn.' && (
                        <div className="overdue-alert">
                            <strong>⚠️ Cảnh báo độc giả:</strong>
                            {overdueBooks}
                        </div>
                    )}
                    
                    {/* NÚT THAO TÁC */}
                    <button className="btn-return" onClick={handleReturn} disabled={isLoading || fineInfo.isReturned}>
                        {fineInfo.isReturned ? "✅ Giao Dịch Đã Hoàn Tất" : (fineInfo.amount > 0 ? "💸 Thu Tiền & Trả Sách" : "✅ Xác Nhận Trả Sách")}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CirculationDesk;