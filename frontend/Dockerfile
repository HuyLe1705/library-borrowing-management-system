# ==========================================
# Giai đoạn 1: Build React Bundle với Webpack
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json và package-lock.json để tối ưu hóa Docker layer cache
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm devDependencies để chạy webpack build)
RUN npm install

# Copy toàn bộ mã nguồn frontend
COPY . .

# Build production bundle ra thư mục build/
RUN npm run build

# ==========================================
# Giai đoạn 2: Phục vụ ứng dụng với Nginx siêu nhẹ
# ==========================================
FROM nginx:alpine

# Copy kết quả build từ builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy file cấu hình Nginx (hỗ trợ React Router SPA và reverse proxy API)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mở cổng 80 trong container
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

