FROM node:22-alpine

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy package.json và package-lock.json trước để tận dụng Docker cache
COPY package*.json ./

# Cài đặt các thư viện production
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở cổng 5000 của Backend
EXPOSE 5000

# Khởi chạy server
CMD ["node", "src/server.js"]