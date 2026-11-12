import React from 'react';
import './App.css'
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

import { AuthProvider } from './Context/AuthContext';

import Homepage from './Pages/Public/Homepage/hompage';
import Login from './Component/Auth/Login';
import Register from './Component/Auth/Register';
import BookDetail from './Component/Books/BookDetail';
import Categories from './Pages/Public/Categories/Categories';
import About from './Pages/Public/About/About';
import BookCatalog from './Pages/Public/search/BookCatalog';
import AdminLayout from './Layouts/AdminLayout';
import StaffDashboard from './Pages/Admin/StaffDashboard';
import BookManagement from './Pages/Admin/BookManagement';
import CirculationManagement from './Pages/Admin/CirculationManagement';
import UserManagement from './Pages/Admin/UserManagement';
import ActivityLogs from './Pages/Admin/ActivityLogs';
import LibrarianLayout from "./Layouts/LibrarianLayout";
import LibrarianDashboard from "./Pages/Librarian/LibrarianDashboard";
import BorrowBook from "./Pages/Librarian/BorrowBook";
import ReturnBook from "./Pages/Librarian/ReturnBook";
import BookLookup from './Pages/Librarian/BookLookup';
import ReaderLookup from './Pages/Librarian/ReaderLookup';
import BorrowingList from './Pages/Librarian/BorrowingList';
import BorrowRequests from './Pages/Librarian/BorrowRequests';


import ProtectedRoute from './Component/common/ProtectedRoute';
import { ROLES, PERMISSIONS } from './Utils/permissions';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <div className="App">
                    <main className="content">
                        <Routes>
                            {/* Trang công khai */}
                            <Route path="/" element={<Homepage />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/search" element={<BookCatalog />} />
                            <Route path="/categories" element={<Categories />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/search" element={<BookCatalog />} />
                            <Route path="/book/:id" element={<BookDetail />} />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                        <AdminLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard" element={<StaffDashboard />} />
                                <Route path="books" element={<BookManagement />} />
                                <Route path="circulation" element={<CirculationManagement />} />
                                <Route path="users" element={<UserManagement />} />
                                <Route path="activity-logs" element={<ActivityLogs />} />
                            </Route>

                            {/* Route không tồn tại */}
                            <Route
                                path="*"
                                element={<Navigate to="/" replace />}
                            />

                            <Route path="/librarian" element={<LibrarianLayout />}>
                                <Route index element={<LibrarianDashboard />} />

                                <Route path="borrow" element={<BorrowBook />} />
                                <Route path="return" element={<ReturnBook />} />

                                <Route path="books" element={<BookLookup />} />
                                <Route path="readers" element={<ReaderLookup />} />
                                <Route path="borrowings" element={<BorrowingList />} />
                                <Route path="requests" element={<BorrowRequests />} />
                            </Route>
                        </Routes>
                    </main>
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;