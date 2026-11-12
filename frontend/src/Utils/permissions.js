export const ROLES = Object.freeze({
    ADMIN: 'ADMIN',
    USER: 'USER',
});

export const PERMISSIONS = Object.freeze({
    BOOK_VIEW: 'BOOK_VIEW',
    BOOK_BORROW: 'BOOK_BORROW',
    BOOK_MANAGE: 'BOOK_MANAGE',
    BORROW_MANAGE: 'BORROW_MANAGE',
    USER_MANAGE: 'USER_MANAGE',
});

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        PERMISSIONS.BOOK_VIEW,
        PERMISSIONS.BOOK_BORROW,
        PERMISSIONS.BOOK_MANAGE,
        PERMISSIONS.BORROW_MANAGE,
        PERMISSIONS.USER_MANAGE,
    ],

    [ROLES.USER]: [
        PERMISSIONS.BOOK_VIEW,
        PERMISSIONS.BOOK_BORROW,
    ],
};

// Chuẩn hóa "ROLE_ADMIN", "admin", "Admin" thành "ADMIN".
export const normalizeRole = (role) => {
    if (typeof role !== 'string') {
        return null;
    }

    const normalized = role
        .trim()
        .toUpperCase()
        .replace(/^ROLE_/, '');

    return Object.values(ROLES).includes(normalized)
        ? normalized
        : null;
};

// Hỗ trợ nhiều cấu trúc dữ liệu role trả về từ backend.
export const getUserRoles = (user) => {
    if (!user) {
        return [];
    }

    const rawRoles = [
        user.role,
        user.roles,
    ].flatMap((value) => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    });

    return [
        ...new Set(
            rawRoles
                .map((role) => {
                    if (typeof role === 'string') {
                        return normalizeRole(role);
                    }

                    if (role && typeof role === 'object') {
                        return normalizeRole(
                            role.name ??
                            role.roleName ??
                            role.authority
                        );
                    }

                    return null;
                })
                .filter(Boolean)
        ),
    ];
};

export const hasRole = (user, allowedRoles = []) => {
    if (!user || !Array.isArray(allowedRoles)) {
        return false;
    }

    const userRoles = getUserRoles(user);
    const normalizedAllowedRoles = allowedRoles
        .map(normalizeRole)
        .filter(Boolean);

    return normalizedAllowedRoles.some((role) =>
        userRoles.includes(role)
    );
};

export const hasPermission = (user, permission) => {
    const userRoles = getUserRoles(user);

    return userRoles.some((role) =>
        (ROLE_PERMISSIONS[role] || []).includes(permission)
    );
};

export const hasAnyPermission = (user, permissions = []) => {
    return permissions.some((permission) =>
        hasPermission(user, permission)
    );
};

// Trang mặc định sau đăng nhập theo role.
export const getDefaultRoute = (user) => {
    if (hasRole(user, [ROLES.ADMIN])) {
        return '/admin';
    }

    if (hasRole(user, [ROLES.USER])) {
        return '/';
    }

    return '/login';
};