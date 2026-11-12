const { getPool, sql } = require('../config/database');

const dashboardRepository = {
    // 1. Thống kê tổng quan: Tổng số sách, độc giả, sách đang mượn và sách quá hạn
    async getSummary() {
        const pool = await getPool();

        // Tự động đồng bộ các bản ghi quá hạn sang OVERDUE
        await pool.request().query(`
            UPDATE dbo.borrow_records
            SET status = 'OVERDUE'
            WHERE status = 'BORROWED' AND due_date < CAST(SYSDATETIME() AS DATE);
        `);

        const result = await pool.request().query(`
            -- 1. Tổng số đầu sách
            SELECT COUNT(*) AS totalBooks FROM dbo.books;

            -- 2. Tổng số bản sao sách & bản sao đang sẵn sàng (AVAILABLE)
            SELECT
                COUNT(*) AS totalCopies,
                SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableCopies
            FROM dbo.book_copies;

            -- 3. Tổng số độc giả (Sinh viên & Giảng viên)
            SELECT COUNT(*) AS totalReaders
            FROM dbo.users
            WHERE role IN ('STUDENT', 'LECTURER');

            -- 4. Thống kê mượn/quá hạn
            SELECT
                SUM(CASE WHEN status = 'BORROWED' AND due_date >= CAST(SYSDATETIME() AS DATE) THEN 1 ELSE 0 END) AS borrowedBooks,
                SUM(CASE WHEN status = 'OVERDUE' OR (status = 'BORROWED' AND due_date < CAST(SYSDATETIME() AS DATE)) THEN 1 ELSE 0 END) AS overdueBooks,
                COUNT(*) AS totalBorrowTransactions
            FROM dbo.borrow_records;

            -- 5. Tiền phạt chưa nộp
            SELECT
                COUNT(*) AS unpaidFinesCount,
                ISNULL(SUM(amount), 0) AS totalUnpaidFineAmount
            FROM dbo.fines
            WHERE status = 'UNPAID';

            -- 6. Yêu cầu mượn đang chờ xử lý
            IF OBJECT_ID('dbo.borrow_requests', 'U') IS NOT NULL
                SELECT COUNT(*) AS pendingRequests FROM dbo.borrow_requests WHERE status = 'PENDING';
            ELSE
                SELECT 0 AS pendingRequests;
        `);

        const totalBooks = result.recordsets[0]?.[0]?.totalBooks || 0;
        const { totalCopies = 0, availableCopies = 0 } = result.recordsets[1]?.[0] || {};
        const totalReaders = result.recordsets[2]?.[0]?.totalReaders || 0;
        const { borrowedBooks = 0, overdueBooks = 0, totalBorrowTransactions = 0 } = result.recordsets[3]?.[0] || {};
        const { unpaidFinesCount = 0, totalUnpaidFineAmount = 0 } = result.recordsets[4]?.[0] || {};
        const pendingRequests = result.recordsets[5]?.[0]?.pendingRequests || 0;

        return {
            totalBooks,
            totalCopies,
            availableCopies,
            totalReaders,
            borrowedBooks,
            overdueBooks,
            totalBorrowTransactions,
            unpaidFinesCount,
            totalUnpaidFineAmount: Number(totalUnpaidFineAmount),
            pendingRequests,
        };
    },

    // 2. Thống kê số lượt mượn/trả theo ngày hoặc tháng để vẽ biểu đồ
    async getStatistics({ period = 'day', year, month, days = 7 } = {}) {
        const pool = await getPool();
        const normalizedPeriod = String(period).toLowerCase().includes('month') ? 'month' : 'day';

        if (normalizedPeriod === 'month') {
            const targetYear = Number(year) || new Date().getFullYear();
            const request = pool.request();
            request.input('targetYear', sql.Int, targetYear);

            const result = await request.query(`
                SELECT
                    MONTH(borrow_date) AS [month],
                    COUNT(*) AS borrowCount
                FROM dbo.borrow_records
                WHERE YEAR(borrow_date) = @targetYear
                GROUP BY MONTH(borrow_date);

                SELECT
                    MONTH(return_date) AS [month],
                    COUNT(*) AS returnCount
                FROM dbo.borrow_records
                WHERE return_date IS NOT NULL AND YEAR(return_date) = @targetYear
                GROUP BY MONTH(return_date);
            `);

            const borrowMap = {};
            (result.recordsets[0] || []).forEach((row) => {
                borrowMap[row.month] = row.borrowCount;
            });

            const returnMap = {};
            (result.recordsets[1] || []).forEach((row) => {
                returnMap[row.month] = row.returnCount;
            });

            const series = [];
            let totalBorrows = 0;
            let totalReturns = 0;

            for (let m = 1; m <= 12; m++) {
                const monthStr = String(m).padStart(2, '0');
                const periodKey = `${targetYear}-${monthStr}`;
                const borrows = borrowMap[m] || 0;
                const returns = returnMap[m] || 0;
                totalBorrows += borrows;
                totalReturns += returns;

                series.push({
                    period: periodKey,
                    label: `Tháng ${monthStr}/${targetYear}`,
                    month: m,
                    year: targetYear,
                    borrows,
                    returns,
                });
            }

            return {
                period: 'month',
                year: targetYear,
                summary: {
                    totalBorrows,
                    totalReturns,
                },
                series,
            };
        }

        // Trường hợp thống kê theo ngày (period = 'day')
        const targetDays = Math.min(60, Math.max(1, Number(days) || 7));
        const endDate = new Date();
        const startDate = new Date();

        if (year && month) {
            // Xem toàn bộ ngày trong 1 tháng cụ thể
            const targetYear = Number(year);
            const targetMonth = Number(month);
            startDate.setFullYear(targetYear, targetMonth - 1, 1);
            const lastDay = new Date(targetYear, targetMonth, 0).getDate();
            endDate.setFullYear(targetYear, targetMonth - 1, lastDay);
        } else {
            // Mặc định xem N ngày gần nhất (e.g. 7 ngày qua)
            startDate.setDate(endDate.getDate() - (targetDays - 1));
        }

        const formatIsoDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const fromDateStr = formatIsoDate(startDate);
        const toDateStr = formatIsoDate(endDate);

        const request = pool.request();
        request.input('fromDate', sql.Date, fromDateStr);
        request.input('toDate', sql.Date, toDateStr);

        const result = await request.query(`
            SELECT
                CONVERT(VARCHAR(10), borrow_date, 120) AS [date],
                COUNT(*) AS borrowCount
            FROM dbo.borrow_records
            WHERE borrow_date >= @fromDate AND borrow_date <= @toDate
            GROUP BY CONVERT(VARCHAR(10), borrow_date, 120);

            SELECT
                CONVERT(VARCHAR(10), return_date, 120) AS [date],
                COUNT(*) AS returnCount
            FROM dbo.borrow_records
            WHERE return_date IS NOT NULL AND return_date >= @fromDate AND return_date <= @toDate
            GROUP BY CONVERT(VARCHAR(10), return_date, 120);
        `);

        const borrowMap = {};
        (result.recordsets[0] || []).forEach((row) => {
            borrowMap[row.date] = row.borrowCount;
        });

        const returnMap = {};
        (result.recordsets[1] || []).forEach((row) => {
            returnMap[row.date] = row.returnCount;
        });

        const series = [];
        let totalBorrows = 0;
        let totalReturns = 0;

        const curDate = new Date(startDate);
        while (curDate <= endDate) {
            const dateStr = formatIsoDate(curDate);
            const dayStr = String(curDate.getDate()).padStart(2, '0');
            const monthStr = String(curDate.getMonth() + 1).padStart(2, '0');
            const label = `${dayStr}/${monthStr}`;

            const borrows = borrowMap[dateStr] || 0;
            const returns = returnMap[dateStr] || 0;
            totalBorrows += borrows;
            totalReturns += returns;

            series.push({
                date: dateStr,
                label,
                borrows,
                returns,
            });

            curDate.setDate(curDate.getDate() + 1);
        }

        return {
            period: 'day',
            from: fromDateStr,
            to: toDateStr,
            summary: {
                totalBorrows,
                totalReturns,
            },
            series,
        };
    },
};

module.exports = dashboardRepository;
