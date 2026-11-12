
import books from './bookData';

// Mô phỏng API lấy danh sách sách.
export const getBooks = async () => {
    return [...books];
};

// Mô phỏng API lấy chi tiết theo ID.
export const getBookById = async (id) => {
    return books.find((book) => String(book.id) === String(id)) || null;
};
